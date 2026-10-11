import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowUpDown, UserPlus } from "lucide-react";
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
          <h2 className="font-display font-medium">All patients</h2>
          <div className="relative w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none" />
            <input
              className="input py-1.5 text-sm !pl-10"
              placeholder="Search by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
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
                    ["duration", "DURATION (S)"],
                  ].map(([key, label]) => (
                    <th key={key} className="py-3 px-4">
                      <button onClick={() => toggleSort(key)} className="flex items-center gap-1 hover:text-navy-700 dark:hover:text-offwhite">
                        {label} <ArrowUpDown size={12} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((p, index) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/data/${p.id}`)}
                    className="border-b border-navy-50 dark:border-navy-700 last:border-none hover:bg-navy-50/60 dark:hover:bg-navy-700/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-mono text-xs text-navy-400 font-medium">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-navy-900 dark:text-offwhite">{p.name}</td>
                    <td className="py-3 px-4">{p.age}</td>
                    <td className="py-3 px-4">{p.gender}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-navy-50 dark:bg-navy-900 border border-navy-100 dark:border-navy-700">
                        {p.bloodGroup}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      {p.hr != null ? `${p.hr}` : "—"}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-teal-600 dark:text-teal-400">
                      {p.spo2 != null ? `${p.spo2}%` : "—"}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                      {p.bp || "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-navy-500 dark:text-navy-300">
                      {p.duration != null ? `${p.duration}s` : "0s"}
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

