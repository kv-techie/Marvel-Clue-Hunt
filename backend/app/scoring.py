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

    return score  # Allow negative scores for heavy deductions


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


def calculate_total_deductions(team: Team) -> int:
    """Calculate total deductions from manual adjustments and hint penalties"""
    total_deductions = 0

    # Add hint penalties
    total_deductions += team.hints_used * settings.hint_penalty

    # Add manual deductions
    for adjustment in team.manual_adjustments:
        if adjustment.adjustment_type == "deduct":
            total_deductions += adjustment.amount

    return total_deductions


def check_auto_disqualification(team: Team) -> bool:
    """Check if team should be auto-disqualified based on deduction threshold"""
    if team.disqualified:
        return True

    total_deductions = calculate_total_deductions(team)
    return total_deductions >= settings.disqualification_deduction_threshold


def get_leaderboard(teams: Dict[str, Team]) -> list:
    """Generate sorted leaderboard"""
    from app.scoring import calculate_total_deductions, check_auto_disqualification

    leaderboard = []

    for team_name, team in teams.items():
        final_score = calculate_final_score(team)
        is_auto_disqualified = check_auto_disqualification(team)

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
                "disqualified": team.disqualified,
                "disqualification_reason": team.disqualification_reason,
                "disqualification_acknowledged": team.disqualification_acknowledged_by_team,
                "disqualification_confirmed": team.disqualification_confirmed_by_admin,
                "total_deductions": calculate_total_deductions(team),
                "auto_disqualify_eligibility": is_auto_disqualified,
            }
        )

    # Sort by score (descending)
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    return leaderboard
