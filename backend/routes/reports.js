const express = require("express");
const { read, write, nextId } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const data = read();
  const mine = data.reports.filter((r) => r.owner === req.userId);
  res.json(mine.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt)));
});

router.post("/", (req, res) => {
  const { patientId, sessionId, patientName, notes, summary } = req.body || {};
  if (!patientId || !sessionId) {
    return res.status(400).json({ error: "Select a patient and a session before generating a report." });
  }
  const data = read();
  const patient = data.patients.find((p) => p.id === patientId && p.owner === req.userId);
  const session = data.sessions.find((s) => s.id === sessionId && s.owner === req.userId && s.patientId === patientId);
  if (!patient || !session) {
    return res.status(404).json({ error: "The selected patient and session do not match." });
  }
  const mineCount = data.reports.filter((r) => r.owner === req.userId).length;
  const serial = `R${String(mineCount + 1).padStart(3, "0")}`;
  const report = {
    id: nextId(data),
    serial,
    owner: req.userId,
    patientId,
    sessionId,
    patientName: patient.name,
    notes: notes || "",
    summary: summary || {},
    generatedAt: new Date().toISOString(),
  };
  data.reports.push(report);
  write(data);
  res.json(report);
});

module.exports = router;
