# Circuit Genome AI

AI-based circuit quality & design analysis platform. Upload a circuit's component list, voltage,
and current, and get back a "Circuit Genome" — reliability, safety, power, complexity,
repairability, manufacturability and cost scores — plus rule-based recommendations and a
downloadable PDF report.

This is a working MVP matching the spec: **React + Tailwind + Chart.js** frontend and
**Node/Express + JWT** backend. Data is stored in simple JSON files (`backend/data/`) so the
whole thing runs locally with zero external services — swap in MongoDB later (see below) without
touching the route logic.

## Project structure

```
circuit-genome-ai/
  backend/          Express API (auth, genome engine, PDF reports)
  frontend/          React + Vite + Tailwind + Chart.js UI
```

## 1. Run it locally

### Backend

```bash
cd backend
npm install
cp .env.example .env      # edit JWT_SECRET to any long random string
npm run dev                # or: npm start
```

Runs on **http://localhost:5000**. Health check: `GET /api/health`.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Runs on **http://localhost:5173** and proxies `/api` calls to the backend automatically
(see `vite.config.js`).

Open http://localhost:5173, register an account, then click **Upload Circuit** →
**Fill example** to try it instantly.

## 2. Add-on features

Beyond the base MVP, this version adds:

- **Explainable scoring ("Why this score?")** — click any genome dimension on the report page to see the exact rule-by-rule trace (`analysis.trace`) that produced it, with each rule's point delta and reason.
- **Component substitution suggestions** — recommendations that involve swapping a part (e.g. LM7805 → Buck Converter) now include the actual suggested component(s) from the library, with estimated cost.
- **Re-analyze & version history** — click "Edit & Re-analyze" on a report to change voltage/current/components and get a fresh analysis. The previous version is archived automatically (`project.history`, last 20 kept), and a before/after score diff is shown immediately after re-analysis.
- **Hybrid ML comparison layer** (`backend/utils/mlEngine.js`) — a small, dependency-free ridge-regression model trained on synthetic data at server startup, run alongside the rule engine so every project shows both a rule-based score and an ML-predicted score for comparison. This is intentionally transparent (closed-form linear regression, not a black box) and is meant as a stepping stone toward the "future ML scoring" direction, not a replacement for the rule engine.
- **Dark mode** — toggle in the navbar, persisted to `localStorage`.

## 3. How the scoring works

`backend/utils/genomeEngine.js` is the rule engine described in the spec (Module 4/5/6). It:

- Classifies each component against `backend/data/componentLibrary.json`
- Flags issues (e.g. linear regulator + high current → recommend a buck converter; relay with
  no flyback diode → safety flag; too many resistors → recommend a resistor network)
- Produces per-category genome scores, an overall score, and a 5-factor risk breakdown

Extend it by editing that file's rules, or by adding more entries to `componentLibrary.json`.

## 4. Push this to GitHub

**First time (no repo yet):** create an empty repo on github.com (no README/gitignore, since you
already have one here), then from the `circuit-genome-ai` folder:

```bash
git init
git add .
git commit -m "Initial commit: Circuit Genome AI MVP"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

**Already have the repo and are pushing these add-ons as an update:**

```bash
git add .
git commit -m "Add explainability, component substitutions, version history, hybrid ML comparison, dark mode"
git push
```

If push is rejected with a 403/permission error, it usually means Windows/git has a *different*
GitHub account's credentials cached. Clear them via Control Panel → Credential Manager →
Windows Credentials → remove any `git:https://github.com` entry, then push again and log in as
the correct account (using a Personal Access Token as the password, not your GitHub password —
generate one at https://github.com/settings/tokens with the `repo` scope checked).

## 5. Deploying (optional)

- **Frontend**: `npm run build` in `frontend/` produces a static `dist/` folder — deploy to
  Vercel, Netlify, or GitHub Pages.
- **Backend**: deploy `backend/` to Render, Railway, or Fly.io. Set `JWT_SECRET` as an
  environment variable there. Note the JSON-file storage resets if the host's filesystem is
  ephemeral (e.g. some free tiers) — for production, migrate to MongoDB (see below).

## 6. Swapping in real MongoDB (future enhancement, per spec §11)

Replace `backend/db.js` with a Mongoose connection and models for `User` and `Project` matching
the schemas in the spec (§10). The route files (`routes/auth.js`, `routes/projects.js`) call
`db.getUsers()/saveUsers()/getProjects()/saveProjects()` — swap those four functions for Mongoose
queries and the rest of the app keeps working unchanged.

## Tech stack

- Frontend: React, React Router, Tailwind CSS, Chart.js (radar chart)
- Backend: Node.js, Express, JWT auth (bcryptjs + jsonwebtoken), PDFKit for reports
- Storage: JSON files by default (MVP), Mongoose/MongoDB-ready architecture
