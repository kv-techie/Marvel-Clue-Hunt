import json
import os
from datetime import datetime

from app.config import settings
from app.models import (
    BonusRequest,
    GameState,
    PointAdjustment,
    PointsAdjustmentRequest,
    Team,
)
from app.scoring import (
    calculate_final_score,
    calculate_total_deductions,
    check_auto_disqualification,
    get_leaderboard,
)
from app.team_allocator import allocate_teams_from_files as allocate_teams
from app.timer_manager import timer_manager
from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter()

TEAMS_FILE = "app/data/teams.json"
ATTENDANCE_FILE = "app/data/attendance.csv"
GAME_STATE_FILE = "app/data/game_state.json"
ADMIN_WHITELIST_FILE = "app/data/admin_whitelist.json"
VOLUNTEER_WHITELIST_FILE = "app/data/volunteer_whitelist.json"

# In-memory game state
game_state: GameState = GameState()


def load_game_state():
    """Load game state from file"""
    global game_state
    if os.path.exists(GAME_STATE_FILE):
        with open(GAME_STATE_FILE, "r") as f:
            data = json.load(f)
            game_state = GameState(**data)
            # Restore in-memory timers from persisted state (if present)
            try:
                from app.timer_manager import timer_manager

                timer_manager.restore_from_game_state(data)
            except Exception:
                pass


def save_game_state():
    """Save game state to file"""
    os.makedirs(os.path.dirname(GAME_STATE_FILE), exist_ok=True)
    with open(GAME_STATE_FILE, "w") as f:
        json.dump(game_state.dict(), f, default=str, indent=2)


def load_admin_whitelist():
    """Load admin whitelist from file"""
    if os.path.exists(ADMIN_WHITELIST_FILE):
        with open(ADMIN_WHITELIST_FILE, "r") as f:
            return json.load(f).get("admins", [])
    return []


def save_admin_whitelist(admins: list):
    """Save admin whitelist to file"""
    os.makedirs(os.path.dirname(ADMIN_WHITELIST_FILE), exist_ok=True)
    with open(ADMIN_WHITELIST_FILE, "w") as f:
        json.dump({"admins": admins}, f, indent=2)


def load_volunteer_whitelist():
    """Load volunteer whitelist from file"""
    if os.path.exists(VOLUNTEER_WHITELIST_FILE):
        with open(VOLUNTEER_WHITELIST_FILE, "r") as f:
            return json.load(f).get("volunteers", [])
    return []


def save_volunteer_whitelist(volunteers: list):
    """Save volunteer whitelist to file"""
    os.makedirs(os.path.dirname(VOLUNTEER_WHITELIST_FILE), exist_ok=True)
    with open(VOLUNTEER_WHITELIST_FILE, "w") as f:
        json.dump({"volunteers": volunteers}, f, indent=2)


@router.post("/upload-attendance")
async def upload_attendance(file: UploadFile = File(...)):
    """Upload attendance CSV and allocate teams"""

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    # Save uploaded file
    os.makedirs(os.path.dirname(ATTENDANCE_FILE), exist_ok=True)

    content = await file.read()
    with open(ATTENDANCE_FILE, "wb") as f:
        f.write(content)

    # Allocate teams
    try:
        teams = allocate_teams(ATTENDANCE_FILE, TEAMS_FILE)

        # Initialize game state with teams
        game_state.teams = {
            name: Team(name=name, members=members) for name, members in teams.items()
        }
        save_game_state()

        return {
            "message": "Teams allocated successfully",
            "teams": teams,
            "total_teams": len(teams),
            "total_attendees": sum(len(members) for members in teams.values()),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/teams")
async def get_all_teams():
    """Get all teams with their current status"""

    if not game_state.teams:
        raise HTTPException(status_code=404, detail="No teams allocated yet")

    teams_with_status = {}
    for team_name, team in game_state.teams.items():
        teams_with_status[team_name] = {
            "members": team.members,
            "hints_used": team.hints_used,
            "dialogues_completed": sum(
                [
                    team.dialogue_1_completed,
                    team.dialogue_2_completed,
                    team.dialogue_3_completed,
                ]
            ),
            "qualified": team.qualified,
            "current_score": calculate_final_score(team),
        }

    return teams_with_status


@router.post("/set-start-time")
async def set_start_time(start_time: str):
    """Set global game start time (ISO format)"""

    try:
        dt = datetime.fromisoformat(start_time)
        timer_manager.set_global_start_time(dt)
        game_state.global_start_time = dt
        save_game_state()

        return {"message": "Start time set successfully", "start_time": dt.isoformat()}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format")


@router.post("/start-game")
async def start_game():
    """Start the game immediately"""

    now = datetime.now()
    timer_manager.set_global_start_time(now)
    game_state.global_start_time = now
    game_state.game_active = True
    save_game_state()

    return {"message": "Game started", "start_time": now.isoformat()}


@router.post("/stop-game")
async def stop_game():
    """Stop the game"""

    game_state.game_active = False
    save_game_state()

    return {"message": "Game stopped", "game_active": False}


@router.post("/delete-participant-data")
async def delete_participant_data():
    """Delete all participant data and reset game state after game ends"""

    if game_state.game_active:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete data while game is active. Stop the game first.",
        )

    # Reset game state
    game_state.teams = {}
    game_state.global_start_time = None
    game_state.game_active = False
    save_game_state()

    # Delete/reset data files
    attendance_file = ATTENDANCE_FILE
    if os.path.exists(attendance_file):
        os.remove(attendance_file)

    return {
        "message": "All participant data has been deleted successfully",
        "teams_cleared": True,
        "game_state_reset": True,
    }


@router.get("/leaderboard")
async def get_admin_leaderboard():
    """Get full leaderboard with all team details"""

    if not game_state.teams:
        raise HTTPException(status_code=404, detail="No teams found")

    leaderboard = get_leaderboard(game_state.teams)

    return {"leaderboard": leaderboard, "game_active": timer_manager.is_game_active()}


@router.post("/award-enactment-bonus/{team_name}")
async def award_enactment_bonus(team_name: str, request: BonusRequest):
    """Award enactment bonus to a team"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    team = game_state.teams[team_name]
    bonus_amount = request.bonus_amount

    if bonus_amount <= 0:
        raise HTTPException(
            status_code=400, detail="bonus_amount must be a positive integer"
        )

    team.enactment_bonus_awarded = True
    team.enactment_bonus_amount = bonus_amount
    save_game_state()

    return {
        "message": f"Enactment bonus of {bonus_amount} awarded to {team_name}",
        "new_score": calculate_final_score(team),
    }


@router.get("/game-status")
async def get_game_status():
    """Get overall game status"""

    return {
        "game_active": timer_manager.is_game_active(),
        "global_start_time": game_state.global_start_time.isoformat()
        if game_state.global_start_time
        else None,
        "total_teams": len(game_state.teams),
        "teams_active": len([t for t in game_state.teams.values() if t.timer_started]),
    }


@router.get("/admins")
async def get_admin_list():
    """Get list of authorized admins"""
    admins = load_admin_whitelist()
    return {"admins": admins}


@router.post("/set-pin/{role}/{name}")
async def set_pin(role: str, name: str, pin: str):
    """Set PIN for an admin or volunteer. role should be 'admin' or 'volunteer'."""

    role = role.strip().lower()
    name = name.strip()

    if role not in ["admin", "volunteer"]:
        raise HTTPException(
            status_code=400, detail="Role must be 'admin' or 'volunteer'"
        )

    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    # Load ENTIRE game state file
    if os.path.exists(GAME_STATE_FILE):
        with open(GAME_STATE_FILE, "r") as f:
            gs = json.load(f)
    else:
        # Initialize with proper structure if file doesn't exist
        gs = {
            "teams": {},
            "admin_users": {},
            "volunteer_users": {},
            "global_start_time": None,
            "game_active": False,
        }

    # Ensure all keys exist to prevent data loss
    if "admin_users" not in gs:
        gs["admin_users"] = {}
    if "volunteer_users" not in gs:
        gs["volunteer_users"] = {}
    if "teams" not in gs:
        gs["teams"] = {}

    key = "admin_users" if role == "admin" else "volunteer_users"
    users = gs.get(key, {})

    # Check if user exists (updating) or new (creating)
    user_key = name.lower()
    existing_user = users.get(user_key, {})

    # Update or create user - preserve created_at if updating
    users[user_key] = {
        "username": name,
        "pin": str(pin),
        "role": role,
        "created_at": existing_user.get("created_at", datetime.now().isoformat()),
        "updated_at": datetime.now().isoformat(),
    }

    gs[key] = users

    # Save ENTIRE state back (preserving teams and all other data)
    os.makedirs(os.path.dirname(GAME_STATE_FILE), exist_ok=True)
    with open(GAME_STATE_FILE, "w") as f:
        json.dump(gs, f, indent=2)

    action = "updated" if existing_user else "created"
    return {"message": f"PIN {action} for {name} ({role})"}


@router.get("/pins")
async def list_pins():
    """List admin and volunteer users with PINs (from game_state.json)"""
    if os.path.exists(GAME_STATE_FILE):
        with open(GAME_STATE_FILE, "r") as f:
            gs = json.load(f)
    else:
        gs = {}

    admin_users = gs.get("admin_users", {})
    volunteer_users = gs.get("volunteer_users", {})

    # normalize to readable lists
    admins = [v for k, v in admin_users.items()]
    volunteers = [v for k, v in volunteer_users.items()]

    return {"admin_users": admins, "volunteer_users": volunteers}


@router.delete("/pin/{role}/{name}")
async def delete_pin(role: str, name: str):
    """Remove PIN entry for admin or volunteer from game_state.json"""
    role = role.strip().lower()
    name = name.strip()

    if role not in ["admin", "volunteer"]:
        raise HTTPException(
            status_code=400, detail="Role must be 'admin' or 'volunteer'"
        )

    if os.path.exists(GAME_STATE_FILE):
        with open(GAME_STATE_FILE, "r") as f:
            gs = json.load(f)
    else:
        gs = {}

    key = "admin_users" if role == "admin" else "volunteer_users"
    users = gs.get(key, {})

    removed = False
    lookup = name.lower()
    if lookup in users:
        users.pop(lookup)
        removed = True

    gs[key] = users

    # Save ENTIRE state back (preserving teams and other data)
    os.makedirs(os.path.dirname(GAME_STATE_FILE), exist_ok=True)
    with open(GAME_STATE_FILE, "w") as f:
        json.dump(gs, f, indent=2)

    if not removed:
        raise HTTPException(status_code=404, detail=f"{name} not found in {role} users")

    return {"message": f"Removed {name} from {role} users"}


@router.get("/devices/{team_name}")
async def list_devices(team_name: str):
    """List registered device IDs for a team"""
    DEVICES_FILE = "app/data/devices.json"
    if os.path.exists(DEVICES_FILE):
        with open(DEVICES_FILE, "r") as f:
            devices = json.load(f)
    else:
        devices = {}

    team_devices = devices.get(team_name, [])
    return {"team": team_name, "devices": team_devices}


@router.delete("/devices/{team_name}/{device_id}")
async def remove_device(team_name: str, device_id: str):
    """Remove a specific device id from a team's registered devices"""
    DEVICES_FILE = "app/data/devices.json"
    if os.path.exists(DEVICES_FILE):
        with open(DEVICES_FILE, "r") as f:
            devices = json.load(f)
    else:
        devices = {}

    team_devices = devices.get(team_name, [])
    if device_id not in team_devices:
        raise HTTPException(status_code=404, detail="Device not found for team")

    team_devices = [d for d in team_devices if d != device_id]
    devices[team_name] = team_devices

    os.makedirs(os.path.dirname(DEVICES_FILE), exist_ok=True)
    with open(DEVICES_FILE, "w") as f:
        json.dump(devices, f, indent=2)

    return {"message": f"Device removed from {team_name}", "devices": team_devices}


@router.post("/admins/{name}")
async def add_admin(name: str):
    """Add a new admin to the whitelist"""
    name = name.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    admins = load_admin_whitelist()

    # Check if already exists (case-insensitive)
    if any(admin.lower() == name.lower() for admin in admins):
        raise HTTPException(status_code=400, detail=f"{name} is already an admin")

    admins.append(name)
    save_admin_whitelist(admins)

    return {"message": f"{name} has been added as admin", "admins": admins}


@router.delete("/admins/{name}")
async def remove_admin(name: str):
    """Remove an admin from the whitelist"""
    name = name.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    admins = load_admin_whitelist()

    # Find and remove (case-insensitive)
    original_admins = admins
    admins = [admin for admin in admins if admin.lower() != name.lower()]

    if len(admins) == len(original_admins):
        raise HTTPException(status_code=404, detail=f"{name} is not an admin")

    save_admin_whitelist(admins)

    return {"message": f"{name} has been removed from admins", "admins": admins}


@router.post("/adjust-points/{team_name}")
async def adjust_points(
    team_name: str, adjusted_by: str, request: PointsAdjustmentRequest
):
    """Adjust points for a team with reason and auditing"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    if request.adjustment_type not in ["reward", "deduct"]:
        raise HTTPException(
            status_code=400, detail='adjustment_type must be "reward" or "deduct"'
        )

    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    if not request.reason.strip():
        raise HTTPException(status_code=400, detail="Reason is required")

    team = game_state.teams[team_name]

    # Create adjustment record
    adjustment = PointAdjustment(
        timestamp=datetime.now(),
        adjusted_by=adjusted_by,
        amount=request.amount,
        reason=request.reason.strip(),
        adjustment_type=request.adjustment_type,
    )

    team.manual_adjustments.append(adjustment)

    # Check if team should be auto-disqualified
    if not team.disqualified and check_auto_disqualification(team):
        team.disqualified = True
        team.disqualification_reason = f"Automatic: Total deductions ({calculate_total_deductions(team)}) exceed threshold ({settings.disqualification_deduction_threshold})"
        team.disqualification_timestamp = datetime.now()

    save_game_state()

    return {
        "message": f"{request.adjustment_type.capitalize()} of {request.amount} points applied to {team_name}",
        "new_score": calculate_final_score(team),
        "auto_disqualified": team.disqualified
        and team.disqualification_reason
        and "Automatic" in team.disqualification_reason,
        "disqualification_reason": team.disqualification_reason
        if team.disqualified
        else None,
        "adjustment": {
            "adjusted_by": adjusted_by,
            "amount": request.amount,
            "reason": request.reason,
            "adjustment_type": request.adjustment_type,
            "timestamp": adjustment.timestamp.isoformat(),
        },
    }


@router.get("/adjustments-log")
async def get_adjustments_log():
    """Get audit log of all points adjustments"""

    adjustments_log = []

    for team_name, team in game_state.teams.items():
        for adjustment in team.manual_adjustments:
            adjustments_log.append(
                {
                    "team_name": team_name,
                    "adjusted_by": adjustment.adjusted_by,
                    "amount": adjustment.amount,
                    "reason": adjustment.reason,
                    "adjustment_type": adjustment.adjustment_type,
                    "timestamp": adjustment.timestamp.isoformat(),
                }
            )

    # Sort by timestamp descending (latest first)
    adjustments_log.sort(key=lambda x: x["timestamp"], reverse=True)

    return {"adjustments": adjustments_log, "total": len(adjustments_log)}


@router.get("/volunteers")
async def get_volunteer_list():
    """Get list of authorized volunteers"""
    volunteers = load_volunteer_whitelist()
    return {"volunteers": volunteers}


@router.post("/volunteers/{name}")
async def add_volunteer(name: str):
    """Add a new volunteer to the whitelist"""
    name = name.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    volunteers = load_volunteer_whitelist()

    # Check if already exists (case-insensitive)
    if any(vol.lower() == name.lower() for vol in volunteers):
        raise HTTPException(status_code=400, detail=f"{name} is already a volunteer")

    # Make sure they're not an admin
    admins = load_admin_whitelist()
    if any(admin.lower() == name.lower() for admin in admins):
        raise HTTPException(status_code=400, detail=f"{name} is already an admin")

    volunteers.append(name)
    save_volunteer_whitelist(volunteers)

    return {"message": f"{name} has been added as volunteer", "volunteers": volunteers}


@router.delete("/volunteers/{name}")
async def remove_volunteer(name: str):
    """Remove a volunteer from the whitelist"""
    name = name.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    volunteers = load_volunteer_whitelist()

    # Find and remove (case-insensitive)
    original_volunteers = volunteers
    volunteers = [vol for vol in volunteers if vol.lower() != name.lower()]

    if len(volunteers) == len(original_volunteers):
        raise HTTPException(status_code=404, detail=f"{name} is not a volunteer")

    save_volunteer_whitelist(volunteers)

    return {
        "message": f"{name} has been removed from volunteers",
        "volunteers": volunteers,
    }


@router.get("/disqualification-candidates")
async def get_disqualification_candidates():
    """Get list of teams eligible for auto-disqualification based on deductions"""
    from app.scoring import calculate_total_deductions, check_auto_disqualification

    if not game_state.teams:
        raise HTTPException(status_code=404, detail="No teams found")

    candidates = []
    for team_name, team in game_state.teams.items():
        if check_auto_disqualification(team) and not team.disqualified:
            candidates.append(
                {
                    "team_name": team_name,
                    "members": team.members,
                    "total_deductions": calculate_total_deductions(team),
                    "threshold": settings.disqualification_deduction_threshold,
                    "reason": f"Total deductions ({calculate_total_deductions(team)}) exceed threshold ({settings.disqualification_deduction_threshold})",
                }
            )

    return {"candidates": candidates, "total": len(candidates)}


@router.post("/confirm-disqualification/{team_name}")
async def confirm_disqualification(team_name: str, confirmed_by: str):
    """Admin confirms disqualification for a team"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    team = game_state.teams[team_name]

    if team.disqualified and team.disqualification_confirmed_by_admin:
        raise HTTPException(
            status_code=400, detail="Team already disqualified and confirmed"
        )

    from app.scoring import calculate_total_deductions

    team.disqualified = True
    team.disqualification_confirmed_by_admin = True
    team.disqualification_timestamp = datetime.now()
    team.disqualification_reason = f"Automatic: Total deductions ({calculate_total_deductions(team)}) exceed threshold ({settings.disqualification_deduction_threshold})"
    save_game_state()

    return {
        "message": f"{team_name} has been disqualified",
        "team_name": team_name,
        "disqualified": True,
        "reason": team.disqualification_reason,
        "confirmed_by": confirmed_by,
        "timestamp": team.disqualification_timestamp.isoformat(),
    }


@router.post("/team-acknowledge-disqualification/{team_name}")
async def team_acknowledge_disqualification(team_name: str):
    """Team acknowledges their disqualification status"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    team = game_state.teams[team_name]

    if not team.disqualified:
        raise HTTPException(status_code=400, detail="Team is not disqualified")

    if team.disqualification_acknowledged_by_team:
        raise HTTPException(
            status_code=400, detail="Team already acknowledged disqualification"
        )

    team.disqualification_acknowledged_by_team = True
    save_game_state()

    return {
        "message": f"{team_name} has acknowledged disqualification",
        "acknowledged": True,
    }


# Load game state on startup
load_game_state()
