import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.websocket_manager import manager

from app.routes import admin, attendee, common

app = FastAPI(title="Marvel Clue Hunt API", version="1.0.0")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault(
            "Referrer-Policy", "strict-origin-when-cross-origin"
        )
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=()",
        )
        return response


# CORS configuration
# Allow specific origins from environment, fallback to localhost for development
env_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
origins = [
    "http://localhost:3000",
    "http://localhost:7080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:7080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if env_origins:
    origins.extend([o.strip() for o in env_origins if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.onrender\.com|https://.*", # Automagically allow deployed render frontends
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)

# Include routers
app.include_router(common.router, prefix="/api", tags=["common"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(attendee.router, prefix="/api/attendee", tags=["attendee"])


@app.get("/")
async def root():
    return {"message": "Marvel Clue Hunt API", "status": "active"}

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    role: str = Query(...),
    team_id: str = Query(None),
    token: str = Query(...)
):
    if not token:
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, role, team_id)
    try:
        while True:
            data = await websocket.receive_json()
    except WebSocketDisconnect:
        manager.disconnect(websocket, role, team_id)


if __name__ == "__main__":
    import uvicorn

    # Support Render's dynamic port assignment
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
