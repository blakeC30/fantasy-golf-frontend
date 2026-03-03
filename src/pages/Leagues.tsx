/**
 * Leagues — post-login landing page.
 *
 * Shows all leagues the user belongs to, plus an option to create a new one.
 * Joining a league is done via an invite link shared by the league manager.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LeagueCard } from "../components/LeagueCard";
import { useMyLeagues, useCreateLeague, useMyRequests, useCancelMyRequest } from "../hooks/useLeague";

export function Leagues() {
  const navigate = useNavigate();
  const { data: leagues, isLoading } = useMyLeagues();
  const { data: pendingRequests } = useMyRequests();
  const createLeague = useCreateLeague();
  const cancelRequest = useCancelMyRequest();

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    try {
      const league = await createLeague.mutateAsync({ name: createName });
      navigate(`/leagues/${league.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setCreateError(msg ?? "Failed to create league.");
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Your Leagues</h1>

      {/* League list */}
      {isLoading ? (
        <p className="text-gray-400">Loading…</p>
      ) : leagues && leagues.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {leagues.map((l) => (
            <LeagueCard key={l.id} league={l} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">You haven't joined any leagues yet.</p>
      )}

      {/* Pending join requests */}
      {pendingRequests && pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Pending Requests</h2>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {pendingRequests.map((req) => (
              <div key={String(req.league_id)} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{req.league_name}</p>
                  {req.league_description && (
                    <p className="text-xs text-gray-400 truncate">{req.league_description}</p>
                  )}
                </div>
                <span className="flex-shrink-0 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  Pending approval
                </span>
                <button
                  onClick={() => cancelRequest.mutate(String(req.league_id))}
                  disabled={cancelRequest.isPending}
                  className="flex-shrink-0 text-xs text-red-500 hover:underline disabled:opacity-40"
                >
                  Withdraw
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Join */}
      <div className="grid gap-6 sm:grid-cols-2 pt-4 border-t border-gray-200">
        {/* Create */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Create a league</h2>
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="text-sm text-green-700 font-medium hover:underline"
            >
              + New league
            </button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-2">
              <input
                type="text"
                placeholder="League name"
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {createError && <p className="text-xs text-red-600">{createError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createLeague.isPending}
                  className="flex-1 bg-green-800 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold py-2 rounded-lg"
                >
                  {createLeague.isPending ? "Creating…" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Join */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Join a league</h2>
          <p className="text-sm text-gray-500">
            Ask a league manager to share their invite link with you. The link will
            look like <span className="font-mono text-gray-700">/join/…</span> and
            will submit a join request directly.
          </p>
        </div>
      </div>
    </div>
  );
}
