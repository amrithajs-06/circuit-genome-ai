import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { projectApi } from "../api";

const EXAMPLE_COMPONENTS = "Arduino UNO, LM7805, ATmega328P, 220Ω, 10KΩ, LED, Relay, Capacitor";

export default function UploadProject() {
  const [form, setForm] = useState({
    projectName: "",
    description: "",
    application: "",
    voltage: "",
    current: "",
    componentsText: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fillExample = () => {
    setForm({
      projectName: "Relay Controller Module",
      description: "Arduino-based relay switching module for home automation.",
      application: "Home Automation",
      voltage: "12",
      current: "500",
      componentsText: EXAMPLE_COMPONENTS,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const components = form.componentsText
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    if (components.length === 0) {
      setError("Please list at least one component.");
      return;
    }

    setLoading(true);
    try {
      const project = await projectApi.create({
        projectName: form.projectName,
        description: form.description,
        application: form.application,
        voltage: form.voltage,
        current: form.current,
        components,
      });
      navigate(`/report/${project.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not analyze this project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Upload Circuit</h1>
        <button onClick={fillExample} className="text-sm text-genome-600 font-medium">
          Fill example
        </button>
      </div>

      {error && <div className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-sm p-3 rounded-md mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Project Name</label>
          <input
            required
            className="mt-1 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-md px-3 py-2"
            value={form.projectName}
            onChange={(e) => setForm({ ...form, projectName: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
          <textarea
            className="mt-1 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-md px-3 py-2"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Application</label>
          <input
            className="mt-1 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-md px-3 py-2"
            placeholder="e.g. Home Automation, IoT Sensor Node"
            value={form.application}
            onChange={(e) => setForm({ ...form, application: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Voltage (V)</label>
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-md px-3 py-2"
              value={form.voltage}
              onChange={(e) => setForm({ ...form, voltage: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Current (mA)</label>
            <input
              type="number"
              step="1"
              className="mt-1 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-md px-3 py-2"
              value={form.current}
              onChange={(e) => setForm({ ...form, current: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Component List (comma-separated)</label>
          <textarea
            required
            rows={4}
            className="mt-1 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-md px-3 py-2 font-mono text-sm"
            placeholder={EXAMPLE_COMPONENTS}
            value={form.componentsText}
            onChange={(e) => setForm({ ...form, componentsText: e.target.value })}
          />
        </div>
        <button
          disabled={loading}
          className="w-full bg-genome-600 hover:bg-genome-700 text-white font-medium py-2.5 rounded-md disabled:opacity-60"
        >
          {loading ? "Analyzing..." : "Generate Circuit Genome"}
        </button>
      </form>
    </div>
  );
}
