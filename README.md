# Marvel-Clue-Hunt

A comprehensive Marvel-themed clue hunt game management system with real-time tracking, team management, and scoring capabilities.

## Overview

Marvel-Clue-Hunt is a full-stack application designed to manage interactive clue hunt events. It features role-based access control (Admin, Volunteer, Attendee), real-time timer management, automated scoring, and advanced team disqualification systems.

## Features

### Authentication & Access Control

#### Team-Based Attendee Login
- Attendees authenticate using their team name and a persistent device ID
- Device limit: Maximum 3 devices per team
- Device IDs stored in browser localStorage
- Device registrations persisted in `backend/app/data/devices.json`

#### PIN-Based Admin/Volunteer Authentication
- Admins and volunteers use PIN-based authentication
- Admins can create and manage PINs via admin endpoints
- PINs stored securely in `backend/app/data/game_state.json`
- Legacy whitelist files remain supported for backward compatibility

### Team Management

#### Team Allocation
- CSV-based attendance upload
- Automatic team allocation from attendance data
- Team data persisted across server restarts
- View all teams with current status and scores

#### Device Management
- List registered devices per team
- Remove specific devices from teams
- Enforce device limits per team
- Admin endpoints for device oversight

### Game Control

#### Timer System
- Global game start time configuration
- Individual team timers
- Timer persistence across server restarts
- Timers restored from `game_state.json` on startup
- Fallback to `team.timer_started` for elapsed time calculation

#### Game State Management
- Start/stop game controls
- Real-time game status monitoring
- Track active teams and game progress
- Delete participant data after game completion

### Scoring System

#### Dialogue Completion
- Three dialogue stages with time-based scoring
- Tiered scoring: Excellent (100 pts), Good (80 pts), Standard (60 pts)
- Configurable time thresholds per dialogue
- Individual dialogue completion tracking

#### Points Adjustment
- Manual points adjustment (reward/deduct)
- Mandatory reason for all adjustments
- Full audit trail with timestamps
- Track who made each adjustment
- View complete adjustment history

#### Bonus System
- Enactment bonus awards
- Configurable bonus amounts
- Bonus tracking per team

#### Penalties
- Hint usage penalties
- Configurable penalty amounts per hint
- Automatic deduction from final score

### Disqualification System

#### Auto-Disqualification
- Automatic disqualification based on deduction thresholds
- Total deductions calculated from:
  - Hint penalties
  - Manual point deductions
- Configurable disqualification threshold
- Candidate identification for potential disqualifications

#### Disqualification Workflow
1. System identifies teams exceeding deduction threshold
2. Admin reviews disqualification candidates
3. Admin confirms disqualification with reason
4. Team receives disqualification notification
5. Team acknowledges disqualification status

#### Disqualification Tracking
- Disqualification reason logging
- Timestamp recording
- Admin confirmation tracking
- Team acknowledgement tracking
- Full disqualification history in leaderboard

### Leaderboard

- Real-time score calculations
- Qualification status (minimum 2 dialogues completed)
- Disqualification status display
- Sort by final score (descending)
- Detailed team statistics:
  - Dialogues completed
  - Hints used
  - Total deductions
  - Disqualification information

### Admin Management

#### User Management
- Add/remove admins dynamically
- Add/remove volunteers dynamically
- View all authorized users
- PIN management for all roles

#### Data Management
- Upload attendance CSV
- Delete participant data post-game
- Export game state
- Audit log access

## Architecture

### Backend (`/backend`)

**Technology Stack:**
- FastAPI (Python web framework)
- Pydantic (data validation)
- JSON-based persistence

**Core Modules:**
- `main.py` - Application entry point
- `config.py` - Configuration settings
- `models.py` - Data models and schemas
- `scoring.py` - Scoring logic and calculations
- `timer_manager.py` - Timer management
- `team_allocator.py` - Team allocation logic

**API Routes:**
- `routes/admin.py` - Admin endpoints
- `routes/volunteer.py` - Volunteer endpoints
- `routes/attendee.py` - Attendee endpoints
- `routes/common.py` - Shared endpoints

**Data Storage:**
- `app/data/game_state.json` - Game state, teams, PINs
- `app/data/devices.json` - Device registrations
- `app/data/admin_whitelist.json` - Admin whitelist (legacy)
- `app/data/volunteer_whitelist.json` - Volunteer whitelist (legacy)

### Frontend (`/frontend`)

**Technology Stack:**
- React (UI framework)
- Vite (build tool)
- React Router (routing)

**Structure:**
- `src/pages/` - Page components
- `src/admin/` - Admin interface
- `src/volunteer/` - Volunteer interface
- `src/attendee/` - Attendee interface
- `src/components/` - Reusable components
- `src/api/` - API client
- `src/context/` - React context providers
- `src/utils/` - Utility functions
- `src/styles/` - Styling

## API Endpoints

### Authentication
- `POST /api/login` - Login for all user types

### Admin Endpoints

#### Team Management
- `POST /api/admin/upload-attendance` - Upload attendance CSV
- `GET /api/admin/teams` - Get all teams with status
- `POST /api/admin/delete-participant-data` - Delete all participant data

#### Game Control
- `POST /api/admin/set-start-time` - Set global start time
- `POST /api/admin/start-game` - Start game immediately
- `POST /api/admin/stop-game` - Stop the game
- `GET /api/admin/game-status` - Get overall game status

#### Scoring & Adjustments
- `POST /api/admin/award-enactment-bonus/{team_name}` - Award bonus
- `POST /api/admin/adjust-points/{team_name}` - Adjust team points
- `GET /api/admin/adjustments-log` - View audit log
- `GET /api/admin/leaderboard` - Get full leaderboard

#### Disqualification Management
- `GET /api/admin/disqualification-candidates` - List disqualification candidates
- `POST /api/admin/confirm-disqualification/{team_name}` - Confirm disqualification
- `POST /api/admin/team-acknowledge-disqualification/{team_name}` - Team acknowledgement

#### User Management
- `GET /api/admin/admins` - List all admins
- `POST /api/admin/admins/{name}` - Add admin
- `DELETE /api/admin/admins/{name}` - Remove admin
- `GET /api/admin/volunteers` - List all volunteers
- `POST /api/admin/volunteers/{name}` - Add volunteer
- `DELETE /api/admin/volunteers/{name}` - Remove volunteer

#### PIN Management
- `POST /api/admin/set-pin/{role}/{name}?pin=...` - Set PIN for user
- `GET /api/admin/pins` - List all PINs
- `DELETE /api/admin/pin/{role}/{name}` - Remove PIN

#### Device Management
- `GET /api/admin/devices/{team_name}` - List team devices
- `DELETE /api/admin/devices/{team_name}/{device_id}` - Remove device

### Volunteer Endpoints
- `GET /api/volunteer/teams` - View all teams
- `POST /api/volunteer/validate-dialogue` - Validate dialogue submissions
- `GET /api/volunteer/leaderboard` - View leaderboard

### Attendee Endpoints
- `POST /api/attendee/start-timer` - Start team timer
- `POST /api/attendee/submit-dialogue` - Submit dialogue answer
- `POST /api/attendee/request-hint` - Request hint
- `GET /api/attendee/team-status` - Get team status
- `GET /api/attendee/leaderboard` - View public leaderboard

## Installation & Setup

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
```

3. Activate virtual environment:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Run the server:
```bash
uvicorn app.main:app --reload
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Testing

### Backend Tests

Run backend unit tests:

```bash
cd backend
venv\Scripts\Activate.ps1  # Windows
source venv/bin/activate    # Linux/Mac
python -m pytest tests/test_auth.py -q
```

## Configuration

Key configuration settings in `backend/app/config.py`:

- **Dialogue time thresholds** - Excellent/Good time limits
- **Hint penalty** - Points deducted per hint
- **Qualification threshold** - Minimum dialogues for qualification
- **Disqualification threshold** - Maximum deductions before auto-disqualification
- **Device limit** - Maximum devices per team (default: 3)

## Data Persistence

All game data persists across server restarts:

- **Game state** - Teams, scores, timers, disqualifications
- **User authentication** - Admin and volunteer PINs
- **Device registrations** - Team device tracking
- **Audit logs** - All point adjustments with reasons

## Workflow

### Game Setup
1. Admin uploads attendance CSV
2. System automatically allocates teams
3. Admin sets game start time or starts immediately
4. Admin creates PINs for volunteers (if needed)

### During Game
1. Teams log in with team name and device ID
2. Teams start their timers when ready
3. Teams complete dialogue challenges
4. Volunteers validate submissions
5. Teams can request hints (with penalties)
6. Admin monitors real-time leaderboard

### Scoring & Adjustments
1. System automatically calculates scores
2. Admin can manually adjust points (with reasons)
3. System tracks total deductions per team
4. Auto-disqualification triggered if threshold exceeded
5. Admin reviews and confirms disqualifications

### Post-Game
1. Admin stops the game
2. Final leaderboard generated
3. Admin reviews audit logs
4. Admin deletes participant data for next event

## Recent Changes

### Version 2.0 Updates

- **Disqualification System**: Complete team disqualification workflow with auto-detection, admin confirmation, and team acknowledgement
- **Points Adjustment**: Manual point adjustments with mandatory reasons and full audit trail
- **Enhanced User Management**: Dynamic admin/volunteer management with add/remove capabilities
- **Device Management**: Admin oversight of team device registrations
- **Improved Timer Persistence**: Timers survive server restarts with fallback mechanisms
- **Audit Logging**: Comprehensive logging of all point adjustments

### Authentication Overhaul

- **Team-based attendee login**: Device-limited authentication with persistent device IDs
- **PIN-based admin/volunteer access**: Secure PIN authentication replacing legacy whitelist
- **Device registration**: Tracked in `devices.json` with admin management tools

## Notes

- Admin PINs and volunteer PINs are stored in `app/data/game_state.json` under `admin_users` and `volunteer_users` objects
- Device IDs are generated and stored in browser localStorage for attendees
- Game state persists across server restarts to maintain timer accuracy
- Disqualification threshold can be configured in settings
- All point adjustments require a reason and are logged for audit purposes

## Future Enhancements

- CI/CD pipeline for automated testing
- Enhanced admin analytics dashboard
- Real-time notifications for teams
- Mobile-responsive UI improvements
- Export functionality for reports
- Integration with external authentication providers

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## License

This project is part of an event management system for Jain (Deemed-to-be) University.

## Contact

**Developer**: Kedhar Vinod  
**Organization**: Jain (Deemed-to-be) University  
**Location**: Bengaluru

---

For questions or support, please open an issue in the repository.
