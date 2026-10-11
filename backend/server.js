require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const patientRoutes = require("./routes/patients");
const sessionRoutes = require("./routes/sessions");
const reportRoutes = require("./routes/reports");

const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" })); // snapshots are small data URLs, 5mb is generous headroom

app.get("/api/health", (req, res) => res.json({ ok: true, name: "CardioPulse Ai API" }));
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/reports", reportRoutes);

// Serve frontend production build if available
const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found." });
  }
  res.sendFile(path.join(frontendDist, "index.html"), (err) => {
    if (err) {
      res.status(200).send("CardioPulse Ai Backend is running. Frontend dev server is available at http://localhost:8090");
    }
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`CardioPulse Ai running unified on http://localhost:${PORT}`);
});

