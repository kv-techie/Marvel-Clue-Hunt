from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Dict
import json
import os
from app.models import Team, GameState
from app.team_allocator import allocate_teams
from app.scoring import get_leaderboard, calculate_final_score
from app.timer_manager import timer_manager
from datetime import datetime

router = APIRouter()

TEAMS_FILE = "app/data/teams.json"
ATTENDANCE_FILE = "app/data/attendance.csv"
GAME_STATE_FILE = "app/data/game_state.json"

# In-memory game state
game_state: GameState = GameState()

def load_game_state():
    """Load game state from file"""
    global game_state
    if os.path.exists(GAME_STATE_FILE):
        with open(GAME_STATE_FILE, 'r') as f:
            data = json.load(f)
            game_state = GameState(**data)

def save_game_state():
    """Save game state to file"""
    os.makedirs(os.path.dirname(GAME_STATE_FILE), exist_ok=True)
    with open(GAME_STATE_FILE, 'w') as f:
        json.dump(game_state.dict(), f, default=str, indent=2)

@router.post("/upload-attendance")
async def upload_attendance(file: UploadFile = File(...)):
    """Upload attendance CSV and allocate teams"""
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    # Save uploaded file
    os.makedirs(os.path.dirname(ATTENDANCE_FILE), exist_ok=True)
    
    content = await file.read()
    with open(ATTENDANCE_FILE, 'wb') as f:
        f.write(content)
    
    # Allocate teams
    try:
        teams = allocate_teams(ATTENDANCE_FILE, TEAMS_FILE)
        
        # Initialize game state with teams
        game_state.teams = {
            name: Team(name=name, members=members)
            for name, members in teams.items()
        }
        save_game_state()
        
        return {
            "message": "Teams allocated successfully",
            "teams": teams,
            "total_teams": len(teams),
            "total_attendees": sum(len(members) for members in teams.values())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/teams")
async def get_all_teams():
    """Get all teams with their current status"""
    
    if not game_state.teams:
        raise HTTPException(status_code=404, detail="No teams allocated yet")
    
    teams_with_status = {}
    for team_name, team in game_state.teams.items():
        teams_with_status[team_name] = {
            "members": team.members,
            "hints_used": team.hints_used,
            "dialogues_completed": sum([
                team.dialogue_1_completed,
                team.dialogue_2_completed,
                team.dialogue_3_completed
            ]),
            "qualified": team.qualified,
            "current_score": calculate_final_score(team)
        }
    
    return teams_with_status

@router.post("/set-start-time")
async def set_start_time(start_time: str):
    """Set global game start time (ISO format)"""
    
    try:
        dt = datetime.fromisoformat(start_time)
        timer_manager.set_global_start_time(dt)
        game_state.global_start_time = dt
        save_game_state()
        
        return {
            "message": "Start time set successfully",
            "start_time": dt.isoformat()
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format")

@router.post("/start-game")
async def start_game():
    """Start the game immediately"""
    
    now = datetime.now()
    timer_manager.set_global_start_time(now)
    game_state.global_start_time = now
    game_state.game_active = True
    save_game_state()
    
    return {
        "message": "Game started",
        "start_time": now.isoformat()
    }

@router.get("/leaderboard")
async def get_admin_leaderboard():
    """Get full leaderboard with all team details"""
    
    if not game_state.teams:
        raise HTTPException(status_code=404, detail="No teams found")
    
    leaderboard = get_leaderboard(game_state.teams)
    
    return {
        "leaderboard": leaderboard,
        "game_active": timer_manager.is_game_active()
    }

@router.post("/award-enactment-bonus/{team_name}")
async def award_enactment_bonus(team_name: str):
    """Award enactment bonus to a team"""
    
    if team_name not in game_state.teams:
        raise HTTPException(status_code=404, detail="Team not found")
    
    team = game_state.teams[team_name]
    team.enactment_bonus_awarded = True
    save_game_state()
    
    return {
        "message": f"Enactment bonus awarded to {team_name}",
        "new_score": calculate_final_score(team)
    }

@router.get("/game-status")
async def get_game_status():
    """Get overall game status"""
    
    return {
        "game_active": timer_manager.is_game_active(),
        "global_start_time": game_state.global_start_time.isoformat() if game_state.global_start_time else None,
        "total_teams": len(game_state.teams),
        "teams_active": len([t for t in game_state.teams.values() if t.timer_started])
    }

# Load game state on startup
load_game_state()