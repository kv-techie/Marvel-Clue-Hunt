from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel


class Attendee(BaseModel):
    name: str
    team: Optional[str] = None


class PointAdjustment(BaseModel):
    timestamp: datetime
    adjusted_by: str
    amount: int
    reason: str
    adjustment_type: str  # "reward" or "deduct"


class Team(BaseModel):
    name: str
    members: List[str]
    character: Optional[str] = (
        None  # Character this team is assigned (e.g., "Iron Man", "Thor")
    )
    timer_started: Optional[datetime] = None
    hints_used: int = 0
    dialogue_1_completed: bool = False
    dialogue_1_time: Optional[int] = None
    dialogue_2_completed: bool = False
    dialogue_2_time: Optional[int] = None
    dialogue_3_completed: bool = False
    dialogue_3_time: Optional[int] = None
    qualified: bool = False
    enactment_bonus_awarded: bool = False
    enactment_bonus_amount: int = 0
    manual_adjustments: List[Dict] = []
    final_score: Optional[int] = None
    disqualified: bool = False
    disqualification_reason: Optional[str] = None
    disqualification_timestamp: Optional[datetime] = None
    disqualification_confirmed_by_admin: bool = False
    disqualification_acknowledged_by_team: bool = False
    tab_switch_logs: List[Dict] = []  # Track tab focus changes


class DialogueSubmission(BaseModel):
    team_name: str
    dialogue_number: int
    answer: str
    time_taken: int


class HintRequest(BaseModel):
    team_name: str
    dialogue_number: int


class GameState(BaseModel):
    global_start_time: Optional[datetime] = None
    game_active: bool = False
    teams: Dict[str, Team] = {}


class LoginRequest(BaseModel):
    # For admin/volunteer login: provide `name` and `pin` and set `is_admin` True
    # For attendee login: provide `team_name`, `device_id`, and optionally `device_name` and `device_info`
    name: Optional[str] = None
    pin: Optional[str] = None
    team_name: Optional[str] = None
    device_id: Optional[str] = None
    device_name: Optional[str] = None  # NEW - friendly device name
    device_info: Optional[dict] = (
        None  # NEW - full device metadata (browser, os, screen, etc.)
    )
    is_admin: bool = False


class LoginResponse(BaseModel):
    success: bool
    name: str
    team: Optional[str] = None
    is_admin: bool
    is_volunteer: bool = False
    message: str


class BonusRequest(BaseModel):
    bonus_amount: int


class PointsAdjustmentRequest(BaseModel):
    amount: int
    reason: str
    adjustment_type: str  # "reward" or "deduct"


class TabSwitchLog(BaseModel):
    team_name: str
    event_type: str  # "tab_left" or "tab_returned"
    timestamp: datetime
