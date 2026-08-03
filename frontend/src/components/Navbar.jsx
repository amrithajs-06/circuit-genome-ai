import { Link, useNavigate } from "react-router-dom";

export default function Navbar({ user, onLogout, darkMode, onToggleDark }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between transition-colors">
      <Link to="/" className="flex items-center gap-2 font-bold text-genome-700 dark:text-genome-400 text-lg">
        <span>🧬</span> Circuit Genome AI
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link to="/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-genome-700 dark:hover:text-genome-400">
              Dashboard
            </Link>
            <Link to="/upload" className="text-slate-600 dark:text-slate-300 hover:text-genome-700 dark:hover:text-genome-400">
              Upload Circuit
            </Link>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-slate-500 dark:text-slate-400">Hi, {user.name}</span>
            <button
              onClick={handleLogout}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-md"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-slate-600 dark:text-slate-300 hover:text-genome-700 dark:hover:text-genome-400">
              Login
            </Link>
            <Link
              to="/register"
              className="bg-genome-600 hover:bg-genome-700 text-white px-3 py-1.5 rounded-md"
            >
              Register
            </Link>
          </>
        )}
        <button
          onClick={onToggleDark}
          title="Toggle dark mode"
          className="text-lg leading-none w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
      </div>
    </nav>
  );
}
