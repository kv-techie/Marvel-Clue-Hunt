import json

# Load game state
with open("app/data/game_state.json", "r") as f:
    game_state = json.load(f)

# Assign each team its corresponding stone (team name = stone name)
for team_name in game_state.get("teams", {}).keys():
    game_state["teams"][team_name]["stone"] = team_name
    print(f"✅ Assigned '{team_name}' to team '{team_name}'")

# Save updated game state
with open("app/data/game_state.json", "w") as f:
    json.dump(game_state, f, indent=2)

print("\n✅ All teams assigned to their respective stones!")
