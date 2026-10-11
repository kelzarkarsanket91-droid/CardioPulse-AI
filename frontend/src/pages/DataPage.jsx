import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowUpDown, UserPlus, Download } from "lucide-react";
import { api } from "../lib/api";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function DataPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "Male",
    bloodGroup: "O+",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .listPatients()
      .then(setPatients)
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const patient = await api.addPatient({
        ...form,
        age: Number(form.age),
      });
      setPatients((prev) => [patient, ...prev]);
      setForm({ name: "", age: "", gender: "Male", bloodGroup: "O+" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const visible = useMemo(() => {
    let list = patients.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    list = [...list].sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (av === null || av === undefined) av = "";
      if (bv === null || bv === undefined) bv = "";
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [patients, query, sortKey, sortDir]);

  function downloadCsvData(patientsToExport, filename) {
    if (!patientsToExport || patientsToExport.length === 0) {
      alert("No patient data available to download.");
      return;
    }
    const headers = [
      "S.NO",
      "NAME",
      "AGE",
      "GENDER",
      "BLOOD GRP",
      "HR (BPM)",
      "SPO2 (%)",
      "BP (MMHG)",
      "ECG RAW",
      "PPG RAW",
      "PI (%)",
      "SIGNAL QUALITY",
      "DURATION (S)",
    ];
    const rows = patientsToExport.map((p, idx) => [
      idx + 1,
      `"${(p.name || "").replace(/"/g, '""')}"`,
      p.age ?? "",
      p.gender ?? "",
      p.bloodGroup ?? "",
      p.hr ?? "",
      p.spo2 ?? "",
      p.bp ? `"${p.bp}"` : "",
      p.ecgRaw ?? "",
      p.ppgRaw ?? "",
      p.pi != null ? `${p.pi}%` : "",
      `"${p.signalQuality || "Good"}"`,
      p.duration ?? 0,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Patient data</h1>
        <p className="text-navy-400 text-sm mt-1">
          Register patients below. When you monitor them on the Monitor screen, live vitals (HR, SpO2, BP, Duration) will automatically be saved and displayed here.
        </p>
      </div>

      <div className="card">
        <h2 className="font-display font-medium mb-4 flex items-center gap-2">
          <UserPlus size={18} className="text-teal-500" /> Add a patient
        </h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input
              className="input"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Age</label>
            <input
              className="input"
              type="number"
              min="0"
              max="120"
              placeholder="e.g. 35"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Blood Group</label>
            <select
              className="input"
              value={form.bloodGroup}
              onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
            >
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg}>{bg}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 flex items-end">
            <button className="btn-primary w-full" disabled={saving}>
              {saving ? "Adding…" : "Add patient"}
            </button>
          </div>
        </form>
        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div>
            <h2 className="font-display font-medium">All patients</h2>
            <p className="text-xs text-navy-400 mt-0.5">Export records in bulk as a group, or download individually.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => downloadCsvData(visible, `CardioPulse_Patients_Group_${new Date().toISOString().slice(0, 10)}.csv`)}
              className="btn-secondary !text-xs !py-1.5 !px-3.5 flex items-center gap-1.5"
              title="Download all currently visible patients as a group CSV file"
            >
              <Download size={14} className="text-teal-500" /> Download Group CSV ({visible.length})
            </button>

            <div className="relative w-52">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none" />
              <input
                className="input py-1.5 text-sm !pl-9"
                placeholder="Search by name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-navy-400 text-sm">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-navy-400 text-sm">No patients yet — add your first one above.</p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-navy-400 border-b border-navy-50 dark:border-navy-700 uppercase text-xs tracking-wider font-semibold">
                  <th className="py-3 px-4 text-center w-16">S.NO</th>
                  {[
                    ["name", "NAME"],
                    ["age", "AGE"],
                    ["gender", "GENDER"],
                    ["bloodGroup", "BLOOD GRP"],
                    ["hr", "HR (BPM)"],
                    ["spo2", "SPO2 (%)"],
                    ["bp", "BP (MMHG)"],
                    ["ecgRaw", "ECG RAW"],
                    ["ppgRaw", "PPG RAW"],
                    ["pi", "PI (%)"],
                    ["signalQuality", "SIGNAL QUALITY"],
                    ["duration", "DURATION (S)"],
                  ].map(([key, label]) => (
                    <th key={key} className="py-3 px-4">
                      <button onClick={() => toggleSort(key)} className="flex items-center gap-1 hover:text-navy-700 dark:hover:text-offwhite whitespace-nowrap">
                        {label} <ArrowUpDown size={12} />
                      </button>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p, index) => (
                  <tr
                    key={p.id}
                    className="border-b border-navy-50 dark:border-navy-700 last:border-none hover:bg-navy-50/60 dark:hover:bg-navy-700/40 transition-colors"
                  >
                    <td
                      onClick={() => navigate(`/data/${p.id}`)}
                      className="py-3 px-4 text-center font-mono text-xs text-navy-400 font-medium cursor-pointer"
                    >
                      {index + 1}
                    </td>
                    <td
                      onClick={() => navigate(`/data/${p.id}`)}
                      className="py-3 px-4 font-semibold text-navy-900 dark:text-offwhite cursor-pointer hover:underline whitespace-nowrap"
                    >
                      {p.name}
                    </td>
                    <td onClick={() => navigate(`/data/${p.id}`)} className="py-3 px-4 cursor-pointer">{p.age}</td>
                    <td onClick={() => navigate(`/data/${p.id}`)} className="py-3 px-4 cursor-pointer">{p.gender}</td>
                    <td onClick={() => navigate(`/data/${p.id}`)} className="py-3 px-4 cursor-pointer">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-navy-50 dark:bg-navy-900 border border-navy-100 dark:border-navy-700">
                        {p.bloodGroup}
                      </span>
                    </td>
                    <td onClick={() => navigate(`/data/${p.id}`)} className="py-3 px-4 font-mono font-medium text-emerald-600 dark:text-emerald-400 cursor-pointer">
                      {p.hr != null ? `${p.hr}` : "—"}
                    </td>
                    <td onClick={() => navigate(`/data/${p.id}`)} className="py-3 px-4 font-mono font-medium text-teal-600 dark:text-teal-400 cursor-pointer">
                      {p.spo2 != null ? `${p.spo2}%` : "—"}
                    </td>
                    <td onClick={() => navigate(`/data/${p.id}`)} className="py-3 px-4 font-mono font-medium text-blue-600 dark:text-blue-400 cursor-pointer whitespace-nowrap">
                      {p.bp || "—"}
                    </td>
                    <td onClick={() => navigate(`/data/${p.id}`)} className="py-3 px-4 font-mono text-purple-600 dark:text-purple-400 cursor-pointer">
                      {p.ecgRaw != null ? p.ecgRaw : "—"}
                    </td>
                    <td onClick={() => navigate(`/data/${p.id}`)} className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400 cursor-pointer">
                      {p.ppgRaw != null ? p.ppgRaw : "—"}
                    </td>
                    <td onClick={() => navigate(`/data/${p.id}`)} className="py-3 px-4 font-mono text-teal-600 dark:text-teal-400 cursor-pointer">
                      {p.pi != null ? `${p.pi}%` : "—"}
                    </td>
                    <td onClick={() => navigate(`/data/${p.id}`)} className="py-3 px-4 cursor-pointer">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                        (p.signalQuality || "").toLowerCase() === "good"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                          : "bg-navy-50 dark:bg-navy-900 border-navy-100 dark:border-navy-700 text-navy-600 dark:text-navy-300"
                      }`}>
                        {p.signalQuality || "Good"}
                      </span>
                    </td>
                    <td onClick={() => navigate(`/data/${p.id}`)} className="py-3 px-4 font-mono text-navy-500 dark:text-navy-300 cursor-pointer whitespace-nowrap">
                      {p.duration != null ? `${p.duration}s` : "0s"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadCsvData([p], `CardioPulse_${(p.name || "Patient").replace(/\s+/g, "_")}_Vitals.csv`);
                        }}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900 transition"
                        title={`Download individual record for ${p.name}`}
                      >
                        <Download size={12} /> CSV
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


