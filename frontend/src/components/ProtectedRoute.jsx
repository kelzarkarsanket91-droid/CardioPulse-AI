import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import TopBar from "./TopBar";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-navy-400">
        Loading CardioPulse Ai…
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
