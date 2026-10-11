import { useEffect, useState } from "react";
import Logo from "./Logo";

// Shown once when the site is first opened: logo + name centered, then fades
// away into whatever page the router lands on (splash, or straight to /home
// if already signed in).
export default function BootScreen({ onDone, minDurationMs = 1400 }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), minDurationMs);
    const doneTimer = setTimeout(() => onDone(), minDurationMs + 400); // matches fade transition below
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [minDurationMs, onDone]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-navy-900 to-navy-950 transition-opacity duration-[400ms] ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <Logo size={96} className="shadow-soft animate-[pulse_1.8s_ease-in-out_infinite]" />
      <h1 className="font-display text-2xl font-semibold tracking-tight text-white">CardioPulse Ai</h1>
    </div>
  );
}
