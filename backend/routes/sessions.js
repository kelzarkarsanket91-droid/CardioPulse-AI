const express = require("express");
const { read, write, nextId } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.post("/", (req, res) => {
  const {
    patientId,
    durationSec,
    avgBpm,
    avgSpo2,
    avgSystolic,
    avgDiastolic,
    ecgRaw,
    ppgRaw,
    perfusionIndex,
    signalQuality,
    samples,
    ecgSnapshot,
    ppgSnapshot,
  } = req.body || {};
  if (!patientId) return res.status(400).json({ error: "A patient must be selected before saving a session." });
  const data = read();
  const patient = data.patients.find((p) => p.id === patientId);
  if (!patient) return res.status(404).json({ error: "Patient not found." });

  const session = {
    id: nextId(data),
    patientId,
    owner: req.userId,
    startedAt: new Date().toISOString(),
    durationSec: durationSec || 0,
    avgBpm: avgBpm || null,
    avgSpo2: avgSpo2 || null,
    avgSystolic: avgSystolic || null,
    avgDiastolic: avgDiastolic || null,
    ecgRaw: ecgRaw != null ? ecgRaw : null,
    ppgRaw: ppgRaw != null ? ppgRaw : null,
    perfusionIndex: perfusionIndex != null ? perfusionIndex : null,
    signalQuality: signalQuality || "Good",
    samples: Array.isArray(samples) ? samples.slice(0, 4000) : [], // cap stored raw samples
    ecgSnapshot: ecgSnapshot || null, // data URL, small canvas capture
    ppgSnapshot: ppgSnapshot || null,
  };
  data.sessions.push(session);
  write(data);
  res.json(session);
});


router.get("/:id", (req, res) => {
  const data = read();
  const session = data.sessions.find((s) => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found." });
  res.json(session);
});

module.exports = router;
