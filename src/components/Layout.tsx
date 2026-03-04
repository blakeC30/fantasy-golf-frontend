/**
 * Layout — shared navigation shell + auth guard.
 *
 * Wraps every authenticated page. Redirects to /login if there is no token
 * and bootstrapping is complete (i.e. the silent refresh already failed).
 * Shows a loading screen while the refresh attempt is still in flight.
 */

import { Link, Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useLeagueMembers } from "../hooks/useLeague";

export function Layout() {
  const { token, user, bootstrapping, logout } = useAuth();
  const { leagueId } = useParams<{ leagueId?: string }>();
  const location = useLocation();

  const { data: leagueMembers } = useLeagueMembers(leagueId ?? "");
  const isManager = leagueMembers?.some(
    (m) => m.user_id === user?.id && m.role === "manager"
  ) ?? false;

  function isActive(path: string): boolean {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  }

  function navLink(to: string, label: string, exact = false) {
    const active = exact ? location.pathname === to : isActive(to);
    return (
      <Link
        to={to}
        className={`text-sm font-medium transition-colors pb-0.5 ${
          active
            ? "text-white border-b-2 border-green-300"
            : "text-green-200 hover:text-white"
        }`}
      >
        {label}
      </Link>
    );
  }

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-green-900 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to="/leagues"
            className="text-lg font-bold tracking-tight text-white hover:text-green-200 transition-colors"
          >
            ⛳ Fantasy Golf
          </Link>

          <nav className="flex items-center gap-5">
            {leagueId && (
              <>
                {navLink(`/leagues/${leagueId}`, "Dashboard", true)}
                {navLink(`/leagues/${leagueId}/picks`, "My Picks")}
                {navLink(`/leagues/${leagueId}/leaderboard`, "Leaderboard")}
                {isManager && navLink(`/leagues/${leagueId}/manage`, "Manage")}
              </>
            )}

            {user?.is_platform_admin && navLink("/admin", "Admin")}

            <span className="hidden sm:inline-flex items-center bg-green-800 text-green-100 text-sm px-3 py-1 rounded-full font-medium">
              {user?.display_name}
            </span>
            <button
              onClick={logout}
              className="text-sm text-green-300 hover:text-white border border-green-700 hover:border-green-400 px-3 py-1 rounded-lg transition-colors"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>

      <footer className="bg-green-950 border-t border-green-900 py-6">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-green-700">
          <span className="font-semibold text-green-500">⛳ Fantasy Golf</span>
          <span>© {new Date().getFullYear()} · Free to play</span>
          <Link to="/leagues" className="hover:text-green-400 transition-colors">
            My Leagues
          </Link>
        </div>
      </footer>
    </div>
  );
}
