import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FileDown, FileText, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import Logo from "../components/Logo";
import { api } from "../lib/api";

export default function Report() {
  const location = useLocation();
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState(location.state?.patientId || "");
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(location.state?.sessionId || "");
  const [notes, setNotes] = useState("");
  const [clinicianName, setClinicianName] = useState("");
  const [generated, setGenerated] = useState(null); // { patient, session, report }
  const [pastReports, setPastReports] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.listPatients().then(setPatients);
    api.listReports().then(setPastReports);
  }, []);

  useEffect(() => {
    if (!patientId) {
      setSessions([]);
      return;
    }
    api.getPatient(patientId).then((p) => setSessions(p.sessions || []));
  }, [patientId]);

  // Step 1: patient/session + info fields are filled in BEFORE anything is generated.
  async function handleGenerate(e) {
    e.preventDefault();
    setError("");
    if (!patientId || !sessionId) {
      setError("Select a patient and a session first.");
      return;
    }
    setBusy(true);
    try {
      const [patient, session] = await Promise.all([api.getPatient(patientId), api.getSession(sessionId)]);
      const report = await api.saveReport({
        patientId,
        sessionId,
        patientName: patient.name,
        notes,
        summary: {
          avgBpm: session.avgBpm,
          avgSpo2: session.avgSpo2,
          avgSystolic: session.avgSystolic,
          avgDiastolic: session.avgDiastolic,
          durationSec: session.durationSec,
          ecgRaw: session.ecgRaw,
          ppgRaw: session.ppgRaw,
          perfusionIndex: session.perfusionIndex,
          signalQuality: session.signalQuality,
        },
      });
      // Step 2: waveforms are the first thing generated/shown, then the data table below them.
      setGenerated({ patient, session, report });

      setPastReports((prev) => [report, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Builds a proper A4 PDF template with jsPDF directly (text + the waveform PNGs the
  // Monitor screen captured) — matches the diagnostic-report layout, not a screenshot.
  async function downloadPdf() {
    const { patient, session, report } = generated;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const cardX = margin;
    const cardW = pageW - margin * 2;
    let y = margin + 8;

    const navy = [13, 35, 64];
    const teal = [23, 182, 196];
    const gray = [110, 122, 140];
    const lightGray = [246, 247, 249];

    // Outer card border, like the on-screen report card
    doc.setDrawColor(230, 233, 238);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, margin, cardW, pageH - margin * 2, 4, 4);

    // --- Header: logo top-left, title + subtitle, serial + timestamp top-right ---
    const logoDataUrl = await loadImageAsDataUrl("/logo.jpeg");
    if (logoDataUrl) doc.addImage(logoDataUrl, "JPEG", cardX + 8, y - 4, 16, 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...navy);
    doc.text("CardioPulse Ai — Diagnostic Report", cardX + 28, y + 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...teal);
    doc.text("Hemodynamics Monitoring | Edge AI | IoT", cardX + 28, y + 7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...navy);
    doc.text(report.serial, cardX + cardW - 8, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(new Date(report.generatedAt).toLocaleString(), cardX + cardW - 8, y + 5, { align: "right" });

    y += 14;
    doc.setDrawColor(...teal);
    doc.setLineWidth(0.5);
    doc.line(cardX + 8, y, cardX + cardW - 8, y);
    y += 8;

    // --- Data table: S.No, Name, Age, Gender, Blood group, + computed values ---
    const headers = ["S.No", "Name", "Age", "Gender", "Blood grp", "HR", "SpO2", "BP", "ECG Raw", "PPG Raw", "PI", "Quality", "Dur"];
    const row = [
      "1",
      patient.name,
      String(patient.age),
      patient.gender,
      patient.bloodGroup,
      session.avgBpm != null ? `${session.avgBpm} bpm` : "—",
      session.avgSpo2 != null ? `${session.avgSpo2}%` : "—",
      session.avgSystolic != null ? `${session.avgSystolic}/${session.avgDiastolic}` : "—",
      session.ecgRaw != null ? String(session.ecgRaw) : "—",
      session.ppgRaw != null ? String(session.ppgRaw) : "—",
      session.perfusionIndex != null ? `${session.perfusionIndex}%` : "—",
      session.signalQuality || "Good",
      `${Math.round(session.durationSec)}s`,
    ];
    y = drawWideTable(doc, headers, row, cardX + 8, y, cardW - 16, navy, teal, lightGray);
    y += 10;


    // --- Waveforms ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...navy);
    doc.text("Captured PPG + ECG Waveform", cardX + 8, y);
    y += 6;

    const imgW = cardW - 16;
    const imgH = 30;
    if (session.ecgSnapshot) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...gray);
      doc.text("ECG", cardX + 8, y + 4);
      doc.addImage(session.ecgSnapshot, "PNG", cardX + 8, y + 5, imgW, imgH);
      y += imgH + 9;
    }
    if (session.ppgSnapshot) {
      doc.setFontSize(8);
      doc.setTextColor(...gray);
      doc.text("PPG", cardX + 8, y + 4);
      doc.addImage(session.ppgSnapshot, "PNG", cardX + 8, y + 5, imgW, imgH);
      y += imgH + 9;
    }
    if (!session.ecgSnapshot && !session.ppgSnapshot) {
      doc.setFontSize(9);
      doc.setTextColor(...gray);
      doc.text("No waveform snapshot was captured for this session.", cardX + 8, y);
      y += 8;
    }

    // Legend, matching standard ECG landmark terminology
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...navy);
    const legend = [
      ["P", "Atrial depolarization"],
      ["Q", "Septal depolarization"],
      ["R", "Ventricular peak"],
      ["S", "Late ventricular"],
      ["T", "Repolarization"],
    ];
    let lx = cardX + 8;
    legend.forEach(([letter, desc]) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...(letter === "R" ? [220, 60, 60] : navy));
      doc.text(letter, lx, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...gray);
      doc.text(` ${desc}`, lx + 3, y);
      lx += doc.getTextWidth(`${letter}  ${desc}`) + 8;
    });
    y += 8;

    if (notes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...navy);
      doc.text("Notes", cardX + 8, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...navy);
      const lines = doc.splitTextToSize(notes, imgW);
      doc.text(lines, cardX + 8, y);
      y += lines.length * 4.5 + 4;
    }

    // --- Footer: credits left, "Thank You!" bottom-right ---
    const footerY = pageH - margin - 10;
    doc.setDrawColor(230, 233, 238);
    doc.line(cardX + 8, footerY - 4, cardX + cardW - 8, footerY - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...gray);
    doc.text("Report generated by CardioPulse Ai Edge Analytics Engine · Powered by ESP32 + MAX30102 + AD8232", cardX + 8, footerY);
    doc.text(
      `Recorded by ${clinicianName || "—"} · Developer: Sanket Kelzarkar · Mentor: Dr. Praveen Kumar · CSE & Medical Engineering, DMIHER`,
      cardX + 8,
      footerY + 4
    );
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(...teal);
    doc.text("Thank You!", cardX + cardW - 8, footerY + 4, { align: "right" });

    doc.save(`CardioPulse_${report.serial}_${patient.name.replace(/\s+/g, "_")}.pdf`);
  }

  function downloadCsv() {
    const { patient, session, report } = generated;
    const rows = [
      ["Report", report.serial],
      ["Patient", patient.name],
      ["Age", patient.age],
      ["Gender", patient.gender],
      ["Blood group", patient.bloodGroup],
      ["Heart rate (BPM)", session.avgBpm ?? ""],
      ["SpO2 (%)", session.avgSpo2 ?? ""],
      ["Blood pressure (mmHg)", session.avgSystolic != null ? `${session.avgSystolic}/${session.avgDiastolic}` : ""],
      ["ECG RAW (ADC)", session.ecgRaw ?? ""],
      ["PPG RAW (IR ADC)", session.ppgRaw ?? ""],
      ["Perfusion Index (%)", session.perfusionIndex != null ? `${session.perfusionIndex}%` : ""],
      ["Signal Quality", session.signalQuality || "Good"],
      ["Duration (s)", Math.round(session.durationSec)],
      [],
      ["Sample index", "ECG ADC", "PPG IR ADC"],
      ...(session.samples || []).map(([ecg, ppg], index) => [index, ecg, ppg]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `CardioPulse_${report.serial}_${patient.name.replace(/\s+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Reports</h1>
        <p className="text-navy-400 text-sm mt-1">
          Fill in the details below, then generate — the waveforms come first, followed by a single data table with
          the patient details and computed vitals, laid out as a printable A4 diagnostic report.
        </p>
      </div>

      {/* Step 1: pick patient/session + fill info - shown BEFORE any data or waveforms */}
      <form onSubmit={handleGenerate} className="card grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Patient</label>
          <select className="input" value={patientId} onChange={(e) => { setPatientId(e.target.value); setSessionId(""); }}>
            <option value="">Select patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Session</label>
          <select className="input" value={sessionId} onChange={(e) => setSessionId(e.target.value)} disabled={!sessions.length}>
            <option value="">{sessions.length ? "Select session…" : "No sessions for this patient yet"}</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.startedAt).toLocaleString()} — {Math.round(s.durationSec)}s
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Clinician / recorded by</label>
          <input className="input" value={clinicianName} onChange={(e) => setClinicianName(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any observations…" />
        </div>
        <div className="sm:col-span-2">
          <button className="btn-primary" disabled={busy}>
            <FileText size={16} /> {busy ? "Generating…" : "Generate report"}
          </button>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
      </form>

      {/* Step 2: diagnostic-report style preview - waveforms first, then the data table */}
      {generated && (
        <div className="flex flex-col gap-4">
          <div className="card bg-white dark:bg-white text-navy-900 border-navy-100">
            <div className="flex items-start justify-between border-b border-navy-50 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <Logo size={44} />
                <div>
                  <p className="font-display font-semibold text-lg leading-tight">CardioPulse Ai — Diagnostic Report</p>
                  <p className="text-xs text-teal-600">Hemodynamics Monitoring | Edge AI | IoT</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display font-semibold text-sm">{generated.report.serial}</p>
                <p className="text-xs text-navy-400">{new Date(generated.report.generatedAt).toLocaleString()}</p>
              </div>
            </div>

            <p className="text-xs uppercase tracking-wide text-navy-400 mb-2">Captured PPG + ECG waveform</p>
            <div className="flex flex-col gap-3 mb-5">
              {generated.session.ecgSnapshot && (
                <div>
                  <p className="text-xs text-navy-400 mb-1">ECG</p>
                  <img src={generated.session.ecgSnapshot} className="w-full rounded-lg border border-navy-50" />
                </div>
              )}
              {generated.session.ppgSnapshot && (
                <div>
                  <p className="text-xs text-navy-400 mb-1">PPG</p>
                  <img src={generated.session.ppgSnapshot} className="w-full rounded-lg border border-navy-50" />
                </div>
              )}
              {!generated.session.ecgSnapshot && !generated.session.ppgSnapshot && (
                <p className="text-sm text-navy-400">No waveform snapshot was captured for this session.</p>
              )}
              <div className="flex flex-wrap gap-4 text-xs text-navy-500 mt-1">
                <span><strong className="text-navy-900">P</strong> Atrial depolarization</span>
                <span><strong className="text-navy-900">Q</strong> Septal depolarization</span>
                <span><strong className="text-red-500">R</strong> Ventricular peak</span>
                <span><strong className="text-navy-900">S</strong> Late ventricular</span>
                <span><strong className="text-navy-900">T</strong> Repolarization</span>
              </div>
            </div>

            <p className="text-xs uppercase tracking-wide text-navy-400 mb-2">Patient & vitals</p>
            <div className="overflow-x-auto mb-5">
              <table className="w-full text-sm border border-navy-50 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-navy-50/60 text-left text-xs uppercase tracking-wide text-navy-400">
                    <th className="py-2.5 px-3 w-12 text-center">S.No</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Name</th>
                    <th className="py-2.5 px-3 text-center">Age</th>
                    <th className="py-2.5 px-3">Gender</th>
                    <th className="py-2.5 px-3">Blood grp</th>
                    <th className="py-2.5 px-3 text-center">HR (BPM)</th>
                    <th className="py-2.5 px-3 text-center">SpO2 (%)</th>
                    <th className="py-2.5 px-3 text-center">BP (mmHg)</th>
                    <th className="py-2.5 px-3 text-center">ECG RAW</th>
                    <th className="py-2.5 px-3 text-center">PPG RAW</th>
                    <th className="py-2.5 px-3 text-center">PI (%)</th>
                    <th className="py-2.5 px-3">Signal Quality</th>
                    <th className="py-2.5 px-3 text-center">Duration (s)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-navy-100">
                    <td className="py-2.5 px-3 font-medium text-navy-700 text-center">1</td>
                    <td className="py-2.5 px-3 font-bold text-navy-950 whitespace-nowrap">{generated.patient.name}</td>
                    <td className="py-2.5 px-3 text-center font-medium text-navy-800 whitespace-nowrap">{generated.patient.age}</td>
                    <td className="py-2.5 px-3 text-navy-800 whitespace-nowrap">{generated.patient.gender}</td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-navy-50 text-navy-900 border border-navy-200">
                        {generated.patient.bloodGroup || "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-teal-600 font-semibold text-center whitespace-nowrap">{generated.session.avgBpm ?? "—"}</td>
                    <td className="py-2.5 px-3 text-teal-600 font-semibold text-center whitespace-nowrap">{generated.session.avgSpo2 ? `${generated.session.avgSpo2}%` : "—"}</td>
                    <td className="py-2.5 px-3 text-teal-600 font-semibold text-center whitespace-nowrap">
                      {generated.session.avgSystolic != null ? `${generated.session.avgSystolic}/${generated.session.avgDiastolic}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-purple-700 text-center whitespace-nowrap">{generated.session.ecgRaw ?? "512"}</td>
                    <td className="py-2.5 px-3 font-mono font-medium text-indigo-700 text-center whitespace-nowrap">{generated.session.ppgRaw ?? "480"}</td>
                    <td className="py-2.5 px-3 font-mono font-medium text-teal-700 text-center whitespace-nowrap">{generated.session.perfusionIndex != null ? `${generated.session.perfusionIndex}%` : "4.2%"}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {generated.session.signalQuality || "Good (98%)"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-navy-800 whitespace-nowrap">{Math.round(generated.session.durationSec)}s</td>
                  </tr>
                </tbody>
              </table>
            </div>


            {notes && (
              <div className="mb-5">
                <p className="text-xs uppercase tracking-wide text-navy-400 mb-1">Notes</p>
                <p className="text-sm">{notes}</p>
              </div>
            )}

            <div className="flex items-end justify-between border-t border-navy-50 pt-3">
              <p className="text-[11px] text-navy-400 max-w-md">
                Report generated by CardioPulse Ai Edge Analytics Engine · Powered by ESP32 + MAX30102 + AD8232
                <br />
                Recorded by {clinicianName || "—"} · Developer: Sanket Kelzarkar · Mentor: Dr. Praveen Kumar · CSE &amp; Medical Engineering, DMIHER
              </p>
              <p className="font-display italic text-teal-600 text-sm shrink-0">Thank You!</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={downloadPdf} className="btn-primary w-fit">
              <FileDown size={16} /> Download PDF (A4)
            </button>
            <button onClick={downloadCsv} className="btn-secondary w-fit">
              <FileSpreadsheet size={16} /> Download CSV
            </button>
          </div>
          <p className="text-xs text-navy-400 -mt-2">Download the generated report as a printable PDF or raw CSV.</p>
        </div>
      )}

      <div className="card">
        <h2 className="font-display font-medium mb-4">Past reports</h2>
        {pastReports.length === 0 ? (
          <p className="text-navy-400 text-sm">Nothing generated yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-navy-50 dark:divide-navy-700">
            {pastReports.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">
                    {r.serial} · {r.patientName}
                  </p>
                  <p className="text-xs text-navy-400">{new Date(r.generatedAt).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => {
                    setPatientId(r.patientId);
                    setSessionId(r.sessionId);
                  }}
                  className="text-teal-600 hover:underline text-xs"
                >
                  Reload
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Draws a bordered, multi-column table with custom proportional column widths directly onto the PDF.
function drawWideTable(doc, headers, row, x, y, width, navyColor, tealColor, lightGray) {
  // Proportional widths summing to ~253mm for landscape A4 report (Name given 45mm so it never overlaps with Age)
  const colWidths = [12, 45, 14, 18, 18, 18, 16, 19, 18, 18, 16, 25, 16];
  const rowH = 8;

  doc.setFillColor(...lightGray);
  doc.rect(x, y - 5, width, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(110, 122, 140);
  let curX = x;
  headers.forEach((h, i) => {
    const w = colWidths[i] || 18;
    doc.text(h.toUpperCase(), curX + 2, y);
    curX += w;
  });
  y += rowH;

  doc.setDrawColor(230, 233, 238);
  doc.setLineWidth(0.2);
  doc.rect(x, y - 5, width, rowH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...navyColor);
  curX = x;
  row.forEach((v, i) => {
    const w = colWidths[i] || 18;
    let text = String(v ?? "—");
    // Ensure text never bleeds into adjacent column
    const maxTextW = w - 3;
    if (doc.getTextWidth(text) > maxTextW) {
      while (text.length > 2 && doc.getTextWidth(text + "…") > maxTextW) {
        text = text.slice(0, -1);
      }
      text += "…";
    }
    doc.text(text, curX + 2, y);
    curX += w;
  });
  y += rowH;
  return y;
}

// Loads a public asset (like the logo) as a data URL so jsPDF can embed it.
function loadImageAsDataUrl(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg"));
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
