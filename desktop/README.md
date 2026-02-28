# Desktop Practice Mode (Windows)

This is the **Option 2** solution: a desktop wrapper that can capture **both sides** of a practice conversation regardless of meeting tool (Zoom/Teams/Meet/Webex), by capturing:

- **Mic audio** (your voice)
- **System audio** (friend’s voice from the meeting)

It streams them to the backend WebSocket interview service:

- System audio → `participant=interviewer`
- Mic audio → `participant=candidate`

The backend already supports this split: interviewer sockets auto-generate `interviewer_question` events from final transcripts.

## Run

Prereqs:
- Backend running on `http://localhost:9010`
- Frontend running on `http://localhost:3001`

Commands:

```powershell
cd desktop
npm install
npm run dev
```

Or from repo root (recommended):

```powershell
./scripts/desktop-dev.ps1 -FrontendUrl http://127.0.0.1:3001
```

If the app opens but you see a blank window, run with DevTools:

```powershell
./scripts/desktop-dev.ps1 -OpenDevTools
```

Optional override:

```powershell
$env:DESKTOP_FRONTEND_URL='http://localhost:3001'
npm run dev
```

## Using it

1. The overlay window shows **“Practice Mode Active”**.
2. Click **Start (Capture System + Mic)**.
3. Windows will prompt you twice:
   - Select microphone
   - Select a screen/window to share — **enable “Share system audio”**.

If you don’t enable system audio sharing, your friend’s voice will not be captured.

Hotkey:
- `Ctrl+Shift+I` toggles the overlay.

Quit hotkey (frameless overlay):
- `Ctrl+Shift+Q` quits the desktop app.

## Package (Windows)

From `desktop/`:

```powershell
npm install
npm run dist:win
```

Output goes to `desktop/release/`.
