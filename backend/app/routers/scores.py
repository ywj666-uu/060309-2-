from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.score import Score, SubmissionScore
from app.models.submission import Submission
from app.models.group import Group
from app.models.trial_session import TrialSession
from app.models.user import User
from app.schemas.score import ScoreCreate, ScoreUpdate, ScoreResponse, SubmissionScoreCreate, SubmissionScoreResponse
from app.dependencies import get_current_user
from app.core.enums import UserRole, TrialWinner, GroupSide
from app.core.permissions import require_role
from app.core.exceptions import NotFoundError, BadRequestError

router = APIRouter(prefix="/api/trials/{trial_id}/scores", tags=["scores"])


@router.post("", response_model=ScoreResponse)
async def create_score(
    trial_id: str,
    data: ScoreCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.JUDGE)),
):
    existing = await db.execute(
        select(Score).where(
            Score.trial_session_id == trial_id,
            Score.group_id == data.group_id,
            Score.phase == data.phase,
        )
    )
    if existing.scalar_one_or_none():
        raise BadRequestError("Score already exists for this group/phase. Use PUT to update.")

    score = Score(
        trial_session_id=trial_id,
        group_id=data.group_id,
        judge_id=current_user.id,
        phase=data.phase,
        argumentation_quality=data.argumentation_quality,
        evidence_usage=data.evidence_usage,
        legal_reasoning=data.legal_reasoning,
        presentation=data.presentation,
        overall_score=data.overall_score,
        comments=data.comments,
    )
    db.add(score)
    await db.flush()
    return score


@router.post("/submission-score", response_model=SubmissionScoreResponse)
async def score_submission(
    trial_id: str,
    data: SubmissionScoreCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.JUDGE)),
):
    """Score an individual submission (evidence or argument)."""
    sub_result = await db.execute(
        select(Submission).where(Submission.id == data.submission_id, Submission.trial_session_id == trial_id)
    )
    if not sub_result.scalar_one_or_none():
        raise NotFoundError("Submission not found in this trial")

    existing = await db.execute(
        select(SubmissionScore).where(
            SubmissionScore.submission_id == data.submission_id,
            SubmissionScore.judge_id == current_user.id,
        )
    )
    existing_score = existing.scalar_one_or_none()
    if existing_score:
        existing_score.score = data.score
        existing_score.comments = data.comments
        await db.flush()
        return existing_score

    score = SubmissionScore(
        submission_id=data.submission_id,
        judge_id=current_user.id,
        trial_session_id=trial_id,
        score=data.score,
        comments=data.comments,
    )
    db.add(score)
    await db.flush()
    return score


@router.get("", response_model=list[ScoreResponse])
async def list_scores(
    trial_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Score).where(Score.trial_session_id == trial_id).order_by(Score.scored_at)
    )
    return result.scalars().all()


@router.get("/submission-scores", response_model=list[SubmissionScoreResponse])
async def list_submission_scores(
    trial_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SubmissionScore).where(SubmissionScore.trial_session_id == trial_id).order_by(SubmissionScore.scored_at)
    )
    return result.scalars().all()


@router.put("/{score_id}", response_model=ScoreResponse)
async def update_score(
    trial_id: str,
    score_id: str,
    data: ScoreUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.JUDGE)),
):
    result = await db.execute(
        select(Score).where(Score.id == score_id, Score.trial_session_id == trial_id)
    )
    score = result.scalar_one_or_none()
    if not score:
        raise NotFoundError("Score not found")
    if score.judge_id != current_user.id:
        raise BadRequestError("You can only update your own scores")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(score, key, value)

    await db.flush()
    return score


@router.get("/summary")
async def get_score_summary(
    trial_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate winner by weighted average submission scores per phase per group."""
    from app.models.trial_session import TrialSession, PhaseConfig
    from sqlalchemy.orm import selectinload

    trial_result = await db.execute(
        select(TrialSession).options(selectinload(TrialSession.phase_configs)).where(TrialSession.id == trial_id)
    )
    trial = trial_result.scalar_one_or_none()
    phase_weights: dict[str, float] = {}
    if trial:
        for pc in trial.phase_configs:
            phase_weights[pc.phase] = pc.weight

    groups_result = await db.execute(
        select(Group).where(Group.trial_session_id == trial_id)
    )
    groups = groups_result.scalars().all()

    submissions_result = await db.execute(
        select(Submission).where(Submission.trial_session_id == trial_id)
    )
    submissions = submissions_result.scalars().all()

    sub_scores_result = await db.execute(
        select(SubmissionScore).where(SubmissionScore.trial_session_id == trial_id)
    )
    sub_scores = sub_scores_result.scalars().all()

    score_map = {}
    for ss in sub_scores:
        score_map[ss.submission_id] = ss.score

    # Group submissions by group_id and phase, compute weighted average score per phase
    phase_averages: dict[str, dict[str, float]] = {}
    for group in groups:
        phase_averages[group.id] = {}
        group_subs = [s for s in submissions if s.group_id == group.id]

        phases_seen: dict[str, list[int]] = {}
        for sub in group_subs:
            if sub.id in score_map:
                phases_seen.setdefault(sub.phase, []).append(score_map[sub.id])

        for phase, scores_list in phases_seen.items():
            phase_averages[group.id][phase] = sum(scores_list) / len(scores_list)

    # Total = weighted sum of phase averages
    group_totals = {}
    for group in groups:
        weighted_total = 0.0
        for phase, avg in phase_averages.get(group.id, {}).items():
            weight = phase_weights.get(phase, 1.0)
            weighted_total += avg * weight
        group_totals[group.id] = {
            "group_id": group.id,
            "side": group.side,
            "name": group.name,
            "total_score": round(weighted_total, 2),
            "phase_averages": phase_averages.get(group.id, {}),
        }

    plaintiff_total = sum(v["total_score"] for v in group_totals.values() if v["side"] == "plaintiff")
    defendant_total = sum(v["total_score"] for v in group_totals.values() if v["side"] == "defendant")

    if plaintiff_total > defendant_total:
        winner = TrialWinner.PLAINTIFF
    elif defendant_total > plaintiff_total:
        winner = TrialWinner.DEFENDANT
    else:
        winner = TrialWinner.DRAW

    return {
        "groups": group_totals,
        "plaintiff_total": round(plaintiff_total, 2),
        "defendant_total": round(defendant_total, 2),
        "winner": winner,
        "phase_weights": phase_weights,
    }
