const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { analyzeCircuit, LIBRARY } = require("../utils/genomeEngine");
const { predictScore } = require("../utils/mlEngine");
const { generateProjectPDF } = require("../utils/pdfReport");

const router = express.Router();
router.use(requireAuth);

function runFullAnalysis({ voltage, current, components, application }) {
  const analysis = analyzeCircuit({ voltage, current, components, application });
  const mlComparison = predictScore({ voltage, current, components });
  return { analysis, mlComparison };
}

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

  const { analysis, mlComparison } = runFullAnalysis({ voltage, current, components, application });

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
    mlComparison,
    genomeScore: analysis.overallScore,
    riskScore: analysis.risk.overallRisk,
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString(),
    history: [], // previous versions, most recent first
  };

  const projects = db.getProjects();
  projects.push(project);
  db.saveProjects(projects);

  res.status(201).json(project);
});

// PUT /api/projects/:id/reanalyze - update circuit inputs, archive the
// previous version into history, and return the new analysis + a score diff
// against the immediately preceding version (drives the "before/after" UI).
router.put("/:id/reanalyze", (req, res) => {
  const projects = db.getProjects();
  const idx = projects.findIndex((p) => p.id === req.params.id && p.userId === req.userId);
  if (idx === -1) return res.status(404).json({ message: "Project not found." });

  const project = projects[idx];
  const { description, application, voltage, current, components } = req.body;

  if (!Array.isArray(components) || components.length === 0) {
    return res.status(400).json({ message: "A non-empty components list is required." });
  }

  // Archive current state before overwriting it.
  const snapshot = {
    voltage: project.voltage,
    current: project.current,
    components: project.components,
    analysis: project.analysis,
    mlComparison: project.mlComparison,
    savedAt: project.updatedDate || project.createdDate,
  };
  project.history = [snapshot, ...(project.history || [])].slice(0, 20); // keep last 20

  const { analysis, mlComparison } = runFullAnalysis({
    voltage, current, components, application: application ?? project.application,
  });

  const previousGenome = snapshot.analysis.genome;
  const diff = Object.fromEntries(
    Object.entries(analysis.genome).map(([dim, val]) => [dim, val - (previousGenome[dim] ?? val)])
  );

  project.description = description ?? project.description;
  project.application = application ?? project.application;
  project.voltage = Number(voltage) || 0;
  project.current = Number(current) || 0;
  project.components = components;
  project.analysis = analysis;
  project.mlComparison = mlComparison;
  project.genomeScore = analysis.overallScore;
  project.riskScore = analysis.risk.overallRisk;
  project.updatedDate = new Date().toISOString();

  projects[idx] = project;
  db.saveProjects(projects);

  res.json({ project, diff, previousOverallScore: snapshot.analysis.overallScore });
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
