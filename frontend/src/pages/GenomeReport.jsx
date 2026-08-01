import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { projectApi } from "../api";
import GenomeRadarChart from "../components/GenomeRadarChart";
import ScoreBar from "../components/ScoreBar";

export default function GenomeReport() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    projectApi.get(id).then(setProject).catch(() => setError("Could not load report."));
  }, [id]);

  if (error) return <div className="max-w-4xl mx-auto mt-10 text-rose-600">{error}</div>;
  if (!project) return <div className="max-w-4xl mx-auto mt-10 text-slate-500">Loading...</div>;

  const { analysis } = project;
  const riskColor =
    analysis.risk.status === "HIGH" ? "text-rose-600" : analysis.risk.status === "MEDIUM" ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4 pb-16">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{project.projectName}</h1>
          <p className="text-slate-500 text-sm">{project.description}</p>
        </div>
        <a
          href={projectApi.pdfUrl(project.id)}
          target="_blank"
          rel="noreferrer"
          className="bg-genome-600 hover:bg-genome-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          onClick={(e) => {
            // Attach auth token as query is not supported by <a>; use fetch+blob instead.
            e.preventDefault();
            downloadPdf(project.id, project.projectName);
          }}
        >
          Download PDF Report
        </a>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center">
          <div className="text-5xl font-bold text-genome-700">{analysis.overallScore}%</div>
          <div className="text-slate-500 text-sm mt-1">Overall Genome Score</div>
          <div className={`mt-3 text-sm font-medium ${riskColor}`}>
            Risk: {analysis.risk.overallRisk}% ({analysis.risk.status})
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <GenomeRadarChart genome={analysis.genome} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Genome Breakdown</h2>
        {Object.entries(analysis.genome).map(([k, v]) => (
          <ScoreBar key={k} label={k} value={v} />
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Risk Analysis</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <RiskItem label="Thermal" value={analysis.risk.thermalRisk} />
          <RiskItem label="Electrical" value={analysis.risk.electricalRisk} />
          <RiskItem label="Cost" value={analysis.risk.costRisk} />
          <RiskItem label="Manufacturing" value={analysis.risk.manufacturingRisk} />
          <RiskItem label="Repair" value={analysis.risk.repairRisk} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">AI Recommendations</h2>
        <ul className="space-y-3">
          {analysis.recommendations.map((r, i) => (
            <li key={i} className="border-l-4 border-genome-500 pl-3">
              <p className="text-sm font-medium text-slate-800">{r.issue}</p>
              <p className="text-sm text-slate-500">→ {r.recommendation}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Component Summary</h2>
        <div className="flex flex-wrap gap-2">
          {project.components.map((c, i) => (
            <span key={i} className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full">
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function RiskItem({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-slate-500">{label}</div>
      <div className="font-semibold text-slate-800">{value}%</div>
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
