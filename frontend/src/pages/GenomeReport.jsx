import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { projectApi } from "../api";
import GenomeRadarChart from "../components/GenomeRadarChart";
import ScoreBar from "../components/ScoreBar";

export default function GenomeReport() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [componentsText, setComponentsText] = useState("");
  const [voltage, setVoltage] = useState("");
  const [current, setCurrent] = useState("");
  const [diff, setDiff] = useState(null);
  const [previousScore, setPreviousScore] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const load = () => {
    projectApi
      .get(id)
      .then((p) => {
        setProject(p);
        setComponentsText(p.components.join(", "));
        setVoltage(p.voltage);
        setCurrent(p.current);
      })
      .catch(() => setError("Could not load report."));
  };

  useEffect(load, [id]);

  if (error) return <div className="max-w-4xl mx-auto mt-10 text-rose-600">{error}</div>;
  if (!project) return <div className="max-w-4xl mx-auto mt-10 text-slate-500 dark:text-slate-400">Loading...</div>;

  const { analysis, mlComparison } = project;
  const riskColor =
    analysis.risk.status === "HIGH" ? "text-rose-600" : analysis.risk.status === "MEDIUM" ? "text-amber-600" : "text-emerald-600";

  const handleReanalyze = async (e) => {
    e.preventDefault();
    const components = componentsText.split(",").map((c) => c.trim()).filter(Boolean);
    if (components.length === 0) return;
    setSaving(true);
    try {
      const result = await projectApi.reanalyze(project.id, { voltage, current, components });
      setProject(result.project);
      setDiff(result.diff);
      setPreviousScore(result.previousOverallScore);
      setEditing(false);
    } catch {
      setError("Could not re-analyze this circuit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4 pb-16">
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{project.projectName}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{project.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing((v) => !v)}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-md text-sm font-medium"
          >
            {editing ? "Cancel" : "Edit & Re-analyze"}
          </button>
          <a
            href={projectApi.pdfUrl(project.id)}
            className="bg-genome-600 hover:bg-genome-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            onClick={(e) => {
              e.preventDefault();
              downloadPdf(project.id, project.projectName);
            }}
          >
            Download PDF
          </a>
        </div>
      </div>

      {diff && previousScore !== null && (
        <div className="bg-genome-50 dark:bg-genome-900/20 border border-genome-200 dark:border-genome-800 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-genome-800 dark:text-genome-300 mb-2">
            Re-analysis complete: overall score {previousScore}% → {analysis.overallScore}%{" "}
            <span className={analysis.overallScore >= previousScore ? "text-emerald-600" : "text-rose-500"}>
              ({analysis.overallScore - previousScore >= 0 ? "+" : ""}{analysis.overallScore - previousScore})
            </span>
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(diff).map(([dim, delta]) => (
              delta !== 0 && (
                <span
                  key={dim}
                  className={`px-2 py-1 rounded-full ${delta > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"}`}
                >
                  {dim}: {delta > 0 ? "+" : ""}{delta}
                </span>
              )
            ))}
          </div>
        </div>
      )}

      {editing && (
        <form onSubmit={handleReanalyze} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Voltage (V)</label>
              <input className="mt-1 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-md px-3 py-2 text-sm" value={voltage} onChange={(e) => setVoltage(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Current (mA)</label>
              <input className="mt-1 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-md px-3 py-2 text-sm" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Components (comma-separated)</label>
            <textarea
              rows={3}
              className="mt-1 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-md px-3 py-2 text-sm font-mono"
              value={componentsText}
              onChange={(e) => setComponentsText(e.target.value)}
            />
          </div>
          <button disabled={saving} className="bg-genome-600 hover:bg-genome-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60">
            {saving ? "Re-analyzing..." : "Save & Re-analyze"}
          </button>
        </form>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center">
          <div className="text-5xl font-bold text-genome-700 dark:text-genome-400">{analysis.overallScore}%</div>
          <div className="text-slate-500 dark:text-slate-400 text-sm mt-1">Overall Genome Score</div>
          <div className={`mt-3 text-sm font-medium ${riskColor}`}>
            Risk: {analysis.risk.overallRisk}% ({analysis.risk.status})
          </div>
          {mlComparison && (
            <div className="mt-4 w-full border-t border-slate-100 dark:border-slate-700 pt-3 text-center">
              <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">Hybrid ML Prediction (for comparison)</div>
              <div className="text-xl font-semibold text-slate-600 dark:text-slate-300">{mlComparison.predicted}%</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{mlComparison.modelType}</div>
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <GenomeRadarChart genome={analysis.genome} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Genome Breakdown</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Click any dimension to see which rules produced its score.</p>
        {Object.entries(analysis.genome).map(([k, v]) => (
          <ScoreBar key={k} label={k} value={v} trace={analysis.trace?.[k] || []} />
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Risk Analysis</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <RiskItem label="Thermal" value={analysis.risk.thermalRisk} />
          <RiskItem label="Electrical" value={analysis.risk.electricalRisk} />
          <RiskItem label="Cost" value={analysis.risk.costRisk} />
          <RiskItem label="Manufacturing" value={analysis.risk.manufacturingRisk} />
          <RiskItem label="Repair" value={analysis.risk.repairRisk} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">AI Recommendations</h2>
        <ul className="space-y-4">
          {analysis.recommendations.map((r, i) => (
            <li key={i} className="border-l-4 border-genome-500 pl-3">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.issue}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">→ {r.recommendation}</p>
              {r.substitutes && r.substitutes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {r.substitutes.map((s, si) => (
                    <span key={si} className="text-xs bg-genome-50 dark:bg-genome-900/30 text-genome-700 dark:text-genome-300 px-2 py-1 rounded-full">
                      Suggested part: {s.name} (~${s.avgCost})
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Component Summary</h2>
        <div className="flex flex-wrap gap-2">
          {project.components.map((c, i) => (
            <span key={i} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-1 rounded-full">
              {c}
            </span>
          ))}
        </div>
      </div>

      {project.history && project.history.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"
          >
            Version History ({project.history.length}) {showHistory ? "▲" : "▼"}
          </button>
          {showHistory && (
            <div className="mt-4 space-y-3">
              {project.history.map((h, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-slate-500 dark:text-slate-400">{new Date(h.savedAt).toLocaleString()}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Score: {h.analysis.overallScore}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RiskItem({ label, value }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
      <div className="text-slate-500 dark:text-slate-400">{label}</div>
      <div className="font-semibold text-slate-800 dark:text-slate-100">{value}%</div>
    </div>
  );
}

async function downloadPdf(id, name) {
  const token = localStorage.getItem("token");
  const res = await fetch(`/api/projects/${id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name.replace(/\s+/g, "_")}_genome_report.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
