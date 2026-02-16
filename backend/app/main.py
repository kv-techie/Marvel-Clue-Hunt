from app.routes import admin, attendee, common
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Marvel Clue Hunt API", version="1.0.0")

# CORS configuration for localhost development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://172.20.249.85:3000",  # Your network IP
        "http://172.20.249.85:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(common.router, prefix="/api", tags=["common"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(attendee.router, prefix="/api/attendee", tags=["attendee"])


@app.get("/")
async def root():
    return {"message": "Marvel Clue Hunt API", "status": "active"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
