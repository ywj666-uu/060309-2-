from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.notification import TrialReport
from app.models.trial_session import TrialSession
from app.models.group import Group, GroupMember
from app.models.submission import Submission
from app.models.score import Score, SubmissionScore
from app.models.case import Case
from app.models.user import User
from app.schemas.report import ReportResponse
from app.dependencies import get_current_user
from app.core.enums import UserRole, TrialWinner
from app.core.permissions import require_role
from app.core.exceptions import NotFoundError

router = APIRouter(prefix="/api/trials/{trial_id}/report", tags=["reports"])


@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    trial_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.JUDGE)),
):
    trial_result = await db.execute(
        select(TrialSession).options(selectinload(TrialSession.phase_configs)).where(TrialSession.id == trial_id)
    )
    trial = trial_result.scalar_one_or_none()
    if not trial:
        raise NotFoundError("Trial not found")

    case_result = await db.execute(select(Case).where(Case.id == trial.case_id))
    case = case_result.scalar_one_or_none()

    groups_result = await db.execute(
        select(Group).options(selectinload(Group.members)).where(Group.trial_session_id == trial_id)
    )
    groups = groups_result.scalars().all()

    submissions_result = await db.execute(
        select(Submission).where(Submission.trial_session_id == trial_id).order_by(Submission.submitted_at)
    )
    submissions = submissions_result.scalars().all()

    sub_scores_result = await db.execute(
        select(SubmissionScore).where(SubmissionScore.trial_session_id == trial_id)
    )
    sub_scores = sub_scores_result.scalars().all()

    # Build phase weight map from trial config
    phase_weights: dict[str, float] = {}
    for pc in trial.phase_configs:
        phase_weights[pc.phase] = pc.weight

    # Build score map: submission_id -> score
    score_map: dict[str, int] = {}
    score_detail_map: dict[str, dict] = {}
    for ss in sub_scores:
        score_map[ss.submission_id] = ss.score
        score_detail_map[ss.submission_id] = {
            "score": ss.score,
            "comments": ss.comments,
        }

    # Calculate per-phase averages for each group
    phase_averages: dict[str, dict[str, float]] = {}
    for group in groups:
        phase_averages[group.id] = {}
        group_subs = [s for s in submissions if s.group_id == group.id]

        phases_data: dict[str, list[int]] = {}
        for sub in group_subs:
            if sub.id in score_map:
                phases_data.setdefault(sub.phase, []).append(score_map[sub.id])

        for phase, scores_list in phases_data.items():
            phase_averages[group.id][phase] = round(sum(scores_list) / len(scores_list), 2)

    # Total = weighted sum of phase averages
    plaintiff_total = 0.0
    defendant_total = 0.0
    for group in groups:
        weighted_total = 0.0
        for phase, avg in phase_averages.get(group.id, {}).items():
            weight = phase_weights.get(phase, 1.0)
            weighted_total += avg * weight
        if group.side == "plaintiff":
            plaintiff_total += weighted_total
        else:
            defendant_total += weighted_total

    if plaintiff_total > defendant_total:
        winner = TrialWinner.PLAINTIFF
    elif defendant_total > plaintiff_total:
        winner = TrialWinner.DEFENDANT
    else:
        winner = TrialWinner.DRAW

    trial.winner = winner
    await db.flush()

    report_content = {
        "trial": {
            "id": trial.id,
            "title": trial.title,
            "status": trial.status,
            "started_at": trial.started_at.isoformat() if trial.started_at else None,
            "completed_at": trial.completed_at.isoformat() if trial.completed_at else None,
        },
        "case": {
            "title": case.title,
            "description": case.description,
            "background_facts": case.background_facts,
            "relevant_laws": case.relevant_laws,
        } if case else None,
        "groups": [
            {
                "id": g.id,
                "name": g.name,
                "side": g.side,
                "members": [{"user_id": m.user_id, "role": m.role_in_group} for m in g.members],
                "phase_averages": phase_averages.get(g.id, {}),
                "total_score": round(
                    sum(avg * phase_weights.get(phase, 1.0) for phase, avg in phase_averages.get(g.id, {}).items()), 2
                ),
            }
            for g in groups
        ],
        "submissions": [
            {
                "id": s.id,
                "phase": s.phase,
                "type": s.submission_type,
                "title": s.title,
                "content": s.content,
                "group_id": s.group_id,
                "user_id": s.user_id,
                "submitted_at": s.submitted_at.isoformat(),
                "score": score_detail_map.get(s.id, {}).get("score"),
                "score_comments": score_detail_map.get(s.id, {}).get("comments"),
            }
            for s in submissions
        ],
        "result": {
            "plaintiff_total": round(plaintiff_total, 2),
            "defendant_total": round(defendant_total, 2),
            "winner": winner,
            "phase_weights": phase_weights,
            "scoring_method": "各步骤加权平均分之和",
        },
    }

    existing = await db.execute(select(TrialReport).where(TrialReport.trial_session_id == trial_id))
    report = existing.scalar_one_or_none()
    if report:
        report.report_content = report_content
        report.generated_at = datetime.now(timezone.utc)
    else:
        report = TrialReport(
            trial_session_id=trial_id,
            report_content=report_content,
        )
        db.add(report)

    await db.flush()
    return report


@router.get("", response_model=ReportResponse)
async def get_report(
    trial_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(TrialReport).where(TrialReport.trial_session_id == trial_id))
    report = result.scalar_one_or_none()
    if not report:
        raise NotFoundError("Report not generated yet")
    return report
