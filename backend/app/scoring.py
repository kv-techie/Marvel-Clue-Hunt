from typing import Dict

from app.config import settings
from app.models import Team

MIN_TIME_TAKEN_SECONDS = 1
MAX_TIME_TAKEN_SECONDS = 3600


def calculate_speed_multiplier(time_taken: int, difficulty: str) -> float:
    """
    Calculate speed multiplier based on time and question difficulty.
    Faster answers get higher multipliers (Quizzizz-style).

    Args:
        time_taken: Time to answer in seconds
        difficulty: Question difficulty ("easy", "medium", "hard")

    Returns:
        Multiplier between 0.8x and 1.5x

    Formula:
        - Each difficulty has a baseline time
        - If answered faster: bonus = 1 + (1 - time/baseline) * 0.5 (max 1.5x)
        - If answered slower: 1.0x
    """
    time_taken = max(MIN_TIME_TAKEN_SECONDS, min(time_taken, MAX_TIME_TAKEN_SECONDS))

    # Baseline times in seconds by difficulty
    baseline_times = {
        "easy": 30,
        "medium": 60,
        "hard": 90,
        "bonus": 120,
    }

    baseline = baseline_times.get(difficulty, 60)

    if time_taken <= baseline:
        # Faster than baseline: award multiplier up to 1.5x
        multiplier = 1.0 + ((baseline - time_taken) / baseline) * 0.5
        return min(multiplier, 1.5)  # Cap at 1.5x
    else:
        # Slower than baseline: no bonus
        return 1.0


def calculate_combo_multiplier(
    time_taken: int, previous_correct: bool = False
) -> float:
    """
    Calculate combo multiplier for consecutive fast correct answers.
    Bonuses stack for up to 3x.

    Args:
        time_taken: Time to answer in seconds
        previous_correct: Whether the previous answer was correct

    Returns:
        Combo multiplier between 1.0x and 3.0x
    """
    time_taken = max(MIN_TIME_TAKEN_SECONDS, min(time_taken, MAX_TIME_TAKEN_SECONDS))

    if not previous_correct:
        return 1.0  # Break combo on wrong answer

    if time_taken <= 15:
        return 1.5  # Fast answer (≤15s) = 1.5x
    elif time_taken <= 30:
        return 1.25  # Mid-fast (16-30s) = 1.25x
    else:
        return 1.0  # Slower = no combo bonus


def calculate_question_score(
    base_points: int,
    time_taken: int,
    difficulty: str,
    hints_used: int = 0,
    combo_multiplier: float = 1.0,
) -> int:
    """
    Calculate score for a single question with speed multiplier, combo, and hint penalties.

    Args:
        base_points: Points for correct answer
        time_taken: Time to answer in seconds
        difficulty: Question difficulty
        hints_used: Number of hints used for this question
        combo_multiplier: Combo multiplier from consecutive correct answers

    Returns:
        Final score for this question
    """
    # Calculate speed multiplier
    multiplier = calculate_speed_multiplier(time_taken, difficulty)

    # Apply speed multiplier to base points
    score = int(base_points * multiplier)

    # Apply combo multiplier
    score = int(score * combo_multiplier)

    # Subtract hint penalty
    hint_penalty = hints_used * settings.hint_penalty
    score -= hint_penalty

    return max(score, 0)  # Don't let score go negative


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
    """Calculate final score for a team based on questions completed"""
    score = 0

    # Add scores from completed questions
    if team.questions_completed:
        for question_result in team.questions_completed:
            if isinstance(question_result, dict):
                score += question_result.get("points", 0)
            else:
                score += getattr(question_result, "points", 0)

    # Subtract hint penalties
    hint_penalty = team.hints_used_count * settings.hint_penalty
    score -= hint_penalty

    # Add manual adjustments (rewards/deductions)
    for adjustment in team.manual_adjustments:
        # Handle both dict and object formats
        adj_type = (
            adjustment.get("adjustment_type")
            if isinstance(adjustment, dict)
            else adjustment.adjustment_type
        )
        adj_amount = (
            adjustment.get("amount")
            if isinstance(adjustment, dict)
            else adjustment.amount
        )

        if adj_amount is not None:
            if adj_type == "reward":
                score += adj_amount
            elif adj_type == "deduct":
                score -= abs(adj_amount)  # Ensure we subtract positive values

    # Add enactment bonus if awarded
    if team.enactment_bonus_awarded and team.enactment_bonus_amount is not None:
        score += team.enactment_bonus_amount

    return score  # Allow negative scores for heavy deductions


def check_qualification(team: Team) -> bool:
    """
    Check if team qualifies based on difficulty ratio.
    A team qualifies when they have correctly answered:
      - At least 2 easy questions
      - At least 3 medium questions
      - At least 3 hard questions
    (Ratio 2:3:3 for easy:medium:hard)
    """
    easy_count = 0
    medium_count = 0
    hard_count = 0

    for question_data in (team.questions_completed or []):
        is_correct = (
            question_data.get("correct", False)
            if isinstance(question_data, dict)
            else getattr(question_data, "correct", False)
        )
        if not is_correct:
            continue

        difficulty = (
            question_data.get("difficulty", "")
            if isinstance(question_data, dict)
            else getattr(question_data, "difficulty", "")
        )
        difficulty = difficulty.lower() if difficulty else ""
        if difficulty == "easy":
            easy_count += 1
        elif difficulty == "medium":
            medium_count += 1
        elif difficulty in ("hard", "bonus"):
            hard_count += 1

    return easy_count >= 2 and medium_count >= 3 and hard_count >= 3


def calculate_total_deductions(team: Team) -> int:
    """Calculate total deductions from manual adjustments and hint penalties"""
    total_deductions = 0

    # Add hint penalties
    total_deductions += team.hints_used_count * settings.hint_penalty

    # Add manual deductions
    for adjustment in team.manual_adjustments:
        # Handle both dict and object formats
        adj_type = (
            adjustment.get("adjustment_type")
            if isinstance(adjustment, dict)
            else adjustment.adjustment_type
        )
        adj_amount = (
            adjustment.get("amount")
            if isinstance(adjustment, dict)
            else adjustment.amount
        )

        if adj_type == "deduct":
            total_deductions += abs(adj_amount)

    return total_deductions


def check_auto_disqualification(team: Team) -> bool:
    """Check if team should be auto-disqualified based on deduction threshold"""
    if team.disqualified:
        return True

    total_deductions = calculate_total_deductions(team)
    return total_deductions >= settings.disqualification_deduction_threshold


def calculate_final_score_questions(team: Team) -> int:
    """
    Calculate final score for a team using the question-based system.

    Formula:
    Final Score = Sum(Question Scores) - Tab Violation Penalties + Manual Adjustments

    Where Question Score = (Base Points × Speed Multiplier) - Hint Penalties
    """
    score = 0

    # Sum question scores (already includes speed multiplier and hint deductions)
    # New format stores "points"; keep "score" fallback for legacy records.
    for question_data in team.questions_completed:
        score += question_data.get("points", question_data.get("score", 0))

    # Subtract tab violation penalties
    # Each tab switch after first 3 free switches costs 50 points
    tab_switches = len(team.tab_switch_logs)
    if tab_switches > 3:
        penalty = (tab_switches - 3) * 50
        score -= penalty

    # Add manual adjustments (rewards/deductions from volunteers/admins)
    for adjustment in team.manual_adjustments:
        adj_type = (
            adjustment.get("adjustment_type")
            if isinstance(adjustment, dict)
            else adjustment.adjustment_type
        )
        adj_amount = (
            adjustment.get("amount")
            if isinstance(adjustment, dict)
            else adjustment.amount
        )

        if adj_amount is not None:
            if adj_type == "reward":
                score += adj_amount
            elif adj_type == "deduct":
                score -= abs(adj_amount)

    # Add enactment bonus if awarded
    if team.enactment_bonus_awarded and team.enactment_bonus_amount is not None:
        score += team.enactment_bonus_amount

    return score  # Allow negative scores for heavy deductions


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
                "questions_completed": len(team.questions_completed)
                if team.questions_completed
                else 0,
                "hints_used": team.hints_used_count,
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
