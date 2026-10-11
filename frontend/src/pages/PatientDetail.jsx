import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, FileText, FileSpreadsheet, Trash2 } from "lucide-react";
import { api } from "../lib/api";

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setPatient(null);
    setError("");
    api
      .getPatient(id)
      .then(setPatient)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!window.confirm(`Delete only ${patient.name} and this patient's saved sessions?`)) return;
    setDeleting(true);
    setError("");
    try {
      await api.deletePatient(patient.id);
      navigate("/data", { replace: true });
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  async function downloadCsv(sessionId) {
    const session = await api.getSession(sessionId);
    const rows = [["sample_index", "ecg", "ppg"]];
    (session.samples || []).forEach(([ecg, ppg], i) => rows.push([i, ecg, ppg]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CardioPulse_${patient.name.replace(/\s+/g, "_")}_${session.id}_raw.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="text-navy-400 text-sm">Loading…</p>;
  if (error) return <p className="text-red-500 text-sm">{error}</p>;
  if (!patient) return <p className="text-navy-400 text-sm">Patient not found.</p>;

  return (
    <div className="flex flex-col gap-6">
      <button onClick={() => navigate("/data")} className="flex items-center gap-1.5 text-sm text-navy-400 hover:text-navy-700 dark:hover:text-offwhite w-fit">
        <ArrowLeft size={15} /> Back to patients
      </button>

      <div className="card flex flex-wrap items-center gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">{patient.name}</h1>
          <p className="text-navy-400 text-sm mt-1">
            {patient.age} yrs • {patient.gender} • Blood group {patient.bloodGroup}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 ml-auto">
          <Link to="/report" state={{ patientId: patient.id }} className="btn-primary">
            Generate a report
          </Link>
          <button onClick={handleDelete} className="btn-secondary text-red-600 dark:text-red-400" disabled={deleting}>
            <Trash2 size={15} /> {deleting ? "Deleting…" : "Delete selected patient"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="font-display font-medium mb-1">Saved sessions</h2>
        <p className="text-xs text-navy-400 mb-4">Download raw sample data as CSV here, or head to Reports for a printable PDF.</p>
        {patient.sessions.length === 0 ? (
          <p className="text-navy-400 text-sm">No sessions recorded yet. Head to Monitor to start one.</p>
        ) : (
          <div className="flex flex-col divide-y divide-navy-50 dark:divide-navy-700">
            {patient.sessions.map((s) => (
              <div key={s.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{new Date(s.startedAt).toLocaleString()}</p>
                  <p className="text-xs text-navy-400 mt-0.5">
                    {Math.round(s.durationSec)}s • HR {s.avgBpm ?? "—"} bpm • SpO2 {s.avgSpo2 ?? "—"}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => downloadCsv(s.id)} className="btn-secondary text-sm py-1.5 px-4">
                    <FileSpreadsheet size={14} /> CSV
                  </button>
                  <Link to="/report" state={{ patientId: patient.id, sessionId: s.id }} className="btn-secondary text-sm py-1.5 px-4">
                    <FileText size={14} /> Report
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
