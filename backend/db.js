// Tiny synchronous JSON-file "database". No native modules, nothing to compile.
// Perfect for a student project running on Windows/Mac/Linux without extra tooling.
const fs = require("fs");
const path = require("path");

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const LOCAL_DB_PATH = path.join(__dirname, "data", "db.json");
const DB_PATH = isServerless ? path.join("/tmp", "cardiopulse_db.json") : LOCAL_DB_PATH;

function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    if (isServerless && fs.existsSync(LOCAL_DB_PATH)) {
      // Seed /tmp database from repo data
      fs.copyFileSync(LOCAL_DB_PATH, DB_PATH);
    } else {
      const seed = { users: [], patients: [], sessions: [], reports: [], _seq: 1 };
      fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
    }
  }
}

function read() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function write(data) {
  ensureDb();
  const backupPath = `${DB_PATH}.bak`;
  try {
    if (fs.existsSync(DB_PATH)) fs.copyFileSync(DB_PATH, backupPath);
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Write error:", e.message);
  }
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
