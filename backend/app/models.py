from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

class Attendee(BaseModel):
    name: str
    team: Optional[str] = None

class Team(BaseModel):
    name: str
    members: List[str]
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
    final_score: Optional[int] = None

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
    name: str
    is_admin: bool = False

class LoginResponse(BaseModel):
    success: bool
    name: str
    team: Optional[str] = None
    is_admin: bool
    message: str