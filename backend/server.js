require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "circuit-genome-ai-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found." }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`Circuit Genome AI backend running on http://localhost:${PORT}`);
});
