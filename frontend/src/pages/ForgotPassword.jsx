import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { api } from "../lib/api";
import { ArrowLeft, KeyRound, Smartphone, CheckCircle, ShieldCheck } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Phone -> Send OTP, 2: OTP + New Password
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoOtpNotice, setDemoOtpNotice] = useState("");

  async function handleSendOtp(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const res = await api.requestOtp({ phone });
      setInfo("OTP sent successfully to your phone.");
      if (res.otp) {
        setDemoOtpNotice(res.otp);
        setOtp(res.otp); // autofill for convenient preview
      }
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to send OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await api.resetPassword({ phone, otp, newPassword });
      setStep(3);
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-offwhite dark:bg-navy-950 px-4 py-8">
      <div className="card w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Logo size={48} />
          <h1 className="font-display text-xl font-semibold">Reset Password</h1>
          <p className="text-sm text-navy-400 text-center">
            {step === 1 && "Enter your registered phone number to receive an OTP."}
            {step === 2 && "Enter the 6-digit OTP code and choose a new password."}
            {step === 3 && "Your password has been changed."}
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <div>
              <label className="label">Registered phone number</label>
              <div className="relative flex items-center">
                <Smartphone className="w-5 h-5 absolute left-3.5 text-navy-400 pointer-events-none z-10" />
                <input
                  className="input !pl-11"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {info && <p className="text-sm text-emerald-600 dark:text-emerald-400">{info}</p>}

            <button className="btn-primary mt-2" disabled={busy}>
              {busy ? "Sending OTP…" : "Send OTP code"}
            </button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-navy-400 hover:text-navy-700 dark:hover:text-navy-200 mt-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            {demoOtpNotice && (
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg text-xs text-teal-800 dark:text-teal-200">
                <div className="font-semibold flex items-center gap-1 mb-1">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Demo Mode OTP
                </div>
                Your OTP code is <strong className="tracking-widest font-mono text-sm">{demoOtpNotice}</strong> (also logged on the backend console).
              </div>
            )}

            <div>
              <label className="label">Enter 6-digit OTP</label>
              <input
                className="input tracking-widest text-center font-mono text-lg font-bold"
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">New password</label>
              <div className="relative flex items-center">
                <KeyRound className="w-5 h-5 absolute left-3.5 text-navy-400 pointer-events-none z-10" />
                <input
                  className="input !pl-11"
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Confirm new password</label>
              <div className="relative flex items-center">
                <KeyRound className="w-5 h-5 absolute left-3.5 text-navy-400 pointer-events-none z-10" />
                <input
                  className="input !pl-11"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {info && <p className="text-sm text-emerald-600 dark:text-emerald-400">{info}</p>}

            <button className="btn-primary mt-2" disabled={busy}>
              {busy ? "Resetting password…" : "Reset password"}
            </button>

            <div className="flex items-center justify-between text-xs text-navy-400 mt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Change phone
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={busy}
                className="text-teal-600 dark:text-teal-400 hover:underline"
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-navy-900 dark:text-navy-100">Password reset complete</h2>
              <p className="text-sm text-navy-400 mt-1">
                Your password has been updated securely. You can now log into your account with your new password.
              </p>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="btn-primary w-full mt-2"
            >
              Sign in now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
