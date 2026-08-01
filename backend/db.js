// Lightweight JSON-file "database" so the project runs with zero external
// services. Swap this module out for a real MongoDB/Mongoose layer later
// (see README) without touching route logic much.
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");

function ensureFile(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf-8");
}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  ensureFile(USERS_FILE);
  ensureFile(PROJECTS_FILE);
}

function readJSON(file) {
  ensureStore();
  const raw = fs.readFileSync(file, "utf-8");
  try {
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function writeJSON(file, data) {
  ensureStore();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = {
  getUsers: () => readJSON(USERS_FILE),
  saveUsers: (users) => writeJSON(USERS_FILE, users),
  getProjects: () => readJSON(PROJECTS_FILE),
  saveProjects: (projects) => writeJSON(PROJECTS_FILE, projects),
};
