"""
Achievement & Badge System
Tracks badges earned and achievements unlocked during gameplay
"""

from typing import Dict, List


def _get_attr(obj, key, default=None):
    """Get attribute from dict or Pydantic model"""
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _set_attr(obj, key, value):
    """Set attribute on dict or Pydantic model"""
    if isinstance(obj, dict):
        obj[key] = value
    else:
        setattr(obj, key, value)


BADGES = {
    "speed_demon": {
        "name": "Speed Demon 🚀",
        "description": "Answer all 10 questions in under 20 seconds each",
        "icon": "⚡",
        "color": "gold"
    },
    "perfect_score": {
        "name": "Perfect Answer 💯",
        "description": "Score 100% on a question (instant + no hints)",
        "icon": "⭐",
        "color": "platinum"
    },
    "streak_master": {
        "name": "Streak Master 🔥",
        "description": "Get 5 consecutive correct answers",
        "icon": "🔥",
        "color": "orange"
    },
    "combo_expert": {
        "name": "Combo Expert ⚔️",
        "description": "Achieve 3x combo multiplier",
        "icon": "💫",
        "color": "purple"
    },
    "powerup_warrior": {
        "name": "PowerUp Warrior 🛡️",
        "description": "Use all 3 PowerUps in a session",
        "icon": "⚡",
        "color": "red"
    },
    "flawless_round": {
        "name": "Flawless Round ✨",
        "description": "Complete game without using any hints",
        "icon": "✨",
        "color": "cyan"
    },
    "accuracy_ace": {
        "name": "Accuracy Ace 🎯",
        "description": "Maintain 90%+ accuracy across all questions",
        "icon": "🎯",
        "color": "blue"
    },
    "stone_sage": {
        "name": "Stone Sage 💎",
        "description": "Answer all 10 Infinity Stone questions correctly",
        "icon": "💎",
        "color": "green"
    },
    "comeback_king": {
        "name": "Comeback King 👑",
        "description": "Get 3+ correct answers after 2 wrong answers",
        "icon": "👑",
        "color": "gold"
    },
    "hint_whisperer": {
        "name": "Hint Whisperer 🎓",
        "description": "Use exactly 3 hints with 100% accuracy",
        "icon": "📚",
        "color": "indigo"
    }
}


def check_speed_demon(team: Dict) -> bool:
    """Check if all answers were < 20 seconds"""
    for q in team.get("questions_completed", []):
        if q.get("time_taken", 0) >= 20:
            return False
    return len(team.get("questions_completed", [])) == 10


def check_perfect_score(question_score: Dict) -> bool:
    """Check if this question was perfect (instant + no hints)"""
    return (question_score.get("time_taken", 0) <= 5 and 
            question_score.get("hints_used", 0) == 0 and
            question_score.get("points", 0) >= 100)


def check_streak_master(streak: int) -> bool:
    """Check if streak reached 5"""
    return streak >= 5


def check_combo_expert(max_combo: float) -> bool:
    """Check if combo reached 3x"""
    return max_combo >= 3.0


def check_powerup_warrior(powerups_used: List[str]) -> bool:
    """Check if all 3 powerups were used"""
    return len(powerups_used) >= 3


def check_flawless_round(team: Dict) -> bool:
    """Check if no hints were used"""
    return team.get("hints_used_count", 0) == 0 and len(team.get("questions_completed", [])) == 10


def check_accuracy_ace(team: Dict) -> bool:
    """Check if accuracy is >= 90%"""
    total = len(team.get("questions_completed", []))
    if total == 0:
        return False
    correct = sum(1 for q in team.get("questions_completed", []) if q.get("correct", False))
    accuracy = (correct / total) * 100
    return accuracy >= 90


def check_stone_sage(team: Dict) -> bool:
    """Check if all 10 questions are correct"""
    completed = team.get("questions_completed", [])
    return len(completed) == 10 and all(q.get("correct", False) for q in completed)


def check_comeback_king(team: Dict) -> bool:
    """Check if got 3+ correct after 2 wrong answers"""
    completed = team.get("questions_completed", [])
    consecutive_correct = 0
    prev_wrong_count = 0
    
    for q in completed:
        if q.get("correct", False):
            consecutive_correct += 1
        else:
            if consecutive_correct >= 3 and prev_wrong_count >= 2:
                return True
            consecutive_correct = 0
            prev_wrong_count = 0
    
    return consecutive_correct >= 3 and prev_wrong_count >= 2


def check_hint_whisperer(team: Dict) -> bool:
    """Check if used all 3 hints with 100% accuracy"""
    completed = team.get("questions_completed", [])
    total_hints = sum(q.get("hints_used", 0) for q in completed)
    
    if total_hints != 3:
        return False
    
    # All answers must be correct
    return all(q.get("correct", False) for q in completed)


def evaluate_achievements(team: Dict, question_score: Dict = None) -> List[str]:
    """
    Evaluate team for newly earned badges
    Returns list of newly earned badge IDs
    """
    newly_earned = []
    badges_earned = team.get("badges_earned", [])
    
    # Check speed demon
    if not team.get("achievements", {}).get("speed_demon") and check_speed_demon(team):
        newly_earned.append("speed_demon")
        team["achievements"]["speed_demon"] = True
        if "speed_demon" not in badges_earned:
            badges_earned.append("speed_demon")
    
    # Check perfect score (per question)
    if question_score and check_perfect_score(question_score):
        if "perfect_score" not in badges_earned:
            newly_earned.append("perfect_score")
            badges_earned.append("perfect_score")
    
    # Check streak master
    if not team.get("achievements", {}).get("streak_master") and check_streak_master(team.get("best_streak", 0)):
        newly_earned.append("streak_master")
        team["achievements"]["streak_master"] = True
        if "streak_master" not in badges_earned:
            badges_earned.append("streak_master")
    
    # Check combo expert
    if not team.get("achievements", {}).get("combo_expert"):
        max_combo = max([q.get("combo_multiplier", 1.0) for q in team.get("questions_completed", [])], default=1.0)
        if check_combo_expert(max_combo):
            newly_earned.append("combo_expert")
            team["achievements"]["combo_expert"] = True
            if "combo_expert" not in badges_earned:
                badges_earned.append("combo_expert")
    
    # Check powerup warrior
    if not team.get("achievements", {}).get("powerup_warrior") and check_powerup_warrior(team.get("powerups_used", [])):
        newly_earned.append("powerup_warrior")
        team["achievements"]["powerup_warrior"] = True
        if "powerup_warrior" not in badges_earned:
            badges_earned.append("powerup_warrior")
    
    # Check flawless round
    if not team.get("achievements", {}).get("flawless_round") and check_flawless_round(team):
        newly_earned.append("flawless_round")
        team["achievements"]["flawless_round"] = True
        if "flawless_round" not in badges_earned:
            badges_earned.append("flawless_round")
    
    # Check accuracy ace
    if not team.get("achievements", {}).get("accuracy_ace") and check_accuracy_ace(team):
        newly_earned.append("accuracy_ace")
        team["achievements"]["accuracy_ace"] = True
        if "accuracy_ace" not in badges_earned:
            badges_earned.append("accuracy_ace")
    
    # Check stone sage
    if not team.get("achievements", {}).get("stone_sage") and check_stone_sage(team):
        newly_earned.append("stone_sage")
        team["achievements"]["stone_sage"] = True
        if "stone_sage" not in badges_earned:
            badges_earned.append("stone_sage")
    
    # Check comeback king
    if not team.get("achievements", {}).get("comeback_king") and check_comeback_king(team):
        newly_earned.append("comeback_king")
        team["achievements"]["comeback_king"] = True
        if "comeback_king" not in badges_earned:
            badges_earned.append("comeback_king")
    
    # Check hint whisperer
    if not team.get("achievements", {}).get("hint_whisperer") and check_hint_whisperer(team):
        newly_earned.append("hint_whisperer")
        team["achievements"]["hint_whisperer"] = True
        if "hint_whisperer" not in badges_earned:
            badges_earned.append("hint_whisperer")
    
    team["badges_earned"] = badges_earned
    return newly_earned


def get_badge_details(badge_id: str) -> Dict:
    """Get details for a badge"""
    return BADGES.get(badge_id, {})


def get_all_badges() -> Dict:
    """Get all badge definitions"""
    return BADGES
