import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select

from app.core.security import decode_token
from app.services.ws_manager import ws_manager
from app.database import async_session_factory
from app.models.user import User

router = APIRouter()


@router.websocket("/api/ws/{trial_session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    trial_session_id: str,
    token: str = Query(...),
):
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4001)
        return

    user_id = payload.get("sub")
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            await websocket.close(code=4001)
            return

    await websocket.accept()
    await ws_manager.connect(trial_session_id, user_id, websocket)

    await ws_manager.broadcast(trial_session_id, {
        "event": "user.joined",
        "data": {"user_id": user_id, "full_name": user.full_name, "role": user.role},
    })

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            event = message.get("event")

            if event == "ping":
                await websocket.send_json({"event": "pong", "data": {}})
    except WebSocketDisconnect:
        ws_manager.disconnect(trial_session_id, user_id)
        await ws_manager.broadcast(trial_session_id, {
            "event": "user.left",
            "data": {"user_id": user_id, "full_name": user.full_name},
        })
