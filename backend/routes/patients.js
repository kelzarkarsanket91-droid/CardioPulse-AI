const express = require("express");
const { read, write, nextId } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const data = read();
  const mine = data.patients.filter((p) => p.owner === req.userId);
  const withMetrics = mine.map((p) => {
    const patientSessions = data.sessions
      .filter((s) => s.patientId === p.id)
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    const latest = patientSessions[0] || null;

    const hr = latest?.avgBpm ?? p.hr ?? null;
    const spo2 = latest?.avgSpo2 ?? p.spo2 ?? null;
    const bp =
      latest?.avgSystolic && latest?.avgDiastolic
        ? `${latest.avgSystolic}/${latest.avgDiastolic}`
        : p.bp ?? (p.systolic && p.diastolic ? `${p.systolic}/${p.diastolic}` : null);
    const duration = latest?.durationSec ?? p.durationSec ?? 0;

    return {
      ...p,
      sessionCount: patientSessions.length,
      hr,
      spo2,
      bp,
      duration,
      latestSession: latest,
    };
  });
  res.json(withMetrics);
});

router.post("/", (req, res) => {
  const { name, age, gender, bloodGroup, hr, spo2, bp, duration } = req.body || {};
  if (!name || !age || !gender || !bloodGroup) {
    return res.status(400).json({ error: "Name, age, gender and blood group are all required." });
  }
  const data = read();
  const patient = {
    id: nextId(data),
    owner: req.userId,
    name: name.trim(),
    age: Number(age),
    gender,
    bloodGroup,
    hr: hr ? Number(hr) : null,
    spo2: spo2 ? Number(spo2) : null,
    bp: bp ? String(bp).trim() : null,
    durationSec: duration ? Number(duration) : 0,
    createdAt: new Date().toISOString(),
  };
  data.patients.push(patient);
  write(data);
  res.json({
    ...patient,
    sessionCount: 0,
    hr: patient.hr,
    spo2: patient.spo2,
    bp: patient.bp,
    duration: patient.durationSec,
  });
});


router.get("/:id", (req, res) => {
  const data = read();
  const patient = data.patients.find((p) => p.id === req.params.id && p.owner === req.userId);
  if (!patient) return res.status(404).json({ error: "Patient not found." });
  const sessions = data.sessions
    .filter((s) => s.patientId === patient.id)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  res.json({ ...patient, sessions });
});

router.delete("/:id", (req, res) => {
  const data = read();
  const patient = data.patients.find((p) => p.id === req.params.id && p.owner === req.userId);
  if (!patient) return res.status(404).json({ error: "Patient not found." });

  data.patients = data.patients.filter((p) => p.id !== patient.id || p.owner !== req.userId);
  data.sessions = data.sessions.filter((s) => s.patientId !== patient.id);
  write(data);
  res.json({ ok: true });
});

module.exports = router;
