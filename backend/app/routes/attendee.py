import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from app.achievement_manager import evaluate_achievements, get_badge_details
from app.config import settings
from app.leaderboard_manager import update_team_stats
from app.models import HintRequest, QuestionSubmission, TabSwitchLog
from app.question_manager import question_manager
from app.routes.admin import (
    GAME_INACTIVE_MESSAGE,
    game_state,
    game_state_write_lock,
    is_game_currently_active,
    save_game_state,
)
from app.routes.common import ensure_active_team_device
from app.scoring import (
    calculate_combo_multiplier,
    calculate_final_score,
    calculate_final_score_questions,
    calculate_question_score,
    calculate_speed_multiplier,
    calculate_total_deductions,
    check_auto_disqualification,
    check_qualification,
)
from app.timer_manager import timer_manager

router = APIRouter()

INFINITY_STONES = [
    "Mind Stone",
    "Power Stone",
    "Time Stone",
    "Space Stone",
    "Reality Stone",
    "Soul Stone",
]

MAX_TIME_TAKEN_SECONDS = 3600
MIN_TIME_TAKEN_SECONDS = 1
CLIENT_SERVER_TIME_DELTA_WARN_SECONDS = 5


def _get_elapsed_seconds(team_name: str, team) -> int:
    elapsed = timer_manager.get_team_elapsed_time(team_name)
    if elapsed > 0:
        return elapsed

    start = team.timer_started
    if isinstance(start, str):
        try:
            start = datetime.fromisoformat(start)
        except Exception:
            start = None

    if isinstance(start, datetime):
        return max(0, int((datetime.now() - start).total_seconds()))

    return 0


def _get_authoritative_time_taken(team_name: str, team, client_time_taken: int) -> int:
    elapsed = _get_elapsed_seconds(team_name, team)
    consumed = sum((q.get("time_taken", 0) for q in team.questions_completed), 0)

    server_time_taken = max(
        MIN_TIME_TAKEN_SECONDS,
        elapsed - consumed,
    )
    server_time_taken = min(server_time_taken, MAX_TIME_TAKEN_SECONDS)

    if client_time_taken < 0 or client_time_taken > MAX_TIME_TAKEN_SECONDS:
        logging.warning(
            "Invalid client time_taken for %s: %s. Using server=%s",
            team_name,
            client_time_taken,
            server_time_taken,
        )
    elif (
        abs(client_time_taken - server_time_taken)
        >= CLIENT_SERVER_TIME_DELTA_WARN_SECONDS
    ):
        logging.info(
            "Client/server time delta for %s: client=%s server=%s",
            team_name,
            client_time_taken,
            server_time_taken,
        )

    return server_time_taken


def _normalize_powerup_effect(powerup_info):
    if not powerup_info:
        return None
    if powerup_info.get("id") == "truth_manifestation":
        return "certainty_check"
    return powerup_info.get("effect")


def _apply_time_powerup(time_taken: int, effect: Optional[str]) -> int:
    if effect == "add_time":
        return max(MIN_TIME_TAKEN_SECONDS, time_taken - 30)
    if effect == "slow_timer":
        return max(MIN_TIME_TAKEN_SECONDS, int(time_taken * 0.5))
    return time_taken


def _upgrade_difficulty(difficulty: str) -> str:
    order = ["easy", "medium", "hard"]
    try:
        idx = order.index(difficulty)
    except ValueError:
        return difficulty
    return order[min(idx + 1, len(order) - 1)]


def _enforce_active_access(team_name: str, x_device_id: Optional[str]):
    ensure_active_team_device(team_name, x_device_id)


def _enforce_game_active():
    if not is_game_currently_active():
        raise HTTPException(status_code=403, detail=GAME_INACTIVE_MESSAGE)


@router.post("/start-timer/{team_name}")
async def start_team_timer(
    team_name: str,
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
):
    """Start timer when first team member logs in"""
    from app.powerup_manager import powerup_manager

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    _enforce_active_access(team_name, x_device_id)
    _enforce_game_active()

    team = game_state.teams[team_name]

    if not team.timer_started:
        start_time = timer_manager.start_team_timer(team_name)
        team.timer_started = start_time

        # Initialize team-specific powerups if not already initialized
        if not team.powerups_available:
            powerup_manager.initialize_powerups_for_team(team)

        save_game_state()

    # Get current elapsed time based on global timer (not team's timer_started)
    elapsed_time = timer_manager.get_team_elapsed_time(team_name)

    return {
        "message": "Timer started",
        "timer_started": team.timer_started.isoformat(),
        "elapsed_time": elapsed_time,
    }


@router.get("/team-status/{team_name}")
async def get_team_status(
    team_name: str,
        x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
):
    """Get current status for a team"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    _enforce_active_access(team_name, x_device_id)

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
    question_results = [
        {
            "question_index": item.get("question_index"),
            "correct": bool(item.get("correct", False)),
        }
        for item in team.questions_completed
        if isinstance(item, dict)
    ]

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
        "question_results": question_results,
    }


@router.post("/log-tab-switch")
async def log_tab_switch(request: TabSwitchLog):
    """Log when a team switches tabs or returns to the game

    Rules:
    - First 3 switches: Warning only, no deductions
    - 4th switch and beyond: -50 points per switch
    - Tab switches NOT logged after game is stopped
    """

    # Do not log tab switches if game has been stopped
    if not game_state.game_active:
        return {"message": "Game has ended. Tab switch not logged.", "logged": False}

    if request.team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    with game_state_write_lock():
        team = game_state.teams[request.team_name]

        # Initialize tab_switch_logs if not present
        if not hasattr(team, "tab_switch_logs") or team.tab_switch_logs is None:
            team.tab_switch_logs = []

        # Only count "tab_left" as switches for deduction purposes
        if request.event_type == "tab_left":
            total_switches = (
                len([e for e in team.tab_switch_logs if e["event_type"] == "tab_left"])
                + 1
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


# ===================== INFINITY STONE QUESTION-BASED ENDPOINTS =====================


@router.get("/current-question/{team_name}")
async def get_current_question(
    team_name: str,
        x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
):
    """Get the current question for a team (based on their stone and progress)"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    _enforce_active_access(team_name, x_device_id)
    _enforce_game_active()

    team = game_state.teams[team_name]

    if not team.stone:
        assigned_stone = team_name if team_name in INFINITY_STONES else None
        if assigned_stone:
            team.stone = assigned_stone
            save_game_state()
        else:
            raise HTTPException(status_code=400, detail="Team stone not assigned")

    if team.current_question_index >= 10:
        return {
            "completed": True,
            "message": "All 10 questions completed!",
            "total_completed": 10,
            "current_score": calculate_final_score_questions(team),
        }

    # Get current question
    question = question_manager.get_current_question(
        team.stone, team.current_question_index
    )

    if not question:
        raise HTTPException(status_code=500, detail="Question retrieval error")

    return {
        "question_id": question["id"],
        "question_index": team.current_question_index,
        "total_questions": 10,
        "question_text": question["question_text"],
        "clue_1": question["clue_1"],
        "clue_2": question["clue_2"],
        "difficulty": question["difficulty"],
        "base_points": question["base_points"],
        "hint_text": question.get("hint_text", ""),
        "hints_remaining": max(0, 3 - team.hints_used_count),
        "powerups_available": team.powerups_available,
        "powerups_used": team.powerups_used,
    }


@router.post("/submit-question")
async def submit_question(
    submission: QuestionSubmission,
        x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
):
    """Submit answer to current question"""
    try:
        _enforce_active_access(submission.team_name, x_device_id)
        _enforce_game_active()

        if submission.team_name not in game_state.teams:
            raise HTTPException(status_code=404, detail="Team not found")

        team = game_state.teams[submission.team_name]

        if not team.stone:
            raise HTTPException(status_code=400, detail="Team stone not assigned")

        # Get the question
        question = question_manager.get_question(submission.question_id)
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")

        with game_state_write_lock():
            team = game_state.teams[submission.team_name]
            powerup_info = None
            powerup_effect = None
            if submission.powerup_used:
                from app.powerup_manager import powerup_manager

                powerup_info = powerup_manager.get_powerup_info(
                    submission.team_name, submission.powerup_used
                )
                powerup_effect = _normalize_powerup_effect(powerup_info)

                if not team.powerups_available.get(submission.powerup_used, False):
                    raise HTTPException(
                        status_code=400,
                        detail="Selected powerup is not available.",
                    )

            if powerup_effect in ("skip_question", "skip_penalty_free"):
                team.questions_completed.append(
                    {
                        "question_id": submission.question_id,
                        "question_index": team.current_question_index,
                        "correct": True,
                        "time_taken": 0,
                        "points": 0,
                        "combo_multiplier": team.current_combo,
                        "powerup_used": submission.powerup_used,
                        "hints_used": 0,
                        "skipped": True,
                    }
                )
                team.powerups_used.append(submission.powerup_used)
                team.powerups_available[submission.powerup_used] = False
                team.current_question_index += 1
                save_game_state()

                return {
                    "correct": True,
                    "skipped": True,
                    "message": "Question skipped without penalty.",
                    "current_question_index": team.current_question_index,
                    "questions_completed": team.current_question_index,
                    "next_question_ready": team.current_question_index < 10,
                    "powerup_used": submission.powerup_used,
                    "powerups_available": team.powerups_available,
                }

            authoritative_time_taken = _get_authoritative_time_taken(
                submission.team_name, team, submission.time_taken
            )
            adjusted_time_taken = _apply_time_powerup(
                authoritative_time_taken, powerup_effect
            )

            similarity_threshold = 0.85
            if powerup_effect in ("fuzzy_match_boost", "typo_correction"):
                similarity_threshold = 0.7

            # Check if answer is correct
            is_correct = question_manager.validate_answer(
                submission.question_id,
                submission.answer,
                similarity_threshold=similarity_threshold,
            )

            if not is_correct:
                # Store the wrong answer (still counts as attempted)
                question_data = {
                    "question_id": submission.question_id,
                    "question_index": team.current_question_index,
                    "correct": False,
                    "time_taken": adjusted_time_taken,
                    "points": 0,
                    "combo_multiplier": 1.0,
                    "powerup_used": submission.powerup_used,
                    "hints_used": 0,
                }
                team.questions_completed.append(question_data)

                preserve_streak = powerup_effect == "prevent_streak_break"
                preserve_combo = powerup_effect == "preserve_combo"

                if not preserve_streak:
                    team.current_streak = 0
                if not preserve_combo:
                    team.current_combo = 1.0

                if submission.powerup_used:
                    team.powerups_used.append(submission.powerup_used)
                    team.powerups_available[submission.powerup_used] = False

                if powerup_effect == "restore_hint":
                    team.hints_used_count = max(0, team.hints_used_count - 1)

                # Move to next question anyway (quiz doesn't lock you on wrong answers)
                team.current_question_index += 1
                save_game_state()

                return {
                    "correct": False,
                    "message": "Incorrect answer. Moving to next question...",
                    "current_question_index": team.current_question_index,
                    "questions_completed": team.current_question_index,
                    "next_question_ready": team.current_question_index < 10,
                    "powerup_used": submission.powerup_used,
                    "streak_broken": True,
                    "current_streak": team.current_streak,
                    "current_total_score": calculate_final_score_questions(team),
                    "time_taken_used": adjusted_time_taken,
                    "client_time_taken": submission.time_taken,
                }

            # Calculate combo multiplier based on speed and previous correct
            previous_correct = len(
                team.questions_completed
            ) > 0 and team.questions_completed[-1].get("correct", False)
            combo_mult = calculate_combo_multiplier(
                adjusted_time_taken, previous_correct
            )

            # Update streak on correct answer
            team.current_streak += 1
            team.best_streak = max(team.best_streak, team.current_streak)

            # Update combo multiplier (cap at 3x + bonuses)
            if powerup_effect == "combo_boost":
                team.combo_cap_bonus += 0.5
            combo_cap = 3.0 + team.combo_cap_bonus
            team.current_combo = min(team.current_combo * combo_mult, combo_cap)

            # Calculate score with speed multiplier and combo
            difficulty_for_score = question["difficulty"]
            if powerup_effect == "difficulty_reduction":
                difficulty_for_score = _upgrade_difficulty(difficulty_for_score)

            question_score = calculate_question_score(
                base_points=question["base_points"],
                time_taken=adjusted_time_taken,
                difficulty=difficulty_for_score,
                hints_used=0,  # Hint deductions handled separately
                combo_multiplier=team.current_combo,
            )

            # Apply powerup bonus if used
            if powerup_effect in ("score_multiplier_2x", "points_multiplier_2x"):
                question_score *= 2

            if powerup_effect == "restore_hint":
                team.hints_used_count = max(0, team.hints_used_count - 1)

            if submission.powerup_used:
                team.powerups_used.append(submission.powerup_used)
                team.powerups_available[submission.powerup_used] = False

            # Store completed question
            question_data = {
                "question_id": submission.question_id,
                "question_index": team.current_question_index,
                "correct": True,
                "time_taken": adjusted_time_taken,
                "points": question_score,
                "combo_multiplier": team.current_combo,
                "powerup_used": submission.powerup_used,
                "hints_used": 0,
            }
            team.questions_completed.append(question_data)

            # AWARD POWERUPS BASED ON PERFORMANCE
            from app.powerup_manager import powerup_manager

            powerups_awarded = []
            team_powerups = powerup_manager.get_team_powerups(submission.team_name)

            if len(team_powerups) >= 3:
                powerup_1_id = team_powerups[0]["id"]
                powerup_2_id = team_powerups[1]["id"]
                powerup_3_id = team_powerups[2]["id"]

                # Award for lightning speed (< 10 seconds) - Unlock 1st powerup
                if (
                    adjusted_time_taken < 10
                    and not team.powerups_available.get(powerup_1_id, False)
                    and powerup_1_id not in team.powerups_used
                ):
                    team.powerups_available[powerup_1_id] = True
                    powerups_awarded.append(
                        f"{team_powerups[0]['name']} ⚡ (Lightning Speed!)"
                    )

                # Award for building a streak (3+ consecutive correct) - Unlock 2nd powerup
                if (
                    team.current_streak >= 3
                    and not team.powerups_available.get(powerup_2_id, False)
                    and powerup_2_id not in team.powerups_used
                ):
                    team.powerups_available[powerup_2_id] = True
                    powerups_awarded.append(
                        f"{team_powerups[1]['name']} 🔥 (Streak Unlocked!)"
                    )

                # Award for high combo multiplier (2.0x or higher) - Unlock 3rd powerup
                if (
                    team.current_combo >= 2.0
                    and not team.powerups_available.get(powerup_3_id, False)
                    and powerup_3_id not in team.powerups_used
                ):
                    team.powerups_available[powerup_3_id] = True
                    powerups_awarded.append(
                        f"{team_powerups[2]['name']} 💫 (Combo Mastery!)"
                    )

            # Convert team to dict for manager functions (they expect dicts)
            team_dict = team.dict()
            team_dict["questions_completed"] = team.questions_completed
            team_dict["achievements"] = team.achievements
            team_dict["badges_earned"] = team.badges_earned

            # Check for achievements
            new_badges = evaluate_achievements(team_dict, question_data)
            # Update badges back to team object
            team.badges_earned = team_dict.get("badges_earned", [])
            team.achievements = team_dict.get("achievements", {})
            badge_details = [
                {"id": b, "data": get_badge_details(b)} for b in new_badges
            ]

            if powerup_effect == "global_point_share" and question_score > 0:
                share_amount = int(question_score * 0.15)
                for other_name, other_team in game_state.teams.items():
                    if other_name == submission.team_name:
                        continue
                    other_team.manual_adjustments.append(
                        {
                            "timestamp": datetime.utcnow().isoformat(),
                            "adjusted_by": "SYSTEM",
                            "amount": share_amount,
                            "reason": f"Soul Bond share from {submission.team_name}",
                            "adjustment_type": "reward",
                        }
                    )

            # Update team stats for leaderboard (now works with both dict and Pydantic)
            update_team_stats(team)

            # Move to next question
            team.current_question_index += 1
            save_game_state()

            return {
                "correct": True,
                "message": f"Correct! Question {team.current_question_index} of 10 completed!"
                + (
                    f" Earned: {', '.join(powerups_awarded)}!"
                    if powerups_awarded
                    else ""
                ),
                "score_earned": question_score,
                "speed_multiplier": calculate_speed_multiplier(
                    adjusted_time_taken, difficulty_for_score
                ),
                "combo_multiplier": team.current_combo,
                "current_streak": team.current_streak,
                "best_streak": team.best_streak,
                "current_total_score": calculate_final_score_questions(team),
                "questions_completed": team.current_question_index,
                "next_question_ready": team.current_question_index < 10,
                "badges_earned": badge_details,
                "all_badges": team.badges_earned,
                "powerups_awarded": powerups_awarded,
                "powerups_available": team.powerups_available,
                "time_taken_used": adjusted_time_taken,
                "client_time_taken": submission.time_taken,
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [ERROR] submit_question failed: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/team-powerups/{team_name}")
async def get_team_powerups(
    team_name: str,
        x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
):
    """Get powerup information for a team"""
    from app.powerup_manager import powerup_manager

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    _enforce_active_access(team_name, x_device_id)

    team = game_state.teams[team_name]

    # Get team's powerup definitions
    powerups = powerup_manager.get_team_powerups(team_name)

    # Build response with powerup details
    powerup_details = []
    for powerup in powerups:
        powerup_details.append(
            {
                "id": powerup["id"],
                "name": powerup["name"],
                "description": powerup["description"],
                "effect": powerup["effect"],
                "available": team.powerups_available.get(powerup["id"], False),
                "used": powerup["id"] in team.powerups_used,
            }
        )

    return {
        "team_name": team_name,
        "powerups": powerup_details,
    }


@router.post("/request-hint-question")
async def request_hint_question(
    request: HintRequest,
        x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
):
    """Request a hint for current question (max 3 per session)"""

    if request.team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    _enforce_active_access(request.team_name, x_device_id)
    _enforce_game_active()

    # Get the question
    question = question_manager.get_question(request.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Get hint
    hint_text = question_manager.get_hint(request.question_id)

    with game_state_write_lock():
        team = game_state.teams[request.team_name]

        if team.hints_used_count >= 3:
            raise HTTPException(
                status_code=400,
                detail="Maximum hints (3) already used for this session",
            )

        # Increment hint counter
        team.hints_used_count += 1
        save_game_state()

        return {
            "hint": hint_text,
            "hints_used": team.hints_used_count,
            "hints_remaining": max(0, 3 - team.hints_used_count),
            "hint_penalty": settings.hint_penalty,
            "penalty_applied_to_score": True,
        }


@router.post("/certainty-check")
async def certainty_check(
    team_name: str,
    question_id: str,
    submitted_answer: str,
        x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
):
    """Reality Stone PowerUp: Check answer confidence before submitting"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    _enforce_active_access(team_name, x_device_id)
    _enforce_game_active()

    team = game_state.teams[team_name]

    from app.powerup_manager import powerup_manager

    team_powerups = powerup_manager.get_team_powerups(team_name)
    certainty_powerup = next(
        (p for p in team_powerups if _normalize_powerup_effect(p) == "certainty_check"),
        None,
    )

    if not certainty_powerup:
        raise HTTPException(status_code=400, detail="Certainty Check not available")

    powerup_id = certainty_powerup["id"]
    if not team.powerups_available.get(powerup_id, False):
        raise HTTPException(status_code=400, detail="Certainty Check not available")

    if powerup_id in team.powerups_used:
        raise HTTPException(status_code=400, detail="Certainty Check already used")

    with game_state_write_lock():
        team = game_state.teams[team_name]
        if powerup_id in team.powerups_used or not team.powerups_available.get(
            powerup_id, False
        ):
            raise HTTPException(status_code=400, detail="Certainty Check not available")
        powerup_manager.use_powerup(team, powerup_id)
        save_game_state()

    # Get feedback on answer
    feedback = question_manager.get_answer_quality_feedback(
        question_id, submitted_answer
    )

    return {
        "feedback": feedback,
        "powerup_name": certainty_powerup["name"],
        "can_revise": True,
    }


@router.get("/team-stone/{team_name}")
async def get_team_stone(
    team_name: str,
        x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
):
    """Get the Infinity Stone assigned to a team"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    _enforce_active_access(team_name, x_device_id)

    team = game_state.teams[team_name]

    return {
        "team_name": team_name,
        "stone": team.stone,
        "current_question_index": team.current_question_index,
        "questions_completed": len(team.questions_completed),
        "hints_used": team.hints_used_count,
        "hints_remaining": max(0, 3 - team.hints_used_count),
        "powerups_available": team.powerups_available,
        "current_score": calculate_final_score_questions(team),
        "current_streak": team.current_streak,
        "best_streak": team.best_streak,
    }


@router.get("/available-stones")
async def get_available_stones():
    """Get list of all available Infinity Stones"""
    stones = question_manager.get_all_stone_names()
    return {
        "stones": sorted(stones),
        "count": len(stones),
    }


@router.get("/team-badges/{team_name}")
async def get_team_badges(
    team_name: str,
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
):
    """Get badges and achievements for a team"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    _enforce_active_access(team_name, x_device_id)

    team = game_state.teams[team_name]

    badge_details = [
        {"id": badge_id, "details": get_badge_details(badge_id)}
        for badge_id in team.badges_earned
    ]

    return {
        "team_name": team_name,
        "badges_earned": badge_details,
        "badge_count": len(badge_details),
        "achievements": team.achievements,
        "current_streak": team.current_streak,
        "best_streak": team.best_streak,
    }


@router.get("/leaderboard")
async def get_leaderboard(sort_by: str = "total_points_earned"):
    """Get full leaderboard with team rankings"""

    from app.leaderboard_manager import get_leaderboard

    leaderboard = get_leaderboard(game_state.teams, sort_by)

    return {
        "leaderboard": leaderboard,
        "sort_by": sort_by,
        "total_teams": len(leaderboard),
    }


@router.get("/team-rank/{team_name}")
async def get_team_rank(team_name: str, sort_by: str = "total_points_earned"):
    """Get a specific team's rank and nearby teams"""

    from app.leaderboard_manager import get_team_rank

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    rank_data = get_team_rank(game_state.teams, team_name, sort_by)

    return rank_data


@router.get("/leaderboard-stats")
async def get_leaderboard_stats():
    """Get overall leaderboard statistics"""

    from app.leaderboard_manager import get_stats_comparison

    stats = get_stats_comparison(game_state.teams)

    return stats
