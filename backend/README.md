# Backend README

This folder contains the FastAPI backend for Marvel-Clue-Hunt.

## Recent changes

- Authentication:
  - Admin/Volunteer PIN-based login added. PINs are stored in `app/data/game_state.json` under `admin_users`/`volunteer_users`.
  - Attendee login switched from name-based to team-based with device registration (`team_name` + `device_id`).
- Device management:
  - Registered devices are stored in `app/data/devices.json`.
  - Endpoints to list/remove devices: `GET /api/admin/devices/{team_name}`, `DELETE /api/admin/devices/{team_name}/{device_id}`.
- PIN management endpoints:
  - `POST /api/admin/set-pin/{role}/{name}?pin=...`
  - `GET /api/admin/pins`
  - `DELETE /api/admin/pin/{role}/{name}`
- Timer robustness:
  - `TimerManager.restore_from_game_state()` restores per-team timers from `game_state.json` on startup so timers survive server restarts.

## Tests

Run the auth & timer tests:

```bash
cd backend
venv\Scripts\Activate.ps1
python -m pytest tests/test_auth.py -q
```

## Files of interest

- `app/routes/common.py` - login route handling attendee and admin/volunteer logins.
- `app/routes/admin.py` - admin APIs, PIN/device management, game state persistence.
- `app/data/game_state.json` - stores admin/volunteer PINs and saved game state.
- `app/data/devices.json` - stores registered devices per team.
- `app/timer_manager.py` - global timer manager; now supports restoring timers from saved state.

If you want me to add more detailed developer setup or CI, tell me which provider you prefer (GitHub Actions, Azure Pipelines, etc.).
