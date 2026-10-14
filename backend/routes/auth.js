const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { read, write, nextId } = require("../db");
const { requireAuth, SECRET } = require("../middleware/auth");

const router = express.Router();

const VALID_ROLES = ["Doctor (Cardiologist)", "Patient", "Developer", "Nurse", "Pathologist"];

function phoneMatches(inputPhone, storedPhone) {
  if (!inputPhone || !storedPhone) return false;
  const c1 = String(inputPhone).replace(/\D/g, "");
  const c2 = String(storedPhone).replace(/\D/g, "");
  if (c1 === c2) return true;
  if (c1.length >= 10 && c2.length >= 10) {
    return c1.slice(-10) === c2.slice(-10);
  }
  return false;
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone || "",
    email: user.email || "",
    role: user.role || "",
    clinic: user.clinic || "",
    notes: user.notes || "",
    language: user.language || "English",
    initials: initials(user.name),
  };
}

router.post("/register", (req, res) => {
  const { name, phone, email, password, role } = req.body || {};
  if (!name || !password) {
    return res.status(400).json({ error: "Name and password are required." });
  }
  if (!phone && !email) {
    return res.status(400).json({ error: "Please provide a mobile number, an email address, or both." });
  }

  let cleanPhone = "";
  if (phone) {
    cleanPhone = String(phone).replace(/\D/g, "");
    if (cleanPhone.length < 7) {
      return res.status(400).json({ error: "Please enter a valid phone number." });
    }
  }

  let cleanEmail = "";
  if (email) {
    cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const data = read();

  if (cleanPhone && data.users.find((u) => u.phone && phoneMatches(cleanPhone, u.phone))) {
    return res.status(409).json({ error: "An account with this phone number already exists." });
  }
  if (cleanEmail && data.users.find((u) => u.email && u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ error: "An account with this email address already exists." });
  }

  const user = {
    id: nextId(data),
    name: name.trim(),
    phone: cleanPhone,
    email: cleanEmail,
    passwordHash: bcrypt.hashSync(password, 10),
    role: VALID_ROLES.includes(role) ? role : "",
    clinic: "",
    notes: "",
    language: "English",
    createdAt: new Date().toISOString(),
  };
  data.users.push(user);
  write(data);
  const token = jwt.sign({ sub: user.id }, SECRET, { expiresIn: "30d" });
  res.json({ token, user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const { identifier, phone, password } = req.body || {};
  const loginId = (identifier || phone || "").trim();
  if (!loginId || !password) {
    return res.status(400).json({ error: "Mobile number/email and password are required." });
  }

  const cleanPhone = loginId.replace(/\D/g, "");
  const cleanEmail = loginId.toLowerCase();

  const data = read();
  const user = data.users.find((u) => {
    const matchPhone = cleanPhone && u.phone && phoneMatches(cleanPhone, u.phone);
    const matchEmail = u.email && u.email.toLowerCase() === cleanEmail;
    return matchPhone || matchEmail;
  });

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "Incorrect mobile/email or password." });
  }
  const token = jwt.sign({ sub: user.id }, SECRET, { expiresIn: "30d" });
  res.json({ token, user: publicUser(user) });
});


router.get("/me", requireAuth, (req, res) => {
  const data = read();
  const user = data.users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "Account not found." });
  res.json(publicUser(user));
});

router.put("/me", requireAuth, (req, res) => {
  const { clinic, notes, name, role, language, email } = req.body || {};
  const data = read();
  const user = data.users.find((u) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "Account not found." });
  if (typeof clinic === "string") user.clinic = clinic;
  if (typeof notes === "string") user.notes = notes;
  if (typeof name === "string" && name.trim()) user.name = name.trim();
  if (typeof role === "string" && VALID_ROLES.includes(role)) user.role = role;
  if (typeof language === "string" && language.trim()) user.language = language;
  if (typeof email === "string") user.email = email.trim().toLowerCase();
  write(data);
  res.json(publicUser(user));
});


// In-memory OTP storage: phone -> { otp, expiresAt }
const otpStore = new Map();

async function sendMsg91Otp(phone, otp) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey) {
    console.log(`[CardioPulse OTP] MSG91_AUTH_KEY not configured in backend/.env. Simulated OTP: ${otp} for ${phone}`);
    return { sent: false, simulated: true };
  }

  // Ensure country code (defaults to 91 for India if 10-digit number is provided)
  let formattedPhone = phone;
  if (formattedPhone.length === 10) {
    formattedPhone = `91${formattedPhone}`;
  }

  try {
    let url = "";
    let options = {};

    if (templateId) {
      // MSG91 Send OTP API with Template
      url = `https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${formattedPhone}&authkey=${authKey}&otp=${otp}`;
      options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      };
    } else {
      // MSG91 Standard Send OTP API
      url = `https://control.msg91.com/api/v5/otp?mobile=${formattedPhone}&authkey=${authKey}&otp=${otp}`;
      options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      };
    }

    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    console.log(`[CardioPulse MSG91 Response]:`, data);
    return { sent: response.ok, data };
  } catch (err) {
    console.error(`[CardioPulse MSG91 Error]:`, err.message);
    return { sent: false, error: err.message };
  }
}

router.post("/forgot-password/request-otp", async (req, res) => {
  const { phone } = req.body || {};
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required." });
  }
  const cleanPhone = String(phone).replace(/\D/g, "");
  const data = read();
  const user = data.users.find((u) => u.phone && phoneMatches(cleanPhone, u.phone));
  if (!user) {
    return res.status(404).json({ error: "No account found with this phone number." });
  }

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

  otpStore.set(cleanPhone, { otp, expiresAt, userId: user.id });
  if (user.phone && user.phone !== cleanPhone) {
    otpStore.set(user.phone, { otp, expiresAt, userId: user.id });
  }

  console.log(`[CardioPulse OTP] Generated OTP for ${cleanPhone}: ${otp}`);

  // Send real SMS via MSG91
  const smsResult = await sendMsg91Otp(user.phone || cleanPhone, otp);

  res.json({
    ok: true,
    message: smsResult.sent
      ? "OTP sent successfully to your mobile number via SMS."
      : "OTP generated. (Check terminal/console or provide MSG91 keys in backend/.env)",
    smsSent: smsResult.sent,
    otp: process.env.MSG91_AUTH_KEY ? undefined : otp, // only expose OTP in demo mode when no real SMS API key is configured
  });
});


router.post("/forgot-password/reset", (req, res) => {
  const { phone, otp, newPassword } = req.body || {};
  if (!phone || !otp || !newPassword) {
    return res.status(400).json({ error: "Phone, OTP and new password are required." });
  }
  const cleanPhone = String(phone).replace(/\D/g, "");
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const data = read();
  const user = data.users.find((u) => u.phone && phoneMatches(cleanPhone, u.phone));
  const record = otpStore.get(cleanPhone) || (user && user.phone ? otpStore.get(user.phone) : null);
  if (!record) {
    return res.status(400).json({ error: "No OTP was requested or it has expired. Please request a new one." });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanPhone);
    if (user && user.phone) otpStore.delete(user.phone);
    return res.status(400).json({ error: "OTP has expired. Please request a new one." });
  }

  if (String(record.otp).trim() !== String(otp).trim()) {
    return res.status(400).json({ error: "Invalid OTP code entered." });
  }

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  write(data);
  otpStore.delete(cleanPhone);
  if (user.phone) otpStore.delete(user.phone);

  res.json({ ok: true, message: "Password has been reset successfully. You can now log in." });
});

module.exports = router;

