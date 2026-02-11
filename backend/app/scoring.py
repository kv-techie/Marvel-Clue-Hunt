from typing import Dict

from app.config import settings
from app.models import Team


def calculate_dialogue_score(dialogue_number: int, time_taken: int) -> int:
    """Calculate score based on dialogue number and time taken (in seconds)"""

    if dialogue_number == 1:
        if time_taken <= settings.dialogue_1_excellent:
            return 100
        elif time_taken <= settings.dialogue_1_good:
            return 80
        else:
            return 60

    elif dialogue_number == 2:
        if time_taken <= settings.dialogue_2_excellent:
            return 100
        elif time_taken <= settings.dialogue_2_good:
            return 80
        else:
            return 60

    elif dialogue_number == 3:
        if time_taken <= settings.dialogue_3_excellent:
            return 100
        elif time_taken <= settings.dialogue_3_good:
            return 80
        else:
            return 60

    return 0


def calculate_final_score(team: Team) -> int:
    """Calculate final score for a team"""
    score = 0

    # Add dialogue scores
    if team.dialogue_1_completed and team.dialogue_1_time:
        score += calculate_dialogue_score(1, team.dialogue_1_time)

    if team.dialogue_2_completed and team.dialogue_2_time:
        score += calculate_dialogue_score(2, team.dialogue_2_time)

    if team.dialogue_3_completed and team.dialogue_3_time:
        score += calculate_dialogue_score(3, team.dialogue_3_time)

    # Subtract hint penalties
    hint_penalty = team.hints_used * settings.hint_penalty
    score -= hint_penalty

    # Add enactment bonus if awarded
    if team.enactment_bonus_awarded:
        score += team.enactment_bonus_amount

    # Add manual adjustments (rewards/deductions)
    for adjustment in team.manual_adjustments:
        if adjustment.adjustment_type == "reward":
            score += adjustment.amount
        elif adjustment.adjustment_type == "deduct":
            score -= adjustment.amount

    return max(0, score)  # Ensure non-negative score


def check_qualification(team: Team) -> bool:
    """Check if team qualifies (completed at least 2 dialogues)"""
    completed = sum(
        [
            team.dialogue_1_completed,
            team.dialogue_2_completed,
            team.dialogue_3_completed,
        ]
    )
    return completed >= settings.qualification_threshold


def get_leaderboard(teams: Dict[str, Team]) -> list:
    """Generate sorted leaderboard"""
    leaderboard = []

    for team_name, team in teams.items():
        final_score = calculate_final_score(team)
        leaderboard.append(
            {
                "team_name": team_name,
                "score": final_score,
                "qualified": check_qualification(team),
                "dialogues_completed": sum(
                    [
                        team.dialogue_1_completed,
                        team.dialogue_2_completed,
                        team.dialogue_3_completed,
                    ]
                ),
                "hints_used": team.hints_used,
                "members": team.members,
            }
        )

    # Sort by score (descending)
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    return leaderboard
