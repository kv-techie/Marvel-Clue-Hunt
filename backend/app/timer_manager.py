from datetime import datetime
from typing import Dict, Optional


class TimerManager:
    def __init__(self):
        self.global_start_time: Optional[datetime] = None
        self.team_timers: Dict[str, datetime] = {}

    def set_global_start_time(self, start_time: Optional[datetime]):
        """Set the global event start time"""
        self.global_start_time = start_time

    def reset_team_timers(self):
        """Clear all team timers."""
        self.team_timers.clear()

    def reset_all(self):
        """Reset global timer and all team timers."""
        self.global_start_time = None
        self.team_timers.clear()

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

    def restore_from_game_state(self, game_state: dict):
        """Restore global start time and per-team timers from saved game_state structure.

        Expects a dict with 'global_start_time' and 'teams' keys.
        """
        # Restore global start time
        global_start = game_state.get("global_start_time")
        if global_start:
            try:
                if isinstance(global_start, datetime):
                    self.global_start_time = global_start
                else:
                    self.global_start_time = datetime.fromisoformat(global_start)
                print(
                    f"🕐 Restored global_start_time: {self.global_start_time} (game_active: {self.is_game_active()})"
                )
            except Exception as e:
                print(f"⚠️  Failed to restore global_start_time: {e}")

        # Restore per-team timers
        teams = game_state.get("teams") if isinstance(game_state, dict) else None
        if not teams:
            return

        for team_name, team_data in teams.items():
            start_val = team_data.get("timer_started")
            if not start_val:
                continue

            # Accept datetime or ISO string
            if isinstance(start_val, datetime):
                self.team_timers[team_name] = start_val
                continue

            try:
                parsed = datetime.fromisoformat(start_val)
                self.team_timers[team_name] = parsed
            except Exception:
                # ignore invalid formats
                continue


# Global timer instance
timer_manager = TimerManager()
