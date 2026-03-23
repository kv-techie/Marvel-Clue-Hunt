import json
import os
from typing import Dict, List, Optional, Any

from app.models import Team


class PowerupManager:
    """Manages team-specific powerups loaded from powerups.json"""
    
    def __init__(self):
        self.powerups_data = self._load_powerups()
    
    def _load_powerups(self) -> Dict[str, List[Dict]]:
        """Load powerups from powerups.json"""
        powerups_path = os.path.join(
            os.path.dirname(__file__),
            "data",
            "powerups.json"
        )
        
        try:
            with open(powerups_path, 'r') as f:
                data = json.load(f)
                
            # Convert to dict keyed by team name
            result = {}
            for team_data in data.get("teams", []):
                team_name = team_data.get("team_name")
                powerups = team_data.get("powerups", [])
                result[team_name] = powerups
            
            return result
        except Exception as e:
            print(f"Error loading powerups: {e}")
            return {}
    
    def initialize_powerups_for_team(self, team: Team) -> None:
        """Initialize powerups_available for a team based on their name"""
        if not team.name or team.name not in self.powerups_data:
            print(f"Warning: No powerups configured for team '{team.name}'")
            team.powerups_available = {}
            return
        
        # Get team's powerups and initialize them all as locked (False) - to be unlocked through performance
        team_powerups = self.powerups_data[team.name]
        team.powerups_available = {
            powerup["id"]: False
            for powerup in team_powerups
        }
    
    def get_team_powerups(self, team_name: str) -> List[Dict]:
        """Get all powerups for a team"""
        return self.powerups_data.get(team_name, [])
    
    def get_powerup_info(self, team_name: str, powerup_id: str) -> Optional[Dict]:
        """Get info about a specific powerup"""
        team_powerups = self.get_team_powerups(team_name)
        for powerup in team_powerups:
            if powerup["id"] == powerup_id:
                return powerup
        return None
    
    def is_powerup_available(self, team: Team, powerup_id: str) -> bool:
        """Check if a powerup is available for a team"""
        return team.powerups_available.get(powerup_id, False)
    
    def use_powerup(self, team: Team, powerup_id: str) -> bool:
        """Mark a powerup as used"""
        if not self.is_powerup_available(team, powerup_id):
            return False
        
        team.powerups_available[powerup_id] = False
        team.powerups_used.append(powerup_id)
        return True
    
    def reset_powerups_for_new_stone(self, team: Team) -> None:
        """Reset all powerups when team gets assigned a new stone"""
        # Re-initialize powerups as all locked (False) for new stone
        self.initialize_powerups_for_team(team)
        team.powerups_used = []
        team.active_powerup_effect = None


# Global powerup manager instance
powerup_manager = PowerupManager()
