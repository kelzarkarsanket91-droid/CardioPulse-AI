import { useEffect, useState } from "react";
import { Sun, Moon, Monitor as MonitorIcon } from "lucide-react";
import { applyTheme, getTheme } from "../lib/theme";

const OPTIONS = [
  { key: "light", icon: Sun, label: "Light" },
  { key: "system", icon: MonitorIcon, label: "System" },
  { key: "dark", icon: Moon, label: "Dark" },
];

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-navy-100 dark:border-navy-700 p-1 bg-white dark:bg-navy-800">
      {OPTIONS.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          title={label}
          className={`p-1.5 rounded-full transition ${
            theme === key ? "bg-teal-500 text-white" : "text-navy-400 hover:text-navy-700 dark:hover:text-offwhite"
          }`}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}
