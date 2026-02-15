# Marvel-Clue-Hunt 🦸‍♂️

[![Python](https://img.shields.io/badge/Python-3.9%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.0%2B-61DAFB.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-Custom-red.svg)]()

A comprehensive, production-ready Marvel-themed clue hunt game management system with real-time tracking, advanced team management, automated scoring, and sophisticated disqualification mechanisms. Built for scalability and designed to handle live events with multiple teams competing simultaneously.

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Detailed Features](#detailed-features)
- [API Documentation](#api-documentation)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Game Workflow](#game-workflow)
- [Data Models](#data-models)
- [Security](#security)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🎯 Overview

Marvel-Clue-Hunt is a full-stack, event-grade application designed to manage interactive clue hunt competitions with real-time scoring, team coordination, and comprehensive administrative controls. Perfect for college events, corporate team-building activities, or any Marvel-themed interactive competition.

### Why Marvel-Clue-Hunt?

- **Real-time Operations**: Live timer synchronization, instant score updates, and real-time leaderboard
- **Robust Authentication**: Multi-role authentication system with device management and PIN-based access
- **Advanced Scoring**: Tiered scoring system with automatic calculations, manual adjustments, and audit trails
- **Fault Tolerance**: Data persistence across server restarts, timer recovery, and state management
- **Scalability**: Handles multiple teams simultaneously with independent timers and isolated game states
- **Admin Control**: Comprehensive dashboard with team management, scoring adjustments, and disqualification workflows

### Technology Stack

**Backend:**
- **FastAPI** - High-performance Python web framework with automatic OpenAPI documentation
- **Pydantic** - Data validation and settings management
- **JSON Storage** - Lightweight, human-readable persistence layer
- **Uvicorn** - Lightning-fast ASGI server

**Frontend:**
- **React 18** - Modern component-based UI framework
- **Vite** - Next-generation frontend tooling with HMR
- **React Router** - Client-side routing
- **Axios** - Promise-based HTTP client

## 🚀 Key Features

### 🔐 Multi-Level Authentication
- **Attendee Login**: Team-based authentication with device fingerprinting (max 3 devices/team)
- **Admin/Volunteer Access**: Secure PIN-based authentication with dynamic user management
- **Device Management**: Track and control device registrations per team
- **Session Persistence**: LocalStorage-based session management for seamless experience

### ⏱️ Advanced Timer Management
- **Individual Team Timers**: Each team runs on independent timer with millisecond precision
- **Global Game Clock**: Synchronized game start time across all teams
- **Persistent Timers**: Timers survive server restarts and are restored from saved state
- **Fallback Mechanisms**: Multiple fallback strategies for timer calculation reliability

### 📊 Comprehensive Scoring System
- **Time-Based Scoring**: Three-tiered scoring (Excellent/Good/Standard) based on completion time
- **Manual Adjustments**: Admin can reward/deduct points with mandatory audit trails
- **Automatic Calculations**: Real-time score computation with all factors included
- **Hint Penalties**: Configurable point deductions for hint usage
- **Bonus Awards**: Enactment bonuses and special achievement rewards

### ⚖️ Intelligent Disqualification System
- **Auto-Detection**: Automatically identify teams exceeding deduction thresholds
- **Workflow Management**: Multi-step confirmation process (Identify → Review → Confirm → Acknowledge)
- **Audit Trail**: Complete disqualification history with timestamps and reasons
- **Threshold Configuration**: Configurable limits for automatic disqualification triggers

### 📈 Real-Time Leaderboard
- **Live Updates**: Instant score recalculation and ranking adjustments
- **Detailed Statistics**: Shows dialogues completed, hints used, deductions, and qualification status
- **Disqualification Display**: Clear indication of disqualified teams with reasons
- **Role-Based Views**: Different visibility levels for admins, volunteers, and attendees

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐              │
│  │  Admin   │  │Volunteer │  │  Attendee  │              │
│  │Dashboard │  │Dashboard │  │  Dashboard │              │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘              │
│       │             │              │                       │
│       └─────────────┴──────────────┘                       │
│                     │                                       │
│              ┌──────▼──────┐                               │
│              │  API Client │                               │
│              └──────┬──────┘                               │
└───────────────────┬─┴────────────────────────────────────┘
                    │ HTTP/REST
┌───────────────────▼─────────────────────────────────────┐
│                    FastAPI Backend                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Route Handlers                        │ │
│  │  • admin.py     • volunteer.py                     │ │
│  │  • attendee.py  • common.py                        │ │
│  └────────────────┬───────────────────────────────────┘ │
│                   │                                       │
│  ┌────────────────▼───────────────────────────────────┐ │
│  │           Business Logic Layer                     │ │
│  │  • scoring.py  • timer_manager.py                  │ │
│  │  • team_allocator.py                               │ │
│  └────────────────┬───────────────────────────────────┘ │
│                   │                                       │
│  ┌────────────────▼───────────────────────────────────┐ │
│  │           Data Persistence Layer                   │ │
│  │  • game_state.json  • devices.json                 │ │
│  │  • admin_whitelist.json  • volunteer_whitelist.json│ │
│  └────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### Backend Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI application entry point
│   ├── config.py               # Configuration settings and environment variables
│   ├── models.py               # Pydantic models and data schemas
│   ├── scoring.py              # Scoring algorithms and calculations
│   ├── timer_manager.py        # Timer management and synchronization
│   ├── team_allocator.py       # Team allocation logic from CSV
│   ├── routes/
│   │   ├── admin.py            # Admin endpoints (21KB - most comprehensive)
│   │   ├── volunteer.py        # Volunteer endpoints
│   │   ├── attendee.py         # Attendee/team endpoints
│   │   └── common.py           # Shared/authentication endpoints
│   └── data/
│       ├── game_state.json     # Primary data store (teams, scores, PINs)
│       ├── devices.json         # Device registration tracking
│       ├── admin_whitelist.json    # Legacy admin whitelist
│       └── volunteer_whitelist.json # Legacy volunteer whitelist
├── tests/
│   └── test_auth.py            # Authentication tests
├── requirements.txt            # Python dependencies
└── README.md                   # Backend documentation
```

### Frontend Structure

```
frontend/
├── src/
│   ├── App.jsx                 # Root component with routing
│   ├── main.jsx                # Application entry point
│   ├── index.css               # Global styles
│   ├── pages/                  # Page-level components
│   │   ├── Login.jsx           # Login page for all roles
│   │   ├── AdminDashboard.jsx  # Admin control panel
│   │   ├── VolunteerDashboard.jsx
│   │   └── AttendeeDashboard.jsx
│   ├── admin/                  # Admin-specific components
│   │   ├── TeamManagement.jsx
│   │   ├── ScoreAdjustment.jsx
│   │   ├── DisqualificationPanel.jsx
│   │   └── UserManagement.jsx
│   ├── volunteer/              # Volunteer components
│   │   ├── DialogueValidator.jsx
│   │   └── TeamMonitor.jsx
│   ├── attendee/               # Attendee components
│   │   ├── Timer.jsx
│   │   ├── DialogueSubmission.jsx
│   │   └── TeamStatus.jsx
│   ├── components/             # Shared reusable components
│   │   ├── Leaderboard.jsx
│   │   ├── Timer.jsx
│   │   └── Navbar.jsx
│   ├── api/                    # API client and HTTP utilities
│   │   └── client.js           # Axios configuration
│   ├── context/                # React Context providers
│   │   ├── AuthContext.jsx
│   │   └── GameContext.jsx
│   ├── utils/                  # Utility functions
│   │   ├── timeFormatter.js
│   │   └── scoreCalculator.js
│   └── styles/                 # Component-specific styles
├── index.html                  # HTML entry point
├── package.json                # Node.js dependencies
├── vite.config.js              # Vite configuration
└── README.md                   # Frontend documentation
```

## 🎮 Detailed Features

### Authentication & Authorization

#### 1. Attendee Authentication (Team-Based)

**How It Works:**
- Teams authenticate using their **team name** and a **device ID**
- Device ID is automatically generated and stored in browser's `localStorage`
- Maximum of **3 devices** allowed per team
- Device registration persisted in `backend/app/data/devices.json`

**Implementation Details:**
```javascript
// Device ID generation (Frontend)
const deviceId = localStorage.getItem('device_id') || generateUUID();
localStorage.setItem('device_id', deviceId);

// Login request
POST /api/login
{
  "team_name": "Team Avengers",
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_admin": false
}
```

**Device Limit Enforcement:**
- When a 4th device attempts to login, the request is rejected
- Admin can view all registered devices per team
- Admin can remove specific devices to allow new device registration

**Security Features:**
- Device fingerprinting prevents unauthorized access
- Team isolation ensures data privacy between teams
- Session tokens stored securely in localStorage

#### 2. Admin/Volunteer Authentication (PIN-Based)

**How It Works:**
- Admins and volunteers authenticate using **username** and **PIN**
- PINs are set by admins through dedicated endpoints
- PINs stored in `game_state.json` under `admin_users` or `volunteer_users`
- Case-insensitive username lookup

**Implementation Details:**
```python
# Set PIN for admin
POST /api/admin/set-pin/admin/JohnDoe?pin=1234

# Login request
POST /api/login
{
  "name": "JohnDoe",
  "pin": "1234",
  "is_admin": true
}
```

**PIN Management:**
- Admins can create/update PINs for any user
- PINs can be numeric or alphanumeric
- List all PINs with user details
- Delete PINs to revoke access

**Legacy Whitelist Support:**
- System still supports old whitelist files (`admin_whitelist.json`, `volunteer_whitelist.json`)
- Backward compatible for smooth migration

### Team Management

#### Team Allocation

**CSV Upload Process:**
1. Admin uploads attendance CSV file
2. System parses CSV and extracts attendee names
3. Automatic team allocation algorithm distributes attendees evenly
4. Teams are named with Marvel character/team names
5. Team data initialized in game state

**CSV Format Expected:**
```csv
Name,Email,Registration_ID
John Doe,john@example.com,REG001
Jane Smith,jane@example.com,REG002
...
```

**Algorithm:**
- Reads CSV file from uploaded content
- Calculates optimal team size based on total attendees
- Allocates members to teams in round-robin fashion
- Creates `Team` objects with member lists
- Persists team data to `game_state.json`

**API Endpoint:**
```python
POST /api/admin/upload-attendance
Content-Type: multipart/form-data

Response:
{
  "message": "Teams allocated successfully",
  "teams": {
    "Team Iron Man": ["John Doe", "Alice Brown"],
    "Team Thor": ["Jane Smith", "Bob Wilson"],
    ...
  },
  "total_teams": 15,
  "total_attendees": 45
}
```

#### Device Management

**View Registered Devices:**
```python
GET /api/admin/devices/Team%20Avengers

Response:
{
  "team": "Team Avengers",
  "devices": [
    "550e8400-e29b-41d4-a716-446655440000",
    "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  ]
}
```

**Remove Device:**
```python
DELETE /api/admin/devices/Team%20Avengers/550e8400-e29b-41d4-a716-446655440000

Response:
{
  "message": "Device removed from Team Avengers",
  "devices": ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"]
}
```

**Use Cases:**
- Remove compromised devices
- Reset device registration when team member changes phone
- Troubleshoot login issues
- Audit device usage per team

### Timer Management System

#### Global Game Timer

**Purpose:** Synchronize game start across all teams

**Configuration:**
```python
# Set specific start time
POST /api/admin/set-start-time
{
  "start_time": "2026-02-15T10:00:00"
}

# Start immediately
POST /api/admin/start-game
```

**Behavior:**
- Sets `game_state.global_start_time`
- Activates `game_state.game_active` flag
- All teams can start their individual timers after this point

#### Individual Team Timers

**How It Works:**
1. Team logs in and navigates to dashboard
2. Team clicks "Start Timer" button
3. Backend records `team.timer_started` timestamp
4. Timer runs independently on client side
5. Server calculates elapsed time when needed for scoring

**Timer Persistence:**
```python
# TimerManager class
class TimerManager:
    def __init__(self):
        self.timers = {}  # In-memory timers
    
    def start_timer(self, team_name: str):
        self.timers[team_name] = datetime.now()
    
    def restore_from_game_state(self, game_data: dict):
        """Restore timers from saved game state on server restart"""
        for team_name, team_data in game_data.get('teams', {}).items():
            if team_data.get('timer_started'):
                timer_start = datetime.fromisoformat(team_data['timer_started'])
                self.timers[team_name] = timer_start
```

**Fallback Mechanism:**
- Primary: Use `TimerManager.timers[team_name]`
- Fallback: Use `team.timer_started` from persisted state
- Ensures timer accuracy even if server restarts mid-game

**Time Calculation Example:**
```python
def get_elapsed_time(team_name: str) -> int:
    # Try in-memory timer first
    if team_name in timer_manager.timers:
        return int((datetime.now() - timer_manager.timers[team_name]).total_seconds())
    
    # Fallback to persisted timer
    team = game_state.teams[team_name]
    if team.timer_started:
        return int((datetime.now() - team.timer_started).total_seconds())
    
    return 0
```

### Scoring System

#### Dialogue-Based Scoring

**Three Dialogue Stages:**
Each dialogue has different time thresholds and scoring tiers.

**Dialogue 1: Introduction Challenge**
- **Excellent** (100 pts): ≤ 5 minutes (300 seconds)
- **Good** (80 pts): ≤ 8 minutes (480 seconds)
- **Standard** (60 pts): > 8 minutes

**Dialogue 2: Intermediate Challenge**
- **Excellent** (100 pts): ≤ 7 minutes (420 seconds)
- **Good** (80 pts): ≤ 10 minutes (600 seconds)
- **Standard** (60 pts): > 10 minutes

**Dialogue 3: Advanced Challenge**
- **Excellent** (100 pts): ≤ 8 minutes (480 seconds)
- **Good** (80 pts): ≤ 12 minutes (720 seconds)
- **Standard** (60 pts): > 12 minutes

**Scoring Algorithm:**
```python
def calculate_dialogue_score(dialogue_number: int, time_taken: int) -> int:
    thresholds = {
        1: {'excellent': 300, 'good': 480},
        2: {'excellent': 420, 'good': 600},
        3: {'excellent': 480, 'good': 720}
    }
    
    threshold = thresholds[dialogue_number]
    
    if time_taken <= threshold['excellent']:
        return 100
    elif time_taken <= threshold['good']:
        return 80
    else:
        return 60
```

#### Hint System

**Configuration:**
- Maximum hints per team: **3**
- Penalty per hint: **10 points**
- Total possible penalty: **30 points**

**Implementation:**
```python
POST /api/attendee/request-hint
{
  "team_name": "Team Avengers",
  "dialogue_number": 2
}

Response:
{
  "hint": "Look for the red and gold armor...",
  "hints_remaining": 2,
  "penalty_applied": 10
}
```

**Hint Penalty Calculation:**
```python
hint_penalty = team.hints_used * settings.hint_penalty
# Example: 3 hints used = 3 * 10 = 30 points deducted
```

#### Manual Points Adjustment

**Purpose:** Allow admins to reward/deduct points for various reasons

**Features:**
- Mandatory reason field for all adjustments
- Tracks who made the adjustment
- Timestamp for audit trail
- Supports both rewards and deductions

**API Request:**
```python
POST /api/admin/adjust-points/Team%20Avengers?adjusted_by=AdminName
{
  "amount": 25,
  "reason": "Exceptional teamwork and sportsmanship",
  "adjustment_type": "reward"
}

Response:
{
  "message": "Reward of 25 points applied to Team Avengers",
  "new_score": 285,
  "auto_disqualified": false,
  "adjustment": {
    "adjusted_by": "AdminName",
    "amount": 25,
    "reason": "Exceptional teamwork and sportsmanship",
    "adjustment_type": "reward",
    "timestamp": "2026-02-15T14:30:00"
  }
}
```

**Audit Log:**
```python
GET /api/admin/adjustments-log

Response:
{
  "adjustments": [
    {
      "team_name": "Team Avengers",
      "adjusted_by": "AdminName",
      "amount": 25,
      "reason": "Exceptional teamwork",
      "adjustment_type": "reward",
      "timestamp": "2026-02-15T14:30:00"
    },
    {
      "team_name": "Team Thor",
      "adjusted_by": "VolunteerJane",
      "amount": 15,
      "reason": "Rule violation - using external help",
      "adjustment_type": "deduct",
      "timestamp": "2026-02-15T14:25:00"
    }
  ],
  "total": 2
}
```

#### Enactment Bonus

**Purpose:** Reward teams for best dramatic performance or role-play

**Configuration:**
- Default bonus: **50 points** (configurable)
- One-time award per team
- Admin-controlled

**API:**
```python
POST /api/admin/award-enactment-bonus/Team%20Avengers
{
  "bonus_amount": 75
}

Response:
{
  "message": "Enactment bonus of 75 awarded to Team Avengers",
  "new_score": 335
}
```

#### Final Score Calculation

**Formula:**
```
Final Score = 
  Dialogue 1 Score +
  Dialogue 2 Score +
  Dialogue 3 Score +
  Enactment Bonus -
  (Hints Used × Hint Penalty) +
  Sum of Manual Rewards -
  Sum of Manual Deductions
```

**Example Calculation:**
```python
# Team Performance:
- Dialogue 1: Completed in 4 minutes → 100 points
- Dialogue 2: Completed in 9 minutes → 80 points
- Dialogue 3: Completed in 15 minutes → 60 points
- Hints Used: 2 → -20 points
- Enactment Bonus: → +50 points
- Manual Reward: Best team spirit → +25 points
- Manual Deduction: Minor rule violation → -10 points

Final Score = 100 + 80 + 60 - 20 + 50 + 25 - 10 = 285 points
```

**Code Implementation:**
```python
def calculate_final_score(team: Team) -> int:
    score = 0
    
    # Dialogue scores
    if team.dialogue_1_completed and team.dialogue_1_time:
        score += calculate_dialogue_score(1, team.dialogue_1_time)
    if team.dialogue_2_completed and team.dialogue_2_time:
        score += calculate_dialogue_score(2, team.dialogue_2_time)
    if team.dialogue_3_completed and team.dialogue_3_time:
        score += calculate_dialogue_score(3, team.dialogue_3_time)
    
    # Hint penalty
    score -= team.hints_used * settings.hint_penalty
    
    # Enactment bonus
    if team.enactment_bonus_awarded:
        score += team.enactment_bonus_amount
    
    # Manual adjustments
    for adjustment in team.manual_adjustments:
        if adjustment.adjustment_type == "reward":
            score += adjustment.amount
        elif adjustment.adjustment_type == "deduct":
            score -= adjustment.amount
    
    return score
```

### Disqualification System

#### Auto-Disqualification Logic

**Trigger Condition:**
```python
Total Deductions ≥ Disqualification Threshold (200 points)

Total Deductions = (Hints Used × Hint Penalty) + Sum of Manual Deductions
```

**Example Scenarios:**

**Scenario 1: Heavy Hint Usage**
```
Hints Used: 3 → 30 points
Manual Deductions: 175 points (multiple rule violations)
Total: 205 points → AUTO-DISQUALIFICATION TRIGGERED
```

**Scenario 2: Major Rule Violation**
```
Hints Used: 0 → 0 points
Manual Deductions: 250 points (cheating detected)
Total: 250 points → AUTO-DISQUALIFICATION TRIGGERED
```

**Detection Function:**
```python
def check_auto_disqualification(team: Team) -> bool:
    if team.disqualified:
        return True
    
    total_deductions = calculate_total_deductions(team)
    return total_deductions >= settings.disqualification_deduction_threshold

def calculate_total_deductions(team: Team) -> int:
    total = team.hints_used * settings.hint_penalty
    
    for adjustment in team.manual_adjustments:
        if adjustment.adjustment_type == "deduct":
            total += adjustment.amount
    
    return total
```

#### Disqualification Workflow

**Step 1: Identification**
```python
GET /api/admin/disqualification-candidates

Response:
{
  "candidates": [
    {
      "team_name": "Team Loki",
      "members": ["Player1", "Player2", "Player3"],
      "total_deductions": 215,
      "threshold": 200,
      "reason": "Total deductions (215) exceed threshold (200)"
    }
  ],
  "total": 1
}
```

**Step 2: Admin Confirmation**
```python
POST /api/admin/confirm-disqualification/Team%20Loki?confirmed_by=AdminJohn

Response:
{
  "message": "Team Loki has been disqualified",
  "team_name": "Team Loki",
  "disqualified": true,
  "reason": "Automatic: Total deductions (215) exceed threshold (200)",
  "confirmed_by": "AdminJohn",
  "timestamp": "2026-02-15T15:00:00"
}
```

**Step 3: Team Acknowledgement**
```python
POST /api/admin/team-acknowledge-disqualification/Team%20Loki

Response:
{
  "message": "Team Loki has acknowledged disqualification",
  "acknowledged": true
}
```

**Data Model:**
```python
class Team(BaseModel):
    # ... other fields ...
    disqualified: bool = False
    disqualification_reason: Optional[str] = None
    disqualification_timestamp: Optional[datetime] = None
    disqualification_confirmed_by_admin: bool = False
    disqualification_acknowledged_by_team: bool = False
```

#### Manual Disqualification

Admins can also manually disqualify teams for reasons not related to point deductions:

```python
# Direct disqualification with custom reason
team.disqualified = True
team.disqualification_reason = "Unsportsmanlike conduct"
team.disqualification_timestamp = datetime.now()
team.disqualification_confirmed_by_admin = True
```

### Leaderboard System

#### Leaderboard Data Structure

```python
GET /api/admin/leaderboard

Response:
{
  "leaderboard": [
    {
      "team_name": "Team Iron Man",
      "score": 320,
      "qualified": true,
      "dialogues_completed": 3,
      "hints_used": 1,
      "members": ["Alice", "Bob", "Charlie"],
      "disqualified": false,
      "disqualification_reason": null,
      "disqualification_acknowledged": false,
      "disqualification_confirmed": false,
      "total_deductions": 10,
      "auto_disqualify_eligibility": false
    },
    {
      "team_name": "Team Thor",
      "score": 285,
      "qualified": true,
      "dialogues_completed": 3,
      "hints_used": 2,
      "members": ["David", "Emma", "Frank"],
      "disqualified": false,
      "disqualification_reason": null,
      "disqualification_acknowledged": false,
      "disqualification_confirmed": false,
      "total_deductions": 20,
      "auto_disqualify_eligibility": false
    }
  ],
  "game_active": true
}
```

#### Qualification Criteria

**Requirements:**
- Complete at least **2 out of 3 dialogues**
- Not be disqualified

**Checking Qualification:**
```python
def check_qualification(team: Team) -> bool:
    completed = sum([
        team.dialogue_1_completed,
        team.dialogue_2_completed,
        team.dialogue_3_completed
    ])
    return completed >= settings.qualification_threshold and not team.disqualified
```

#### Sorting and Ranking

```python
def get_leaderboard(teams: Dict[str, Team]) -> list:
    leaderboard = []
    
    for team_name, team in teams.items():
        leaderboard.append({
            "team_name": team_name,
            "score": calculate_final_score(team),
            "qualified": check_qualification(team),
            # ... other fields ...
        })
    
    # Sort by score descending
    leaderboard.sort(key=lambda x: x['score'], reverse=True)
    return leaderboard
```

## 📡 API Documentation

### Authentication Endpoints

#### Login (All Roles)
```http
POST /api/login
Content-Type: application/json

# Attendee Login
{
  "team_name": "Team Avengers",
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_admin": false
}

# Admin/Volunteer Login
{
  "name": "JohnDoe",
  "pin": "1234",
  "is_admin": true
}

Response:
{
  "success": true,
  "name": "JohnDoe" | "Team Avengers",
  "team": "Team Avengers" | null,
  "is_admin": true | false,
  "is_volunteer": false | true,
  "message": "Login successful"
}
```

### Admin Endpoints

#### Team Management

**Upload Attendance CSV**
```http
POST /api/admin/upload-attendance
Content-Type: multipart/form-data

Form Data:
  file: attendance.csv

Response:
{
  "message": "Teams allocated successfully",
  "teams": {"Team Iron Man": ["Alice", "Bob"], ...},
  "total_teams": 15,
  "total_attendees": 45
}
```

**Get All Teams**
```http
GET /api/admin/teams

Response:
{
  "Team Avengers": {
    "members": ["Alice", "Bob", "Charlie"],
    "hints_used": 2,
    "dialogues_completed": 3,
    "qualified": true,
    "current_score": 285
  },
  ...
}
```

**Delete Participant Data**
```http
POST /api/admin/delete-participant-data

Response:
{
  "message": "All participant data has been deleted successfully",
  "teams_cleared": true,
  "game_state_reset": true
}
```

#### Game Control

**Set Start Time**
```http
POST /api/admin/set-start-time
Content-Type: application/json

{
  "start_time": "2026-02-15T10:00:00"
}

Response:
{
  "message": "Start time set successfully",
  "start_time": "2026-02-15T10:00:00"
}
```

**Start Game Immediately**
```http
POST /api/admin/start-game

Response:
{
  "message": "Game started",
  "start_time": "2026-02-15T14:30:25.123456"
}
```

**Stop Game**
```http
POST /api/admin/stop-game

Response:
{
  "message": "Game stopped",
  "game_active": false
}
```

**Get Game Status**
```http
GET /api/admin/game-status

Response:
{
  "game_active": true,
  "global_start_time": "2026-02-15T10:00:00",
  "total_teams": 15,
  "teams_active": 12
}
```

#### Scoring Management

**Award Enactment Bonus**
```http
POST /api/admin/award-enactment-bonus/Team%20Avengers
Content-Type: application/json

{
  "bonus_amount": 75
}

Response:
{
  "message": "Enactment bonus of 75 awarded to Team Avengers",
  "new_score": 335
}
```

**Adjust Points**
```http
POST /api/admin/adjust-points/Team%20Avengers?adjusted_by=AdminJohn
Content-Type: application/json

{
  "amount": 25,
  "reason": "Exceptional teamwork",
  "adjustment_type": "reward"  // or "deduct"
}

Response:
{
  "message": "Reward of 25 points applied to Team Avengers",
  "new_score": 310,
  "auto_disqualified": false,
  "disqualification_reason": null,
  "adjustment": {
    "adjusted_by": "AdminJohn",
    "amount": 25,
    "reason": "Exceptional teamwork",
    "adjustment_type": "reward",
    "timestamp": "2026-02-15T14:30:00"
  }
}
```

**Get Adjustments Log**
```http
GET /api/admin/adjustments-log

Response:
{
  "adjustments": [
    {
      "team_name": "Team Avengers",
      "adjusted_by": "AdminJohn",
      "amount": 25,
      "reason": "Exceptional teamwork",
      "adjustment_type": "reward",
      "timestamp": "2026-02-15T14:30:00"
    }
  ],
  "total": 1
}
```

**Get Leaderboard**
```http
GET /api/admin/leaderboard

Response: [See Leaderboard Data Structure above]
```

#### Disqualification Management

**Get Disqualification Candidates**
```http
GET /api/admin/disqualification-candidates

Response:
{
  "candidates": [
    {
      "team_name": "Team Loki",
      "members": ["Player1", "Player2"],
      "total_deductions": 215,
      "threshold": 200,
      "reason": "Total deductions (215) exceed threshold (200)"
    }
  ],
  "total": 1
}
```

**Confirm Disqualification**
```http
POST /api/admin/confirm-disqualification/Team%20Loki?confirmed_by=AdminJohn

Response:
{
  "message": "Team Loki has been disqualified",
  "team_name": "Team Loki",
  "disqualified": true,
  "reason": "Automatic: Total deductions (215) exceed threshold (200)",
  "confirmed_by": "AdminJohn",
  "timestamp": "2026-02-15T15:00:00"
}
```

**Team Acknowledge Disqualification**
```http
POST /api/admin/team-acknowledge-disqualification/Team%20Loki

Response:
{
  "message": "Team Loki has acknowledged disqualification",
  "acknowledged": true
}
```

#### User Management

**List Admins**
```http
GET /api/admin/admins

Response:
{
  "admins": ["JohnDoe", "JaneSmith"]
}
```

**Add Admin**
```http
POST /api/admin/admins/AliceBrown

Response:
{
  "message": "AliceBrown has been added as admin",
  "admins": ["JohnDoe", "JaneSmith", "AliceBrown"]
}
```

**Remove Admin**
```http
DELETE /api/admin/admins/AliceBrown

Response:
{
  "message": "AliceBrown has been removed from admins",
  "admins": ["JohnDoe", "JaneSmith"]
}
```

**List Volunteers** (Similar pattern)
```http
GET /api/admin/volunteers
POST /api/admin/volunteers/{name}
DELETE /api/admin/volunteers/{name}
```

#### PIN Management

**Set PIN**
```http
POST /api/admin/set-pin/admin/JohnDoe?pin=1234

Response:
{
  "message": "PIN set for JohnDoe (admin)"
}
```

**List All PINs**
```http
GET /api/admin/pins

Response:
{
  "admin_users": [
    {
      "username": "JohnDoe",
      "pin": "1234",
      "role": "admin",
      "created_at": "2026-02-15T10:00:00"
    }
  ],
  "volunteer_users": [
    {
      "username": "JaneVolunteer",
      "pin": "5678",
      "role": "volunteer",
      "created_at": "2026-02-15T10:05:00"
    }
  ]
}
```

**Delete PIN**
```http
DELETE /api/admin/pin/admin/JohnDoe

Response:
{
  "message": "Removed JohnDoe from admin users"
}
```

#### Device Management

**List Team Devices**
```http
GET /api/admin/devices/Team%20Avengers

Response:
{
  "team": "Team Avengers",
  "devices": [
    "550e8400-e29b-41d4-a716-446655440000",
    "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  ]
}
```

**Remove Device**
```http
DELETE /api/admin/devices/Team%20Avengers/550e8400-e29b-41d4-a716-446655440000

Response:
{
  "message": "Device removed from Team Avengers",
  "devices": ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"]
}
```

### Volunteer Endpoints

**Get All Teams**
```http
GET /api/volunteer/teams

Response: [Similar to admin teams endpoint]
```

**Validate Dialogue Submission**
```http
POST /api/volunteer/validate-dialogue
Content-Type: application/json

{
  "team_name": "Team Avengers",
  "dialogue_number": 2,
  "answer": "Tony Stark",
  "time_taken": 420
}

Response:
{
  "correct": true,
  "score_awarded": 100,
  "message": "Correct answer! Excellent time."
}
```

**Get Leaderboard**
```http
GET /api/volunteer/leaderboard

Response: [Same as admin leaderboard]
```

### Attendee Endpoints

**Start Timer**
```http
POST /api/attendee/start-timer
Content-Type: application/json

{
  "team_name": "Team Avengers"
}

Response:
{
  "message": "Timer started for Team Avengers",
  "start_time": "2026-02-15T14:30:00"
}
```

**Submit Dialogue Answer**
```http
POST /api/attendee/submit-dialogue
Content-Type: application/json

{
  "team_name": "Team Avengers",
  "dialogue_number": 1,
  "answer": "Iron Man",
  "time_taken": 280
}

Response:
{
  "correct": true,
  "score": 100,
  "message": "Excellent! Dialogue 1 completed.",
  "time_category": "excellent"
}
```

**Request Hint**
```http
POST /api/attendee/request-hint
Content-Type: application/json

{
  "team_name": "Team Avengers",
  "dialogue_number": 2
}

Response:
{
  "hint": "Think about the Avenger with a red and gold suit...",
  "hints_remaining": 2,
  "penalty_applied": 10
}
```

**Get Team Status**
```http
GET /api/attendee/team-status?team_name=Team%20Avengers

Response:
{
  "team_name": "Team Avengers",
  "members": ["Alice", "Bob", "Charlie"],
  "timer_started": "2026-02-15T14:30:00",
  "elapsed_time": 1245,
  "dialogues_completed": [true, true, false],
  "hints_used": 2,
  "hints_remaining": 1,
  "current_score": 170,
  "qualified": true,
  "disqualified": false
}
```

**Get Public Leaderboard**
```http
GET /api/attendee/leaderboard

Response: [Simplified version without sensitive details]
```

## 🛠️ Installation & Setup

### Prerequisites

- **Python 3.9+** (Backend)
- **Node.js 16+** and npm (Frontend)
- **Git** (Version control)
- **Terminal/Command Prompt**

### Backend Setup

#### 1. Clone Repository
```bash
git clone https://github.com/kv-techie/Marvel-Clue-Hunt.git
cd Marvel-Clue-Hunt
```

#### 2. Navigate to Backend
```bash
cd backend
```

#### 3. Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### 4. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Dependencies Include:**
- `fastapi` - Web framework
- `uvicorn[standard]` - ASGI server
- `pydantic` - Data validation
- `pydantic-settings` - Settings management
- `python-multipart` - File upload support

#### 5. Create Data Directory
```bash
mkdir -p app/data
```

#### 6. Run Backend Server

**Development Mode (with auto-reload):**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Production Mode:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Backend will be available at:
- API: `http://localhost:8000`
- Auto-generated API Docs: `http://localhost:8000/docs`
- Alternative API Docs: `http://localhost:8000/redoc`

### Frontend Setup

#### 1. Navigate to Frontend
```bash
cd ../frontend  # From backend directory
# OR
cd frontend  # From root directory
```

#### 2. Install Dependencies
```bash
npm install
```

**Dependencies Include:**
- `react` - UI framework
- `react-dom` - React rendering
- `react-router-dom` - Routing
- `axios` - HTTP client
- `vite` - Build tool

#### 3. Configure API Endpoint

Edit `src/api/client.js` to point to your backend:
```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export default axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});
```

#### 4. Run Development Server
```bash
npm run dev
```

Frontend will be available at: `http://localhost:5173`

#### 5. Build for Production
```bash
npm run build
```

Production files will be in `dist/` directory.

### Docker Setup (Optional)

**Docker Compose (Full Stack):**
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend/app/data:/app/app/data
    environment:
      - DEBUG=false
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

**Run with Docker:**
```bash
docker-compose up -d
```

## ⚙️ Configuration

### Backend Configuration

**File:** `backend/app/config.py`

```python
class Settings(BaseSettings):
    # Application
    app_name: str = "Marvel Clue Hunt"
    debug: bool = True
    
    # Game Settings
    max_hints: int = 3                          # Maximum hints per team
    hint_penalty: int = 10                      # Points deducted per hint
    dialogue_rounds: int = 3                    # Number of dialogue stages
    qualification_threshold: int = 2            # Min dialogues to qualify
    disqualification_deduction_threshold: int = 200  # Auto-DQ threshold
    
    # Dialogue 1 Thresholds (seconds)
    dialogue_1_excellent: int = 300  # 5 minutes
    dialogue_1_good: int = 480       # 8 minutes
    
    # Dialogue 2 Thresholds (seconds)
    dialogue_2_excellent: int = 420  # 7 minutes
    dialogue_2_good: int = 600       # 10 minutes
    
    # Dialogue 3 Thresholds (seconds)
    dialogue_3_excellent: int = 480  # 8 minutes
    dialogue_3_good: int = 720       # 12 minutes
    
    # Bonuses
    enactment_bonus: int = 50       # Default enactment bonus
    
    class Config:
        env_file = ".env"
```

### Environment Variables

Create `.env` file in `backend/` directory:

```env
# Application Settings
APP_NAME="Marvel Clue Hunt - College Fest 2026"
DEBUG=true

# Game Configuration
MAX_HINTS=3
HINT_PENALTY=10
DISQUALIFICATION_DEDUCTION_THRESHOLD=200

# Scoring Thresholds (in seconds)
DIALOGUE_1_EXCELLENT=300
DIALOGUE_1_GOOD=480
DIALOGUE_2_EXCELLENT=420
DIALOGUE_2_GOOD=600
DIALOGUE_3_EXCELLENT=480
DIALOGUE_3_GOOD=720

# Bonus Points
ENACTMENT_BONUS=50
```

### Customizing Scoring

**Example: Make Game Easier**
```python
# Increase time thresholds
dialogue_1_excellent: int = 420  # 7 minutes (was 5)
dialogue_1_good: int = 600       # 10 minutes (was 8)

# Reduce hint penalty
hint_penalty: int = 5  # 5 points (was 10)

# Increase DQ threshold
disqualification_deduction_threshold: int = 300  # (was 200)
```

**Example: Make Game Harder**
```python
# Decrease time thresholds
dialogue_1_excellent: int = 240  # 4 minutes (was 5)
dialogue_1_good: int = 360       # 6 minutes (was 8)

# Increase hint penalty
hint_penalty: int = 20  # 20 points (was 10)

# Decrease DQ threshold
disqualification_deduction_threshold: int = 150  # (was 200)
```

## 🎮 Game Workflow

### Pre-Game Setup (Admin)

**Step 1: Initial Configuration**
1. Start backend and frontend servers
2. Admin logs in with PIN
3. Navigate to admin dashboard

**Step 2: User Management**
1. Create PINs for volunteers:
   ```
   POST /api/admin/set-pin/volunteer/JaneVolunteer?pin=5678
   ```
2. Add additional admins if needed
3. Verify user lists

**Step 3: Team Allocation**
1. Prepare attendance CSV with attendee names
2. Upload CSV via admin dashboard:
   ```
   POST /api/admin/upload-attendance
   ```
3. System automatically creates teams
4. Review team allocations

**Step 4: Game Scheduling**
1. Set game start time:
   ```
   POST /api/admin/set-start-time
   {"start_time": "2026-02-15T10:00:00"}
   ```
   OR
2. Start immediately:
   ```
   POST /api/admin/start-game
   ```

### During Game

**Team Workflow:**

1. **Login**
   - Access attendee portal
   - Enter team name
   - Device ID auto-generated and stored
   - Max 3 devices per team

2. **Start Timer**
   - Click "Start Timer" button
   - Timer begins tracking elapsed time
   - Cannot restart once started

3. **Complete Dialogues**
   - Read dialogue challenge
   - Solve puzzle/riddle
   - Submit answer
   - Volunteer validates submission

4. **Request Hints (Optional)**
   - Click "Request Hint" button
   - 10 points deducted per hint
   - Max 3 hints available
   - Use wisely!

5. **Monitor Progress**
   - View team status
   - Check current score
   - See leaderboard ranking

**Volunteer Workflow:**

1. **Login**
   - Use assigned PIN
   - Access volunteer dashboard

2. **Monitor Teams**
   - View all team statuses
   - Check progress in real-time

3. **Validate Submissions**
   - Receive dialogue submissions
   - Verify answers
   - Approve/reject submissions
   - Record completion times

4. **Assist Teams**
   - Answer questions
   - Provide hints when requested
   - Ensure fair play

**Admin Workflow:**

1. **Monitor Overall Game**
   - Watch real-time leaderboard
   - Track team progress
   - Monitor game status

2. **Handle Issues**
   - Adjust points for special situations
   - Remove devices if needed
   - Resolve disputes

3. **Manage Disqualifications**
   - Review disqualification candidates
   - Confirm auto-disqualifications
   - Handle manual disqualifications

4. **Award Bonuses**
   - Grant enactment bonuses
   - Reward exceptional performance
   - Provide manual point adjustments

### Post-Game

**Step 1: Game Completion**
1. Stop the game:
   ```
   POST /api/admin/stop-game
   ```
2. Final scores calculated automatically

**Step 2: Review Results**
1. View final leaderboard
2. Review adjustment logs
3. Check qualification status
4. Identify winners

**Step 3: Audit & Analysis**
1. Export adjustment logs:
   ```
   GET /api/admin/adjustments-log
   ```
2. Review disqualification records
3. Analyze team performance

**Step 4: Cleanup**
1. Delete participant data:
   ```
   POST /api/admin/delete-participant-data
   ```
2. Reset for next event
3. Backup data if needed

## 📊 Data Models

### Team Model
```python
class Team(BaseModel):
    name: str                                      # Team name
    members: List[str]                             # List of member names
    timer_started: Optional[datetime] = None       # When timer was started
    hints_used: int = 0                           # Number of hints used
    
    # Dialogue 1
    dialogue_1_completed: bool = False
    dialogue_1_time: Optional[int] = None         # Time in seconds
    
    # Dialogue 2
    dialogue_2_completed: bool = False
    dialogue_2_time: Optional[int] = None
    
    # Dialogue 3
    dialogue_3_completed: bool = False
    dialogue_3_time: Optional[int] = None
    
    # Qualification & Scoring
    qualified: bool = False                        # Completed ≥2 dialogues
    enactment_bonus_awarded: bool = False
    enactment_bonus_amount: int = 0
    manual_adjustments: List[PointAdjustment] = []
    final_score: Optional[int] = None
    
    # Disqualification
    disqualified: bool = False
    disqualification_reason: Optional[str] = None
    disqualification_timestamp: Optional[datetime] = None
    disqualification_confirmed_by_admin: bool = False
    disqualification_acknowledged_by_team: bool = False
```

### Point Adjustment Model
```python
class PointAdjustment(BaseModel):
    timestamp: datetime                   # When adjustment was made
    adjusted_by: str                     # Admin/volunteer who made it
    amount: int                          # Points amount
    reason: str                          # Mandatory reason
    adjustment_type: str                 # "reward" or "deduct"
```

### Game State Model
```python
class GameState(BaseModel):
    global_start_time: Optional[datetime] = None  # Game start time
    game_active: bool = False                     # Is game running?
    teams: Dict[str, Team] = {}                   # All teams
    admin_users: Dict[str, dict] = {}            # Admin PINs
    volunteer_users: Dict[str, dict] = {}        # Volunteer PINs
```

### Login Models
```python
class LoginRequest(BaseModel):
    # Attendee fields
    team_name: Optional[str] = None
    device_id: Optional[str] = None
    
    # Admin/Volunteer fields
    name: Optional[str] = None
    pin: Optional[str] = None
    
    # Role indicator
    is_admin: bool = False

class LoginResponse(BaseModel):
    success: bool
    name: str
    team: Optional[str] = None
    is_admin: bool
    is_volunteer: bool = False
    message: str
```

## 🔒 Security

### Authentication Security

**PIN Storage:**
- PINs stored in `game_state.json`
- Plain text storage (consider hashing for production)
- Case-insensitive username lookup

**Device Management:**
- Device IDs prevent unauthorized team access
- UUID v4 format for device IDs
- 3-device limit per team
- Admin can revoke devices

**Session Management:**
- Client-side session storage (localStorage)
- No server-side session tracking
- Stateless authentication

### Recommendations for Production

**1. Implement Password Hashing:**
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# When setting PIN
hashed_pin = pwd_context.hash(pin)

# When verifying
pwd_context.verify(provided_pin, stored_hashed_pin)
```

**2. Add CORS Configuration:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**3. Implement Rate Limiting:**
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/login")
@limiter.limit("5/minute")
async def login(request: Request, ...):
    ...
```

**4. Add HTTPS in Production:**
- Use SSL/TLS certificates
- Redirect HTTP to HTTPS
- Enable HSTS headers

**5. Input Validation:**
- Already using Pydantic for validation
- Add additional sanitization for file uploads
- Validate CSV content thoroughly

## 🧪 Testing

### Backend Tests

**Run All Tests:**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python -m pytest tests/ -v
```

**Run Specific Test File:**
```bash
python -m pytest tests/test_auth.py -v
```

**Run with Coverage:**
```bash
pytest tests/ --cov=app --cov-report=html
```

### Test Structure

```
backend/tests/
├── test_auth.py           # Authentication tests
├── test_scoring.py        # Scoring logic tests
├── test_timer.py          # Timer management tests
├── test_api_admin.py      # Admin endpoint tests
├── test_api_volunteer.py  # Volunteer endpoint tests
└── test_api_attendee.py   # Attendee endpoint tests
```

### Example Test Cases

**Authentication Tests:**
```python
def test_attendee_login_success():
    """Test successful attendee login with valid team and device"""
    response = client.post("/api/login", json={
        "team_name": "Team Avengers",
        "device_id": "test-device-123",
        "is_admin": False
    })
    assert response.status_code == 200
    assert response.json()["success"] == True

def test_device_limit_exceeded():
    """Test device limit enforcement (max 3 devices)"""
    # Register 3 devices
    for i in range(3):
        client.post("/api/login", json={
            "team_name": "Team Thor",
            "device_id": f"device-{i}",
            "is_admin": False
        })
    
    # 4th device should fail
    response = client.post("/api/login", json={
        "team_name": "Team Thor",
        "device_id": "device-4",
        "is_admin": False
    })
    assert response.status_code == 403
```

**Scoring Tests:**
```python
def test_calculate_dialogue_score():
    """Test dialogue score calculation"""
    assert calculate_dialogue_score(1, 280) == 100  # Excellent
    assert calculate_dialogue_score(1, 450) == 80   # Good
    assert calculate_dialogue_score(1, 600) == 60   # Standard

def test_auto_disqualification():
    """Test auto-disqualification trigger"""
    team = Team(name="Test Team", members=["Player1"])
    team.hints_used = 3  # 30 points
    team.manual_adjustments = [
        PointAdjustment(
            timestamp=datetime.now(),
            adjusted_by="Admin",
            amount=180,
            reason="Major violation",
            adjustment_type="deduct"
        )
    ]
    # Total deductions: 30 + 180 = 210 > 200 threshold
    assert check_auto_disqualification(team) == True
```

### Frontend Tests

**Install Testing Dependencies:**
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest
```

**Run Frontend Tests:**
```bash
npm test
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Backend Won't Start

**Error:** `ModuleNotFoundError: No module named 'fastapi'`

**Solution:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

#### 2. Frontend Build Fails

**Error:** `Cannot find module 'vite'`

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### 3. CORS Errors

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:** Add CORS middleware in `backend/app/main.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 4. Timer Not Persisting After Restart

**Issue:** Timers reset when server restarts

**Solution:** Ensure `load_game_state()` is called on startup and `TimerManager.restore_from_game_state()` is implemented correctly.

#### 5. Device Limit Not Working

**Issue:** More than 3 devices can log in

**Check:**
1. Verify `devices.json` exists in `backend/app/data/`
2. Check device registration logic in `routes/common.py`
3. Ensure device IDs are being saved correctly

#### 6. Scores Not Calculating Correctly

**Debug Steps:**
1. Check dialogue completion times
2. Verify time thresholds in `config.py`
3. Review manual adjustments in audit log
4. Check hint penalty calculations

### Debugging Tips

**Enable Debug Logging:**
```python
# backend/app/main.py
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@app.post("/api/login")
async def login(request: LoginRequest):
    logger.debug(f"Login attempt: {request}")
    ...
```

**Check API Requests:**
```bash
# View all requests in real-time
tail -f backend/logs/access.log
```

**Inspect Game State:**
```bash
# View current game state
cat backend/app/data/game_state.json | jq .
```

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Add tests for new features**
5. **Run test suite:**
   ```bash
   pytest tests/ -v
   ```
6. **Commit your changes:**
   ```bash
   git commit -m "Add amazing feature"
   ```
7. **Push to branch:**
   ```bash
   git push origin feature/amazing-feature
   ```
8. **Open a Pull Request**

### Code Style

**Python (Backend):**
- Follow PEP 8 guidelines
- Use type hints
- Add docstrings to functions
- Run `black` for formatting:
  ```bash
  pip install black
  black backend/app/
  ```

**JavaScript (Frontend):**
- Use ESLint
- Follow Airbnb style guide
- Use functional components
- Run prettier:
  ```bash
  npm run format
  ```

### Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build/config changes

**Examples:**
```
feat: Add team disqualification workflow
fix: Resolve timer persistence issue on restart
docs: Update API documentation for new endpoints
```

## 📝 License

This project is developed for **Jain (Deemed-to-be) University** events and competitions.

For commercial use or licensing inquiries, please contact the development team.

## 👥 Credits

**Developer:** Kedhar Vinod  
**Organization:** Jain (Deemed-to-be) University  
**Location:** Bengaluru, Karnataka, India  
**Email:** vinod.kedhar05@gmail.com

## 📞 Support

For issues, questions, or feature requests:

1. **Check documentation** - Most common issues are covered here
2. **Search existing issues** - Someone might have had the same problem
3. **Open a new issue** - Provide detailed information:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots if applicable
   - Environment details (OS, Python version, etc.)

## 🗺️ Roadmap

### Upcoming Features

- [ ] **CI/CD Pipeline** - Automated testing and deployment
- [ ] **Real-time Notifications** - Push notifications for teams
- [ ] **Advanced Analytics** - Detailed performance reports
- [ ] **Mobile App** - Native mobile applications
- [ ] **Database Integration** - PostgreSQL/MongoDB support
- [ ] **Multi-language Support** - i18n implementation
- [ ] **Export Functionality** - PDF/Excel report generation
- [ ] **OAuth Integration** - Google/Microsoft SSO
- [ ] **Websockets** - Real-time leaderboard updates
- [ ] **Admin Dashboard v2** - Enhanced UI with charts

### Future Improvements

- Implement password hashing for PINs
- Add rate limiting for API endpoints
- Improve error handling and validation
- Add comprehensive logging system
- Create Docker images for easy deployment
- Add load testing and performance optimization
- Implement backup and restore functionality
- Add role-based permission system

---

**Built with ❤️ for Marvel fans and competitive spirits!**

*May the best team win! 🏆*
