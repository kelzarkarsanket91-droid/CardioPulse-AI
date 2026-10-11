import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { ArrowLeft } from "lucide-react";

export default function Docs() {
  return (
    <div className="min-h-screen bg-offwhite dark:bg-navy-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link to="/" className="flex items-center gap-1.5 text-sm text-navy-400 hover:text-navy-700 dark:hover:text-offwhite w-fit mb-6">
          <ArrowLeft size={15} /> Back
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Logo size={40} />
          <div>
            <h1 className="font-display text-2xl font-semibold">Setup &amp; Hardware Guide</h1>
            <p className="text-navy-400 text-sm">Run locally in VS Code, wire the sensors, and deploy for free.</p>
          </div>
        </div>

        <Section title="1. VS Code setup">
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Clone the repo: <Code>git clone &lt;your-repo-url&gt;</Code></li>
            <li>Open the folder in VS Code.</li>
            <li>Backend: <Code>cd backend && npm install && npm run dev</Code> — runs on <Code>http://localhost:4000</Code></li>
            <li>Frontend, in a second terminal: <Code>cd frontend && npm install && npm run dev</Code></li>
            <li>Open <Code>http://localhost:8080</Code> in Chrome or Edge.</li>
          </ol>
        </Section>

        <Section title="2. Recommended extensions">
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>ESLint</li>
            <li>Prettier — Code formatter <em>(this is the one that handles saving/formatting; no separate "save" extension is needed — <Code>Ctrl+S</Code> saves, and Prettier auto-formats on save once enabled)</em></li>
            <li>Tailwind CSS IntelliSense</li>
            <li>ES7+ React/Redux/React-Native snippets</li>
            <li>Error Lens</li>
            <li>GitLens</li>
            <li>Path Intellisense</li>
          </ul>
          <p className="text-sm text-navy-400 mt-2">
            To enable format-on-save: open Settings → search "Format On Save" → check the box, with Prettier set as the default formatter.
          </p>
        </Section>

        <Section title="3. Commands">
          <ul className="text-sm space-y-1">
            <li><Code>npm run dev</Code> — start the dev server (frontend or backend)</li>
            <li><Code>npm run build</Code> — production build (frontend)</li>
            <li><Code>npm run preview</Code> — preview the production build locally</li>
            <li><Code>npm run lint</Code> — check for code issues</li>
          </ul>
        </Section>

        <Section title="4. Directory map">
          <pre className="bg-navy-900 text-teal-300 rounded-xl p-4 text-xs overflow-x-auto">
{`cardiopulse-ai/
├─ frontend/
│  ├─ src/
│  │  ├─ pages/        Splash, Login, Register, Home, Monitor, Data, Report, Profile, Docs
│  │  ├─ components/   TopBar, Logo, Avatar, ThemeToggle, WaveformChart, ProtectedRoute
│  │  ├─ lib/           api.js, AuthContext.jsx, theme.js, demoSource.js, serialSource.js, vitals.js
│  │  └─ App.jsx, main.jsx, index.css
│  └─ public/logo.svg
├─ backend/
│  ├─ routes/           auth.js, patients.js, sessions.js, reports.js
│  ├─ middleware/auth.js
│  ├─ db.js             (JSON file storage - no native modules)
│  └─ server.js
└─ firmware/
   └─ cardiopulse_esp32.ino`}
          </pre>
        </Section>

        <Section title="5. Hardware — wiring & tips">
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>AD8232 (ECG): OUTPUT → ESP32 ADC pin (e.g. GPIO34), LO+/LO- → digital pins to detect lead-off, 3.3V + GND.</li>
            <li>MAX30102 (PPG/SpO2): I2C — SDA/SCL → ESP32 SDA/SCL pins, 3.3V + GND. Share the I2C bus if also driving an LCD.</li>
            <li>Use fresh ECG electrode gel/pads and avoid movement — most "noisy" readings are contact issues, not code issues.</li>
            <li>Keep the ESP32 USB cable away from mains wiring to reduce 50/60 Hz interference.</li>
            <li>Use PlatformIO/Arduino Serial Monitor at 115200 baud to verify the firmware first, then close that monitor before using the portal. A USB serial port can only be opened by one program at a time.</li>
            <li>Run the portal at its localhost URL in Chrome or Edge on desktop, open Monitor, and click Connect device. The browser will then own the ESP32 USB port.</li>
            <li>Web Serial only works in Chrome or Edge on desktop, not on mobile browsers or Firefox/Safari. VS Code can flash the board, but its Serial Monitor must be closed while the portal is connected.</li>
            <li>Flash <Code>firmware/cardiopulse_esp32.ino</Code> from the Arduino IDE or PlatformIO — it streams keyed ECG/PPG values at 115200 baud, which the portal parses.</li>
          </ul>
        </Section>

        <Section title="6. Deploying for free">
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Push the repo to GitHub.</li>
            <li><strong>Backend:</strong> deploy the <Code>backend/</Code> folder to Render (or Railway) free tier — set the <Code>JWT_SECRET</Code> environment variable there.</li>
            <li><strong>Frontend:</strong> deploy the <Code>frontend/</Code> folder to Vercel or Netlify — set <Code>VITE_API_URL</Code> to your backend's live URL.</li>
            <li>You'll get a permanent URL (e.g. <Code>https://cardiopulse-ai.vercel.app</Code>) — no localhost needed once deployed.</li>
            <li>Frontend-only changes redeploy in ~1 minute; backend changes redeploy separately since they're two projects.</li>
          </ol>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="font-display font-semibold text-lg mb-3">{title}</h2>
      <div className="text-navy-700 dark:text-navy-100">{children}</div>
    </div>
  );
}

function Code({ children }) {
  return <code className="bg-navy-50 dark:bg-navy-800 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded text-[0.85em]">{children}</code>;
}
