import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, Activity, FileText, Cable, PlusCircle, FolderOpen } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState(getGreeting());

  useEffect(() => {
    Promise.all([api.listPatients(), api.listReports()])
      .then(([p, r]) => {
        setPatients(p);
        setReports(r);
      })
      .finally(() => setLoading(false));
  }, []);

  // Keeps the greeting correct even if the page is left open across a morning/afternoon/etc. boundary.
  useEffect(() => {
    const timer = setInterval(() => setGreeting(getGreeting()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const sessionCount = patients.reduce((sum, p) => sum + (p.sessionCount || 0), 0);

  const stats = [
    { label: "Patients", value: patients.length, icon: Users },
    { label: "Sessions recorded", value: sessionCount, icon: Activity },
    { label: "Reports generated", value: reports.length, icon: FileText },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {greeting}, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-navy-400 text-sm mt-1">Here's what's happening across your patients today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-teal-50 dark:bg-navy-700 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-display font-semibold">{loading ? "—" : value}</p>
              <p className="text-xs text-navy-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-navy-800 text-navy-900 dark:text-white border-none">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-300">
            <Cable size={20} />
          </div>
          <div>
            <p className="font-display font-medium">Connect a device</p>
            <p className="text-sm text-black dark:text-navy-100/60">
              Plug in the ESP32 and start monitoring in one click.
            </p>
          </div>
        </div>
        <button onClick={() => navigate("/monitor")} className="btn-primary whitespace-nowrap">
          Go to Monitor
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ShortcutCard
          to="/data"
          icon={PlusCircle}
          title="Add a patient"
          desc="Register a new patient in a few seconds."
        />
        <ShortcutCard to="/monitor" icon={Activity} title="Start monitoring" desc="Live ECG + PPG, demo or hardware." />
        <ShortcutCard to="/report" icon={FolderOpen} title="Generate a report" desc="Export a session as PDF or CSV." />
      </div>

      <div className="card">
        <p className="text-xs uppercase tracking-wide text-navy-400 mb-3">Project details</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
          <Credit label="Developer" value="Sanket Kelzarkar" />
          <Credit label="Mentor" value="Dr. Praveen Kumar" />
          <Credit label="Branch" value="Computer Science and Medical Engineering" />
          <Credit label="Programme" value="B.Tech (Final Year), VIIth Sem" />
          <Credit label="Submission" value="Major Project - I" />
        </div>
      </div>
    </div>
  );
}

function Credit({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-navy-400">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function ShortcutCard({ to, icon: Icon, title, desc }) {
  return (
    <Link to={to} className="card flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 transition">
      <div className="w-10 h-10 rounded-full bg-navy-50 dark:bg-navy-700 flex items-center justify-center text-navy-700 dark:text-teal-400">
        <Icon size={18} />
      </div>
      <div>
        <p className="font-display font-medium">{title}</p>
        <p className="text-sm text-navy-400">{desc}</p>
      </div>
    </Link>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}
