const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { analyzeCircuit, LIBRARY } = require("../utils/genomeEngine");
const { generateProjectPDF } = require("../utils/pdfReport");

const router = express.Router();
router.use(requireAuth);

// GET /api/projects - list current user's projects
router.get("/", (req, res) => {
  const projects = db.getProjects().filter((p) => p.userId === req.userId);
  res.json(projects.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate)));
});

// GET /api/projects/library - known component library (for autocomplete)
router.get("/library", (_req, res) => {
  res.json(LIBRARY);
});

// GET /api/projects/:id
router.get("/:id", (req, res) => {
  const project = db.getProjects().find((p) => p.id === req.params.id && p.userId === req.userId);
  if (!project) return res.status(404).json({ message: "Project not found." });
  res.json(project);
});

// POST /api/projects - create + analyze a new project
router.post("/", (req, res) => {
  const { projectName, description, application, voltage, current, components } = req.body;

  if (!projectName || !Array.isArray(components) || components.length === 0) {
    return res.status(400).json({ message: "projectName and a non-empty components list are required." });
  }

  const analysis = analyzeCircuit({ voltage, current, components, application });

  const project = {
    id: uuidv4(),
    userId: req.userId,
    projectName,
    description: description || "",
    application: application || "",
    voltage: Number(voltage) || 0,
    current: Number(current) || 0,
    components,
    analysis,
    genomeScore: analysis.overallScore,
    riskScore: analysis.risk.overallRisk,
    createdDate: new Date().toISOString(),
  };

  const projects = db.getProjects();
  projects.push(project);
  db.saveProjects(projects);

  res.status(201).json(project);
});

// DELETE /api/projects/:id
router.delete("/:id", (req, res) => {
  const projects = db.getProjects();
  const idx = projects.findIndex((p) => p.id === req.params.id && p.userId === req.userId);
  if (idx === -1) return res.status(404).json({ message: "Project not found." });
  projects.splice(idx, 1);
  db.saveProjects(projects);
  res.status(204).end();
});

// GET /api/projects/:id/pdf - download PDF report
router.get("/:id/pdf", (req, res) => {
  const project = db.getProjects().find((p) => p.id === req.params.id && p.userId === req.userId);
  if (!project) return res.status(404).json({ message: "Project not found." });
  generateProjectPDF(project, res);
});

module.exports = router;
