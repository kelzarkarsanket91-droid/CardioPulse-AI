import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { useAuth } from "../lib/AuthContext";
import { ROLES } from "../lib/constants";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [sessionRole, setSessionRole] = useState(ROLES[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(form);
      localStorage.setItem("cp-session-role", sessionRole);
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
          <h1 className="font-display text-xl font-semibold">Welcome back</h1>
          <p className="text-sm text-navy-400 text-center">Sign in with your mobile number or email.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">Mobile number or Email</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. 9876543210 or you@example.com"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="label">Password</label>
              <Link to="/forgot-password" tabIndex={-1} className="text-xs text-teal-600 dark:text-teal-400 hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              className="input"
              type="password"
              placeholder="Your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Continue as</label>
            <select className="input" value={sessionRole} onChange={(e) => setSessionRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button className="btn-primary mt-2" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-navy-400 mt-5">
          New here?{" "}
          <Link to="/register" className="text-teal-600 font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
