from datetime import datetime

from app.routes.admin import add_audit_log, game_state, save_game_state
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/teams")
async def get_volunteer_teams():
    """Get all teams overview for volunteer monitoring"""

    teams_data = []

    for team_name, team in game_state.teams.items():
        teams_data.append(
            {
                "name": team.name,
                "members": team.members,
                "member_count": len(team.members),
                "active_devices": len(team.active_devices),
                "hints_used": team.hints_used,
                "timer_started": team.timer_started,
                "dialogues_completed": sum(
                    [
                        team.dialogue_1_completed,
                        team.dialogue_2_completed,
                        team.dialogue_3_completed,
                    ]
                ),
                "current_dialogue": team.current_dialogue,
                "score": team.score,
                "qualified": team.qualified,
                "disqualified": team.disqualified,
            }
        )

    # Sort by team name
    teams_data.sort(key=lambda x: x["name"])

    return {
        "teams": teams_data,
        "total_teams": len(teams_data),
        "game_active": game_state.game_active,
    }


@router.get("/team/{team_name}")
async def get_volunteer_team_details(team_name: str):
    """Get detailed information about a specific team"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    team = game_state.teams[team_name]

    return {
        "name": team.name,
        "members": team.members,
        "active_devices": len(team.active_devices),
        "max_devices": team.max_devices,
        "hints_used": team.hints_used,
        "timer_started": team.timer_started,
        "timer_start_time": team.timer_start_time,
        "dialogue_1_completed": team.dialogue_1_completed,
        "dialogue_2_completed": team.dialogue_2_completed,
        "dialogue_3_completed": team.dialogue_3_completed,
        "dialogue_1_time": team.dialogue_1_time,
        "dialogue_2_time": team.dialogue_2_time,
        "dialogue_3_time": team.dialogue_3_time,
        "current_dialogue": team.current_dialogue,
        "score": team.score,
        "qualified": team.qualified,
        "enactment_bonus_awarded": team.enactment_bonus_awarded,
        "disqualified": team.disqualified,
        "disqualification_reason": team.disqualification_reason,
        "hint_requests": team.hint_requests,
    }


@router.get("/game-status")
async def get_volunteer_game_status():
    """Get current game status for volunteer view"""

    active_teams = sum(1 for team in game_state.teams.values() if team.timer_started)
    qualified_teams = sum(1 for team in game_state.teams.values() if team.qualified)
    disqualified_teams = sum(
        1 for team in game_state.teams.values() if team.disqualified
    )

    return {
        "game_active": game_state.game_active,
        "game_paused": game_state.game_paused,
        "global_start_time": game_state.global_start_time,
        "total_teams": len(game_state.teams),
        "active_teams": active_teams,
        "qualified_teams": qualified_teams,
        "disqualified_teams": disqualified_teams,
    }


@router.post("/provide-hint")
async def provide_hint(
    team_name: str, dialogue_number: int, hint: str, provided_by: str
):
    """Manually provide a hint to a team (volunteer action)"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    team = game_state.teams[team_name]

    if team.disqualified:
        raise HTTPException(
            status_code=400, detail="Cannot provide hint to disqualified team"
        )

    # Record hint
    hint_record = {
        "dialogue_number": dialogue_number,
        "hint": hint,
        "provided_by": provided_by,
        "timestamp": datetime.now().isoformat(),
    }

    team.hint_requests.append(hint_record)
    team.hints_used += 1

    # Recalculate score
    from app.scoring import calculate_score, check_qualification

    team.score = calculate_score(team)
    team.qualified = check_qualification(team)

    add_audit_log(
        "provide_hint",
        provided_by,
        f"Hint provided to '{team_name}' for dialogue {dialogue_number}",
        team_name,
    )

    save_game_state()

    return {
        "message": f"Hint provided to {team_name}",
        "total_hints_used": team.hints_used,
        "new_score": team.score,
    }


@router.post("/verify-answer")
async def verify_answer(
    team_name: str, dialogue_number: int, is_correct: bool, verified_by: str
):
    """Manually verify a team's answer (volunteer action)"""

    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")

    team = game_state.teams[team_name]

    if team.disqualified:
        raise HTTPException(
            status_code=400, detail="Cannot verify answer for disqualified team"
        )

    if not team.timer_started:
        raise HTTPException(
            status_code=400, detail="Team hasn't started their timer yet"
        )

    # Calculate time elapsed
    if team.timer_start_time:
        time_elapsed = int((datetime.now() - team.timer_start_time).total_seconds())
    else:
        time_elapsed = 0

    # Mark dialogue as completed if correct
    if is_correct:
        if dialogue_number == 1:
            team.dialogue_1_completed = True
            team.dialogue_1_time = time_elapsed
        elif dialogue_number == 2:
            team.dialogue_2_completed = True
            team.dialogue_2_time = time_elapsed
        elif dialogue_number == 3:
            team.dialogue_3_completed = True
            team.dialogue_3_time = time_elapsed

        # Update current dialogue
        team.current_dialogue = dialogue_number + 1

        # Recalculate score and qualification
        from app.scoring import calculate_score, check_qualification

        team.score = calculate_score(team)
        team.qualified = check_qualification(team)

    add_audit_log(
        "verify_answer",
        verified_by,
        f"Answer {'verified as correct' if is_correct else 'marked as incorrect'} for '{team_name}' dialogue {dialogue_number}",
        team_name,
    )

    save_game_state()

    return {
        "message": f"Answer {'verified' if is_correct else 'marked as incorrect'}",
        "is_correct": is_correct,
        "dialogue_completed": is_correct,
        "time_elapsed": time_elapsed,
        "new_score": team.score,
        "qualified": team.qualified,
    }


@router.get("/leaderboard")
async def get_volunteer_leaderboard():
    """Get current leaderboard for volunteer monitoring"""

    leaderboard = []

    for team_name, team in game_state.teams.items():
        leaderboard.append(
            {
                "team_name": team.name,
                "score": team.score,
                "dialogues_completed": sum(
                    [
                        team.dialogue_1_completed,
                        team.dialogue_2_completed,
                        team.dialogue_3_completed,
                    ]
                ),
                "hints_used": team.hints_used,
                "qualified": team.qualified,
                "disqualified": team.disqualified,
                "timer_started": team.timer_started,
            }
        )

    # Sort by score (descending)
    leaderboard.sort(key=lambda x: x["score"], reverse=True)

    # Add ranks
    for i, entry in enumerate(leaderboard, 1):
        entry["rank"] = i

    return {"leaderboard": leaderboard, "total_teams": len(leaderboard)}


@router.get("/statistics")
async def get_volunteer_statistics():
    """Get game statistics for volunteer monitoring"""

    total_dialogues = sum(
        team.dialogue_1_completed
        + team.dialogue_2_completed
        + team.dialogue_3_completed
        for team in game_state.teams.values()
    )

    total_hints = sum(team.hints_used for team in game_state.teams.values())

    teams_started = sum(1 for team in game_state.teams.values() if team.timer_started)
    teams_qualified = sum(1 for team in game_state.teams.values() if team.qualified)
    teams_disqualified = sum(
        1 for team in game_state.teams.values() if team.disqualified
    )

    return {
        "total_teams": len(game_state.teams),
        "teams_started": teams_started,
        "teams_qualified": teams_qualified,
        "teams_disqualified": teams_disqualified,
        "total_dialogues_completed": total_dialogues,
        "total_hints_used": total_hints,
        "game_active": game_state.game_active,
        "game_paused": game_state.game_paused,
    }
