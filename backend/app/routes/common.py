import json
import os

from app.models import LoginRequest, LoginResponse
from app.team_allocator import get_team_for_attendee
from fastapi import APIRouter, HTTPException

router = APIRouter()

TEAMS_FILE = "app/data/teams.json"
ADMIN_WHITELIST_FILE = "app/data/admin_whitelist.json"
VOLUNTEER_WHITELIST_FILE = "app/data/volunteer_whitelist.json"


def load_admin_whitelist():
    """Load admin whitelist from file"""
    if os.path.exists(ADMIN_WHITELIST_FILE):
        with open(ADMIN_WHITELIST_FILE, "r") as f:
            data = json.load(f)
            return [name.lower() for name in data.get("admins", [])]
    return []


def load_volunteer_whitelist():
    """Load volunteer whitelist from file"""
    if os.path.exists(VOLUNTEER_WHITELIST_FILE):
        with open(VOLUNTEER_WHITELIST_FILE, "r") as f:
            data = json.load(f)
            return [name.lower() for name in data.get("volunteers", [])]
    return []


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Handle name-based login for attendees, volunteers, and admins"""

    name = request.name.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    # Load whitelists
    admin_whitelist = load_admin_whitelist()
    volunteer_whitelist = load_volunteer_whitelist()

    # Check if admin or volunteer login by checking whitelists
    if request.is_admin:
        if name.lower() in admin_whitelist:
            return LoginResponse(
                success=True,
                name=name,
                team=None,
                is_admin=True,
                is_volunteer=False,
                message="Admin login successful",
            )
        elif name.lower() in volunteer_whitelist:
            return LoginResponse(
                success=True,
                name=name,
                team=None,
                is_admin=False,
                is_volunteer=True,
                message="Volunteer login successful",
            )
        else:
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to access the admin panel. Contact the organizer.",
            )

    # Check if teams file exists
    if not os.path.exists(TEAMS_FILE):
        raise HTTPException(
            status_code=400, detail="Teams not yet allocated. Please contact admin."
        )

    # Find team for attendee
    team = get_team_for_attendee(name, TEAMS_FILE)

    if not team:
        raise HTTPException(
            status_code=404,
            detail="Name not found in attendance list. Please contact admin.",
        )

    return LoginResponse(
        success=True,
        name=name,
        team=team,
        is_admin=False,
        is_volunteer=False,
        message=f"Welcome to {team}!",
    )


@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Marvel Clue Hunt API"}
