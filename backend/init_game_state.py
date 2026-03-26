import json
import os

from app.state_io import atomic_write_json


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    default_data_dir = os.path.join(base_dir, "app", "data")
    state_data_dir = os.getenv("STATE_DATA_DIR", default_data_dir)

    teams_path = os.path.join(state_data_dir, "teams.json")
    game_state_path = os.path.join(state_data_dir, "game_state.json")

    if not os.path.exists(teams_path):
        raise FileNotFoundError(f"teams.json not found at: {teams_path}")

    with open(teams_path, "r", encoding="utf-8") as file:
        teams_data = json.load(file)

    game_state = {"global_start_time": None, "game_active": False, "teams": {}}

    for team_name, members in teams_data.items():
        game_state["teams"][team_name] = {
            "name": team_name,
            "members": members,
            "stone": team_name,
            "timer_started": None,
            "game_started": None,
            "current_question_index": 0,
            "bonus_round_unlocked": False,
            "standard_round_completed_at": None,
            "questions_completed": [],
            "hints_used_count": 0,
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
                "stone_sage": False,
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
            "tab_switch_logs": [],
        }
        print(f"✅ Initialized {team_name} with {len(members)} members")

    atomic_write_json(
        game_state_path,
        game_state,
        indent=2,
    )
    print(f"\n✅ Game state initialized with {len(game_state['teams'])} teams!")
    print(f"💾 Saved to: {game_state_path}")


if __name__ == "__main__":
    main()
