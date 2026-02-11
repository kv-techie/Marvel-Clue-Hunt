import json
import math
from typing import Dict, List

import pandas as pd


def allocate_teams(csv_path: str, output_path: str) -> Dict[str, List[str]]:
    """Read attendance CSV and distribute participants equally into teams"""

    # Read CSV
    df = pd.read_csv(csv_path)

    # Assuming CSV has a 'name' column
    if "name" not in df.columns and "Name" not in df.columns:
        raise ValueError("CSV must contain a 'name' or 'Name' column")

    name_column = "name" if "name" in df.columns else "Name"
    attendees = df[name_column].dropna().tolist()

    # Calculate team distribution
    total_attendees = len(attendees)

    # Aim for teams of 4-6 people
    ideal_team_size = 10
    num_teams = math.ceil(total_attendees / ideal_team_size)

    # Distribute evenly
    teams = {}
    for i in range(num_teams):
        team_name = f"Team {chr(65 + i)}"  # Team A, Team B, etc.
        teams[team_name] = []

    # Round-robin distribution
    for idx, attendee in enumerate(attendees):
        team_idx = idx % num_teams
        team_name = f"Team {chr(65 + team_idx)}"
        teams[team_name].append(attendee)

    # Save to JSON
    with open(output_path, "w") as f:
        json.dump(teams, f, indent=2)

    return teams


def get_team_for_attendee(name: str, teams_path: str) -> str:
    """Find which team an attendee belongs to"""

    with open(teams_path, "r") as f:
        teams = json.load(f)

    for team_name, members in teams.items():
        if name in members:
            return team_name

    return None
