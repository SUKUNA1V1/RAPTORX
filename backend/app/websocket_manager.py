"""
WebSocket Connection Manager
Handles broadcasting real-time updates to connected clients
"""

from typing import Set, Dict, Any, Callable
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manage WebSocket connections and broadcast messages"""

    def __init__(self):
        self.active_connections: Set[Any] = set()  # Set of WebSocket connections
        self.user_connections: Dict[int, Set[Any]] = {}  # user_id -> connections
        self.role_connections: Dict[str, Set[Any]] = {}  # role -> connections
        self.subscriptions: Dict[str, Set[Any]] = {}  # message_type -> connections

    async def connect(self, websocket: Any, user_id: int | None = None, role: str | None = None):
        """Add a new connection"""
        await websocket.accept()
        self.active_connections.add(websocket)

        if user_id is not None:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(websocket)

        if role is not None:
            if role not in self.role_connections:
                self.role_connections[role] = set()
            self.role_connections[role].add(websocket)

        logger.info(f"Client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: Any, user_id: int | None = None, role: str | None = None):
        """Remove a connection"""
        if websocket in self.active_connections:
            self.active_connections.discard(websocket)

        if user_id is not None and user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)

        if role is not None and role in self.role_connections:
            self.role_connections[role].discard(websocket)

        # Clean up empty sets
        for connections_set in self.user_connections.values():
            if not connections_set:
                self.user_connections = {k: v for k, v in self.user_connections.items() if v}

        logger.info(f"Client disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast to all connected clients"""
        message["timestamp"] = datetime.utcnow().isoformat()
        data = json.dumps(message)

        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(data)
            except Exception as e:
                logger.error(f"Error sending message: {e}")
                disconnected.add(connection)

        # Clean up disconnected connections
        for conn in disconnected:
            self.active_connections.discard(conn)

    async def broadcast_to_user(self, user_id: int, message: Dict[str, Any]):
        """Broadcast to a specific user's connections"""
        if user_id in self.user_connections:
            message["timestamp"] = datetime.utcnow().isoformat()
            data = json.dumps(message)

            disconnected = set()
            for connection in self.user_connections[user_id]:
                try:
                    await connection.send_text(data)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    disconnected.add(connection)

            # Clean up
            for conn in disconnected:
                self.user_connections[user_id].discard(conn)

    async def broadcast_to_role(self, role: str, message: Dict[str, Any]):
        """Broadcast to users with a specific role"""
        if role in self.role_connections:
            message["timestamp"] = datetime.utcnow().isoformat()
            data = json.dumps(message)

            disconnected = set()
            for connection in self.role_connections[role]:
                try:
                    await connection.send_text(data)
                except Exception as e:
                    logger.error(f"Error sending message to role {role}: {e}")
                    disconnected.add(connection)

            # Clean up
            for conn in disconnected:
                self.role_connections[role].discard(conn)

    async def subscribe_to_type(self, connection: Any, message_type: str):
        """Subscribe connection to a message type"""
        if message_type not in self.subscriptions:
            self.subscriptions[message_type] = set()
        self.subscriptions[message_type].add(connection)

    async def unsubscribe_from_type(self, connection: Any, message_type: str):
        """Unsubscribe connection from a message type"""
        if message_type in self.subscriptions:
            self.subscriptions[message_type].discard(connection)

    async def broadcast_event(self, event_type: str, data: Dict[str, Any]):
        """Broadcast an event to subscribed connections"""
        if event_type in self.subscriptions:
            message = {"type": event_type, "data": data}
            message["timestamp"] = datetime.utcnow().isoformat()
            data_str = json.dumps(message)

            disconnected = set()
            for connection in self.subscriptions[event_type]:
                try:
                    await connection.send_text(data_str)
                except Exception as e:
                    logger.error(f"Error sending event {event_type}: {e}")
                    disconnected.add(connection)

            # Clean up
            for conn in disconnected:
                self.subscriptions[event_type].discard(conn)

    def get_connection_count(self) -> int:
        """Get total number of active connections"""
        return len(self.active_connections)

    def get_user_connection_count(self, user_id: int) -> int:
        """Get number of connections for a specific user"""
        return len(self.user_connections.get(user_id, set()))


# Global connection manager instance
manager = ConnectionManager()
