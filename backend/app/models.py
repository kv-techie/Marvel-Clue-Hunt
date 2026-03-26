from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


class Attendee(BaseModel):
    name: str
    team: Optional[str] = None
    favorite_character: Optional[str] = None  # Character preference for team allocation


class PointAdjustment(BaseModel):
    timestamp: datetime
    adjusted_by: str
    amount: int
    reason: str
    adjustment_type: str  # "reward" or "deduct"


class Team(BaseModel):
    name: str
    members: List[str]
    stone: Optional[str] = (
        None  # Infinity Stone assigned to team (Mind, Power, Time, Space, Reality, Soul)
    )
    timer_started: Optional[datetime] = None
    game_started: Optional[datetime] = None

    # Question-based gameplay
    current_question_index: int = 0  # Current question number (0-9)
    questions_completed: List[Dict] = Field(
        default_factory=list
    )  # Track which questions completed and scores
    hints_used_count: int = 0  # Global hint counter (max 3 per session)

    # Legacy dialogue fields (for backward compatibility)
    dialogue_1_completed: bool = False
    dialogue_2_completed: bool = False
    dialogue_3_completed: bool = False
    dialogue_1_time: Optional[int] = None
    dialogue_2_time: Optional[int] = None
    dialogue_3_time: Optional[int] = None
    hints_used: int = 0  # Legacy field (use hints_used_count instead)
    enactment_bonus_awarded: bool = False
    enactment_bonus_amount: int = 0

    # PowerUp tracking - team-specific powerups loaded from powerups.json
    powerups_available: Dict[str, bool] = Field(
        default_factory=dict
    )  # Team-specific powerups {id: is_available}
    powerups_used: List[str] = Field(
        default_factory=list
    )  # Track which powerup IDs have been used
    active_powerup_effect: Optional[Dict] = (
        None  # Current active powerup (for multi-question effects)
    )

    # Gamification - Streaks & Combos
    current_streak: int = 0  # Consecutive correct answers
    best_streak: int = 0  # Best streak in this session
    current_combo: float = (
        1.0  # Combo multiplier for consecutive fast answers (starts at 1x)
    )
    combo_cap_bonus: float = 0.0  # Permanent bonus to combo cap (Power Stone)
    last_answer_time: Optional[int] = None  # Time of last answer in seconds

    # Gamification - Badges & Achievements
    badges_earned: List[str] = Field(default_factory=list)  # List of earned badge IDs
    achievements: Dict[str, Any] = Field(
        default_factory=lambda: {
            "50_points_total": False,
            "100_points_total": False,
            "perfect_score": False,  # 100% on a question
            "speed_demon": False,  # All questions < 20s
            "streak_5": False,  # 5 consecutive correct
            "combo_master": False,  # 3x combo achieved
            "powerup_champion": False,  # Used all 3 powerups
            "flawless_game": False,  # No hints used, all correct
            "hint_hero": False,  # Used all 3 hints effectively (high accuracy)
            "stone_sage": False,  # All 10 questions correct
        }
    )  # Achievement progress tracking

    # Leaderboard stats
    questions_answered_correctly: int = 0
    total_questions_answered: int = 0
    accuracy_percentage: float = 0.0
    total_points_earned: int = 0
    average_answer_time: float = 0.0

    # Legacy fields (preserved for admin/volunteer functionality)
    qualified: bool = False
    manual_adjustments: List[Dict] = Field(default_factory=list)
    final_score: Optional[int] = None
    disqualified: bool = False
    disqualification_reason: Optional[str] = None
    disqualification_timestamp: Optional[datetime] = None
    disqualification_confirmed_by_admin: bool = False
    disqualification_acknowledged_by_team: bool = False
    tab_switch_logs: List[Dict] = Field(default_factory=list)  # Track tab focus changes


class Question(BaseModel):
    id: str
    question_text: str
    clue_1: str
    clue_2: str
    hint_text: str
    correct_answer: str
    base_points: int
    difficulty: str


class PowerUp(BaseModel):
    id: str
    stone: str
    name: str
    description: str
    effect_type: str  # "points", "time", "hint", "protection", "info"
    effect_value: Optional[int] = None
    used: bool = False


class QuestionSubmission(BaseModel):
    team_name: str
    question_id: str
    answer: str
    time_taken: int  # elapsed seconds from client timer
    powerup_used: Optional[str] = None  # Which powerup was used with this answer

    @validator("time_taken")
    def validate_time_taken(cls, value):
        if value < 0:
            raise ValueError("time_taken must be >= 0")
        return value


class DialogueSubmission(BaseModel):
    team_name: str
    question_id: str
    answer: str
    time_taken: int

    @validator("time_taken")
    def validate_dialogue_time_taken(cls, value):
        if value < 0:
            raise ValueError("time_taken must be >= 0")
        return value


class HintRequest(BaseModel):
    team_name: str
    question_id: str


class GameState(BaseModel):
    global_start_time: Optional[datetime] = None
    game_active: bool = False
    teams: Dict[str, Team] = Field(default_factory=dict)


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


class PowerupActivateRequest(BaseModel):
    team_name: str
    question_id: str
    powerup_id: str
