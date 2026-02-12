# Marvel-Clue-Hunt
Marvel themed clue hunt repository

## Recent Changes

- Reworked authentication flows:
	- Attendee login is now team-based and device-limited (max 3 devices per team). Attendees authenticate by providing a `team_name` and a persistent `device_id` stored in browser localStorage.
	- Admins and volunteers now use a PIN-based login. Admins can create per-user PINs via an admin endpoint; legacy whitelist files remain supported.

- New backend endpoints and data files:
	- `POST /api/admin/set-pin/{role}/{name}?pin=...` — set PIN for `admin` or `volunteer`.
	- `GET /api/admin/pins` / `DELETE /api/admin/pin/{role}/{name}` — manage PINs.
	- `GET /api/admin/devices/{team_name}` / `DELETE /api/admin/devices/{team_name}/{device_id}` — list and remove registered devices.
	- Device registrations persisted in `backend/app/data/devices.json`.

- Timer robustness improvements:
	- Team timers are restored from persisted `game_state.json` on server startup so elapsed times survive restarts.
	- Backend now falls back to `team.timer_started` when computing elapsed time if the in-memory timer is missing.

- Frontend updates:
	- Login UI updated to support team-based attendee login and admin PIN login.
	- Admin management UI updated to set/remove PINs and manage team devices.

## Running tests

Run backend unit tests (requires venv and pytest):

```bash
cd backend
venv\Scripts\Activate.ps1
python -m pytest tests/test_auth.py -q
```

## Notes
- The admin PINs and volunteer PINs are stored under `app/data/game_state.json` in `admin_users` and `volunteer_users` objects.
- If you want an admin UI to manage PINs or devices further, there's now a basic `AdminManagement` component in the frontend that can set PINs and remove devices.

If you'd like, I can add CI to run tests automatically and add more admin tooling.
