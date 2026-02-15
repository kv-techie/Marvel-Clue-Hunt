# Marvel-Clue-Hunt 🦸‍♂️

[![Python](https://img.shields.io/badge/Python-3.9%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.0%2B-61DAFB.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-Custom-red.svg)]()

A comprehensive, production-ready Marvel-themed clue hunt game management system with real-time tracking, advanced team management, automated scoring, sophisticated disqualification mechanisms, and **persistent credential management**.

## 📋 Table of Contents

- [Overview](#overview)
- [What's New](#whats-new)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Game Workflow](#game-workflow)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🎯 Overview

Marvel-Clue-Hunt is a full-stack, event-grade application designed to manage interactive clue hunt competitions with real-time scoring, team coordination, and comprehensive administrative controls. Perfect for college events, corporate team-building activities, or any Marvel-themed interactive competition.

### Why Marvel-Clue-Hunt?

- **Real-time Operations**: Live timer synchronization, instant score updates, and real-time leaderboard
- **Robust Authentication**: Multi-role authentication system with device management and PIN-based access
- **Persistent Credentials**: Separate credential storage ensures admin/volunteer access survives game resets
- **Advanced Scoring**: Tiered scoring system with automatic calculations, manual adjustments, and audit trails
- **Fault Tolerance**: Data persistence across server restarts, timer recovery, and state management
- **Scalability**: Handles multiple teams simultaneously with independent timers and isolated game states
- **Admin Control**: Comprehensive dashboard with team management, scoring adjustments, and disqualification workflows

### Technology Stack

**Backend:**
- **FastAPI** - High-performance Python web framework with automatic OpenAPI documentation
- **Pydantic** - Data validation and settings management
- **JSON Storage** - Lightweight, human-readable persistence layer with separation of concerns
- **Uvicorn** - Lightning-fast ASGI server

**Frontend:**
- **React 18** - Modern component-based UI framework
- **Vite** - Next-generation frontend tooling with HMR
- **React Router** - Client-side routing
- **Axios** - Promise-based HTTP client

## 🆕 What's New

### Latest Updates (February 2026)

#### ✨ Credential Management Overhaul
- **Separate Credential Storage**: Admin and volunteer credentials now stored in dedicated files (`admin_credentials.json`, `volunteer_credentials.json`)
- **Persistent Across Game Resets**: Deleting participant data no longer affects admin/volunteer access
- **Multi-Source Authentication**: Supports both new credential files and legacy whitelist system for backward compatibility
- **Timestamped PIN Management**: All PIN operations include `created_at` and `updated_at` timestamps for audit trails

#### 🔧 Bug Fixes & Improvements
- **Fixed Device Removal**: Device removal now properly handles both string (legacy) and object (new) formats
- **Data Persistence**: Resolved issues where volunteers would disappear after adding new users
- **Session Management**: Fixed race condition where users were logged out on page refresh
- **Inline PIN Management**: Admins and volunteers can now change their own PINs directly from dashboard

#### 🎨 Frontend Enhancements
- **Loading States**: Added loading indicators during authentication state restoration
- **Protected Routes**: Improved route protection with proper session persistence
- **PIN Change Feature**: Self-service PIN updates for all users
- **Better Error Handling**: More informative error messages throughout the UI

#### 🗂️ File Upload Improvements
- **Dual Upload Method**: Support for both CSV-based and dual-file (team names + attendees) team allocation
- **Better Validation**: Enhanced file format validation and error reporting
- **Flexible Parsing**: Handles both CSV and TXT formats with smart column detection

## 🚀 Key Features

### 🔐 Enhanced Multi-Level Authentication

#### **Attendee Login**
- Team-based authentication with device fingerprinting
- Device metadata tracking (browser, OS, screen resolution, user agent)
- Maximum 3 devices per team with admin override capability
- Device replacement workflow for lost/replaced phones

#### **Admin/Volunteer Access**
- **Three-Tier Authentication Priority**:
  1. **Primary**: Dedicated credential files (new system)
  2. **Fallback**: game_state.json entries (legacy compatibility)
  3. **Legacy**: Whitelist files (backward compatibility)
- Secure PIN-based authentication with case-insensitive lookup
- Self-service PIN changes with confirmation
- Complete audit trail for all credential operations

### 📁 Improved Data Architecture

```
backend/app/data/
├── admin_credentials.json       # Persistent admin credentials (NEW)
├── volunteer_credentials.json   # Persistent volunteer credentials (NEW)
├── game_state.json             # Game data (teams, scores, timers)
├── devices.json                # Device registration tracking
├── teams.json                  # Team allocations
├── admin_whitelist.json        # Legacy admin list
└── volunteer_whitelist.json    # Legacy volunteer list
```

**Benefits of Separation**:
- ✅ Credentials never accidentally deleted during game resets
- ✅ Independent backup and restoration of user data
- ✅ Multi-game credential persistence
- ✅ Simpler credential management workflow
- ✅ Reduced risk of data loss

### ⏱️ Advanced Timer Management
- **Individual Team Timers**: Each team runs on independent timer with millisecond precision
- **Global Game Clock**: Synchronized game start time across all teams
- **Persistent Timers**: Timers survive server restarts and are restored from saved state
- **Fallback Mechanisms**: Multiple fallback strategies for timer calculation reliability

### 📊 Comprehensive Scoring System
- **Time-Based Scoring**: Three-tiered scoring (Excellent/Good/Standard) based on completion time
- **Manual Adjustments**: Admin can reward/deduct points with mandatory audit trails
- **Automatic Calculations**: Real-time score computation with all factors included
- **Hint Penalties**: Configurable point deductions for hint usage (default: 10 points/hint, max 3 hints)
- **Bonus Awards**: Enactment bonuses and special achievement rewards
- **Full Audit Log**: Complete history of all point adjustments with timestamps and reasons

### ⚖️ Intelligent Disqualification System
- **Auto-Detection**: Automatically identify teams exceeding deduction thresholds (default: 200 points)
- **Workflow Management**: Multi-step confirmation process (Identify → Review → Confirm → Acknowledge)
- **Audit Trail**: Complete disqualification history with timestamps and reasons
- **Threshold Configuration**: Configurable limits for automatic disqualification triggers

### 📈 Real-Time Leaderboard
- **Live Updates**: Instant score recalculation and ranking adjustments
- **Detailed Statistics**: Shows dialogues completed, hints used, deductions, and qualification status
- **Disqualification Display**: Clear indication of disqualified teams with reasons
- **Role-Based Views**: Different visibility levels for admins, volunteers, and attendees

### 🔧 Device Management
- **Enhanced Tracking**: Comprehensive device metadata collection
- **Easy Removal**: Fixed device removal bug - now works with both legacy and new formats
- **Duplicate Prevention**: Fingerprint-based duplicate device detection
- **Admin Controls**: View and manage all registered devices per team

## 🏗️ Architecture

### Backend Structure

```
backend/
├── app/
│   ├── main.py                      # FastAPI application entry point
│   ├── config.py                    # Configuration settings and environment variables
│   ├── models.py                    # Pydantic models and data schemas
│   ├── scoring.py                   # Scoring algorithms and calculations
│   ├── timer_manager.py             # Timer management and synchronization
│   ├── team_allocator.py            # Team allocation logic from CSV
│   ├── routes/
│   │   ├── admin.py                 # Admin endpoints (UPDATED - separate credentials)
│   │   ├── volunteer.py             # Volunteer endpoints
│   │   ├── attendee.py              # Attendee/team endpoints
│   │   └── common.py                # Shared/authentication endpoints (UPDATED)
│   └── data/
│       ├── admin_credentials.json   # 🆕 Persistent admin credentials
│       ├── volunteer_credentials.json # 🆕 Persistent volunteer credentials
│       ├── game_state.json          # Primary data store (teams, scores, timers)
│       ├── devices.json             # Device registration tracking
│       ├── teams.json               # Team allocations
│       ├── admin_whitelist.json     # Legacy admin whitelist
│       └── volunteer_whitelist.json # Legacy volunteer whitelist
├── tests/
│   └── test_auth.py                 # Authentication tests
├── requirements.txt                 # Python dependencies
└── README.md                        # Backend documentation
```

### Frontend Structure

```
frontend/
├── src/
│   ├── App.jsx                      # Root component with routing
│   ├── main.jsx                     # Application entry point
│   ├── index.css                    # Global styles
│   ├── pages/                       # Page-level components
│   │   ├── Login.jsx                # Login page (UPDATED - better session handling)
│   │   ├── AdminDashboard.jsx       # Admin control panel
│   │   ├── VolunteerDashboard.jsx   # Volunteer dashboard (UPDATED - PIN change)
│   │   └── AttendeeDashboard.jsx    # Attendee dashboard
│   ├── admin/                       # Admin-specific components
│   │   ├── TeamManagement.jsx       # Team allocation and management
│   │   ├── ScoreAdjustment.jsx      # Manual point adjustments
│   │   ├── DisqualificationPanel.jsx # Disqualification workflow
│   │   ├── UserManagement.jsx       # Admin/volunteer management (UPDATED)
│   │   └── DeviceManagement.jsx     # Device tracking and removal
│   ├── volunteer/                   # Volunteer components
│   │   ├── DialogueValidator.jsx    # Validate team submissions
│   │   └── TeamMonitor.jsx          # Monitor team progress
│   ├── attendee/                    # Attendee components
│   │   ├── Timer.jsx                # Team timer display
│   │   ├── DialogueSubmission.jsx   # Submit answers
│   │   └── TeamStatus.jsx           # View team status
│   ├── components/                  # Shared reusable components
│   │   ├── Leaderboard.jsx          # Real-time leaderboard
│   │   ├── Timer.jsx                # Timer component
│   │   ├── ProtectedRoute.jsx       # Route protection (UPDATED)
│   │   └── Navbar.jsx               # Navigation bar
│   ├── api/                         # API client and HTTP utilities
│   │   └── client.js                # Axios configuration
│   ├── context/                     # React Context providers
│   │   ├── AuthContext.jsx          # Authentication state (UPDATED)
│   │   └── GameContext.jsx          # Game state management
│   ├── utils/                       # Utility functions
│   │   ├── timeFormatter.js         # Time formatting utilities
│   │   └── scoreCalculator.js       # Client-side score calculations
│   └── styles/                      # Component-specific styles
├── index.html                       # HTML entry point
├── package.json                     # Node.js dependencies
├── vite.config.js                   # Vite configuration
└── README.md                        # Frontend documentation
```

## 🛠️ Installation & Setup

### Prerequisites

- **Python 3.9+** (Backend)
- **Node.js 16+** and npm (Frontend)
- **Git** (Version control)
- **Terminal/Command Prompt**

### Quick Start

#### Backend Setup

```bash
# 1. Clone repository
git clone https://github.com/kv-techie/Marvel-Clue-Hunt.git
cd Marvel-Clue-Hunt/backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 4. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 5. Create data directory
mkdir -p app/data

# 6. Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend available at:
- API: `http://localhost:8000`
- Interactive Docs: `http://localhost:8000/docs`

#### Frontend Setup

```bash
# 1. Navigate to frontend
cd ../frontend  # From backend directory

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Frontend available at: `http://localhost:5173`

### First-Time Setup

#### 1. Create Your First Admin

```bash
# Using curl (Linux/Mac)
curl -X POST "http://localhost:8000/api/admin/set-pin/admin/YourName?pin=1234"

# Using PowerShell (Windows)
Invoke-WebRequest -Method POST -Uri "http://localhost:8000/api/admin/set-pin/admin/YourName?pin=1234"

# Or use the API docs at http://localhost:8000/docs
```

#### 2. Login and Upload Teams

1. Access frontend at `http://localhost:5173`
2. Login with your admin credentials
3. Navigate to "Team Management"
4. Upload attendance CSV or use dual-file upload

#### 3. Configure Game Settings

- Set game start time
- Adjust scoring thresholds (optional)
- Create volunteer accounts
- Test attendee login flow

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

## 🎮 Game Workflow

### Pre-Game Setup (Admin)

**Step 1: Create Admin/Volunteer Accounts**
```bash
# Create admin
POST /api/admin/set-pin/admin/JohnDoe?pin=1234

# Create volunteer
POST /api/admin/set-pin/volunteer/JaneHelper?pin=5678
```

**Step 2: Upload Teams**
```bash
# Option A: Upload attendance CSV
POST /api/admin/upload-attendance
[Upload CSV file]

# Option B: Upload separate team names and attendee files
POST /api/admin/upload-teams-and-attendees
[Upload team_names.txt and attendees.csv]
```

**Step 3: Start Game**
```bash
# Set specific start time
POST /api/admin/set-start-time
{"start_time": "2026-02-15T10:00:00"}

# OR start immediately
POST /api/admin/start-game
```

### During Game

**Team Workflow:**
1. Login with team name (device auto-registered)
2. Start timer
3. Complete dialogues (request hints if needed)
4. Submit answers to volunteers
5. Monitor progress on leaderboard

**Volunteer Workflow:**
1. Login with PIN
2. Monitor team progress
3. Validate dialogue submissions
4. Assist with technical issues

**Admin Workflow:**
1. Monitor overall game status
2. Handle point adjustments
3. Manage disqualifications
4. Award bonuses
5. Resolve disputes

### Post-Game

**Step 1: Stop Game**
```bash
POST /api/admin/stop-game
```

**Step 2: Review Results**
```bash
GET /api/admin/leaderboard
GET /api/admin/adjustments-log
```

**Step 3: Cleanup (SAFE)**
```bash
# Delete participant data WITHOUT losing admin/volunteer credentials
POST /api/admin/delete-participant-data
```

✅ **Your admin and volunteer accounts are preserved!**

## 📡 API Documentation

### 🆕 Updated Authentication Flow

#### Login Endpoint (Enhanced)
```http
POST /api/login
Content-Type: application/json

# Admin/Volunteer Login
{
  "name": "JohnDoe",
  "pin": "1234",
  "is_admin": true
}

Response:
{
  "success": true,
  "name": "JohnDoe",
  "team": null,
  "is_admin": true,
  "is_volunteer": false,
  "message": "Admin login successful"
}

# System checks in order:
# 1. admin_credentials.json (priority)
# 2. game_state.json admin_users (fallback)
# 3. admin_whitelist.json (legacy)
```

### 🆕 Enhanced PIN Management

#### Set/Update PIN
```http
POST /api/admin/set-pin/{role}/{name}?pin={pin}

# Parameters:
# - role: "admin" or "volunteer"
# - name: Username
# - pin: New PIN (numeric or alphanumeric)

Example:
POST /api/admin/set-pin/admin/JohnDoe?pin=1234

Response:
{
  "message": "PIN created for JohnDoe (admin)"
}

# Credentials saved to dedicated files:
# - admin_credentials.json
# - volunteer_credentials.json
```

#### List All PINs
```http
GET /api/admin/pins

Response:
{
  "admin_users": [
    {
      "username": "JohnDoe",
      "pin": "1234",
      "role": "admin",
      "created_at": "2026-02-15T10:00:00",
      "updated_at": "2026-02-15T10:00:00"
    }
  ],
  "volunteer_users": [
    {
      "username": "JaneHelper",
      "pin": "5678",
      "role": "volunteer",
      "created_at": "2026-02-15T10:05:00",
      "updated_at": "2026-02-15T10:05:00"
    }
  ]
}
```

#### Delete PIN
```http
DELETE /api/admin/pin/{role}/{name}

Example:
DELETE /api/admin/pin/admin/JohnDoe

Response:
{
  "message": "Removed JohnDoe from admin users"
}
```

### 🆕 Enhanced Team Allocation

#### Upload Teams and Attendees (New Method)
```http
POST /api/admin/upload-teams-and-attendees
Content-Type: multipart/form-data

Form Data:
  team_names_file: team_names.txt
  attendees_file: attendees.csv

Response:
{
  "message": "Teams allocated successfully",
  "teams": {
    "Team Avengers": ["Alice", "Bob", "Charlie"],
    "Team Thor": ["David", "Emma", "Frank"]
  },
  "total_teams": 2,
  "total_attendees": 6,
  "min_team_size": 3,
  "max_team_size": 3
}
```

### 🔧 Fixed Device Management

#### Remove Device (Fixed)
```http
DELETE /api/admin/devices/{team_name}/{device_id}

Example:
DELETE /api/admin/devices/Team%20Avengers/550e8400-e29b-41d4-a716-446655440000

Response:
{
  "message": "Device removed from Team Avengers",
  "devices": [
    {
      "device_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "device_name": "Chrome on Windows",
      "browser": "Chrome",
      "os": "Windows 10/11",
      "last_login": "2026-02-15T14:30:00"
    }
  ]
}

# Now properly handles both:
# - Legacy format: ["device-id-string"]
# - New format: [{"device_id": "...", "device_name": "...", ...}]
```

### Safe Data Deletion

#### Delete Participant Data (Enhanced Safety)
```http
POST /api/admin/delete-participant-data

Response:
{
  "message": "All participant data has been deleted successfully. Admin/volunteer credentials preserved.",
  "teams_cleared": true,
  "game_state_reset": true
}

# What Gets Deleted:
# ✓ All team data
# ✓ Game timers
# ✓ Scores and progress
# ✓ Device registrations

# What's Preserved:
# ✓ Admin credentials (admin_credentials.json)
# ✓ Volunteer credentials (volunteer_credentials.json)
# ✓ Admin whitelist (backward compatibility)
# ✓ Volunteer whitelist (backward compatibility)
```

For complete API documentation, visit: `http://localhost:8000/docs`

## 🔒 Security

### Enhanced Security Features

#### Credential Isolation
- **Separate Storage**: Credentials stored independently from game data
- **Accidental Deletion Prevention**: Game resets don't affect user accounts
- **Multi-Layer Fallback**: Three-tier authentication system for reliability

#### Device Security
- **Fingerprint Tracking**: Browser fingerprinting prevents device spoofing
- **Metadata Collection**: Comprehensive device information for audit trails
- **Duplicate Prevention**: Same device can't register multiple times

#### Session Management
- **Client-Side Storage**: localStorage for session persistence
- **Stateless Architecture**: No server-side session tracking required
- **Loading States**: Prevents premature logouts during page refresh

### Production Recommendations

#### 1. Implement Password Hashing
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# When setting PIN
hashed_pin = pwd_context.hash(pin)

# When verifying
pwd_context.verify(provided_pin, stored_hashed_pin)
```

#### 2. Enable HTTPS
```bash
# Use SSL/TLS certificates
uvicorn app.main:app --ssl-keyfile=key.pem --ssl-certfile=cert.pem
```

#### 3. Add Rate Limiting
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/login")
@limiter.limit("5/minute")
async def login(...):
    ...
```

## 🐛 Troubleshooting

### Common Issues & Solutions

#### Admin Login Fails After Game Reset

**Problem:** Can't login after deleting participant data

**Solution:** Your credentials should be preserved automatically. If not:

```bash
# Check if credential files exist
ls backend/app/data/admin_credentials.json
ls backend/app/data/volunteer_credentials.json

# If missing, recreate admin:
curl -X POST "http://localhost:8000/api/admin/set-pin/admin/YourName?pin=1234"
```

#### Device Removal Not Working

**Problem:** "Device not found" error when removing devices

**Solution:** This is now fixed in the latest version. Update your `admin.py`:

```python
# Fixed device removal handles both formats:
# - Old: ["device-id-string"]
# - New: [{"device_id": "...", ...}]
```

#### Session Lost on Page Refresh

**Problem:** Users logged out when refreshing page

**Solution:** Latest update includes loading states. Ensure you're using the updated `AuthContext.jsx` and `ProtectedRoute.jsx`.

#### Backend Won't Start

```bash
# Reinstall dependencies
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install --upgrade pip
pip install -r requirements.txt
```

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new features
5. Run test suite: `pytest tests/ -v`
6. Commit changes: `git commit -m "feat: Add amazing feature"`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Commit Convention

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build/config changes

## 📝 Recent Changes Log

### v2.1.0 (February 2026)

**Major Changes:**
- Implemented separate credential storage system
- Fixed device removal bug for both string and object formats
- Added timestamped PIN management with audit trails
- Improved session persistence and loading states
- Enhanced frontend authentication flow

**Files Modified:**
- `backend/app/routes/admin.py` - Credential management overhaul
- `backend/app/routes/common.py` - Three-tier authentication
- `frontend/src/context/AuthContext.jsx` - Session handling
- `frontend/src/components/ProtectedRoute.jsx` - Route protection
- `frontend/src/pages/VolunteerDashboard.jsx` - PIN change feature
- `frontend/src/admin/UserManagement.jsx` - Inline PIN editing

**New Files:**
- `backend/app/data/admin_credentials.json` - Persistent admin credentials
- `backend/app/data/volunteer_credentials.json` - Persistent volunteer credentials

## 📞 Support

For issues, questions, or feature requests:

1. **Check documentation** - Most common issues are covered here
2. **Search existing issues** - [GitHub Issues](https://github.com/kv-techie/Marvel-Clue-Hunt/issues)
3. **Open a new issue** with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details

## 👥 Credits

**Developer:** Kedhar Vinod  
**Organization:** Jain (Deemed-to-be) University  
**Location:** Bengaluru, Karnataka, India  
**Email:** vinod.kedhar05@gmail.com  
**GitHub:** [@kv-techie](https://github.com/kv-techie)

## 📄 License

This project is developed for **Jain (Deemed-to-be) University** events and competitions.

For commercial use or licensing inquiries, please contact the development team.

---

**Built with ❤️ for Marvel fans and competitive spirits!**

*May the best team win! 🏆*