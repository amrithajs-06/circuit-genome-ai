import { Link, useNavigate } from "react-router-dom";

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 font-bold text-genome-700 text-lg">
        <span>🧬</span> Circuit Genome AI
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link to="/dashboard" className="text-slate-600 hover:text-genome-700">Dashboard</Link>
            <Link to="/upload" className="text-slate-600 hover:text-genome-700">Upload Circuit</Link>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">Hi, {user.name}</span>
            <button
              onClick={handleLogout}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-slate-600 hover:text-genome-700">Login</Link>
            <Link
              to="/register"
              className="bg-genome-600 hover:bg-genome-700 text-white px-3 py-1.5 rounded-md"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
