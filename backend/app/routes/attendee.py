from app.config import settings
from app.models import DialogueSubmission, HintRequest
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

# Correct answers for dialogues (customize these)
CORRECT_ANSWERS = {1: "iron man", 2: "thanos", 3: "avengers"}

HINTS = {
    1: [
        "This hero wears a red and gold suit",
        "He's a genius billionaire philanthropist",
        "His real name is Tony Stark",
    ],
    2: [
        "The Mad Titan seeking balance",
        "He snapped his fingers",
        "Infinity Gauntlet wielder",
    ],
    3: [
        "Earth's Mightiest Heroes",
        "A team assembled by Nick Fury",
        "They fought in Endgame",
    ],
}


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
    elapsed_time = timer_manager.get_team_elapsed_time(team_name)
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

    # Get hint based on how many hints have been used
    hint_index = team.hints_used - 1
    hint_text = HINTS[request.dialogue_number][hint_index]

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

    # Validate answer
    correct_answer = CORRECT_ANSWERS[submission.dialogue_number]
    is_correct = submission.answer.strip().lower() == correct_answer.lower()

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
