import { useState } from "react";

export default function ScoreBar({ label, value, trace = [] }) {
  const [open, setOpen] = useState(false);
  const color =
    value >= 75 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="mb-3 relative">
      <div className="flex justify-between text-sm mb-1">
        <button
          onClick={() => setOpen((o) => !o)}
          className="font-medium text-slate-700 dark:text-slate-200 capitalize flex items-center gap-1 hover:text-genome-600 dark:hover:text-genome-400"
        >
          {label}
          {trace.length > 0 && (
            <span className="text-xs text-slate-400 border border-slate-300 dark:border-slate-600 rounded-full w-4 h-4 flex items-center justify-center">
              ?
            </span>
          )}
        </button>
        <span className="text-slate-500 dark:text-slate-400">{value}%</span>
      </div>
      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>

      {open && trace.length > 0 && (
        <div className="mt-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-xs space-y-1.5">
          <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">Why this score?</p>
          {trace.map((t, i) => (
            <div key={i} className="flex gap-2">
              <span
                className={`font-mono shrink-0 w-10 text-right ${
                  t.delta > 0 ? "text-emerald-600" : t.delta < 0 ? "text-rose-500" : "text-slate-400"
                }`}
              >
                {t.delta > 0 ? `+${t.delta}` : t.delta}
              </span>
              <span className="text-slate-600 dark:text-slate-300">{t.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
