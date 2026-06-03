from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import async_session_factory
from app.models.trial_session import TrialSession, PhaseConfig
from app.core.enums import TrialStatus
from app.services.ws_manager import ws_manager


async def auto_advance_phase(trial_session_id: str):
    """Called when a phase timer expires. Advances to next phase or ends trial."""
    async with async_session_factory() as db:
        result = await db.execute(
            select(TrialSession)
            .options(selectinload(TrialSession.phase_configs))
            .where(TrialSession.id == trial_session_id)
        )
        trial = result.scalar_one_or_none()
        if not trial or trial.status != TrialStatus.IN_PROGRESS:
            return

        configs = sorted(trial.phase_configs, key=lambda x: x.order_index)
        current_idx = next(
            (i for i, c in enumerate(configs) if c.phase == trial.current_phase), -1
        )
        if current_idx < 0:
            return

        now = datetime.now(timezone.utc)
        configs[current_idx].is_active = False
        configs[current_idx].ended_at = now

        if current_idx + 1 >= len(configs):
            # Trial is over
            trial.status = TrialStatus.COMPLETED
            trial.current_phase = None
            trial.completed_at = now
            await db.commit()

            await ws_manager.broadcast(trial_session_id, {
                "event": "trial.ended",
                "data": {"trial_id": trial_session_id},
            })
        else:
            # Advance to next phase
            next_config = configs[current_idx + 1]
            trial.current_phase = next_config.phase
            trial.phase_started_at = now
            trial.phase_duration_seconds = next_config.duration_seconds
            next_config.is_active = True
            next_config.started_at = now
            await db.commit()

            await ws_manager.broadcast(trial_session_id, {
                "event": "phase.changed",
                "data": {
                    "phase": next_config.phase,
                    "duration_seconds": next_config.duration_seconds,
                    "started_at": now.isoformat(),
                },
            })

            # Start timer for the new phase
            ws_manager.start_phase_timer(
                trial_session_id, next_config.phase, next_config.duration_seconds
            )


# Register the callback
ws_manager.set_phase_ended_callback(auto_advance_phase)
