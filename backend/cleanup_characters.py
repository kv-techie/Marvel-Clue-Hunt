import json

# Load game state
with open("app/data/game_state.json", "r") as f:
    game_state = json.load(f)

# Remove character field from all teams
for team_name in game_state.get("teams", {}).keys():
    if "character" in game_state["teams"][team_name]:
        del game_state["teams"][team_name]["character"]
        print(f"✅ Removed character field from {team_name}")

# Save cleaned game state
with open("app/data/game_state.json", "w") as f:
    json.dump(game_state, f, indent=2)

print("\n✅ Game state cleaned - characters removed!")
