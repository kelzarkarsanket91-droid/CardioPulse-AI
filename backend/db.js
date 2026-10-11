// Tiny synchronous JSON-file "database". No native modules, nothing to compile.
// Perfect for a student project running on Windows/Mac/Linux without extra tooling.
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data", "db.json");

function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const seed = { users: [], patients: [], sessions: [], reports: [], _seq: 1 };
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
  }
}

function read() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function write(data) {
  ensureDb();
  const backupPath = `${DB_PATH}.bak`;
  if (fs.existsSync(DB_PATH)) fs.copyFileSync(DB_PATH, backupPath);
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function nextId(data) {
  const usedIds = new Set(
    [...data.users, ...data.patients, ...data.sessions, ...data.reports].map((item) => String(item.id))
  );
  let id = Number(data._seq) || 1;
  while (usedIds.has(String(id))) id += 1;
  data._seq = id + 1;
  return String(id);
}

module.exports = { read, write, nextId };
