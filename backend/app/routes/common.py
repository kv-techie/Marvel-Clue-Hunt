import json
import os
import shutil
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.models import LoginRequest, LoginResponse
from app.state_io import atomic_write_json

router = APIRouter()

# Get absolute path to data directory (works from any working directory)
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DATA_DIR = os.path.join(APP_DIR, "data")
STATE_DATA_DIR = os.getenv("STATE_DATA_DIR", DEFAULT_DATA_DIR)
os.makedirs(STATE_DATA_DIR, exist_ok=True)


def _state_file(filename: str) -> str:
    return os.path.join(STATE_DATA_DIR, filename)


def _bootstrap_state_file(filename: str):
    """Ensure state file exists in STATE_DATA_DIR by copying from bundled defaults once."""
    source = os.path.join(DEFAULT_DATA_DIR, filename)
    destination = _state_file(filename)
    if not os.path.exists(destination) and os.path.exists(source):
        shutil.copy2(source, destination)


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
ADMIN_WHITELIST_FILE = _state_file("admin_whitelist.json")
VOLUNTEER_WHITELIST_FILE = _state_file("volunteer_whitelist.json")
DEVICES_FILE = _state_file("devices.json")
GAME_STATE_FILE = _state_file("game_state.json")
ADMIN_CREDENTIALS_FILE = _state_file("admin_credentials.json")
VOLUNTEER_CREDENTIALS_FILE = _state_file("volunteer_credentials.json")


def load_admin_credentials():
    """Load admin credentials from dedicated file"""
    if os.path.exists(ADMIN_CREDENTIALS_FILE):
        with open(ADMIN_CREDENTIALS_FILE, "r") as f:
            return json.load(f)
    return {}


def load_volunteer_credentials():
    """Load volunteer credentials from dedicated file"""
    if os.path.exists(VOLUNTEER_CREDENTIALS_FILE):
        with open(VOLUNTEER_CREDENTIALS_FILE, "r") as f:
            return json.load(f)
    return {}


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
    atomic_write_json(DEVICES_FILE, devices_data, indent=2)


def _load_devices():
    if os.path.exists(DEVICES_FILE):
        with open(DEVICES_FILE, "r") as f:
            return json.load(f)
    return {}


def _get_device_id(device_entry):
    """Extract device_id from both old format (string) and new format (dict)"""
    if isinstance(device_entry, str):
        return device_entry
    elif isinstance(device_entry, dict):
        return device_entry.get("device_id")
    return None


def _check_device_in_other_teams(
    devices_dict, current_team, device_id, fingerprint=None
):
    """
    Check if a device (by device_id or fingerprint) is already registered with another team.

    Returns: (is_in_other_team, other_team_name) or (False, None)
    """
    for team_name, team_devices in devices_dict.items():
        # Skip the current team
        if team_name == current_team:
            continue

        # Check each device in other teams
        for device in team_devices:
            device_id_in_team = _get_device_id(device)

            # Check by device_id
            if device_id_in_team == device_id:
                return True, team_name

            # Check by fingerprint (if device is dict and has fingerprint)
            if fingerprint and isinstance(device, dict):
                device_fingerprint = device.get("fingerprint")
                if device_fingerprint and device_fingerprint == fingerprint:
                    return True, team_name

    return False, None


def _find_matching_device(team_devices, request):
    """
    Find a matching device based on multiple criteria:
    1. Exact device_id match
    2. Fingerprint match (same device, localStorage cleared)
    3. Similar characteristics (browser + OS + screen resolution)

    Returns: (matched_device, match_type, device_index) or (None, None, None)
    """
    for idx, device in enumerate(team_devices):
        if isinstance(device, dict):
            device_id = device.get("device_id")

            # 1. Exact device_id match
            if device_id == request.device_id:
                return device, "exact_id", idx

            # 2. Fingerprint match (highest priority for duplicate prevention)
            if request.device_info and device.get("fingerprint"):
                if device.get("fingerprint") == request.device_info.get("fingerprint"):
                    return device, "fingerprint", idx

            # 3. Similar device characteristics (fallback)
            if request.device_info:
                browser_match = device.get("browser") == request.device_info.get(
                    "browser"
                )
                os_match = device.get("os") == request.device_info.get("os")
                screen_match = device.get(
                    "screen_resolution"
                ) == request.device_info.get("screen_resolution")

                # All three must match to consider it the same device
                if browser_match and os_match and screen_match:
                    return device, "similar", idx

        # Handle old format (string)
        elif isinstance(device, str):
            if device == request.device_id:
                return device, "exact_id_legacy", idx

    return None, None, None


def _update_device_entry(device, request, match_type, is_active=False):
    """Update device entry with latest information"""
    now = datetime.now().isoformat()

    # Convert old format to new format
    if isinstance(device, str):
        device = {
            "device_id": request.device_id,
            "device_name": request.device_name or "Legacy Device",
            "browser": request.device_info.get("browser")
            if request.device_info
            else None,
            "os": request.device_info.get("os") if request.device_info else None,
            "screen_resolution": request.device_info.get("screen_resolution")
            if request.device_info
            else None,
            "registered_at": now,
            "is_active": is_active,
        }

    # Update device_id if fingerprint matched (localStorage was cleared and new UUID generated)
    if match_type == "fingerprint":
        print(
            f"[DEVICE] Fingerprint match - updating device_id from {device.get('device_id')} to {request.device_id}"
        )
        device["device_id"] = request.device_id

    # Update device_id if similar device found (characteristics match)
    if match_type == "similar":
        print(
            f"[DEVICE] Similar device found - updating device_id from {device.get('device_id')} to {request.device_id}"
        )
        device["device_id"] = request.device_id

    # Update last_login
    device["last_login"] = now

    # Set is_active status
    device["is_active"] = is_active

    # Update device_name if provided
    if request.device_name:
        device["device_name"] = request.device_name

    # Update device_info fields if provided
    if request.device_info:
        device["browser"] = request.device_info.get("browser", device.get("browser"))
        device["os"] = request.device_info.get("os", device.get("os"))
        device["screen_resolution"] = request.device_info.get(
            "screen_resolution", device.get("screen_resolution")
        )
        device["device_type"] = request.device_info.get(
            "device_type", device.get("device_type")
        )
        device["viewport_size"] = request.device_info.get(
            "viewport_size", device.get("viewport_size")
        )
        device["touch_supported"] = request.device_info.get(
            "touch_supported", device.get("touch_supported")
        )
        device["user_agent"] = request.device_info.get(
            "user_agent", device.get("user_agent")
        )
        device["platform"] = request.device_info.get("platform", device.get("platform"))
        device["language"] = request.device_info.get("language", device.get("language"))
        device["timezone"] = request.device_info.get("timezone", device.get("timezone"))
        device["fingerprint"] = request.device_info.get(
            "fingerprint", device.get("fingerprint")
        )

    return device


def _create_device_entry(request, is_active=True):
    """Create a new device entry"""
    now = datetime.now().isoformat()

    device_entry = {
        "device_id": request.device_id,
        "device_name": request.device_name or "Unknown Device",
        "browser": request.device_info.get("browser") if request.device_info else None,
        "os": request.device_info.get("os") if request.device_info else None,
        "device_type": request.device_info.get("device_type")
        if request.device_info
        else None,
        "screen_resolution": request.device_info.get("screen_resolution")
        if request.device_info
        else None,
        "viewport_size": request.device_info.get("viewport_size")
        if request.device_info
        else None,
        "touch_supported": request.device_info.get("touch_supported")
        if request.device_info
        else None,
        "user_agent": request.device_info.get("user_agent")
        if request.device_info
        else None,
        "platform": request.device_info.get("platform")
        if request.device_info
        else None,
        "language": request.device_info.get("language")
        if request.device_info
        else None,
        "timezone": request.device_info.get("timezone")
        if request.device_info
        else None,
        "fingerprint": request.device_info.get("fingerprint")
        if request.device_info
        else None,
        "registered_at": request.device_info.get("registered_at")
        if request.device_info
        else now,
        "last_login": now,
        "is_active": is_active,
    }

    return device_entry


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Handle login flows:

    - Admin/Volunteer: provide `name` and `pin` with `is_admin=True`.
    - Attendee: provide `team_name`, `device_id`, and optionally `device_name` and `device_info`.

    Security: Devices are locked to their first registered team and cannot switch teams.
    """

    # Admin / Volunteer login (PIN-based)
    if request.is_admin:
        if not request.name or not request.pin:
            raise HTTPException(status_code=400, detail="Name and PIN required")

        name = request.name.strip()

        # PRIORITY 1: Check dedicated credential files (NEW SYSTEM)
        admin_credentials = load_admin_credentials()
        volunteer_credentials = load_volunteer_credentials()

        # Normalize keys to lowercase for case-insensitive lookup
        admin_creds_lower = {k.lower(): v for k, v in admin_credentials.items()}
        volunteer_creds_lower = {k.lower(): v for k, v in volunteer_credentials.items()}

        # Check admin credentials file
        if name.lower() in admin_creds_lower:
            stored_pin = str(admin_creds_lower[name.lower()].get("pin", ""))
            if str(request.pin) == stored_pin:
                print(f"✅ Admin login successful: {name} (from credentials file)")
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

        # Check volunteer credentials file
        if name.lower() in volunteer_creds_lower:
            stored_pin = str(volunteer_creds_lower[name.lower()].get("pin", ""))
            if str(request.pin) == stored_pin:
                print(f"✅ Volunteer login successful: {name} (from credentials file)")
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

        # PRIORITY 2: Fallback to game_state.json (LEGACY SUPPORT)
        gs = _load_game_state_json()
        admin_users = {k.lower(): v for k, v in gs.get("admin_users", {}).items()}
        volunteer_users = {
            k.lower(): v for k, v in gs.get("volunteer_users", {}).items()
        }

        # Check admin users in game_state.json
        if name.lower() in admin_users:
            stored_pin = str(admin_users[name.lower()].get("pin", ""))
            if str(request.pin) == stored_pin:
                print(
                    f"✅ Admin login successful: {name} (from game_state.json - LEGACY)"
                )
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

        # Check volunteer users in game_state.json
        if name.lower() in volunteer_users:
            stored_pin = str(volunteer_users[name.lower()].get("pin", ""))
            if str(request.pin) == stored_pin:
                print(
                    f"✅ Volunteer login successful: {name} (from game_state.json - LEGACY)"
                )
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

        # PRIORITY 3: Fallback to whitelist names (legacy without pins)
        admin_whitelist = load_admin_whitelist()
        volunteer_whitelist = load_volunteer_whitelist()

        if name.lower() in admin_whitelist:
            print(f"✅ Admin login successful: {name} (from whitelist - LEGACY)")
            return LoginResponse(
                success=True,
                name=name,
                team=None,
                is_admin=True,
                is_volunteer=False,
                message="Admin login (legacy) successful",
            )
        if name.lower() in volunteer_whitelist:
            print(f"✅ Volunteer login successful: {name} (from whitelist - LEGACY)")
            return LoginResponse(
                success=True,
                name=name,
                team=None,
                is_admin=False,
                is_volunteer=True,
                message="Volunteer login (legacy) successful",
            )

        print(f"❌ Login failed: {name} not found in any credential source")
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to access the admin panel. Contact the organizer.",
        )

    # Attendee login (team-based, device-limited with fingerprint duplicate prevention)
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

    # Check if team is disqualified
    gs = _load_game_state_json()
    team_data = gs.get("teams", {}).get(team_name, {})

    if team_data.get("disqualified", False):
        disqualification_reason = team_data.get(
            "disqualification_reason", "Unknown reason"
        )
        raise HTTPException(
            status_code=403,
            detail=f"Your team has been disqualified from the game. Reason: {disqualification_reason}",
        )

    # Load all devices
    devices = _load_devices()
    team_devices = devices.get(team_name, [])

    # SECURITY CHECK: Check if this device is already registered with another team
    fingerprint = (
        request.device_info.get("fingerprint") if request.device_info else None
    )
    is_in_other_team, other_team_name = _check_device_in_other_teams(
        devices, team_name, request.device_id, fingerprint
    )

    if is_in_other_team:
        print(
            f"[SECURITY] Device {request.device_id} attempted to access {team_name} but is registered with {other_team_name}"
        )
        raise HTTPException(
            status_code=403,
            detail=f"This device is already registered with {other_team_name}. A device cannot be used by multiple teams. Contact admin if this is an error.",
        )

    # Find matching device (exact ID, fingerprint, or similar characteristics)
    matched_device, match_type, device_idx = _find_matching_device(
        team_devices, request
    )

    if matched_device:
        # Device already registered with this team - update it
        print(f"[DEVICE] Match found - Type: {match_type}, Team: {team_name}")

        # Deactivate all other devices for this team (enforce single active device)
        for device in team_devices:
            device["is_active"] = False

        # Activate the current device
        updated_device = _update_device_entry(
            matched_device, request, match_type, is_active=True
        )
        team_devices[device_idx] = updated_device
        devices[team_name] = team_devices
        _save_devices(devices)

        print(
            f"[DEVICE] Device {request.device_id} activated for {team_name}. Other devices deactivated."
        )

        return LoginResponse(
            success=True,
            name="",
            team=team_name,
            is_admin=False,
            is_volunteer=False,
            message=f"Device recognized for {team_name}",
        )

    # No matching device found in this team - register as new device
    # Enforce max 3 devices per team
    if len(team_devices) >= 3:
        raise HTTPException(
            status_code=403,
            detail="Maximum devices reached for this team. Contact admin to remove a device.",
        )

    # Register new device with metadata
    print(f"[DEVICE] Registering new device for {team_name}")

    # Deactivate all other devices for this team (enforce single active device)
    for device in team_devices:
        device["is_active"] = False

    device_entry = _create_device_entry(request, is_active=True)

    team_devices.append(device_entry)
    devices[team_name] = team_devices
    _save_devices(devices)

    print(
        f"[DEVICE] Device {request.device_id} registered and activated for {team_name}. Other devices deactivated."
    )

    return LoginResponse(
        success=True,
        name="",
        team=team_name,
        is_admin=False,
        is_volunteer=False,
        message=f"Welcome to {team_name}! Device registered.",
    )


@router.post("/logout")
async def logout(request: LoginRequest):
    """
    Logout a device by deactivating it.
    Requires: team_name and device_id
    """
    if not request.team_name or not request.device_id:
        raise HTTPException(
            status_code=400, detail="team_name and device_id are required"
        )

    team_name = request.team_name.strip()

    # Load devices
    devices = _load_devices()
    team_devices = devices.get(team_name, [])

    if not team_devices:
        raise HTTPException(status_code=404, detail="No devices found for this team")

    # Find and deactivate the device
    device_found = False
    for device in team_devices:
        if isinstance(device, dict) and device.get("device_id") == request.device_id:
            device["is_active"] = False
            device_found = True
            print(f"[DEVICE] Device {request.device_id} logged out from {team_name}")
            break

    if not device_found:
        raise HTTPException(status_code=404, detail="Device not found for this team")

    # Save updated devices
    devices[team_name] = team_devices
    _save_devices(devices)

    return {"success": True, "message": "Device logged out successfully"}


@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Marvel Clue Hunt API"}
