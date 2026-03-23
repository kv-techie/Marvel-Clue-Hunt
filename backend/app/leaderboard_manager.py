"""
Leaderboard Management System
Tracks and ranks teams by various metrics
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


def update_team_stats(team) -> None:
    """
    Update team's leaderboard stats based on completed questions
    
    Args:
        team: Team object (dict or Pydantic model) with questions_completed list
    """
    questions = _get_attr(team, "questions_completed", [])
    
    if not questions:
        _set_attr(team, "total_questions_answered", 0)
        _set_attr(team, "questions_answered_correctly", 0)
        _set_attr(team, "accuracy_percentage", 0.0)
        _set_attr(team, "total_points_earned", 0)
        _set_attr(team, "average_answer_time", 0.0)
        return
    
    # Count correct answers
    correct_count = sum(1 for q in questions if isinstance(q, dict) and q.get("correct", False) or getattr(q, "correct", False))
    total_count = len(questions)
    
    # Calculate accuracy
    accuracy = (correct_count / total_count * 100) if total_count > 0 else 0.0
    
    # Calculate total points
    total_points = sum(q.get("points", 0) if isinstance(q, dict) else getattr(q, "points", 0) for q in questions)
    
    # Calculate average time
    avg_time = (sum(q.get("time_taken", 0) if isinstance(q, dict) else getattr(q, "time_taken", 0) for q in questions) / total_count) if total_count > 0 else 0.0
    
    # Update team stats
    _set_attr(team, "total_questions_answered", total_count)
    _set_attr(team, "questions_answered_correctly", correct_count)
    _set_attr(team, "accuracy_percentage", round(accuracy, 2))
    _set_attr(team, "total_points_earned", total_points)
    _set_attr(team, "average_answer_time", round(avg_time, 2))


def get_leaderboard(teams_data: Dict[str, Dict], sort_by: str = "total_points_earned") -> List[Dict]:
    """
    Get leaderboard of all teams ranked by specified metric
    
    Args:
        teams_data: Dictionary of team name -> team data
        sort_by: Field to sort by ('total_points_earned', 'accuracy_percentage', 'average_answer_time', etc.)
    
    Returns:
        List of teams sorted by metric with rank information
    """
    # Update all team stats
    for team in teams_data.values():
        update_team_stats(team)
    
    # Create leaderboard entries
    leaderboard = []
    for team_name, team_data in teams_data.items():
        leaderboard.append({
            "rank": 0,  # Will be set below
            "team_name": team_name,
            "stone": _get_attr(team_data, "stone", "Unassigned"),
            "total_points": _get_attr(team_data, "total_points_earned", 0),
            "accuracy": _get_attr(team_data, "accuracy_percentage", 0.0),
            "questions_correct": _get_attr(team_data, "questions_answered_correctly", 0),
            "questions_total": _get_attr(team_data, "total_questions_answered", 0),
            "avg_time": _get_attr(team_data, "average_answer_time", 0.0),
            "streak": _get_attr(team_data, "current_streak", 0),
            "best_streak": _get_attr(team_data, "best_streak", 0),
            "badges_count": len(_get_attr(team_data, "badges_earned", [])),
            "completion_status": "Completed" if _get_attr(team_data, "total_questions_answered", 0) == 10 else f"{_get_attr(team_data, 'total_questions_answered', 0)}/10"
        })
    
    # Sort by specified field
    if sort_by == "total_points_earned":
        leaderboard.sort(key=lambda x: x["total_points"], reverse=True)
    elif sort_by == "accuracy_percentage":
        leaderboard.sort(key=lambda x: x["accuracy"], reverse=True)
    elif sort_by == "average_answer_time":
        leaderboard.sort(key=lambda x: x["avg_time"])
    elif sort_by == "best_streak":
        leaderboard.sort(key=lambda x: x["best_streak"], reverse=True)
    elif sort_by == "badges_count":
        leaderboard.sort(key=lambda x: x["badges_count"], reverse=True)
    
    # Add ranks
    for idx, entry in enumerate(leaderboard, 1):
        entry["rank"] = idx
    
    return leaderboard


def get_team_rank(teams_data: Dict[str, Dict], team_name: str, sort_by: str = "total_points_earned") -> Dict:
    """
    Get specific team's rank and surrounding teams
    
    Args:
        teams_data: Dictionary of all teams
        team_name: Team to get ranking for
        sort_by: Field to sort by
    
    Returns:
        Dictionary with team's rank info and nearby teams
    """
    leaderboard = get_leaderboard(teams_data, sort_by)
    
    # Find team's position
    team_position = next((i for i, t in enumerate(leaderboard) if t["team_name"] == team_name), None)
    
    if team_position is None:
        return {"error": "Team not found"}
    
    # Get team and surrounding teams
    start = max(0, team_position - 2)
    end = min(len(leaderboard), team_position + 3)
    
    return {
        "current_rank": leaderboard[team_position]["rank"],
        "total_teams": len(leaderboard),
        "team_data": leaderboard[team_position],
        "nearby_teams": leaderboard[start:end],
        "position_in_nearby": team_position - start
    }


def get_stats_comparison(teams_data: Dict[str, Dict]) -> Dict:
    """
    Get comparison statistics across all teams
    
    Args:
        teams_data: Dictionary of all teams
    
    Returns:
        Dictionary with leaderboard stats
    """
    leaderboard = get_leaderboard(teams_data)
    
    if not leaderboard:
        return {
            "total_teams": 0,
            "highest_score": 0,
            "avg_score": 0.0,
            "highest_accuracy": 0.0,
            "avg_accuracy": 0.0,
            "fastest_time": 0.0,
            "avg_time": 0.0
        }
    
    points = [t["total_points"] for t in leaderboard]
    accuracies = [t["accuracy"] for t in leaderboard if t["questions_total"] > 0]
    times = [t["avg_time"] for t in leaderboard if t["avg_time"] > 0]
    
    return {
        "total_teams": len(leaderboard),
        "highest_score": max(points) if points else 0,
        "avg_score": round(sum(points) / len(points), 2) if points else 0.0,
        "highest_accuracy": max(accuracies) if accuracies else 0.0,
        "avg_accuracy": round(sum(accuracies) / len(accuracies), 2) if accuracies else 0.0,
        "fastest_time": min(times) if times else 0.0,
        "avg_time": round(sum(times) / len(times), 2) if times else 0.0,
    }
