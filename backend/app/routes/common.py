from fastapi import APIRouter, HTTPException
from app.models import LoginRequest, LoginResponse
from app.team_allocator import get_team_for_attendee
import os

router = APIRouter()

TEAMS_FILE = "app/data/teams.json"
ADMIN_NAMES = ["admin", "volunteer"]  # Simple admin check

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Handle name-based login for both attendees and admins"""
    
    name = request.name.strip()
    
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    
    # Check if admin/volunteer
    if name.lower() in ADMIN_NAMES or request.is_admin:
        return LoginResponse(
            success=True,
            name=name,
            team=None,
            is_admin=True,
            message="Admin login successful"
        )
    
    # Check if teams file exists
    if not os.path.exists(TEAMS_FILE):
        raise HTTPException(
            status_code=400,
            detail="Teams not yet allocated. Please contact admin."
        )
    
    # Find team for attendee
    team = get_team_for_attendee(name, TEAMS_FILE)
    
    if not team:
        raise HTTPException(
            status_code=404,
            detail="Name not found in attendance list. Please contact admin."
        )
    
    return LoginResponse(
        success=True,
        name=name,
        team=team,
        is_admin=False,
        message=f"Welcome to {team}!"
    )

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Marvel Clue Hunt API"}