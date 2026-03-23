import json

# Available characters
characters = [
    "Captain America",
    "Iron Man",
    "Thor",
    "Spider-Man",
    "Black Widow",
    "Hulk",
    "Black Panther",
    "Doctor Strange",
    "Ant-Man",
    "Scarlet Witch",
]

# Load game state
with open("app/data/game_state.json", "r") as f:
    game_state = json.load(f)

# Assign characters to teams in round-robin fashion
team_names = list(game_state.get("teams", {}).keys())
for idx, team_name in enumerate(team_names):
    character = characters[idx % len(characters)]
    game_state["teams"][team_name]["character"] = character
    print(f"✅ Assigned {character} to team {team_name}")

# Save updated game state
with open("app/data/game_state.json", "w") as f:
    json.dump(game_state, f, indent=2)

print("\n✅ All teams assigned characters!")
