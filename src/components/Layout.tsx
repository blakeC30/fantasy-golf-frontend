/**
 * Layout — shared navigation shell + auth guard.
 *
 * Wraps every authenticated page. Redirects to /login if there is no token
 * and bootstrapping is complete (i.e. the silent refresh already failed).
 * Shows a loading screen while the refresh attempt is still in flight.
 */

import { Link, Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useLeagueMembers } from "../hooks/useLeague";

export function Layout() {
  const { token, user, bootstrapping, logout } = useAuth();
  const { leagueId } = useParams<{ leagueId?: string }>();

  const { data: leagueMembers } = useLeagueMembers(leagueId ?? "");
  const isManager = leagueMembers?.some(
    (m) => m.user_id === user?.id && m.role === "manager"
  ) ?? false;

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
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/leagues" className="text-xl font-bold tracking-tight hover:text-green-200">
            ⛳ Fantasy Golf
          </Link>

          <nav className="flex items-center gap-5 text-sm font-medium">
            {leagueId && (
              <>
                <Link to={`/leagues/${leagueId}`} className="hover:text-green-200">
                  Dashboard
                </Link>
                <Link to={`/leagues/${leagueId}/picks`} className="hover:text-green-200">
                  My Picks
                </Link>
                <Link to={`/leagues/${leagueId}/leaderboard`} className="hover:text-green-200">
                  Leaderboard
                </Link>
                {isManager && (
                  <Link to={`/leagues/${leagueId}/manage`} className="hover:text-green-200">
                    Manage League
                  </Link>
                )}
              </>
            )}

            {user?.is_platform_admin && (
              <Link to="/admin" className="hover:text-green-200">
                Admin
              </Link>
            )}

            <span className="text-green-300 hidden sm:inline">
              {user?.display_name}
            </span>
            <button
              onClick={logout}
              className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-sm"
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

      <footer className="text-center text-xs text-gray-400 py-4">
        Fantasy Golf — {new Date().getFullYear()}
      </footer>
    </div>
  );
}
