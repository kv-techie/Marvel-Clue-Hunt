from datetime import datetime

from app.config import settings
from app.dialogue_manager import dialogue_manager
from app.models import DialogueSubmission, HintRequest, TabSwitchLog
from app.routes.admin import game_state, save_game_state
from app.scoring import (
    calculate_final_score,
    calculate_total_deductions,
    check_auto_disqualification,
    check_qualification,
)
from app.timer_manager import timer_manager
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.post("/start-timer/{team_name}")
async def start_team_timer(team_name: str):
    """Start timer when first team member logs in"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    if not timer_manager.is_game_active():
        raise HTTPException(status_code=400, detail="Game has not started yet")

    team = game_state.teams[team_name]

    if not team.timer_started:
        start_time = timer_manager.start_team_timer(team_name)
        team.timer_started = start_time
        save_game_state()

    return {"message": "Timer started", "timer_started": team.timer_started.isoformat()}


@router.get("/team-status/{team_name}")
async def get_team_status(team_name: str):
    """Get current status for a team"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    team = game_state.teams[team_name]
    # Prefer in-memory timer for accuracy; fall back to persisted team.timer_started
    elapsed_time = timer_manager.get_team_elapsed_time(team_name)
    if elapsed_time == 0 and team.timer_started:
        # team.timer_started may be a datetime or ISO string depending on load/save
        start = team.timer_started
        if isinstance(start, str):
            try:
                start = datetime.fromisoformat(start)
            except Exception:
                start = None

        if isinstance(start, datetime):
            elapsed_time = int((datetime.now() - start).total_seconds())
    is_auto_disqualified = check_auto_disqualification(team)

    return {
        "team_name": team_name,
        "members": team.members,
        "elapsed_time": elapsed_time,
        "hints_used": team.hints_used,
        "hints_remaining": settings.max_hints - team.hints_used,
        "dialogue_1_completed": team.dialogue_1_completed,
        "dialogue_2_completed": team.dialogue_2_completed,
        "dialogue_3_completed": team.dialogue_3_completed,
        "current_score": calculate_final_score(team),
        "qualified": check_qualification(team),
        "disqualified": team.disqualified,
        "disqualification_reason": team.disqualification_reason,
        "disqualification_acknowledged": team.disqualification_acknowledged_by_team,
        "disqualification_confirmed": team.disqualification_confirmed_by_admin,
        "total_deductions": calculate_total_deductions(team),
        "auto_disqualify_eligible": is_auto_disqualified,
    }


@router.post("/request-hint")
async def request_hint(request: HintRequest):
    """Request a hint (max 3 per team)"""

    if request.team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    team = game_state.teams[request.team_name]

    if not team.character:
        raise HTTPException(status_code=400, detail="Team character not assigned")

    if team.hints_used >= settings.max_hints:
        raise HTTPException(status_code=400, detail="Maximum hints already used")

    # Check if dialogue is already completed
    if request.dialogue_number == 1 and team.dialogue_1_completed:
        raise HTTPException(status_code=400, detail="Dialogue already completed")
    if request.dialogue_number == 2 and team.dialogue_2_completed:
        raise HTTPException(status_code=400, detail="Dialogue already completed")
    if request.dialogue_number == 3 and team.dialogue_3_completed:
        raise HTTPException(status_code=400, detail="Dialogue already completed")

    # Increment hints used
    team.hints_used += 1
    save_game_state()

    # Get hint based on how many hints have been used (1-indexed)
    hint_number = team.hints_used
    if hint_number > 3:
        hint_number = 3  # Cap at 3 hints

    hint_text = dialogue_manager.get_hint(
        team.character, request.dialogue_number, hint_number
    )

    if not hint_text:
        raise HTTPException(status_code=400, detail="Hint not available")

    return {
        "hint": hint_text,
        "hints_used": team.hints_used,
        "hints_remaining": settings.max_hints - team.hints_used,
        "penalty": settings.hint_penalty * team.hints_used,
    }


@router.post("/submit-dialogue")
async def submit_dialogue(submission: DialogueSubmission):
    """Submit answer for a dialogue round"""

    if submission.team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    team = game_state.teams[submission.team_name]

    if not team.character:
        raise HTTPException(status_code=400, detail="Team character not assigned")

    # Validate dialogue number
    if submission.dialogue_number not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="Invalid dialogue number")

    # Check if already completed
    if submission.dialogue_number == 1 and team.dialogue_1_completed:
        raise HTTPException(status_code=400, detail="Dialogue 1 already completed")
    if submission.dialogue_number == 2 and team.dialogue_2_completed:
        raise HTTPException(status_code=400, detail="Dialogue 2 already completed")
    if submission.dialogue_number == 3 and team.dialogue_3_completed:
        raise HTTPException(status_code=400, detail="Dialogue 3 already completed")

    # Check if previous dialogue is completed (except for dialogue 1)
    if submission.dialogue_number == 2 and not team.dialogue_1_completed:
        raise HTTPException(status_code=400, detail="Complete Dialogue 1 first")
    if submission.dialogue_number == 3 and not team.dialogue_2_completed:
        raise HTTPException(status_code=400, detail="Complete Dialogue 2 first")

    # Validate answer using dialogue manager
    is_correct = dialogue_manager.validate_answer(
        team.character, submission.dialogue_number, submission.answer
    )

    if not is_correct:
        return {"correct": False, "message": "Incorrect answer. Try again!"}

    # Mark as completed and record time
    if submission.dialogue_number == 1:
        team.dialogue_1_completed = True
        team.dialogue_1_time = submission.time_taken
    elif submission.dialogue_number == 2:
        team.dialogue_2_completed = True
        team.dialogue_2_time = submission.time_taken
    elif submission.dialogue_number == 3:
        team.dialogue_3_completed = True
        team.dialogue_3_time = submission.time_taken

    # Update qualification status
    team.qualified = check_qualification(team)

    save_game_state()

    return {
        "correct": True,
        "message": f"Dialogue {submission.dialogue_number} completed!",
        "time_taken": submission.time_taken,
        "current_score": calculate_final_score(team),
        "qualified": team.qualified,
    }


@router.get("/current-dialogue/{team_name}")
async def get_current_dialogue(team_name: str):
    """Get which dialogue the team should be working on"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    team = game_state.teams[team_name]

    if not team.dialogue_1_completed:
        return {"current_dialogue": 1, "message": "Work on Dialogue 1"}
    elif not team.dialogue_2_completed:
        return {"current_dialogue": 2, "message": "Work on Dialogue 2"}
    elif not team.dialogue_3_completed:
        return {"current_dialogue": 3, "message": "Work on Dialogue 3"}
    else:
        return {"current_dialogue": 0, "message": "All dialogues completed!"}


@router.get("/dialogue/{team_name}/{dialogue_number}")
async def get_dialogue(team_name: str, dialogue_number: int):
    """Get the clue for a specific dialogue for a team's character"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    team = game_state.teams[team_name]

    if not team.character:
        raise HTTPException(status_code=400, detail="Team character not assigned")

    if dialogue_number not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="Invalid dialogue number")

    clue = dialogue_manager.get_clue(team.character, dialogue_number)

    if not clue:
        raise HTTPException(status_code=404, detail="Dialogue not found")

    return {
        "dialogue_number": dialogue_number,
        "character": team.character,
        "clue": clue,
    }


@router.get("/team-character/{team_name}")
async def get_team_character(team_name: str):
    """Get the character assigned to a team"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    team = game_state.teams[team_name]

    return {
        "team_name": team_name,
        "character": team.character,
    }


@router.get("/available-characters")
async def get_available_characters():
    """Get list of all available characters"""
    characters = dialogue_manager.get_all_characters()
    return {
        "characters": sorted(characters),
        "count": len(characters),
    }


@router.post("/log-tab-switch")
async def log_tab_switch(request: TabSwitchLog):
    """Log when a team switches tabs or returns to the game

    Rules:
    - First 3 switches: Warning only, no deductions
    - 4th switch and beyond: -50 points per switch
    """

    if request.team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    team = game_state.teams[request.team_name]

    # Initialize tab_switch_logs if not present
    if not hasattr(team, "tab_switch_logs") or team.tab_switch_logs is None:
        team.tab_switch_logs = []

    # Only count "tab_left" as switches for deduction purposes
    if request.event_type == "tab_left":
        total_switches = (
            len([e for e in team.tab_switch_logs if e["event_type"] == "tab_left"]) + 1
        )

        # Apply deduction if beyond 3 switches
        deduction = 0
        if total_switches > 3:
            deduction = 50
            # Create a point adjustment for this switch
            adjustment = {
                "timestamp": request.timestamp.isoformat(),
                "adjusted_by": "SYSTEM",
                "amount": -deduction,
                "reason": f"Tab switch violation #{total_switches}",
                "adjustment_type": "deduct",
            }
            team.manual_adjustments.append(adjustment)

    # Log the tab switch event
    log_entry = {
        "timestamp": request.timestamp.isoformat(),
        "event_type": request.event_type,
    }

    team.tab_switch_logs.append(log_entry)
    save_game_state()

    total_left_switches = len(
        [e for e in team.tab_switch_logs if e["event_type"] == "tab_left"]
    )
    switches_remaining = max(0, 3 - total_left_switches)
    total_deductions = sum(
        adj["amount"]
        for adj in team.manual_adjustments
        if "Tab switch violation" in adj.get("reason", "")
    )

    return {
        "message": f"Tab switch event logged: {request.event_type}",
        "total_tab_left": total_left_switches,
        "switches_allowed_before_penalty": 3,
        "switches_remaining": switches_remaining,
        "penalty_per_overuse": 50,
        "total_deductions_from_switches": total_deductions,
        "is_penalized": total_left_switches > 3,
    }
