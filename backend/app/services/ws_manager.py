import asyncio
from datetime import datetime, timezone
from typing import Callable, Awaitable
from fastapi import WebSocket


class WSManager:
    def __init__(self):
        self.rooms: dict[str, dict[str, WebSocket]] = {}
        self.timers: dict[str, asyncio.Task] = {}
        self._on_phase_ended: Callable[[str], Awaitable[None]] | None = None

    def set_phase_ended_callback(self, callback: Callable[[str], Awaitable[None]]):
        self._on_phase_ended = callback

    async def connect(self, room_id: str, user_id: str, websocket: WebSocket):
        if room_id not in self.rooms:
            self.rooms[room_id] = {}
        self.rooms[room_id][user_id] = websocket

    def disconnect(self, room_id: str, user_id: str):
        if room_id in self.rooms:
            self.rooms[room_id].pop(user_id, None)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

    async def broadcast(self, room_id: str, message: dict):
        if room_id not in self.rooms:
            return
        message["timestamp"] = datetime.now(timezone.utc).isoformat()
        disconnected = []
        for user_id, ws in self.rooms[room_id].items():
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(user_id)
        for uid in disconnected:
            self.disconnect(room_id, uid)

    async def send_to_user(self, room_id: str, user_id: str, message: dict):
        if room_id in self.rooms and user_id in self.rooms[room_id]:
            message["timestamp"] = datetime.now(timezone.utc).isoformat()
            try:
                await self.rooms[room_id][user_id].send_json(message)
            except Exception:
                self.disconnect(room_id, user_id)

    def start_phase_timer(self, room_id: str, phase: str, duration_seconds: int):
        if room_id in self.timers:
            self.timers[room_id].cancel()
        self.timers[room_id] = asyncio.create_task(
            self._run_timer(room_id, phase, duration_seconds)
        )

    def stop_timer(self, room_id: str):
        if room_id in self.timers:
            self.timers[room_id].cancel()
            del self.timers[room_id]

    async def _run_timer(self, room_id: str, phase: str, duration_seconds: int):
        remaining = duration_seconds
        try:
            while remaining > 0:
                await self.broadcast(room_id, {
                    "event": "phase.time_update",
                    "data": {"phase": phase, "remaining_seconds": remaining},
                })
                if remaining in (60, 30, 10):
                    await self.broadcast(room_id, {
                        "event": "phase.warning",
                        "data": {"phase": phase, "remaining_seconds": remaining},
                    })
                await asyncio.sleep(1)
                remaining -= 1

            await self.broadcast(room_id, {
                "event": "phase.ended",
                "data": {"phase": phase},
            })

            # Auto-advance: call the callback to move to next phase
            if self._on_phase_ended:
                await self._on_phase_ended(room_id)

        except asyncio.CancelledError:
            pass

    def get_online_users(self, room_id: str) -> list[str]:
        if room_id in self.rooms:
            return list(self.rooms[room_id].keys())
        return []


ws_manager = WSManager()
