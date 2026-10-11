const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "cardiopulse-dev-secret-change-me";

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not signed in." });
  try {
    const payload = jwt.verify(token, SECRET);
    req.userId = payload.sub;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Session expired. Please sign in again." });
  }
}

module.exports = { requireAuth, SECRET };
