# CardioPulse Ai — Hemodynamics Monitoring Portal

ECG/PPG monitoring, patient records, live waveform view, PDF/CSV report export, and simple phone-based login.
Built as two small projects — no external cloud account required to run it locally.

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node + Express + a plain JSON file for storage (zero native modules — nothing to compile, so it just works on Windows/Mac/Linux)

## Quick start (VS Code)

```bash
git clone <your-repo-url>
cd cardiopulse-ai

# Terminal 1 — backend
cd backend
npm install
cp .env.example .env
npm run dev            # http://localhost:4000

# Terminal 2 — frontend
cd frontend
npm install
cp .env.example .env
npm run dev             # http://localhost:8080
```

Open **http://localhost:8080** in Chrome or Edge (Web Serial, used for the hardware connect button, only works in Chromium browsers on desktop).

> Note on the earlier MySQL setup: this version stores data in a plain JSON file (`backend/data/db.json`) instead, specifically to avoid the `MODULE_NOT_FOUND` / native-build issues that come up with MySQL drivers on Windows. Nothing to install beyond `npm install`.

## Recommended VS Code extensions

| Extension | Why |
|---|---|
| ESLint | catches code issues as you type |
| **Prettier – Code formatter** | formats on save — this is the one extension you need for "saving nicely"; `Ctrl+S` already saves the file, Prettier just auto-formats it |
| Tailwind CSS IntelliSense | autocomplete for utility classes |
| ES7+ React/Redux/React-Native snippets | fast component scaffolding |
| Error Lens | inline error/warning highlights |
| GitLens | git blame/history inline |
| Path Intellisense | autocompletes import paths |

To turn on format-on-save: **Settings → search "Format On Save" → enable**, with Prettier set as the default formatter.

## Commands

Run these inside `frontend/` or `backend/` as noted:

| Command | Where | What it does |
|---|---|---|
| `npm run dev` | both | starts the dev server |
| `npm run build` | frontend | production build → `frontend/dist` |
| `npm run preview` | frontend | serves the production build locally to test it |
| `npm run lint` | frontend | checks code style/issues |

## Directory map

```
cardiopulse-ai/
├─ frontend/
│  ├─ src/
│  │  ├─ pages/        Splash, Login, Register, Home, Monitor, DataPage, PatientDetail, Report, ProfilePage, Docs
│  │  ├─ components/   TopBar, Logo, Avatar, ThemeToggle, WaveformChart, ProtectedRoute
│  │  ├─ lib/          api.js, AuthContext.jsx, theme.js, demoSource.js, serialSource.js, vitals.js
│  │  └─ App.jsx, main.jsx, index.css
│  └─ public/logo.svg  ← replace with your real logo file (same filename, or update Logo.jsx)
├─ backend/
│  ├─ routes/          auth.js, patients.js, sessions.js, reports.js
│  ├─ middleware/auth.js
│  ├─ db.js            plain JSON-file storage, no native deps
│  └─ server.js
└─ firmware/
   └─ cardiopulse_esp32.ino
```

## Hardware — wiring & connection tips

- **AD8232 (ECG):** `OUTPUT → GPIO34`, `LO+ → GPIO32`, `LO- → GPIO33`, plus 3.3V + GND. LO pins detect if an electrode has come off, so the graph shows a flat line instead of noise.
- **MAX30102 (PPG/SpO2):** I2C — `SDA → GPIO21`, `SCL → GPIO22`, plus 3.3V + GND. Fine to share the bus with an LCD if you're also driving one.
- Fresh electrode gel/pads and staying still make the biggest difference to signal quality — most "noisy" traces are a contact problem, not a firmware problem.
- Keep the USB cable away from mains wiring/chargers to cut down on 50/60 Hz mains hum.
- **Always check the raw stream first** in the Arduino/PlatformIO Serial Monitor at 115200 baud — you should see lines like `512,478` — before connecting the portal.
- The "Connect device" button uses the **Web Serial API**, which only works in **Chrome or Edge on desktop** (not mobile, not Firefox/Safari).
- Flash `firmware/cardiopulse_esp32.ino` (Arduino IDE or PlatformIO). It needs the **SparkFun MAX3010x** library for the MAX30102.
- No hardware yet? Use **Demo mode** on the Monitor screen — it generates a realistic ECG+PPG waveform so every screen works end to end.

## Deploying for free (no more localhost)

1. Push this repo to GitHub.
2. **Backend:** deploy the `backend/` folder to [Render](https://render.com) (or Railway) on their free tier. Set an environment variable `JWT_SECRET` to a long random string.
   - ⚠️ Free-tier hosts usually use an ephemeral filesystem, so `data/db.json` may reset on redeploy/restart. Fine for a demo/capstone; for permanent data, swap `db.js` for a small hosted database later.
3. **Frontend:** deploy the `frontend/` folder to [Vercel](https://vercel.com) or [Netlify](https://netlify.com). Set the environment variable `VITE_API_URL` to your live backend URL (e.g. `https://cardiopulse-api.onrender.com`).
4. You'll get a permanent URL like `https://cardiopulse-ai.vercel.app` — done, no localhost needed. Frontend edits redeploy in about a minute; backend edits redeploy separately since they're two projects.

## About the logo

Your CardioPulse Ai logo is wired in at `frontend/public/logo.jpeg` and shows up everywhere — splash screen, top bar, login/register, favicon, and the PDF report header. To swap it later, replace that file (keep the filename `logo.jpeg`, or update the `src` in `src/components/Logo.jsx` if you use a different name/format).

## Theming

Light / dark / system mode toggle lives in the top bar (persisted to `localStorage`). The **Monitor** screen keeps its dark, medical-console look regardless of the site-wide theme — that's intentional, the same way a real bedside monitor looks the same in a bright or dim room.
