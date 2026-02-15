import json
import random
from typing import Dict, List


def allocate_teams_from_files(
    team_names_path: str, attendees_path: str, output_path: str
) -> Dict[str, List[str]]:
    """
    Allocate teams by reading team names and attendees from separate files.
    Randomly distributes attendees equally across teams.

    Args:
        team_names_path: Path to file with team names (one per line)
        attendees_path: Path to file with attendee names (one per line)
        output_path: Path to save teams.json

    Returns:
        Dictionary mapping team names to list of attendee names

    Distribution Strategy:
        - If attendees divide evenly: All teams get equal members
        - If remainder exists: First N teams get +1 member

    Example:
        32 attendees ÷ 5 teams = 6 remainder 2
        Result: [7, 7, 6, 6, 6] (first 2 teams get 7, rest get 6)
    """

    # Read team names
    with open(team_names_path, "r", encoding="utf-8") as f:
        team_names = [line.strip() for line in f if line.strip()]

    # Read attendees
    with open(attendees_path, "r", encoding="utf-8") as f:
        attendees = [line.strip() for line in f if line.strip()]

    # Validate inputs
    if not team_names:
        raise ValueError("Team names file is empty")

    if not attendees:
        raise ValueError("Attendees file is empty")

    total_attendees = len(attendees)
    total_teams = len(team_names)

    print(f"[ALLOCATION] {total_attendees} attendees → {total_teams} teams")

    # Shuffle attendees for random distribution
    random.shuffle(attendees)

    # Calculate distribution
    base_size = total_attendees // total_teams  # Members per team (minimum)
    remainder = total_attendees % total_teams  # Extra members to distribute

    # Create team sizes: First 'remainder' teams get +1 member
    team_sizes = []
    for i in range(total_teams):
        if i < remainder:
            team_sizes.append(base_size + 1)  # First N teams get extra member
        else:
            team_sizes.append(base_size)  # Rest get base size

    print(
        f"[ALLOCATION] Distribution: {team_sizes} (Base: {base_size}, Remainder: {remainder})"
    )

    # Allocate attendees to teams
    teams = {}
    attendee_idx = 0

    for team_idx, team_name in enumerate(team_names):
        team_size = team_sizes[team_idx]
        team_members = attendees[attendee_idx : attendee_idx + team_size]
        teams[team_name] = team_members
        attendee_idx += team_size

        print(f"[ALLOCATION] {team_name}: {len(team_members)} members")

    # Save to JSON
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(teams, f, indent=2, ensure_ascii=False)

    print(f"[ALLOCATION] Teams saved to {output_path}")

    return teams


def get_team_for_attendee(name: str, teams_path: str) -> str:
    """Find which team an attendee belongs to"""

    with open(teams_path, "r", encoding="utf-8") as f:
        teams = json.load(f)

    for team_name, members in teams.items():
        if name in members:
            return team_name

    return None
