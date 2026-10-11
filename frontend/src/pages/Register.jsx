import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { useAuth } from "../lib/AuthContext";
import { ROLES } from "../lib/constants";
import { Smartphone, Mail, Lock, User, UserCheck } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", role: ROLES[0] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.phone && !form.email) {
      setError("Please provide a phone number, an email address, or both.");
      return;
    }

    setBusy(true);
    try {
      await register(form);
      navigate("/home");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-offwhite dark:bg-navy-950 px-4">
      <div className="card w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Logo size={48} />
          <h1 className="font-display text-xl font-semibold">Create your account</h1>
          <p className="text-sm text-navy-400 text-center">Register with your mobile number, email, or both.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Full name</label>
            <div className="relative flex items-center">
              <User className="w-5 h-5 absolute left-3.5 text-navy-400 pointer-events-none z-10" />
              <input
                className="input !pl-11"
                placeholder="e.g. Your full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="label">Mobile number</label>
              <span className="text-[10px] text-navy-400">SMS / OTP</span>
            </div>
            <div className="relative flex items-center">
              <Smartphone className="w-5 h-5 absolute left-3.5 text-navy-400 pointer-events-none z-10" />
              <input
                className="input !pl-11"
                type="tel"
                placeholder="e.g. 9876543210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="label">Email address</label>
              <span className="text-[10px] text-navy-400">Reports / Login</span>
            </div>
            <div className="relative flex items-center">
              <Mail className="w-5 h-5 absolute left-3.5 text-navy-400 pointer-events-none z-10" />
              <input
                className="input !pl-11"
                type="email"
                placeholder="e.g. you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative flex items-center">
              <Lock className="w-5 h-5 absolute left-3.5 text-navy-400 pointer-events-none z-10" />
              <input
                className="input !pl-11"
                type="password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">I am a…</label>
            <div className="relative flex items-center">
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button className="btn-primary mt-2" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>


        <p className="text-center text-sm text-navy-400 mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-teal-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
