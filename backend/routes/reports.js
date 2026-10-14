const express = require("express");
const { read, write, nextId } = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const data = read();
  const allReports = data.reports || [];
  res.json(allReports.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt)));
});

router.post("/", (req, res) => {
  const { patientId, sessionId, patientName, notes, summary } = req.body || {};
  if (!patientId || !sessionId) {
    return res.status(400).json({ error: "Select a patient and a session before generating a report." });
  }
  const data = read();
  const patient = data.patients.find((p) => p.id === patientId);
  const session = data.sessions.find((s) => s.id === sessionId && s.patientId === patientId);
  if (!patient || !session) {
    return res.status(404).json({ error: "The selected patient and session do not match." });
  }
  const serial = `R${String((data.reports?.length || 0) + 1).padStart(3, "0")}`;
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
