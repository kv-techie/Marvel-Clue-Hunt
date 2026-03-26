from fastapi import WebSocket
from typing import Dict, Set
import json
import asyncio

class ConnectionManager:
    """
    Manages all WebSocket connections, organized by role and team.
    Supports targeted messaging (to a team), role-based messaging
    (to all admins), and global broadcasts (to everyone).
    """

    def __init__(self):
        # All active connections bucketed by role
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "admin": set(),
            "attendee": set(),
            "volunteer": set(),
        }
        # Maps team_id -> set of WebSocket connections for that team
        self.team_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, role: str, team_id: str = None):
        await websocket.accept()
        if role not in self.active_connections:
            self.active_connections[role] = set()
        self.active_connections[role].add(websocket)
        if team_id:
            if team_id not in self.team_connections:
                self.team_connections[team_id] = set()
            self.team_connections[team_id].add(websocket)

    def disconnect(self, websocket: WebSocket, role: str, team_id: str = None):
        if role in self.active_connections:
            self.active_connections[role].discard(websocket)
        if team_id and team_id in self.team_connections:
            self.team_connections[team_id].discard(websocket)

    async def broadcast_global(self, event: str, data: dict):
        """Send to every connected client regardless of role."""
        message = json.dumps({"event": event, "data": data})
        all_connections = set()
        for role_connections in self.active_connections.values():
            all_connections.update(role_connections)
        
        # Fire all sends concurrently, remove dead connections
        dead = []
        for connection in all_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self._purge(d)

    async def send_to_team(self, team_id: str, event: str, data: dict):
        """Send to all members of a specific team."""
        message = json.dumps({"event": event, "data": data})
        if team_id in self.team_connections:
            dead = []
            for connection in self.team_connections[team_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    dead.append(connection)
            for d in dead:
                self._purge(d)

    async def send_to_role(self, role: str, event: str, data: dict):
        """Send to all clients of a given role (e.g., all admins)."""
        message = json.dumps({"event": event, "data": data})
        dead = []
        for connection in self.active_connections.get(role, set()):
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self._purge(d)

    def _purge(self, ws: WebSocket):
        for role_set in self.active_connections.values():
            role_set.discard(ws)
        for team_set in self.team_connections.values():
            team_set.discard(ws)


manager = ConnectionManager()
