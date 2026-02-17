import json
import random
from typing import Dict, List, Optional


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


def assign_character_to_team(
    team_name: str, character: str, teams_path: str, output_path: Optional[str] = None
) -> bool:
    """
    Assign a character to a team and save back to file

    Args:
        team_name: Name of the team
        character: Character to assign (e.g., "Iron Man", "Thor")
        teams_path: Path to teams.json file
        output_path: Path to save updated teams (defaults to teams_path)

    Returns:
        True if successful, False otherwise
    """
    if output_path is None:
        output_path = teams_path

    try:
        with open(teams_path, "r", encoding="utf-8") as f:
            teams_data = json.load(f)

        # Update team with character - convert to Team objects with character field
        updated_teams = {}
        for name, members in teams_data.items():
            if name == team_name:
                updated_teams[name] = {"members": members, "character": character}
            else:
                # Preserve existing data
                if isinstance(teams_data[name], dict) and "members" in teams_data[name]:
                    updated_teams[name] = teams_data[name]
                else:
                    updated_teams[name] = {"members": members}

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(updated_teams, f, indent=2, ensure_ascii=False)

        print(f"[ALLOCATION] Assigned {character} to team {team_name}")
        return True
    except Exception as e:
        print(f"[ALLOCATION] Error assigning character: {e}")
        return False


def assign_characters_by_matching(
    teams_path: str,
    available_characters: List[str],
    output_path: Optional[str] = None,
) -> Dict[str, str]:
    """
    Automatically assign characters to teams by matching team names with character names.
    This handles cases like "Team Thor" -> "Thor", "Iron Man Team" -> "Iron Man"

    Args:
        teams_path: Path to teams.json file
        available_characters: List of available character names
        output_path: Path to save updated teams

    Returns:
        Dictionary mapping team names to assigned characters
    """
    if output_path is None:
        output_path = teams_path

    try:
        with open(teams_path, "r", encoding="utf-8") as f:
            teams_data = json.load(f)

        assignments = {}
        updated_teams = {}

        for team_name, members_or_data in teams_data.items():
            # Handle both old format (list) and new format (dict with members)
            if isinstance(members_or_data, list):
                members = members_or_data
                existing_character = None
            else:
                members = members_or_data.get("members", [])
                existing_character = members_or_data.get("character")

            # Try to match team name with available characters
            assigned_character = existing_character

            if not assigned_character:
                # Try exact match first
                for char in available_characters:
                    if char.lower() == team_name.lower():
                        assigned_character = char
                        break

                # Try partial match (team name contains character name)
                if not assigned_character:
                    team_lower = team_name.lower()
                    for char in available_characters:
                        if char.lower() in team_lower or team_lower in char.lower():
                            assigned_character = char
                            break

            if assigned_character:
                assignments[team_name] = assigned_character
                updated_teams[team_name] = {
                    "members": members,
                    "character": assigned_character,
                }
                print(f"[ALLOCATION] {team_name} → {assigned_character}")
            else:
                assignments[team_name] = None
                updated_teams[team_name] = {"members": members}
                print(f"[ALLOCATION] {team_name} → (no character assigned)")

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(updated_teams, f, indent=2, ensure_ascii=False)

        print(f"[ALLOCATION] Character assignments saved to {output_path}")
        return assignments

    except Exception as e:
        print(f"[ALLOCATION] Error assigning characters: {e}")
        return {}
