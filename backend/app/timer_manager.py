from datetime import datetime, timedelta
from typing import Optional, Dict
from app.models import Team

class TimerManager:
    def __init__(self):
        self.global_start_time: Optional[datetime] = None
        self.team_timers: Dict[str, datetime] = {}
    
    def set_global_start_time(self, start_time: datetime):
        """Set the global event start time"""
        self.global_start_time = start_time
    
    def is_game_active(self) -> bool:
        """Check if game has started based on global time"""
        if not self.global_start_time:
            return False
        return datetime.now() >= self.global_start_time
    
    def start_team_timer(self, team_name: str) -> datetime:
        """Start timer for a team when first member logs in"""
        if team_name not in self.team_timers:
            # Only start if game is active
            if self.is_game_active():
                self.team_timers[team_name] = datetime.now()
        return self.team_timers.get(team_name)
    
    def get_team_elapsed_time(self, team_name: str) -> int:
        """Get elapsed time in seconds for a team"""
        if team_name not in self.team_timers:
            return 0
        
        start_time = self.team_timers[team_name]
        elapsed = datetime.now() - start_time
        return int(elapsed.total_seconds())
    
    def get_time_until_start(self) -> int:
        """Get seconds until global start time"""
        if not self.global_start_time:
            return -1
        
        now = datetime.now()
        if now >= self.global_start_time:
            return 0
        
        delta = self.global_start_time - now
        return int(delta.total_seconds())

# Global timer instance
timer_manager = TimerManager()