import json
from datetime import datetime

# Read teams.json
with open("app/data/teams.json", "r") as f:
    teams_data = json.load(f)

# Create game state structure
game_state = {
    "global_start_time": None,
    "game_active": False,
    "teams": {}
}

# Initialize each team
for team_name, members in teams_data.items():
    game_state["teams"][team_name] = {
        "name": team_name,
        "members": members,
        "stone": team_name,  # Assign stone = team name
        "timer_started": None,
        "game_started": None,
        "current_question_index": 0,
        "questions_completed": [],
        "hints_used_count": 0,
        "dialogue_1_completed": False,
        "dialogue_2_completed": False,
        "dialogue_3_completed": False,
        "dialogue_1_time": None,
        "dialogue_2_time": None,
        "dialogue_3_time": None,
        "hints_used": 0,
        "enactment_bonus_awarded": False,
        "enactment_bonus_amount": 0,
        "powerups_available": {},
        "powerups_used": [],
        "active_powerup_effect": None,
        "current_streak": 0,
        "best_streak": 0,
        "current_combo": 1.0,
        "last_answer_time": None,
        "badges_earned": [],
        "achievements": {
            "50_points_total": False,
            "100_points_total": False,
            "perfect_score": False,
            "speed_demon": False,
            "streak_5": False,
            "combo_master": False,
            "powerup_champion": False,
            "flawless_game": False,
            "hint_hero": False,
            "stone_sage": False
        },
        "questions_answered_correctly": 0,
        "total_questions_answered": 0,
        "accuracy_percentage": 0.0,
        "total_points_earned": 0,
        "average_answer_time": 0.0,
        "qualified": False,
        "manual_adjustments": [],
        "final_score": None,
        "disqualified": False,
        "disqualification_reason": None,
        "disqualification_timestamp": None,
        "disqualification_confirmed_by_admin": False,
        "disqualification_acknowledged_by_team": False,
        "tab_switch_logs": []
    }
    print(f"✅ Initialized {team_name} with {len(members)} members")

# Save game state
with open("app/data/game_state.json", "w") as f:
    json.dump(game_state, f, indent=2)

print(f"\n✅ Game state initialized with {len(game_state['teams'])} teams!")
