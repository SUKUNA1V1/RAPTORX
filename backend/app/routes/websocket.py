"""
WebSocket Routes
Real-time communication endpoints for alerts, access events, and system notifications
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException
from sqlalchemy.orm import Session
import logging

from app.database import get_db
from app.middleware.auth import get_current_user_ws, get_current_user
from app.websocket_manager import manager
from app.models import User

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    WebSocket endpoint for real-time updates.
    Authenticates user and manages connection for broadcasting events.
    """
    user_id: int | None = None
    user_role: str | None = None

    try:
        # Get auth token from query parameters or headers
        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(code=4001, reason="Missing authentication token")
            return

        # Authenticate user
        try:
            user = await get_current_user_ws(token, db)
            if not user:
                await websocket.close(code=4003, reason="Invalid token")
                return

            user_id = user.id
            user_role = user.role
        except Exception as e:
            logger.error(f"WebSocket authentication failed: {e}")
            await websocket.close(code=4003, reason="Authentication failed")
            return

        # Accept connection
        await manager.connect(websocket, user_id=user_id, role=user_role)
        logger.info(f"User {user_id} ({user_role}) connected to WebSocket")

        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": f"Connected as {user.username}",
            "user_id": user_id,
            "role": user_role,
        })

        # Keep connection open and handle incoming messages
        while True:
            data = await websocket.receive_json()

            # Handle subscription requests
            if data.get("action") == "subscribe":
                message_type = data.get("type")
                if message_type:
                    await manager.subscribe_to_type(websocket, message_type)
                    logger.info(f"User {user_id} subscribed to {message_type}")

            # Handle unsubscription requests
            elif data.get("action") == "unsubscribe":
                message_type = data.get("type")
                if message_type:
                    await manager.unsubscribe_from_type(websocket, message_type)
                    logger.info(f"User {user_id} unsubscribed from {message_type}")

            # Handle ping/pong for keep-alive
            elif data.get("action") == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id=user_id, role=user_role)
        if user_id:
            logger.info(f"User {user_id} disconnected from WebSocket")

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            manager.disconnect(websocket, user_id=user_id, role=user_role)
        except:
            pass


@router.post("/ws/broadcast-alert")
async def broadcast_alert(
    title: str,
    description: str,
    severity: str = "medium",
    current_user: User = Depends(get_current_user)
):
    """
    Broadcast an alert to all connected clients.
    Requires admin or security role.
    """
    if current_user.role not in ["admin", "security"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    await manager.broadcast_event("alert", {
        "title": title,
        "description": description,
        "severity": severity,
        "triggered_by": current_user.username,
    })

    return {"status": "broadcasted", "recipients": manager.get_connection_count()}


@router.get("/ws/status")
async def websocket_status(current_user: User = Depends(get_current_user)):
    """
    Get WebSocket connection statistics.
    Requires admin role.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return {
        "total_connections": manager.get_connection_count(),
        "user_connections": {
            user_id: manager.get_user_connection_count(user_id)
            for user_id in list(manager.user_connections.keys())
        },
        "subscriptions": {
            msg_type: len(connections)
            for msg_type, connections in manager.subscriptions.items()
        },
    }


# Import at the end to avoid circular imports
from fastapi import HTTPException
from app.middleware.auth import get_current_user
