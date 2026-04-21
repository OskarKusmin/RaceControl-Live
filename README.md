# RaceControl Live

A real-time race management suite for small race tracks (go-kart circuits, track days, club events). A marshal controls the race and flags, a lap-line observer records lap times by tapping a button as cars cross the line, and everyone (drivers, spectators, and staff) sees the same live state on dedicated display screens.

All clients are synchronised in real time over WebSockets, so every screen reflects the same race state within a few milliseconds: flag changes, countdowns, lap times, and session transitions.

## What it does

The app is a single system with multiple role-specific interfaces, accessed from a shared landing page:

### Staff interfaces (access-key protected)
- **Front Desk**: The receptionist creates race sessions, assigns driver names to car numbers (up to 8 per race), edits them, and confirms or deletes sessions.
- **Race Control**: The safety marshal starts the race with a 3-second countdown, switches flag modes (Safe / Hazard / Danger), ends the race with the chequered flag, and closes out the session.
- **Lap Line Tracker**: The observer taps a large button for each car as it crosses the start/finish line, which records lap times and streams them to the leaderboard.

### Public displays
- **Leaderboard**: Live standings sorted by fastest lap, with current lap times, lap counts, session name, flag state, and race countdown. Fullscreen-ready.
- **Next Race**: Shows the upcoming session's name and and driver names with assigned car numbers. Switches to a "Proceed to paddock" call (with chime) when the track is free. Meant for drivers waiting their turn.
- **Race Countdown**: Full-screen countdown clock with urgency colour states (normal / warning / critical / finished) and audio for the start countdown and "go".
- **Race Flags**: A large full-screen flag indicator (green / yellow / red / chequered) for trackside monitors.

### Other features
- **Persistent state**: Active sessions, timers, and race mode are written to `backend/server/data/races.json`, so an in-progress race survives a server restart and resumes with the correct remaining time.
- **Role-based access**: Front Desk, Race Control, and Lap Line Tracker each require a separate access key defined in the server environment. Keys are validated server-side and the socket's role is used to authorise every privileged event.
- **Dark / light theme**:Per-view theme toggle saved to `localStorage`.
- **LAN-friendly**: CORS is open by design so staff tablets and display TVs on the same local network can connect to the host machine without extra configuration.

## Tech stack
**Backend**
- Node.js
- Express.js
- Socket.IO

**Frontend**
- React 18 (Create React App / `react-scripts` 5)
- React Router 7
- Socket.IO client 4
- Plain CSS (component-scoped stylesheets, CSS custom properties for theming)

**Tooling**
- `concurrently` to run backend + frontend together
- `nodemon` + `cross-env` for backend dev mode

## Requirements

- **Node.js** 18 or newer
- **npm** 9 or newer
- All devices that need to view the app must be on the same local network as the host machine

## Installation
From the repository root:
```bash
npm run install:all
```

This installs dependencies for the root (`concurrently`), the backend, and the frontend client in one step.

### Configure environment variables

Copy the example file and set your own access keys:

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env`:

```env
RECEPTIONIST_KEY=choose_a_key_for_front_desk
OBSERVER_KEY=choose_a_key_for_lap_line_tracker
SAFETY_KEY=choose_a_key_for_race_control
PORT=5001
```
The server will refuse to start if any of the three keys are missing.

## Running the app

### Development (both servers together)

From the repository root:
```bash
npm run dev
```

This runs:
- the backend on `http://<host>:5001` with `nodemon` (auto-restart)
- the React dev server on `http://<host>:3000`

In `NODE_ENV=development` the race duration defaults to **2 minutes** to make testing quick. In any other mode it defaults to **10 minutes**.

### Production-style run

Backend:
```bash
cd backend
npm start
```

Frontend (build + serve however you prefer):
```bash
cd frontend/client
npm run build
# Then serve ./build with any static server (e.g. `npx serve -s build`)
```

The frontend automatically connects to `ws://<current-hostname>:5001`, so once the backend is reachable on the LAN, any device pointed at the frontend's host will connect correctly.

## Usage

1. Open the landing page (`/`) on any device. You'll see two groups of buttons: **Staff Tools** and **Displays**.
2. On the staff tablet at reception, go to **Front Desk**, enter the receptionist key, then add a session (e.g. "Junior Sprint 1") and fill in up to 8 driver names. Hit **Confirm**.
3. On a trackside/pit tablet, go to **Race Control**, enter the safety key. The confirmed session appears automatically. Press **Start race** to kick off the 3-second countdown and the race timer.
4. On the observer's tablet, go to **Lap Line Tracker**, enter the observer key. Tap each car's tile as it crosses the line to record a lap.
5. On spectator and driver-facing screens, open **Leaderboard**, **Next Race**, **Race Countdown**, and **Race Flags** (all can be fullscreened).
6. When the race ends (timer runs out or marshal taps the chequered flag), Race Control shows **End session** to archive the heat and queue up the next one.

### Routes

| Path                | Interface           | Access           |
|---------------------|---------------------|------------------|
| `/`                 | Landing page        | Public           |
| `/front-desk`       | Front Desk          | Receptionist key |
| `/race-control`     | Race Control        | Safety key       |
| `/lap-line-tracker` | Lap Line Tracker    | Observer key     |
| `/leaderboard`      | Leaderboard         | Public           |
| `/next-race`        | Next Race           | Public           |
| `/race-countdown`   | Race Countdown      | Public           |
| `/race-flags`       | Race Flags          | Public           |

---

## How the realtime layer works

A single Socket.IO server holds the authoritative race state (sessions, selected session, race timer, flag mode, lap data, starting countdown) and broadcasts a `state-update` snapshot whenever anything changes. Clients subscribe on connect, request a fresh snapshot when mounting, and emit role-gated events for every privileged action:

- `add-session`, `confirm-session`, `delete-session`: Receptionist only
- `start-race`, `finish-race`, `end-race-session`, `change-mode`: Safety only
- `current-lap-times`: Observer only (emitted to leaderboard and lap tracker)
- `validate-key`: Used by the access-key prompt. Invalid keys are deliberately delayed 500ms to discourage brute force

Race timers are stored with `startTime` and `duration`, so on server restart any running race resumes with the correct remaining time instead of snapping back to full duration.

## Notes and caveats
- CORS is intentionally permissive (`origin: '*'`) because the app is designed to run on an isolated local network (the track's own Wi-Fi). Do not expose the backend directly to the public internet without tightening CORS, adding TLS, and hardening the access-key validation.
- State is written to a JSON file. This is deliberately simple and fits the "one venue, one host machine" use case.
- **Browser audio policy.** Countdown, "go", and paddock-call sounds require a prior user interaction on some browsers. If you load a display screen in a tab that's never been interacted with, the first chime may be silently blocked until someone clicks on the page.