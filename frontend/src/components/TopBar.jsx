import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";
import Avatar from "./Avatar";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../lib/AuthContext";

const NAV = [
  { to: "/home", label: "Home" },
  { to: "/data", label: "Data" },
  { to: "/monitor", label: "Monitor" },
  { to: "/report", label: "Report" },
  { to: "/about", label: "About" },
];

export default function TopBar() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-offwhite/85 dark:bg-navy-950/85 border-b border-navy-50 dark:border-navy-800">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <Link to="/home" className="flex items-center gap-2.5">
          <Logo size={34} />
          <span className="font-display font-semibold text-lg tracking-tight">CardioPulse Ai</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
                location.pathname === item.to
                  ? "bg-navy-800 text-white dark:bg-teal-500"
                  : "text-navy-500 hover:bg-navy-50 dark:text-navy-100 dark:hover:bg-navy-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/profile" className="flex items-center gap-2 group">
            <span className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm font-medium text-navy-700 dark:text-offwhite group-hover:text-teal-600">
                {user?.name}
              </span>
              {(localStorage.getItem("cp-session-role") || user?.role) && (
                <span className="text-[11px] text-navy-400">{localStorage.getItem("cp-session-role") || user?.role}</span>
              )}
            </span>
            <Avatar initials={user?.initials} />
          </Link>
        </div>
      </div>
      <nav className="flex md:hidden gap-1 px-4 pb-2 overflow-x-auto">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              location.pathname === item.to
                ? "bg-navy-800 text-white dark:bg-teal-500"
                : "text-navy-500 dark:text-navy-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
