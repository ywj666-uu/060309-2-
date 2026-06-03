from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.trial_session import TrialSession, PhaseConfig
from app.models.user import User
from app.schemas.trial_session import (
    TrialSessionCreate, TrialSessionUpdate, TrialSessionResponse, TrialSessionListResponse,
)
from app.dependencies import get_current_user
from app.core.enums import UserRole, TrialStatus, TrialPhase
from app.core.permissions import require_role
from app.core.exceptions import NotFoundError, BadRequestError
from app.services.ws_manager import ws_manager

router = APIRouter(prefix="/api/trials", tags=["trials"])

DEFAULT_PHASES = [
    (TrialPhase.OPENING, 300),
    (TrialPhase.EVIDENCE, 600),
    (TrialPhase.CROSS_EXAMINATION, 600),
    (TrialPhase.CLOSING, 300),
    (TrialPhase.VERDICT, 120),
]


@router.post("", response_model=TrialSessionResponse)
async def create_trial(
    data: TrialSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    trial = TrialSession(
        case_id=data.case_id,
        title=data.title,
        created_by=current_user.id,
        judge_id=data.judge_id,
    )
    db.add(trial)
    await db.flush()

    phases = data.phase_configs if data.phase_configs else [
        type("PC", (), {"phase": p, "duration_seconds": d, "weight": 1.0})() for p, d in DEFAULT_PHASES
    ]
    for idx, pc in enumerate(phases):
        config = PhaseConfig(
            trial_session_id=trial.id,
            phase=pc.phase,
            duration_seconds=pc.duration_seconds,
            weight=pc.weight,
            order_index=idx,
        )
        db.add(config)

    await db.flush()
    await db.refresh(trial, ["phase_configs"])
    return trial


@router.get("", response_model=list[TrialSessionListResponse])
async def list_trials(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(TrialSession).order_by(TrialSession.created_at.desc()))
    return result.scalars().all()


@router.get("/{trial_id}", response_model=TrialSessionResponse)
async def get_trial(
    trial_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TrialSession).options(selectinload(TrialSession.phase_configs)).where(TrialSession.id == trial_id)
    )
    trial = result.scalar_one_or_none()
    if not trial:
        raise NotFoundError("Trial session not found")
    return trial


@router.post("/{trial_id}/start", response_model=TrialSessionResponse)
async def start_trial(
    trial_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    result = await db.execute(
        select(TrialSession).options(selectinload(TrialSession.phase_configs)).where(TrialSession.id == trial_id)
    )
    trial = result.scalar_one_or_none()
    if not trial:
        raise NotFoundError("Trial session not found")
    if trial.status != TrialStatus.PENDING:
        raise BadRequestError("Trial already started or completed")

    first_phase = sorted(trial.phase_configs, key=lambda x: x.order_index)[0]
    now = datetime.now(timezone.utc)

    trial.status = TrialStatus.IN_PROGRESS
    trial.current_phase = first_phase.phase
    trial.phase_started_at = now
    trial.phase_duration_seconds = first_phase.duration_seconds
    trial.started_at = now

    first_phase.is_active = True
    first_phase.started_at = now

    await db.flush()

    # Start the phase timer - broadcasts countdown via WebSocket
    ws_manager.start_phase_timer(trial_id, first_phase.phase, first_phase.duration_seconds)

    return trial


@router.post("/{trial_id}/next-phase", response_model=TrialSessionResponse)
async def advance_phase(
    trial_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.JUDGE)),
):
    result = await db.execute(
        select(TrialSession).options(selectinload(TrialSession.phase_configs)).where(TrialSession.id == trial_id)
    )
    trial = result.scalar_one_or_none()
    if not trial:
        raise NotFoundError("Trial session not found")
    if trial.status != TrialStatus.IN_PROGRESS:
        raise BadRequestError("Trial is not in progress")

    configs = sorted(trial.phase_configs, key=lambda x: x.order_index)
    current_idx = next((i for i, c in enumerate(configs) if c.phase == trial.current_phase), -1)

    now = datetime.now(timezone.utc)
    configs[current_idx].is_active = False
    configs[current_idx].ended_at = now

    if current_idx + 1 >= len(configs):
        trial.status = TrialStatus.COMPLETED
        trial.current_phase = None
        trial.completed_at = now
        ws_manager.stop_timer(trial_id)
    else:
        next_config = configs[current_idx + 1]
        trial.current_phase = next_config.phase
        trial.phase_started_at = now
        trial.phase_duration_seconds = next_config.duration_seconds
        next_config.is_active = True
        next_config.started_at = now
        # Start timer for the new phase
        ws_manager.start_phase_timer(trial_id, next_config.phase, next_config.duration_seconds)

    await db.flush()
    return trial


@router.post("/{trial_id}/end", response_model=TrialSessionResponse)
async def end_trial(
    trial_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    result = await db.execute(
        select(TrialSession).options(selectinload(TrialSession.phase_configs)).where(TrialSession.id == trial_id)
    )
    trial = result.scalar_one_or_none()
    if not trial:
        raise NotFoundError("Trial session not found")

    trial.status = TrialStatus.COMPLETED
    trial.completed_at = datetime.now(timezone.utc)
    await db.flush()
    return trial
