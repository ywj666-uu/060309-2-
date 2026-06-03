import os
import uuid
import aiofiles
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.case import Case, CaseAttachment
from app.models.user import User
from app.schemas.case import CaseCreate, CaseUpdate, CaseResponse, CaseListResponse, CaseAttachmentResponse
from app.dependencies import get_current_user
from app.core.enums import UserRole
from app.core.permissions import require_role
from app.core.exceptions import NotFoundError, ForbiddenError
from app.config import settings

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.post("", response_model=CaseResponse)
async def create_case(
    data: CaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    case = Case(
        title=data.title,
        description=data.description,
        background_facts=data.background_facts,
        relevant_laws=data.relevant_laws,
        difficulty_level=data.difficulty_level,
        created_by=current_user.id,
    )
    db.add(case)
    await db.flush()
    await db.refresh(case, ["attachments"])
    return case


@router.get("", response_model=list[CaseListResponse])
async def list_cases(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Case).order_by(Case.created_at.desc()))
    return result.scalars().all()


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Case).options(selectinload(Case.attachments)).where(Case.id == case_id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise NotFoundError("Case not found")
    return case


@router.put("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    data: CaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    result = await db.execute(
        select(Case).options(selectinload(Case.attachments)).where(Case.id == case_id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise NotFoundError("Case not found")
    if case.created_by != current_user.id:
        raise ForbiddenError("Not the owner of this case")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(case, key, value)

    await db.flush()
    return case


@router.delete("/{case_id}")
async def delete_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise NotFoundError("Case not found")
    if case.created_by != current_user.id:
        raise ForbiddenError("Not the owner of this case")

    await db.delete(case)
    return {"message": "Case deleted"}


@router.post("/{case_id}/attachments", response_model=CaseAttachmentResponse)
async def upload_attachment(
    case_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise NotFoundError("Case not found")

    upload_dir = os.path.join(settings.UPLOAD_DIR, "cases", case_id)
    os.makedirs(upload_dir, exist_ok=True)

    file_ext = os.path.splitext(file.filename)[1]
    stored_name = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, stored_name)

    content = await file.read()
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    attachment = CaseAttachment(
        case_id=case_id,
        file_name=file.filename,
        file_path=file_path,
        file_type=file.content_type or "application/octet-stream",
        file_size=len(content),
    )
    db.add(attachment)
    await db.flush()
    return attachment


@router.get("/{case_id}/attachments", response_model=list[CaseAttachmentResponse])
async def list_attachments(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(CaseAttachment).where(CaseAttachment.case_id == case_id))
    return result.scalars().all()
