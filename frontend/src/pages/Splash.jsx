import { Link, Navigate } from "react-router-dom";
import Logo from "../components/Logo";
import { useAuth } from "../lib/AuthContext";
import { Activity } from "lucide-react";

export default function Splash() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-navy-900 to-navy-950 text-white px-6">
      <div className="flex flex-col items-center text-center gap-5 max-w-sm w-full">
        <Logo size={88} className="shadow-soft" />
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">CardioPulse Ai</h1>
          <p className="text-navy-100/70 mt-2 text-sm flex items-center justify-center gap-1.5">
            <Activity size={15} className="text-teal-400" />
            Live ECG &amp; PPG monitoring, patient records, and reports — in one place.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full mt-4">
          <Link to="/register" className="btn-primary w-full">
            Create account
          </Link>
          <Link
            to="/login"
            className="w-full inline-flex items-center justify-center rounded-full border border-white/15 text-white font-medium px-5 py-2.5 hover:bg-white/5 transition"
          >
            Sign in
          </Link>
        </div>

        <Link to="/docs" className="text-xs text-teal-400/80 hover:text-teal-300 mt-2">
          Setup &amp; hardware guide →
        </Link>
      </div>
    </div>
  );
}
