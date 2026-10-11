const express = require("express");
const cors = require("cors");

const authRoutes = require("../backend/routes/auth");
const patientRoutes = require("../backend/routes/patients");
const sessionRoutes = require("../backend/routes/sessions");
const reportRoutes = require("../backend/routes/reports");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true, name: "CardioPulse Ai API (Vercel Serverless)" }));
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/reports", reportRoutes);

module.exports = app;
