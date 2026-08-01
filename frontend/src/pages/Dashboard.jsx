import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { projectApi } from "../api";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    projectApi
      .list()
      .then(setProjects)
      .catch(() => setError("Could not load projects."))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this project?")) return;
    await projectApi.remove(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Your Projects</h1>
        <Link
          to="/upload"
          className="bg-genome-600 hover:bg-genome-700 text-white px-4 py-2 rounded-md font-medium"
        >
          + New Project
        </Link>
      </div>

      {error && <div className="bg-rose-50 text-rose-600 text-sm p-3 rounded-md mb-4">{error}</div>}
      {loading && <p className="text-slate-500">Loading...</p>}

      {!loading && projects.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-500">
          No projects yet. Upload a circuit to generate your first Genome report.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <h2 className="font-semibold text-slate-800">{p.projectName}</h2>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  p.riskScore > 60
                    ? "bg-rose-50 text-rose-600"
                    : p.riskScore > 30
                    ? "bg-amber-50 text-amber-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                Risk {p.riskScore}%
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{p.description || "No description"}</p>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-2xl font-bold text-genome-700">{p.genomeScore}%</div>
              <div className="flex gap-3 text-sm">
                <Link to={`/report/${p.id}`} className="text-genome-600 font-medium">
                  View Report
                </Link>
                <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-rose-500">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
