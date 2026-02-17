import json
import os
import random
from datetime import datetime

from app.config import settings
from app.dialogue_manager import dialogue_manager
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
from app.team_allocator import (
    allocate_teams_from_files as allocate_teams,
)
from app.team_allocator import (
    assign_character_to_team,
    assign_characters_by_matching,
)
from app.timer_manager import timer_manager
from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter()

TEAMS_FILE = "app/data/teams.json"
ATTENDANCE_FILE = "app/data/attendance.csv"
GAME_STATE_FILE = "app/data/game_state.json"
ADMIN_WHITELIST_FILE = "app/data/admin_whitelist.json"
VOLUNTEER_WHITELIST_FILE = "app/data/volunteer_whitelist.json"
ADMIN_CREDENTIALS_FILE = "app/data/admin_credentials.json"
VOLUNTEER_CREDENTIALS_FILE = "app/data/volunteer_credentials.json"

# In-memory game state
game_state: GameState = GameState()


def load_game_state():
    """Load game state from file"""
    global game_state
    if os.path.exists(GAME_STATE_FILE):
        with open(GAME_STATE_FILE, "r") as f:
            data = json.load(f)
            game_state = GameState(**data)
            print(f"✅ Loaded game state: {len(data.get('teams', {}))} teams")
            # Restore in-memory timers from persisted state (if present)
            try:
                from app.timer_manager import timer_manager

                timer_manager.restore_from_game_state(data)
            except Exception as e:
                print(f"⚠️  Timer restoration error: {e}")
    else:
        print(f"⚠️  Game state file not found at: {os.path.abspath(GAME_STATE_FILE)}")


def save_game_state():
    """Save game state to file"""
    os.makedirs(os.path.dirname(GAME_STATE_FILE), exist_ok=True)
    with open(GAME_STATE_FILE, "w") as f:
        json.dump(game_state.dict(), f, default=str, indent=2)
    print(f"💾 Saved game state to: {os.path.abspath(GAME_STATE_FILE)}")


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


def load_admin_credentials():
    """Load admin credentials from dedicated file"""
    if os.path.exists(ADMIN_CREDENTIALS_FILE):
        with open(ADMIN_CREDENTIALS_FILE, "r") as f:
            return json.load(f)
    return {}


def save_admin_credentials(credentials: dict):
    """Save admin credentials to dedicated file"""
    os.makedirs(os.path.dirname(ADMIN_CREDENTIALS_FILE), exist_ok=True)
    with open(ADMIN_CREDENTIALS_FILE, "w") as f:
        json.dump(credentials, f, indent=2)
    print(f"💾 Saved {len(credentials)} admin credentials")


def load_volunteer_credentials():
    """Load volunteer credentials from dedicated file"""
    if os.path.exists(VOLUNTEER_CREDENTIALS_FILE):
        with open(VOLUNTEER_CREDENTIALS_FILE, "r") as f:
            return json.load(f)
    return {}


def save_volunteer_credentials(credentials: dict):
    """Save volunteer credentials to dedicated file"""
    os.makedirs(os.path.dirname(VOLUNTEER_CREDENTIALS_FILE), exist_ok=True)
    with open(VOLUNTEER_CREDENTIALS_FILE, "w") as f:
        json.dump(credentials, f, indent=2)
    print(f"💾 Saved {len(credentials)} volunteer credentials")


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

        # Auto-assign characters by matching team names with available characters
        available_characters = dialogue_manager.get_all_characters()
        character_assignments = assign_characters_by_matching(
            TEAMS_FILE, available_characters
        )

        # Initialize game state with teams
        game_state.teams = {}
        for name, members in teams.items():
            character = character_assignments.get(name)
            game_state.teams[name] = Team(
                name=name, members=members, character=character
            )

        save_game_state()

        return {
            "message": "Teams allocated successfully",
            "teams": teams,
            "character_assignments": character_assignments,
            "total_teams": len(teams),
            "total_attendees": sum(len(members) for members in teams.values()),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-teams-and-attendees")
async def upload_teams_and_attendees(
    team_names_file: UploadFile = File(...), attendees_file: UploadFile = File(...)
):
    """Upload team names and attendees files to allocate teams"""

    try:
        # Read team names file
        team_names_content = await team_names_file.read()
        team_names_text = team_names_content.decode("utf-8")

        # Parse team names (handle both CSV and TXT)
        team_names = []
        for line in team_names_text.splitlines():
            line = line.strip()
            if line:
                # Handle CSV format (take first column)
                if "," in line:
                    team_names.append(line.split(",")[0].strip())
                else:
                    team_names.append(line)

        # Read attendees file
        attendees_content = await attendees_file.read()
        attendees_text = attendees_content.decode("utf-8")

        # Parse attendees (handle both CSV and TXT)
        attendees = []
        for line in attendees_text.splitlines():
            line = line.strip()
            if line:
                # Handle CSV format (take first column, typically the name)
                if "," in line:
                    attendees.append(line.split(",")[0].strip())
                else:
                    attendees.append(line)

        # Validation
        if not team_names:
            raise HTTPException(status_code=400, detail="No team names found in file")

        if not attendees:
            raise HTTPException(status_code=400, detail="No attendees found in file")

        if len(attendees) < len(team_names):
            raise HTTPException(
                status_code=400,
                detail=f"Not enough attendees ({len(attendees)}) for the number of teams ({len(team_names)})",
            )

        # Shuffle attendees for random distribution EVERY time
        random.shuffle(attendees)

        # Allocate attendees to teams evenly
        teams = {}
        attendees_per_team = len(attendees) // len(team_names)
        remainder = len(attendees) % len(team_names)

        attendee_index = 0
        for i, team_name in enumerate(team_names):
            # Distribute remainder across first teams
            team_size = attendees_per_team + (1 if i < remainder else 0)
            teams[team_name] = attendees[attendee_index : attendee_index + team_size]
            attendee_index += team_size

        # Save teams to teams.json file
        os.makedirs(os.path.dirname(TEAMS_FILE), exist_ok=True)
        with open(TEAMS_FILE, "w") as f:
            json.dump(teams, f, indent=2)
        print(f"💾 Saved teams to: {os.path.abspath(TEAMS_FILE)}")

        # Auto-assign characters by matching team names with available characters
        available_characters = dialogue_manager.get_all_characters()
        character_assignments = assign_characters_by_matching(
            TEAMS_FILE, available_characters
        )

        # Initialize game state with teams
        game_state.teams = {}
        for name, members in teams.items():
            character = character_assignments.get(name)
            game_state.teams[name] = Team(
                name=name, members=members, character=character
            )

        save_game_state()

        # Calculate team size stats
        team_sizes = [len(members) for members in teams.values()]

        return {
            "message": "Teams allocated successfully",
            "teams": teams,
            "character_assignments": character_assignments,
            "total_teams": len(teams),
            "total_attendees": len(attendees),
            "min_team_size": min(team_sizes),
            "max_team_size": max(team_sizes),
        }

    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="File encoding error. Please ensure files are UTF-8 encoded",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing files: {str(e)}")


@router.get("/teams")
async def get_all_teams():
    """Get all teams with their current status"""

    if not game_state.teams:
        raise HTTPException(status_code=404, detail="No teams allocated yet")

    teams_with_status = {}
    for team_name, team in game_state.teams.items():
        teams_with_status[team_name] = {
            "name": team_name,
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
            "disqualified": team.disqualified,
            "disqualification_reason": team.disqualification_reason,
            "disqualification_timestamp": team.disqualification_timestamp.isoformat()
            if team.disqualification_timestamp
            else None,
        }

    return {"teams": list(teams_with_status.values())}


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


@router.get("/team-tab-switches/{team_name}")
async def get_team_tab_switches(team_name: str):
    """Get tab switch logs for a specific team

    Rules:
    - First 3 switches: Warning only, no deductions
    - 4th switch and beyond: -50 points per switch
    """

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    team = game_state.teams[team_name]
    tab_switches = getattr(team, "tab_switch_logs", []) or []

    tab_left_count = len([e for e in tab_switches if e.get("event_type") == "tab_left"])
    penalty_deductions = max(0, tab_left_count - 3) * 50
    is_penalized = tab_left_count > 3

    return {
        "team_name": team_name,
        "total_tab_left": tab_left_count,
        "total_tab_switches": tab_left_count,  # Keep for backward compatibility
        "switches_remaining": max(0, 3 - tab_left_count),
        "is_penalized": is_penalized,
        "penalty_per_overuse": 50,
        "total_deductions_from_switches": penalty_deductions,
        "events": tab_switches,
    }


@router.post("/stop-game")
async def stop_game():
    """Stop the game"""

    game_state.game_active = False
    save_game_state()

    return {"message": "Game stopped", "game_active": False}


@router.post("/delete-participant-data")
async def delete_participant_data():
    """Delete all participant data and reset game state after game ends

    Admin and volunteer credentials are stored separately and are NOT affected.
    """

    if game_state.game_active:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete data while game is active. Stop the game first.",
        )

    # Simply reset game state - credentials are in separate files!
    game_state.teams = {}
    game_state.global_start_time = None
    game_state.game_active = False
    save_game_state()

    # Delete/reset data files
    attendance_file = ATTENDANCE_FILE
    if os.path.exists(attendance_file):
        os.remove(attendance_file)

    # Clear teams.json
    if os.path.exists(TEAMS_FILE):
        os.remove(TEAMS_FILE)
        print(f"🗑️  Deleted: {os.path.abspath(TEAMS_FILE)}")

    print("🗑️  Deleted all participant data. Admin/volunteer credentials preserved.")

    return {
        "message": "All participant data has been deleted successfully. Admin/volunteer credentials preserved.",
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
        "game_active": game_state.game_active and timer_manager.is_game_active(),
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

    # Load credentials from dedicated file
    if role == "admin":
        credentials = load_admin_credentials()
    else:
        credentials = load_volunteer_credentials()

    # Check if user exists (updating) or new (creating)
    user_key = name.lower()
    existing_user = credentials.get(user_key, {})

    # Update or create user - preserve created_at if updating
    credentials[user_key] = {
        "username": name,
        "pin": str(pin),
        "role": role,
        "created_at": existing_user.get("created_at", datetime.now().isoformat()),
        "updated_at": datetime.now().isoformat(),
    }

    # Save to dedicated credentials file
    if role == "admin":
        save_admin_credentials(credentials)
    else:
        save_volunteer_credentials(credentials)

    action = "updated" if existing_user else "created"
    print(f"📝 PIN {action} for {name} ({role})")
    return {"message": f"PIN {action} for {name} ({role})"}


@router.get("/pins")
async def list_pins():
    """List admin and volunteer users with PINs"""
    admin_credentials = load_admin_credentials()
    volunteer_credentials = load_volunteer_credentials()

    # Normalize to readable lists
    admins = [v for k, v in admin_credentials.items()]
    volunteers = [v for k, v in volunteer_credentials.items()]

    return {"admin_users": admins, "volunteer_users": volunteers}


@router.delete("/pin/{role}/{name}")
async def delete_pin(role: str, name: str):
    """Remove PIN entry for admin or volunteer"""
    role = role.strip().lower()
    name = name.strip()

    if role not in ["admin", "volunteer"]:
        raise HTTPException(
            status_code=400, detail="Role must be 'admin' or 'volunteer'"
        )

    # Load credentials from dedicated file
    if role == "admin":
        credentials = load_admin_credentials()
    else:
        credentials = load_volunteer_credentials()

    removed = False
    lookup = name.lower()
    if lookup in credentials:
        credentials.pop(lookup)
        removed = True

    # Save back to dedicated credentials file
    if role == "admin":
        save_admin_credentials(credentials)
    else:
        save_volunteer_credentials(credentials)

    if not removed:
        raise HTTPException(status_code=404, detail=f"{name} not found in {role} users")

    print(f"🗑️  Removed {name} from {role} users")
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

    # Find device by checking device_id field in each device object
    device_found = False
    updated_devices = []

    for device in team_devices:
        # Handle both old format (string) and new format (dict)
        if isinstance(device, str):
            if device != device_id:
                updated_devices.append(device)
            else:
                device_found = True
        elif isinstance(device, dict):
            if device.get("device_id") != device_id:
                updated_devices.append(device)
            else:
                device_found = True

    if not device_found:
        raise HTTPException(status_code=404, detail="Device not found for team")

    devices[team_name] = updated_devices

    os.makedirs(os.path.dirname(DEVICES_FILE), exist_ok=True)
    with open(DEVICES_FILE, "w") as f:
        json.dump(devices, f, indent=2)

    print(f"🗑️  Removed device {device_id} from {team_name}")
    return {"message": f"Device removed from {team_name}", "devices": updated_devices}


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
            # Handle both dict and object formats
            if isinstance(adjustment, dict):
                adjustments_log.append(
                    {
                        "team_name": team_name,
                        "adjusted_by": adjustment.get("adjusted_by"),
                        "amount": adjustment.get("amount"),
                        "reason": adjustment.get("reason"),
                        "adjustment_type": adjustment.get("adjustment_type"),
                        "timestamp": adjustment.get("timestamp"),
                    }
                )
            else:
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


@router.post("/reverse-disqualification/{team_name}")
async def reverse_disqualification(team_name: str, reversed_by: str):
    """Admin reverses a disqualification for a team"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    team = game_state.teams[team_name]

    if not team.disqualified:
        raise HTTPException(status_code=400, detail="Team is not disqualified")

    # Reverse the disqualification
    team.disqualified = False
    team.disqualification_confirmed_by_admin = False
    team.disqualification_acknowledged_by_team = False
    team.disqualification_reason = None
    team.disqualification_timestamp = None
    save_game_state()

    return {
        "message": f"Disqualification reversed for {team_name}",
        "team_name": team_name,
        "disqualified": False,
        "reversed_by": reversed_by,
        "timestamp": datetime.now().isoformat(),
    }


# ==================== CHARACTER MANAGEMENT ====================


@router.post("/assign-character/{team_name}/{character}")
async def assign_character(team_name: str, character: str):
    """Assign a character to a team"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    available_characters = dialogue_manager.get_all_characters()
    if character not in available_characters:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid character. Available: {', '.join(available_characters)}",
        )

    team = game_state.teams[team_name]
    team.character = character
    save_game_state()

    # Also update the teams file
    assign_character_to_team(team_name, character, TEAMS_FILE)

    return {
        "message": f"Assigned {character} to {team_name}",
        "team_name": team_name,
        "character": character,
    }


@router.get("/team-characters")
async def get_team_characters():
    """Get character assignments for all teams"""

    assignments = {}
    for team_name, team in game_state.teams.items():
        assignments[team_name] = team.character

    return {
        "assignments": assignments,
        "total_teams": len(assignments),
        "unassigned_teams": sum(1 for c in assignments.values() if not c),
    }


@router.post("/auto-assign-characters")
async def auto_assign_characters():
    """Automatically assign characters to teams by matching team names with available characters"""

    available_characters = dialogue_manager.get_all_characters()

    # Auto-assign using the matching logic
    character_assignments = assign_characters_by_matching(
        TEAMS_FILE, available_characters
    )

    # Update game state
    for team_name, character in character_assignments.items():
        if team_name in game_state.teams:
            game_state.teams[team_name].character = character

    save_game_state()

    return {
        "message": "Characters auto-assigned",
        "assignments": character_assignments,
        "total_assigned": sum(1 for c in character_assignments.values() if c),
        "total_unassigned": sum(1 for c in character_assignments.values() if not c),
    }


# Load game state on startup
load_game_state()
