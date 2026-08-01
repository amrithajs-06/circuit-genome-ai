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

## 2. How the scoring works

`backend/utils/genomeEngine.js` is the rule engine described in the spec (Module 4/5/6). It:

- Classifies each component against `backend/data/componentLibrary.json`
- Flags issues (e.g. linear regulator + high current → recommend a buck converter; relay with
  no flyback diode → safety flag; too many resistors → recommend a resistor network)
- Produces per-category genome scores, an overall score, and a 5-factor risk breakdown

Extend it by editing that file's rules, or by adding more entries to `componentLibrary.json`.

## 3. Push this to GitHub

From the `circuit-genome-ai` folder:

```bash
git init
git add .
git commit -m "Initial commit: Circuit Genome AI MVP"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

If you don't have a repo yet: go to github.com → **New repository** → give it a name → **do not**
initialize with a README (you already have one) → create → then run the commands above with that
repo's URL (shown on the page after creation).

If you use SSH instead of HTTPS:
```bash
git remote add origin git@github.com:<your-username>/<your-repo-name>.git
```

## 4. Deploying (optional)

- **Frontend**: `npm run build` in `frontend/` produces a static `dist/` folder — deploy to
  Vercel, Netlify, or GitHub Pages.
- **Backend**: deploy `backend/` to Render, Railway, or Fly.io. Set `JWT_SECRET` as an
  environment variable there. Note the JSON-file storage resets if the host's filesystem is
  ephemeral (e.g. some free tiers) — for production, migrate to MongoDB (see below).

## 5. Swapping in real MongoDB (future enhancement, per spec §11)

Replace `backend/db.js` with a Mongoose connection and models for `User` and `Project` matching
the schemas in the spec (§10). The route files (`routes/auth.js`, `routes/projects.js`) call
`db.getUsers()/saveUsers()/getProjects()/saveProjects()` — swap those four functions for Mongoose
queries and the rest of the app keeps working unchanged.

## Tech stack

- Frontend: React, React Router, Tailwind CSS, Chart.js (radar chart)
- Backend: Node.js, Express, JWT auth (bcryptjs + jsonwebtoken), PDFKit for reports
- Storage: JSON files by default (MVP), Mongoose/MongoDB-ready architecture
