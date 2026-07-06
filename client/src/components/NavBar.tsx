import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

export function NavBar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="border-b border-line bg-paper sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent inline-block" />
          <span className="font-display text-lg tracking-tight text-ink">Archive</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-ink/70">
          <Link to="/dashboard" className="hover:text-ink">Dashboard</Link>
          <Link to="/workspaces" className="hover:text-ink">Workspaces</Link>
          <button onClick={handleLogout} className="hover:text-rust">Log out</button>
        </nav>
      </div>
    </header>
  );
}
