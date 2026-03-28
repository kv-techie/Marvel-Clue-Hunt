import json
import os
import shutil
from contextlib import contextmanager
from datetime import datetime

from fastapi import APIRouter, File, HTTPException, UploadFile

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
from app.state_io import atomic_write_json, state_write_lock
from app.team_allocator import (
    allocate_teams_from_files as allocate_teams,
)
from .common import (
    block_guest_access,
    load_guest_credentials,
    save_guest_credentials,
)
from app.timer_manager import timer_manager
from app.websocket_manager import manager

router = APIRouter()

GAME_INACTIVE_MESSAGE = "Game has not started, kindly wait for admin to start"

INFINITY_STONES = [
    "Mind Stone",
    "Power Stone",
    "Time Stone",
    "Space Stone",
    "Reality Stone",
    "Soul Stone",
]

# Get absolute path to data directory (works from any working directory)
# Get absolute path to data directory
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DATA_DIR = os.path.join(APP_DIR, "data")
STATE_DATA_DIR = os.getenv("STATE_DATA_DIR", DEFAULT_DATA_DIR)

# Ensure state directory exists with error handling
try:
    os.makedirs(STATE_DATA_DIR, exist_ok=True)
    print(f"📂 Admin state data directory: {os.path.abspath(STATE_DATA_DIR)}")
except Exception as e:
    print(f"⚠️ Warning: Could not create admin state directory {STATE_DATA_DIR}: {e}")


def _state_file(filename: str) -> str:
    return os.path.join(STATE_DATA_DIR, filename)


def _bootstrap_state_file(filename: str):
    """Ensure state file exists in STATE_DATA_DIR by copying from bundled defaults once."""
    source = os.path.join(DEFAULT_DATA_DIR, filename)
    destination = _state_file(filename)
    if not os.path.exists(destination) and os.path.exists(source):
        try:
            shutil.copy2(source, destination)
            print(f"📦 Bootstrapped {filename} to {destination}")
        except Exception as e:
            print(f"⚠️ Failed to bootstrap {filename}: {e}")


for _filename in [
    "game_state.json",
    "devices.json",
    "teams.json",
    "admin_whitelist.json",
    "volunteer_whitelist.json",
    "admin_credentials.json",
    "volunteer_credentials.json",
]:
    _bootstrap_state_file(_filename)

TEAMS_FILE = _state_file("teams.json")
ATTENDANCE_FILE = _state_file("attendance.csv")
GAME_STATE_FILE = _state_file("game_state.json")
ADMIN_WHITELIST_FILE = _state_file("admin_whitelist.json")
VOLUNTEER_WHITELIST_FILE = _state_file("volunteer_whitelist.json")
ADMIN_CREDENTIALS_FILE = _state_file("admin_credentials.json")
VOLUNTEER_CREDENTIALS_FILE = _state_file("volunteer_credentials.json")
DEVICES_FILE = _state_file("devices.json")

# In-memory game state
game_state: GameState = GameState()


@contextmanager
def game_state_write_lock():
    with state_write_lock():
        yield


def load_game_state():
    """Load game state from file"""
    global game_state
    if os.path.exists(GAME_STATE_FILE):
        try:
            with open(GAME_STATE_FILE, "r") as f:
                data = json.load(f)

            print(
                f"📄 Raw JSON - Mind Stone stone: {data.get('teams', {}).get('Mind Stone', {}).get('stone')}"
            )
            
            # **CRITICAL FIX**: Mutate the existing object instead of reassigning
            # This ensures other modules that imported game_state still see the same object
            new_state = GameState(**data)
            
            # Clear and update teams dict to maintain the reference
            game_state.teams.clear()
            game_state.teams.update(new_state.teams)
            
            # Update other fields
            game_state.game_active = new_state.game_active
            game_state.global_start_time = new_state.global_start_time

            print(f"✅ Loaded game state: {len(game_state.teams)} teams")

            # Ensure all teams have stones assigned
            for team_name, team in game_state.teams.items():
                if team.stone is None or team.stone == "":
                    team.stone = team_name
                    print(f"🔨 Auto-assigned stone '{team_name}' to team '{team_name}'")

            # Restore in-memory timers
            try:
                timer_manager.restore_from_game_state(data)
            except Exception as e:
                print(f"⚠️  Timer restoration error: {e}")
                
        except (json.JSONDecodeError, TypeError, ValueError) as e:
            print(
                f"⚠️  Invalid game state file at {os.path.abspath(GAME_STATE_FILE)}: {e}. Reinitializing with empty state."
            )
            game_state.teams = {}
            game_state.game_active = False
            game_state.global_start_time = None
            save_game_state()
    else:
        print(f"⚠️  Game state file not found at: {os.path.abspath(GAME_STATE_FILE)}")


def save_game_state():
    """Save game state to file"""
    atomic_write_json(GAME_STATE_FILE, game_state.dict(), default=str, indent=2)
    print(f"💾 Saved game state to: {os.path.abspath(GAME_STATE_FILE)}")


def is_game_currently_active() -> bool:
    return bool(game_state.game_active and timer_manager.is_game_active())


def load_admin_whitelist():
    """Load admin whitelist from file"""
    if os.path.exists(ADMIN_WHITELIST_FILE):
        with open(ADMIN_WHITELIST_FILE, "r") as f:
            return json.load(f).get("admins", [])
    return []


def save_admin_whitelist(admins: list):
    """Save admin whitelist to file"""
    atomic_write_json(ADMIN_WHITELIST_FILE, {"admins": admins}, indent=2)


def load_volunteer_whitelist():
    """Load volunteer whitelist from file"""
    if os.path.exists(VOLUNTEER_WHITELIST_FILE):
        with open(VOLUNTEER_WHITELIST_FILE, "r") as f:
            return json.load(f).get("volunteers", [])
    return []


def save_volunteer_whitelist(volunteers: list):
    """Save volunteer whitelist to file"""
    atomic_write_json(VOLUNTEER_WHITELIST_FILE, {"volunteers": volunteers}, indent=2)


def load_admin_credentials():
    """Load admin credentials from dedicated file"""
    if os.path.exists(ADMIN_CREDENTIALS_FILE):
        try:
            with open(ADMIN_CREDENTIALS_FILE, "r") as f:
                content = f.read().strip()
                if not content:
                    return {}
                return json.loads(content)
        except Exception as e:
            print(f"⚠️ Error loading admin credentials: {e}")
    return {}


def save_admin_credentials(credentials: dict):
    """Save admin credentials to dedicated file"""
    atomic_write_json(ADMIN_CREDENTIALS_FILE, credentials, indent=2)
    print(f"💾 Saved {len(credentials)} admin credentials")


def load_volunteer_credentials():
    """Load volunteer credentials from dedicated file"""
    if os.path.exists(VOLUNTEER_CREDENTIALS_FILE):
        with open(VOLUNTEER_CREDENTIALS_FILE, "r") as f:
            return json.load(f)
    return {}


def save_volunteer_credentials(credentials: dict):
    """Save volunteer credentials to dedicated file"""
    atomic_write_json(VOLUNTEER_CREDENTIALS_FILE, credentials, indent=2)
    print(f"💾 Saved {len(credentials)} volunteer credentials")


@router.post("/generate-guest-password")
async def generate_guest_password(admin_name: str):
    """Generate a temporary 4-6 digit password for guest login.
    Only authorized admins can call this (checked by caller).
    """
    import random

    # Generate random 4-6 digit PIN
    length = random.randint(4, 6)
    temp_pin = "".join([str(random.randint(0, 9)) for _ in range(length)])

    # Save to guest credentials
    guest_creds = {
        "admin_name": admin_name,
        "temp_pin": temp_pin,
        "is_active": True,
        "created_at": datetime.now().isoformat(),
    }
    save_guest_credentials(guest_creds)

    print(f"🔑 Generated guest PIN for {admin_name}: {temp_pin}")
    return {"success": True, "pin": temp_pin, "admin_name": admin_name}


@router.post("/upload-attendance")
async def upload_attendance(admin_name: str, file: UploadFile = File(...)):
    """Upload attendance CSV and allocate teams"""
    block_guest_access(admin_name)

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
        game_state.teams = {}
        for idx, (name, members) in enumerate(teams.items()):
            assigned_stone = (
                name
                if name in INFINITY_STONES
                else INFINITY_STONES[idx % len(INFINITY_STONES)]
            )
            game_state.teams[name] = Team(
                name=name, members=members, stone=assigned_stone
            )

        save_game_state()

        return {
            "message": "Teams allocated successfully",
            "teams": teams,
            "total_teams": len(teams),
            "total_attendees": sum(len(members) for members in teams.values()),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/allocate-teams-random")
async def allocate_teams_random(admin_name: str, file: UploadFile = File(...)):
    """Allocate attendees randomly into stone-named teams"""
    block_guest_access(admin_name)

    try:
        # Read attendees file
        content = await file.read()
        attendees_text = content.decode("utf-8")

        # Parse attendees (one per line)
        attendees = []
        for line in attendees_text.splitlines():
            line = line.strip()
            if line:
                attendees.append(line)

        if not attendees:
            raise HTTPException(status_code=400, detail="No attendees found in file")

        # Create stone-based team names
        team_names = INFINITY_STONES  # Use only 6 stone teams

        # Randomly distribute attendees across teams
        import random

        random.shuffle(attendees)

        teams = {stone: [] for stone in INFINITY_STONES}
        for idx, attendee in enumerate(attendees):
            team_idx = idx % len(INFINITY_STONES)
            teams[INFINITY_STONES[team_idx]].append(attendee)

        # Save teams to file
        os.makedirs(os.path.dirname(TEAMS_FILE), exist_ok=True)
        atomic_write_json(TEAMS_FILE, teams, indent=2, ensure_ascii=False)

        # Initialize game state with teams
        game_state.teams = {}
        for team_name, members in teams.items():
            game_state.teams[team_name] = Team(
                name=team_name,
                members=members,
                stone=team_name,
            )

        save_game_state()

        return {
            "message": f"Teams allocated successfully! {len(attendees)} attendees into 6 Infinity Stone teams",
            "teams": teams,
            "total_teams": len(teams),
            "total_attendees": len(attendees),
            "team_sizes": {name: len(members) for name, members in teams.items()},
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error allocating teams: {str(e)}")


@router.post("/upload-teams-and-attendees")
async def upload_teams_and_attendees(
    admin_name: str,
    teams_file: UploadFile = File(...),
    attendees_file: UploadFile = File(...),
):
    """
    Upload teams and attendees files to allocate teams based on character preferences.
    """
    block_guest_access(admin_name)
    try:
        # Read teams file
        teams_content = await teams_file.read()
        teams_text = teams_content.decode("utf-8")

        # Parse team names from first line
        team_names = [name.strip() for name in teams_text.split(",")]
        if not team_names:
            raise HTTPException(status_code=400, detail="No teams found in file")

        # Read attendees file
        attendees_content = await attendees_file.read()
        attendees_text = attendees_content.decode("utf-8")

        # Parse attendees with favorite character (CSV format: name, favorite_character)
        attendees_data = {}  # Dict mapping name to favorite_character
        for line_num, line in enumerate(attendees_text.splitlines(), 1):
            line = line.strip()
            if not line or line.startswith("#"):  # Skip empty lines and comments
                continue

            if "," in line:
                # CSV format: name, favorite_character
                parts = [p.strip() for p in line.split(",", 1)]
                name = parts[0]
                favorite_char = parts[1] if len(parts) > 1 else ""

                # Reject if character preference is empty
                if not favorite_char or not favorite_char.strip():
                    raise HTTPException(
                        status_code=400,
                        detail=f"Line {line_num}: Empty character preference for '{name}'. Each attendee must have a character preference.",
                    )

                attendees_data[name] = favorite_char
            else:
                # Plain text format (no preference specified)
                raise HTTPException(
                    status_code=400,
                    detail=f"Line {line_num}: Missing character preference. Format should be 'Name, Character'",
                )

        if not attendees_data:
            raise HTTPException(status_code=400, detail="No attendees found in file")

        # Get unique character preferences
        unique_characters = set()
        for name, char in attendees_data.items():
            if char and char.strip():
                unique_characters.add(char.strip())

        # Validate: Number of teams must match number of unique character preferences
        if len(team_names) != len(unique_characters):
            raise HTTPException(
                status_code=400,
                detail=f"Team Names and Attendees Preference don't match. You have {len(team_names)} teams but {len(unique_characters)} character preferences. They must be equal.",
            )

        # Get available characters for validation
        available_characters = dialogue_manager.get_all_characters()

        # Validate that all preferences are valid characters
        invalid_prefs = []
        for name, char in attendees_data.items():
            if char and char not in available_characters:
                invalid_prefs.append(f"{name}: {char}")

        if invalid_prefs:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid character preferences: {', '.join(invalid_prefs[:5])}{'...' if len(invalid_prefs) > 5 else ''}. Valid characters are: {', '.join(available_characters)}",
            )

        print(
            f"📝 Loaded {len(attendees_data)} attendees with {len(unique_characters)} character preferences"
        )
        print(f"📝 Loaded {len(team_names)} teams: {', '.join(team_names)}")

        # Allocate teams by preference
        os.makedirs(os.path.dirname(TEAMS_FILE), exist_ok=True)

        from app.team_allocator import allocate_teams_by_preference

        teams_dict = allocate_teams_by_preference(
            attendees_data=attendees_data,
            team_size=len(attendees_data)
            // len(team_names),  # Calculate team size from total attendees
            output_path=None,  # Don't save yet, we'll save with team names
        )

        # Map character-based teams to actual team names
        # Extract character from team name (e.g., "Team Iron Man" -> "Iron Man")
        team_character_mapping = {}
        for team_name in team_names:
            # Remove "Team " prefix if it exists
            character = team_name.replace("Team ", "").strip()
            if character in unique_characters:
                team_character_mapping[team_name] = character
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Team name '{team_name}' doesn't match any character preference. Expected format: 'Team {{character}}' where character is one of: {', '.join(unique_characters)}",
                )

        # Rebuild teams with actual team names
        final_teams = {}
        for team_name, character in team_character_mapping.items():
            char_key = f"Team {character}"
            if char_key in teams_dict:
                final_teams[team_name] = teams_dict[char_key]

        # Save to JSON with team names
        teams_with_character = {}
        for team_name, members in final_teams.items():
            character = team_character_mapping[team_name]
            teams_with_character[team_name] = {
                "members": members,
                "character": character,
            }

        atomic_write_json(
            TEAMS_FILE, teams_with_character, indent=2, ensure_ascii=False
        )
        print(f"💾 Saved teams to: {os.path.abspath(TEAMS_FILE)}")

        # Initialize game state with teams
        game_state.teams = {}
        for idx, (team_name, members) in enumerate(final_teams.items()):
            character = team_character_mapping[team_name]
            game_state.teams[team_name] = Team(
                name=team_name,
                members=members,
                stone=INFINITY_STONES[idx % len(INFINITY_STONES)],
            )

        save_game_state()

        # Calculate team size stats
        team_sizes = [len(members) for members in final_teams.values()]

        return {
            "message": "Teams allocated successfully by character preference",
            "teams": final_teams,
            "character_assignments": team_character_mapping,
            "total_teams": len(final_teams),
            "total_attendees": len(attendees_data),
            "unique_characters": len(unique_characters),
            "min_team_size": min(team_sizes) if team_sizes else 0,
            "max_team_size": max(team_sizes) if team_sizes else 0,
        }

    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="File encoding error. Please ensure files are UTF-8 encoded",
        )
    except HTTPException:
        raise
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
            "stone": team.stone or "Unassigned",
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
async def set_start_time(start_time: str, admin_name: str = "Admin"):
    """Set global game start time (ISO format)"""
    block_guest_access(admin_name)

    try:
        dt = datetime.fromisoformat(start_time)
        timer_manager.set_global_start_time(dt)
        game_state.global_start_time = dt
        save_game_state()

        return {"message": "Start time set successfully", "start_time": dt.isoformat()}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format")


@router.post("/start-game")
async def start_game(admin_name: str = "Admin"):
    """Start the game immediately"""
    block_guest_access(admin_name)

    now = datetime.now()

    # Ensure old timers from previous sessions don't leak into a new run.
    timer_manager.reset_team_timers()
    for team in game_state.teams.values():
        team.timer_started = None

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
async def stop_game(admin_name: str = "Admin"):
    """Stop the game"""
    block_guest_access(admin_name)

    timer_manager.reset_all()
    for team in game_state.teams.values():
        team.timer_started = None

    game_state.global_start_time = None
    game_state.game_active = False
    save_game_state()

    return {"message": "Game stopped", "game_active": False}


@router.post("/delete-participant-data")
async def delete_participant_data(admin_name: str = "Admin"):
    """Delete all participant data and reset game state after game ends

    Admin and volunteer credentials are stored separately and are NOT affected.
    """

    if is_game_currently_active():
        raise HTTPException(
            status_code=400,
            detail="Cannot delete data while game is active. Stop the game first.",
        )

    # Simply reset game state - credentials are in separate files!
    game_state.teams = {}
    game_state.global_start_time = None
    game_state.game_active = False
    timer_manager.reset_all()
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
async def award_enactment_bonus(team_name: str, request: BonusRequest, admin_name: str = "Admin"):
    """Award enactment bonus to a team"""
    block_guest_access(admin_name)

    if not is_game_currently_active():
        raise HTTPException(status_code=403, detail=GAME_INACTIVE_MESSAGE)

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

    # Broadcast to team and admins
    new_score = calculate_final_score(team)
    await manager.send_to_team(team_name, "score_update", {"new_score": new_score})
    await manager.send_to_role("admin", "leaderboard_update", {})

    return {
        "message": f"Enactment bonus of {bonus_amount} awarded to {team_name}",
        "new_score": new_score,
    }


@router.get("/game-status")
async def get_game_status():
    """Get overall game status"""

    return {
        "game_active": is_game_currently_active(),
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
async def set_pin(role: str, name: str, pin: str, admin_name: str = "Admin"):
    """Set PIN for an admin or volunteer. role should be 'admin' or 'volunteer'."""
    block_guest_access(admin_name)

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
async def delete_pin(role: str, name: str, admin_name: str = "Admin"):
    """Remove PIN entry for admin or volunteer"""
    block_guest_access(admin_name)
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
    if os.path.exists(DEVICES_FILE):
        with open(DEVICES_FILE, "r") as f:
            devices = json.load(f)
    else:
        devices = {}

    team_devices = devices.get(team_name, [])
    return {"team": team_name, "devices": team_devices}




@router.delete("/devices/{team_name}/{device_id}")
async def remove_device(team_name: str, device_id: str, admin_name: str = "Admin"):
    """Remove a specific device id from a team's registered devices"""
    block_guest_access(admin_name)
    DEVICES_FILE = _state_file("devices.json")
    if os.path.exists(DEVICES_FILE):
        with open(DEVICES_FILE, "r") as f:
            devices = json.load(f)
    else:
        devices = {}

    with state_write_lock():
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

        atomic_write_json(DEVICES_FILE, devices, indent=2)

    print(f"🗑️  Removed device {device_id} from {team_name}")
    return {"message": f"Device removed from {team_name}", "devices": updated_devices}


@router.get("/teams-active-devices")
async def get_teams_active_devices():
    """Get all teams with their currently active device information"""
    DEVICES_FILE = _state_file("devices.json")

    if os.path.exists(DEVICES_FILE):
        with open(DEVICES_FILE, "r") as f:
            devices_data = json.load(f)
    else:
        devices_data = {}

    current_team_names = set(game_state.teams.keys())

    # Prune stale teams from devices store to keep only current teams
    stale_team_names = [
        name for name in devices_data.keys() if name not in current_team_names
    ]
    if stale_team_names:
        for stale_team_name in stale_team_names:
            devices_data.pop(stale_team_name, None)

        with state_write_lock():
            atomic_write_json(DEVICES_FILE, devices_data, indent=2)

        print(f"🧹 Pruned stale teams from devices.json: {stale_team_names}")

    teams_active_devices = []

    for team_name, team in game_state.teams.items():
        team_devices = devices_data.get(team_name, [])
        team_members = team.members if hasattr(team, "members") and team.members else []

        # Find active device for this team
        active_device = None
        all_devices_count = len(team_devices)

        for device in team_devices:
            if isinstance(device, dict) and device.get("is_active"):
                active_device = {
                    "device_id": device.get("device_id"),
                    "device_name": device.get("device_name"),
                    "browser": device.get("browser"),
                    "os": device.get("os"),
                    "screen_resolution": device.get("screen_resolution"),
                    "last_login": device.get("last_login"),
                    "registered_at": device.get("registered_at"),
                }
                break

        teams_active_devices.append(
            {
                "team_name": team_name,
                "members_count": len(team_members),
                "registered_devices_count": all_devices_count,
                "active_device": active_device,
                "has_active": active_device is not None,
            }
        )

    # Sort by team name
    teams_active_devices.sort(key=lambda x: x["team_name"])

    return {
        "teams": teams_active_devices,
        "total_teams": len(teams_active_devices),
        "teams_with_active_device": len(
            [t for t in teams_active_devices if t["has_active"]]
        ),
    }


@router.post("/admins/{name}")
async def add_admin(name: str, admin_name: str = "Admin"):
    """Add a new admin to the whitelist"""
    block_guest_access(admin_name)
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
async def remove_admin(name: str, admin_name: str = "Admin"):
    """Remove an admin from the whitelist"""
    block_guest_access(admin_name)
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
    block_guest_access(adjusted_by)

    if not is_game_currently_active():
        raise HTTPException(status_code=403, detail=GAME_INACTIVE_MESSAGE)

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

    with game_state_write_lock():
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

        # Broadcast update to team and admins
        new_score = calculate_final_score(team)
        await manager.send_to_team(team_name, "score_update", {
            "new_score": new_score,
            "adjustment": {
                "amount": request.amount,
                "reason": request.reason,
                "type": request.adjustment_type
            }
        })
        if team.disqualified:
            await manager.send_to_team(team_name, "disqualification_update", {
                "disqualified": True,
                "reason": team.disqualification_reason
            })
        
        await manager.send_to_role("admin", "leaderboard_update", {})

    return {
        "message": f"{request.adjustment_type.capitalize()} of {request.amount} points applied to {team_name}",
        "new_score": new_score,
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
async def add_volunteer(name: str, admin_name: str = "Admin"):
    """Add a new volunteer to the whitelist"""
    block_guest_access(admin_name)
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
async def remove_volunteer(name: str, admin_name: str = "Admin"):
    """Remove a volunteer from the whitelist"""
    block_guest_access(admin_name)
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

    # Also remove any stored volunteer credentials for this name
    volunteer_credentials = load_volunteer_credentials()
    credential_key = name.lower()
    if credential_key in volunteer_credentials:
        volunteer_credentials.pop(credential_key)
        save_volunteer_credentials(volunteer_credentials)

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
    block_guest_access(confirmed_by)

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    with game_state_write_lock():
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
        
        # Broadcast to team
        await manager.send_to_team(team_name, "disqualification_update", {
            "disqualified": True,
            "reason": team.disqualification_reason
        })
        await manager.send_to_role("admin", "leaderboard_update", {})

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

    with game_state_write_lock():
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
    block_guest_access(reversed_by)

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    with game_state_write_lock():
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

        # Broadcast to team
        await manager.send_to_team(team_name, "disqualification_update", {
            "disqualified": False
        })
        await manager.send_to_role("admin", "leaderboard_update", {})

    return {
        "message": f"Disqualification reversed for {team_name}",
        "team_name": team_name,
        "disqualified": False,
        "reversed_by": reversed_by,
        "timestamp": datetime.now().isoformat(),
    }


# ==================== CHARACTER MANAGEMENT ====================


@router.post("/assign-stone/{team_name}/{stone}")
async def assign_stone(team_name: str, stone: str, admin_name: str = "Admin"):
    """Assign a stone to a team"""
    from app.powerup_manager import powerup_manager

    block_guest_access(admin_name)

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    with game_state_write_lock():
        team = game_state.teams[team_name]
        team.stone = stone
        team.current_question_index = 0  # Reset question progress for new stone
        team.current_streak = 0  # Reset current streak for new stone
        team.current_combo = 1.0  # Reset combo multiplier
        team.timer_started = None  # Reset timer for new stone

        # Initialize team-specific powerups based on team name
        powerup_manager.reset_powerups_for_new_stone(team)

        save_game_state()

    return {
        "message": f"Assigned {stone} to {team_name}. Streak and powerups reset for this stone!",
        "team_name": team_name,
        "stone": stone,
    }


# ==================== ADMIN LEADERBOARD ====================


@router.get("/leaderboard")
async def get_admin_leaderboard(sort_by: str = "total_points_earned"):
    """Get leaderboard for admin dashboard (same as attendee leaderboard)"""
    from app.leaderboard_manager import leaderboard_manager

    leaderboard = leaderboard_manager.get_leaderboard(game_state.teams, sort_by)

    return {
        "leaderboard": leaderboard,
        "sort_by": sort_by,
        "timestamp": datetime.now().isoformat(),
    }


# ==================== DISQUALIFICATION CANDIDATES ====================


@router.get("/disqualification-candidates")
async def get_disqualification_candidates():
    """Get teams that could be disqualified (high tab switches or rule violations)"""
    candidates = []

    for team_name, team in game_state.teams.items():
        if team.disqualified:
            continue  # Skip already disqualified teams

        # Check for excessive tab switches (more than 3)
        tab_switches = len(team.tab_switch_logs) if team.tab_switch_logs else 0

        # Flag teams with high tab switch counts
        violation_reason = None
        violation_score = 0

        if tab_switches > 5:
            violation_reason = f"Excessive tab switches ({tab_switches})"
            violation_score = tab_switches

        if violation_reason:
            candidates.append(
                {
                    "team_name": team_name,
                    "members": team.members,
                    "stone": team.stone,
                    "violation_reason": violation_reason,
                    "violation_score": violation_score,
                    "tab_switches": tab_switches,
                    "current_score": calculate_final_score(team),
                }
            )

    # Sort by violation score (highest first)
    candidates.sort(key=lambda x: x["violation_score"], reverse=True)

    return {"candidates": candidates, "total_flagged": len(candidates)}


# Load game state on startup
load_game_state()
save_game_state()  # Persist auto-assigned stones to file
