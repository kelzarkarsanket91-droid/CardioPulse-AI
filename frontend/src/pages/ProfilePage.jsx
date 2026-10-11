import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Save, Share2, Check } from "lucide-react";
import Avatar from "../components/Avatar";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import { INDIAN_LANGUAGES, ROLES } from "../lib/constants";

export default function ProfilePage() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState(user?.clinic || "");
  const [notes, setNotes] = useState(user?.notes || "");
  const [role, setRole] = useState(user?.role || ROLES[0]);
  const [language, setLanguage] = useState(user?.language || "English");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateProfile({ clinic, notes, role, language });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  async function handleShare() {
    const shareData = {
      title: "CardioPulse Ai",
      text: "Check out CardioPulse Ai — live ECG & PPG monitoring, patient records and reports.",
      url: window.location.origin,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (_) {
        // user cancelled the share sheet - nothing to do
      }
    } else {
      await navigator.clipboard.writeText(shareData.url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }

  function formatPhone(p) {
    if (!p) return "";
    const clean = String(p).replace(/\D/g, "");
    if (clean.length === 10) {
      return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
    }
    if (clean.length === 12 && clean.startsWith("91")) {
      return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
    }
    return `+${clean}`;
  }


  return (
    <div className="max-w-xl flex flex-col gap-6">
      <div className="card flex items-center gap-4">
        <Avatar initials={user?.initials} size={56} />
        <div>
          <h1 className="font-display text-xl font-semibold">{user?.name}</h1>
          <p className="text-navy-400 text-sm">
            {user?.phone ? formatPhone(user.phone) : ""}
            {user?.phone && user?.email ? " • " : ""}
            {user?.email || ""}
          </p>
        </div>
      </div>



      <form onSubmit={handleSave} className="card flex flex-col gap-4">
        <h2 className="font-display font-medium">Settings</h2>

        <div>
          <label className="label">Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Language</label>
          <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {INDIAN_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <p className="text-xs text-navy-400 mt-1">
            Saves your preferred language for the interface. Full translation of every screen is on the roadmap.
          </p>
        </div>

        <div>
          <label className="label">Clinic / department</label>
          <input className="input" value={clinic} onChange={(e) => setClinic(e.target.value)} placeholder="e.g. DMIHER Cardiology Lab" />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything you'd like to keep handy" />
        </div>
        <button className="btn-primary w-fit" disabled={busy}>
          <Save size={16} /> {saved ? "Saved" : busy ? "Saving…" : "Save changes"}
        </button>
      </form>

      <div className="card flex items-center justify-between gap-4">
        <div>
          <p className="font-display font-medium">Share CardioPulse Ai</p>
          <p className="text-sm text-navy-400">Send the app to a colleague or share on social media.</p>
        </div>
        <button onClick={handleShare} className="btn-secondary shrink-0">
          {shared ? <Check size={16} /> : <Share2 size={16} />} {shared ? "Link copied" : "Share"}
        </button>
      </div>

      <button onClick={handleLogout} className="btn-secondary w-fit text-red-500 !border-red-200 hover:!bg-red-50 dark:hover:!bg-red-950/30">
        <LogOut size={16} /> Sign out
      </button>
    </div>
  );
}
