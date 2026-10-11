import { Activity, Cpu, Database, FileText, GitBranch, HeartPulse } from "lucide-react";

export default function About() {
  return (
    <div className="flex flex-col gap-10 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-semibold">About CardioPulse Ai</h1>
        <p className="text-navy-400 text-sm mt-1">The platform, the methods behind it, and the project as a whole.</p>
      </div>

      <section className="card">
        <h2 className="font-display font-medium text-lg mb-3 flex items-center gap-2">
          <Activity size={18} className="text-teal-500" /> About the platform
        </h2>
        <p className="text-sm leading-relaxed text-navy-700 dark:text-navy-100">
          CardioPulse Ai is a hemodynamics monitoring portal that pairs low-cost ECG and PPG sensors with a
          browser-based dashboard. A clinician or student can register a patient, connect a sensor board over USB,
          watch live ECG and PPG waveforms with derived vitals, and save a session for later review — all without
          installing any desktop software. Sessions can be exported as a printable A4 report or as raw CSV data for
          further analysis.
        </p>
      </section>

      <section className="card">
        <h2 className="font-display font-medium text-lg mb-4 flex items-center gap-2">
          <Cpu size={18} className="text-teal-500" /> Methods used
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Method icon={HeartPulse} title="Signal acquisition" desc="AD8232 for ECG and MAX30102 for PPG, sampled on an ESP32 and streamed to the browser." />
          <Method icon={GitBranch} title="Web Serial" desc="Direct USB communication with the sensor board from Chrome/Edge — no drivers required." />
          <Method icon={Activity} title="Vitals estimation" desc="Adaptive peak detection on the ECG for heart rate, and AC/DC ratio analysis on the PPG for an SpO2 and perfusion index estimate." />
          <Method icon={Database} title="Storage" desc="Patient records, sessions and reports are scoped per account and persisted server-side." />
          <Method icon={FileText} title="Reporting" desc="Reports are composed as a proper A4 PDF template — not a screenshot — with the waveform plots placed alongside structured patient and vitals data." />
        </div>
      </section>

      <section className="card">
        <h2 className="font-display font-medium text-lg mb-3 flex items-center gap-2">
          <FileText size={18} className="text-teal-500" /> About the project
        </h2>
        <p className="text-sm leading-relaxed text-navy-700 dark:text-navy-100">
          CardioPulse Ai is developed as a Major Project - I submission for the final year B.Tech programme
          (VIIth semester), Computer Science and Medical Engineering. It combines embedded firmware, real-time
          signal processing, and a full-stack web application into a single, coherent monitoring tool aimed at
          being simple enough for a classroom demo and structured enough to extend toward real clinical workflows.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 text-sm">
          <Field label="Developer" value="Sanket Kelzarkar" />
          <Field label="Mentor" value="Dr. Praveen Kumar" />
          <Field label="Branch" value="Computer Science and Medical Engineering" />
          <Field label="Programme" value="B.Tech (Final Year), VIIth Sem" />
          <Field label="Submission" value="Major Project - I" />
        </div>
      </section>
    </div>
  );
}

function Method({ icon: Icon, title, desc }) {
  return (
    <div className="flex gap-3">
      <div className="w-9 h-9 shrink-0 rounded-full bg-navy-50 dark:bg-navy-700 flex items-center justify-center text-navy-700 dark:text-teal-400">
        <Icon size={16} />
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-navy-400 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-navy-400">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
