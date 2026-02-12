import json
import os

from app.models import LoginRequest, LoginResponse
from fastapi import APIRouter, HTTPException

router = APIRouter()

TEAMS_FILE = "app/data/teams.json"
ADMIN_WHITELIST_FILE = "app/data/admin_whitelist.json"
VOLUNTEER_WHITELIST_FILE = "app/data/volunteer_whitelist.json"
DEVICES_FILE = "app/data/devices.json"
GAME_STATE_FILE = "app/data/game_state.json"


def load_admin_whitelist():
    """Load admin whitelist from file (legacy support)"""
    if os.path.exists(ADMIN_WHITELIST_FILE):
        with open(ADMIN_WHITELIST_FILE, "r") as f:
            data = json.load(f)
            return [name.lower() for name in data.get("admins", [])]
    return []


def load_volunteer_whitelist():
    """Load volunteer whitelist from file (legacy support)"""
    if os.path.exists(VOLUNTEER_WHITELIST_FILE):
        with open(VOLUNTEER_WHITELIST_FILE, "r") as f:
            data = json.load(f)
            return [name.lower() for name in data.get("volunteers", [])]
    return []


def _load_game_state_json():
    if os.path.exists(GAME_STATE_FILE):
        with open(GAME_STATE_FILE, "r") as f:
            return json.load(f)
    return {}


def _save_devices(devices_data: dict):
    os.makedirs(os.path.dirname(DEVICES_FILE), exist_ok=True)
    with open(DEVICES_FILE, "w") as f:
        json.dump(devices_data, f, indent=2)


def _load_devices():
    if os.path.exists(DEVICES_FILE):
        with open(DEVICES_FILE, "r") as f:
            return json.load(f)
    return {}


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Handle login flows:

    - Admin/Volunteer: provide `name` and `pin` with `is_admin=True`.
    - Attendee: provide `team_name` and `device_id`.
    """

    # Admin / Volunteer login (PIN-based)
    if request.is_admin:
        if not request.name or not request.pin:
            raise HTTPException(status_code=400, detail="Name and PIN required")

        name = request.name.strip()

        gs = _load_game_state_json()
        admin_users = {k.lower(): v for k, v in gs.get("admin_users", {}).items()}
        volunteer_users = {
            k.lower(): v for k, v in gs.get("volunteer_users", {}).items()
        }

        # Check admin users
        if name.lower() in admin_users:
            stored_pin = str(admin_users[name.lower()].get("pin", ""))
            if str(request.pin) == stored_pin:
                return LoginResponse(
                    success=True,
                    name=name,
                    team=None,
                    is_admin=True,
                    is_volunteer=False,
                    message="Admin login successful",
                )
            else:
                raise HTTPException(status_code=403, detail="Invalid PIN")

        # Check volunteer users
        if name.lower() in volunteer_users:
            stored_pin = str(volunteer_users[name.lower()].get("pin", ""))
            if str(request.pin) == stored_pin:
                return LoginResponse(
                    success=True,
                    name=name,
                    team=None,
                    is_admin=False,
                    is_volunteer=True,
                    message="Volunteer login successful",
                )
            else:
                raise HTTPException(status_code=403, detail="Invalid PIN")

        # Fallback to whitelist names (legacy without pins)
        admin_whitelist = load_admin_whitelist()
        volunteer_whitelist = load_volunteer_whitelist()

        if name.lower() in admin_whitelist:
            return LoginResponse(
                success=True,
                name=name,
                team=None,
                is_admin=True,
                is_volunteer=False,
                message="Admin login (legacy) successful",
            )
        if name.lower() in volunteer_whitelist:
            return LoginResponse(
                success=True,
                name=name,
                team=None,
                is_admin=False,
                is_volunteer=True,
                message="Volunteer login (legacy) successful",
            )

        raise HTTPException(
            status_code=403,
            detail="You are not authorized to access the admin panel. Contact the organizer.",
        )

    # Attendee login (team-based, device-limited)
    # Require team_name and device_id
    if not request.team_name or not request.device_id:
        raise HTTPException(
            status_code=400, detail="team_name and device_id are required"
        )

    team_name = request.team_name.strip()

    # Check if teams file exists
    if not os.path.exists(TEAMS_FILE):
        raise HTTPException(
            status_code=400, detail="Teams not yet allocated. Please contact admin."
        )

    # Validate that team exists
    with open(TEAMS_FILE, "r") as f:
        teams = json.load(f)

    if team_name not in teams:
        raise HTTPException(status_code=404, detail="Team not found. Check team name.")

    # Load devices
    devices = _load_devices()
    team_devices = devices.get(team_name, [])

    # If device already registered, allow login
    if request.device_id in team_devices:
        return LoginResponse(
            success=True,
            name="",
            team=team_name,
            is_admin=False,
            is_volunteer=False,
            message=f"Device recognized for {team_name}",
        )

    # Enforce max 3 devices per team
    if len(team_devices) >= 3:
        raise HTTPException(
            status_code=403, detail="Maximum devices reached for this team"
        )

    # Register new device
    team_devices.append(request.device_id)
    devices[team_name] = team_devices
    _save_devices(devices)

    return LoginResponse(
        success=True,
        name="",
        team=team_name,
        is_admin=False,
        is_volunteer=False,
        message=f"Welcome to {team_name}! Device registered.",
    )


@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Marvel Clue Hunt API"}
