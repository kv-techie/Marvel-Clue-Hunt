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


def assign_stone_to_team(
    team_name: str, stone: str, teams_path: str, output_path: Optional[str] = None
) -> bool:
    """
    Assign an Infinity Stone to a team and save back to file

    Args:
        team_name: Name of the team
        stone: Stone to assign (e.g., "Mind Stone", "Power Stone")
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

        # Update team with stone - convert to Team objects with stone field
        updated_teams = {}
        for name, members in teams_data.items():
            if name == team_name:
                updated_teams[name] = {"members": members, "stone": stone}
            else:
                # Preserve existing data
                if isinstance(teams_data[name], dict) and "members" in teams_data[name]:
                    updated_teams[name] = teams_data[name]
                else:
                    updated_teams[name] = {"members": members}

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(updated_teams, f, indent=2, ensure_ascii=False)

        print(f"[ALLOCATION] Assigned {stone} to team {team_name}")
        return True
    except Exception as e:
        print(f"[ALLOCATION] Error assigning stone: {e}")
        return False


def assign_stones_by_matching(
    teams_path: str,
    available_stones: List[str],
    output_path: Optional[str] = None,
) -> Dict[str, str]:
    """
    Automatically assign Infinity Stones to teams by matching team names with stone names.

    Args:
        teams_path: Path to teams.json file
        available_stones: List of available stone names (Mind, Power, Time, Space, Reality, Soul)
        output_path: Path to save updated teams

    Returns:
        Dictionary mapping team names to assigned stones
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
                existing_stone = None
            else:
                members = members_or_data.get("members", [])
                existing_stone = members_or_data.get("stone")

            # Try to match team name with available stones
            assigned_stone = existing_stone

            if not assigned_stone:
                # Try exact match first
                for stone in available_stones:
                    if stone.lower() == team_name.lower():
                        assigned_stone = stone
                        break

                # Try partial match (team name contains stone name)
                if not assigned_stone:
                    team_lower = team_name.lower()
                    for stone in available_stones:
                        stone_lower = stone.lower().replace(" stone", "")
                        if stone_lower in team_lower or team_lower in stone_lower:
                            assigned_stone = stone
                            break

            if assigned_stone:
                assignments[team_name] = assigned_stone
                updated_teams[team_name] = {
                    "members": members,
                    "stone": assigned_stone,
                }
                print(f"[ALLOCATION] {team_name} → {assigned_stone}")
            else:
                assignments[team_name] = None
                updated_teams[team_name] = {"members": members}
                print(f"[ALLOCATION] {team_name} → (no stone assigned)")

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(updated_teams, f, indent=2, ensure_ascii=False)

        print(f"[ALLOCATION] Stone assignments saved to {output_path}")
        return assignments

    except Exception as e:
        print(f"[ALLOCATION] Error assigning stones: {e}")
        return {}


def auto_assign_infinity_stones(
    teams_path: str, output_path: Optional[str] = None
) -> Dict[str, str]:
    """
    Automatically assign the 6 Infinity Stones to the first 6 teams.
    If more than 6 teams exist, only first 6 get stones.

    Args:
        teams_path: Path to teams.json file
        output_path: Path to save updated teams

    Returns:
        Dictionary mapping team names to assigned stones
    """
    if output_path is None:
        output_path = teams_path

    INFINITY_STONES = [
        "Mind Stone",
        "Power Stone",
        "Time Stone",
        "Space Stone",
        "Reality Stone",
        "Soul Stone",
    ]

    try:
        with open(teams_path, "r", encoding="utf-8") as f:
            teams_data = json.load(f)

        team_names = list(teams_data.keys())
        assignments = {}
        updated_teams = {}

        for idx, team_name in enumerate(team_names):
            members_or_data = teams_data[team_name]

            # Handle both old format (list) and new format (dict with members)
            if isinstance(members_or_data, list):
                members = members_or_data
            else:
                members = members_or_data.get("members", [])

            # Assign stone to first 6 teams
            if idx < len(INFINITY_STONES):
                stone = INFINITY_STONES[idx]
                assignments[team_name] = stone
                updated_teams[team_name] = {"members": members, "stone": stone}
                print(f"[ALLOCATION] {team_name} → {stone}")
            else:
                assignments[team_name] = None
                updated_teams[team_name] = {"members": members}
                print(f"[ALLOCATION] {team_name} → (max 6 teams supported)")

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(updated_teams, f, indent=2, ensure_ascii=False)

        print(f"[ALLOCATION] Infinity Stone assignments saved to {output_path}")
        return assignments

    except Exception as e:
        print(f"[ALLOCATION] Error assigning stones: {e}")
        return {}


def allocate_teams_by_preference(
    attendees_data: Dict[str, str],
    team_size: int = 10,
    output_path: Optional[str] = None,
) -> Dict[str, List[str]]:
    """
    Allocate teams based on favorite character preferences with randomization.
    Each team is named after a character and has 50%+ members who prefer that character.

    RANDOMIZATION:
    - Randomly SELECTS 50%+ members from each preference group (not sequential)
    - Remaining fillers are randomly selected from other attendees
    - This ensures varied, randomized team compositions on each upload

    Args:
        attendees_data: Dict mapping attendee names to favorite_character
        team_size: Target size for each team
        output_path: Path to save teams.json

    Returns:
        Dictionary mapping team names (character names) to list of attendee names

    Example:
        If we have 40 attendees and 4 characters with preferences:
        - Iron Man: 12 fans → Team Iron Man gets 6+ random Iron Man fans
        - Thor: 11 fans → Team Thor gets 5+ random Thor fans
        - Captain America: 10 fans → Team CA gets 5+ random CA fans
        - Black Widow: 10 fans → Team BW gets 5+ random BW fans

        Creates 4 teams of ~10 members each with random selection within preferences.
    """

    if not attendees_data:
        raise ValueError("Attendees data is empty")

    # Group attendees by their favorite character
    preferences = {}

    for name, character in attendees_data.items():
        if character and character.strip():
            character = character.strip()
            if character not in preferences:
                preferences[character] = []
            preferences[character].append(name)

    print(f"[PREFERENCE ALLOCATION] {len(attendees_data)} attendees")
    for char, fans in preferences.items():
        print(f"[PREFERENCE ALLOCATION] {char}: {len(fans)} fans")

    # Sort characters by number of fans (descending)
    sorted_chars = sorted(preferences.items(), key=lambda x: len(x[1]), reverse=True)

    # Create teams
    teams = {}
    used_attendees = set()  # Track who's been assigned

    for character, fans in sorted_chars:
        team_name = f"Team {character}"
        team_members = []

        # Calculate how many preference members we need (50%+)
        min_preference_members = (team_size + 1) // 2  # Ceiling of team_size / 2

        # RANDOMIZE: Randomly select from this character's fans
        available_fans = [f for f in fans if f not in used_attendees]
        num_to_select = min(min_preference_members, len(available_fans))

        if num_to_select > 0:
            selected_fans = random.sample(available_fans, num_to_select)
            team_members.extend(selected_fans)
            for fan in selected_fans:
                used_attendees.add(fan)

        # Fill remaining spots from remaining attendees
        remaining_needed = team_size - len(team_members)
        all_unused = [
            name for name in attendees_data.keys() if name not in used_attendees
        ]

        if remaining_needed > 0 and all_unused:
            num_fillers = min(remaining_needed, len(all_unused))
            fillers = random.sample(all_unused, num_fillers)
            team_members.extend(fillers)
            for filler in fillers:
                used_attendees.add(filler)

        teams[team_name] = team_members

        pref_count = len([m for m in team_members if m in fans])
        print(
            f"[PREFERENCE ALLOCATION] {team_name}: {pref_count} {character} fans + {len(team_members) - pref_count} others = {len(team_members)} total"
        )

    # Handle any remaining attendees that weren't assigned
    remaining_attendees = [
        name for name in attendees_data.keys() if name not in used_attendees
    ]
    if remaining_attendees:
        print(
            f"[PREFERENCE ALLOCATION] Distributing {len(remaining_attendees)} remaining attendees..."
        )
        for idx, attendee in enumerate(remaining_attendees):
            team_idx = idx % len(teams)
            team_name = list(teams.keys())[team_idx]
            teams[team_name].append(attendee)

    # Save to JSON if output path provided
    if output_path:
        teams_with_character = {}
        for team_name, members in teams.items():
            character = team_name.replace("Team ", "")
            teams_with_character[team_name] = {
                "members": members,
                "character": character,
            }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(teams_with_character, f, indent=2, ensure_ascii=False)

        print(f"[PREFERENCE ALLOCATION] Teams saved to {output_path}")

    return teams


def assign_character_to_team(
    team_name: str, character: str, teams_path: str
) -> bool:
    """
    Assign a character to a specific team in the teams.json file.
    
    Args:
        team_name: Name of the team
        character: Character to assign
        teams_path: Path to teams.json file
    
    Returns:
        True if successful, False otherwise
    """
    try:
        with open(teams_path, "r", encoding="utf-8") as f:
            teams_data = json.load(f)
        
        if team_name not in teams_data:
            print(f"[CHARACTER ASSIGNMENT] Team {team_name} not found")
            return False
        
        # Update team with character
        team_data = teams_data[team_name]
        if isinstance(team_data, dict):
            team_data["character"] = character
        else:
            # Convert list format to dict format
            teams_data[team_name] = {
                "members": team_data if isinstance(team_data, list) else [],
                "character": character
            }
        
        with open(teams_path, "w", encoding="utf-8") as f:
            json.dump(teams_data, f, indent=2, ensure_ascii=False)
        
        print(f"[CHARACTER ASSIGNMENT] Assigned {character} to {team_name}")
        return True
    except Exception as e:
        print(f"[CHARACTER ASSIGNMENT] Error: {e}")
        return False


def assign_characters_by_matching(
    teams_path: str, available_characters: List[str]
) -> Dict[str, str]:
    """
    Automatically assign characters to teams by matching team names with available character names.
    
    Args:
        teams_path: Path to teams.json file
        available_characters: List of available character names
    
    Returns:
        Dictionary mapping team names to assigned characters
    """
    assignments = {}
    
    try:
        with open(teams_path, "r", encoding="utf-8") as f:
            teams_data = json.load(f)
        
        updated_teams = {}
        
        for team_name, team_data in teams_data.items():
            assigned_character = None
            
            # Try exact match first
            for character in available_characters:
                if character.lower() == team_name.lower():
                    assigned_character = character
                    break
            
            # Try partial match (team name contains character name)
            if not assigned_character:
                team_lower = team_name.lower()
                for character in available_characters:
                    char_lower = character.lower()
                    if char_lower in team_lower or team_lower in char_lower:
                        assigned_character = character
                        break
            
            # Update teams data
            if isinstance(team_data, dict):
                if assigned_character:
                    team_data["character"] = assigned_character
                updated_teams[team_name] = team_data
            else:
                # Convert list format to dict format
                updated_teams[team_name] = {
                    "members": team_data if isinstance(team_data, list) else [],
                    "character": assigned_character
                }
            
            assignments[team_name] = assigned_character
            if assigned_character:
                print(f"[CHARACTER MATCHING] {team_name} → {assigned_character}")
            else:
                print(f"[CHARACTER MATCHING] {team_name} → (no match found)")
        
        # Save updated teams
        with open(teams_path, "w", encoding="utf-8") as f:
            json.dump(updated_teams, f, indent=2, ensure_ascii=False)
        
        return assignments
    except Exception as e:
        print(f"[CHARACTER MATCHING] Error: {e}")
        return {}
