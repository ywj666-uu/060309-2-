import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.group import Group, GroupMember
from app.models.user import User
from app.schemas.group import GroupCreate, GroupMemberAdd, DrawLotsRequest, GroupResponse, GroupMemberResponse
from app.dependencies import get_current_user
from app.core.enums import UserRole, GroupSide
from app.core.permissions import require_role
from app.core.exceptions import NotFoundError, BadRequestError

router = APIRouter(prefix="/api/trials/{trial_id}/groups", tags=["groups"])


@router.post("", response_model=GroupResponse)
async def create_group(
    trial_id: str,
    data: GroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    existing = await db.execute(
        select(Group).where(Group.trial_session_id == trial_id, Group.side == data.side)
    )
    if existing.scalar_one_or_none():
        raise BadRequestError(f"A {data.side.value} group already exists for this trial")

    group = Group(
        trial_session_id=trial_id,
        name=data.name,
        side=data.side,
    )
    db.add(group)
    await db.flush()
    await db.refresh(group, ["members"])
    return group


@router.post("/draw-lots", response_model=list[GroupResponse])
async def draw_lots(
    trial_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    # Delete existing groups for this trial (allows re-draw each click)
    existing = await db.execute(
        select(Group).where(Group.trial_session_id == trial_id)
    )
    for g in existing.scalars().all():
        await db.delete(g)
    await db.flush()

    # Pull all students, prioritize those with fewer draw_count
    students_result = await db.execute(
        select(User).where(User.role == UserRole.STUDENT).order_by(User.draw_count.asc())
    )
    students = list(students_result.scalars().all())
    if len(students) < 2:
        raise BadRequestError("至少需要2名学生才能抽签分组")

    # Group by draw_count, shuffle within same count for fairness
    from itertools import groupby
    students.sort(key=lambda s: s.draw_count)
    shuffled = []
    for _, group in groupby(students, key=lambda s: s.draw_count):
        batch = list(group)
        random.shuffle(batch)
        shuffled.extend(batch)

    student_ids = [s.id for s in shuffled]

    mid = len(student_ids) // 2
    plaintiff_ids = student_ids[:mid]
    defendant_ids = student_ids[mid:]

    now = datetime.now(timezone.utc)
    plaintiff_group = Group(
        trial_session_id=trial_id, name="原告方", side=GroupSide.PLAINTIFF, drawn_at=now
    )
    defendant_group = Group(
        trial_session_id=trial_id, name="被告方", side=GroupSide.DEFENDANT, drawn_at=now
    )
    db.add(plaintiff_group)
    db.add(defendant_group)
    await db.flush()

    for uid in plaintiff_ids:
        db.add(GroupMember(group_id=plaintiff_group.id, user_id=uid))
    for uid in defendant_ids:
        db.add(GroupMember(group_id=defendant_group.id, user_id=uid))

    # Increment draw_count for all assigned students
    all_assigned_ids = plaintiff_ids + defendant_ids
    for s in students:
        if s.id in all_assigned_ids:
            s.draw_count += 1

    await db.flush()
    await db.refresh(plaintiff_group, ["members"])
    await db.refresh(defendant_group, ["members"])

    return [plaintiff_group, defendant_group]


@router.get("", response_model=list[GroupResponse])
async def list_groups(
    trial_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Group).options(selectinload(Group.members))
        .where(Group.trial_session_id == trial_id)
    )
    return result.scalars().all()


@router.post("/{group_id}/members", response_model=GroupMemberResponse)
async def add_member(
    trial_id: str,
    group_id: str,
    data: GroupMemberAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    result = await db.execute(select(Group).where(Group.id == group_id, Group.trial_session_id == trial_id))
    group = result.scalar_one_or_none()
    if not group:
        raise NotFoundError("Group not found")

    member = GroupMember(
        group_id=group_id,
        user_id=data.user_id,
        role_in_group=data.role_in_group,
    )
    db.add(member)
    await db.flush()
    return member


@router.delete("/{group_id}/members/{user_id}")
async def remove_member(
    trial_id: str,
    group_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    result = await db.execute(
        select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise NotFoundError("Member not found")

    await db.delete(member)
    return {"message": "Member removed"}
