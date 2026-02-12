# Frontend README

This folder contains the React frontend for Marvel-Clue-Hunt (Vite).

## Recent changes

- Login flow updated:
  - Attendees login using `team_name` + a persistent `device_id` stored in `localStorage`.
  - Admin/Volunteer login uses `name` + `PIN`.
- Admin UI (`AdminManagement.jsx`) now supports setting/removing PINs and listing/removing team devices via new backend endpoints.
- `api/client.js` updated with new endpoints: `setPin`, `getPins`, `deletePin`, `getDevices`, `removeDevice`.

## Run

```bash
cd frontend
npm install
npm run dev
```

If you'd like UI improvements or additional admin pages, I can scaffold them next.
