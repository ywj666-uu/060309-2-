import os
import uuid
import aiofiles
from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.submission import Submission
from app.models.group import Group, GroupMember
from app.models.trial_session import TrialSession
from app.models.user import User
from app.schemas.submission import SubmissionCreate, SubmissionResponse
from app.dependencies import get_current_user
from app.core.enums import UserRole, TrialStatus, TrialPhase, SubmissionType
from app.core.exceptions import NotFoundError, BadRequestError, ForbiddenError
from app.config import settings

router = APIRouter(prefix="/api/trials/{trial_id}/submissions", tags=["submissions"])


@router.post("", response_model=SubmissionResponse)
async def create_submission(
    trial_id: str,
    phase: TrialPhase = Form(...),
    submission_type: SubmissionType = Form(...),
    title: str = Form(...),
    content: str | None = Form(None),
    file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trial_result = await db.execute(select(TrialSession).where(TrialSession.id == trial_id))
    trial = trial_result.scalar_one_or_none()
    if not trial:
        raise NotFoundError("Trial not found")
    if trial.status != TrialStatus.IN_PROGRESS:
        raise BadRequestError("Trial is not in progress")
    if trial.current_phase != phase:
        raise BadRequestError(f"Current phase is {trial.current_phase}, not {phase}")

    member_result = await db.execute(
        select(GroupMember).join(Group)
        .where(Group.trial_session_id == trial_id, GroupMember.user_id == current_user.id)
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise ForbiddenError("You are not a participant in this trial")

    file_path = None
    file_name = None
    file_type = None

    if file:
        upload_dir = os.path.join(settings.UPLOAD_DIR, "trials", trial_id)
        os.makedirs(upload_dir, exist_ok=True)
        file_ext = os.path.splitext(file.filename)[1]
        stored_name = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(upload_dir, stored_name)

        file_content = await file.read()
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(file_content)

        file_name = file.filename
        file_type = file.content_type

    submission = Submission(
        trial_session_id=trial_id,
        group_id=member.group_id,
        user_id=current_user.id,
        phase=phase,
        submission_type=submission_type,
        title=title,
        content=content,
        file_path=file_path,
        file_name=file_name,
        file_type=file_type,
    )
    db.add(submission)
    await db.flush()
    return submission


@router.get("", response_model=list[SubmissionResponse])
async def list_submissions(
    trial_id: str,
    phase: TrialPhase | None = None,
    group_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Submission).where(Submission.trial_session_id == trial_id)
    if phase:
        query = query.where(Submission.phase == phase)
    if group_id:
        query = query.where(Submission.group_id == group_id)
    query = query.order_by(Submission.submitted_at)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    trial_id: str,
    submission_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Submission).where(Submission.id == submission_id, Submission.trial_session_id == trial_id)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise NotFoundError("Submission not found")
    return submission
