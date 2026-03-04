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

  const [joinCode, setJoinCode] = useState("");

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    // Accept a full URL (e.g. https://…/join/abc123) or just the code itself.
    const raw = joinCode.trim();
    const code = raw.includes("/join/") ? raw.split("/join/").pop()! : raw;
    if (code) navigate(`/join/${code}`);
  }

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
      {/* Page header */}
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-green-700">
          Fantasy Golf
        </p>
        <h1 className="text-3xl font-bold text-gray-900">My Leagues</h1>
      </div>

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
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-10 text-center space-y-3">
          <div className="text-4xl">⛳</div>
          <p className="font-semibold text-gray-700">No leagues yet</p>
          <p className="text-sm text-gray-400">Create a league below or join one with an invite link.</p>
        </div>
      )}

      {/* Pending join requests */}
      {pendingRequests && pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-gray-800">Pending Requests</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden divide-y divide-amber-100">
            {pendingRequests.map((req) => (
              <div key={String(req.league_id)} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{req.league_name}</p>
                  {req.league_description && (
                    <p className="text-xs text-gray-400 truncate">{req.league_description}</p>
                  )}
                </div>
                <span className="flex-shrink-0 text-xs font-bold bg-amber-200 text-amber-800 px-2.5 py-1 rounded-full">
                  Pending approval
                </span>
                <button
                  onClick={() => cancelRequest.mutate(String(req.league_id))}
                  disabled={cancelRequest.isPending}
                  className="flex-shrink-0 text-xs font-medium text-red-500 hover:text-red-700 hover:underline disabled:opacity-40 transition-colors"
                >
                  Withdraw
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Join */}
      <div className="border-t border-gray-200 pt-8 space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">
          Join or create
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Create */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-green-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <h2 className="font-bold text-gray-900 mb-1">Create a league</h2>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Start your own league and invite friends with a shareable link.
            </p>
            {!showCreate ? (
              <button
                onClick={() => setShowCreate(true)}
                className="text-sm font-semibold text-green-700 hover:text-green-900 transition-colors"
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
                    className="flex-1 bg-green-800 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                  >
                    {createLeague.isPending ? "Creating…" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Join */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-green-200 transition-all">
            <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
            </div>
            <h2 className="font-bold text-gray-900 mb-1">Join a league</h2>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Paste an invite link from a league manager to request access.
            </p>
            <form onSubmit={handleJoin} className="space-y-2">
              <input
                type="text"
                placeholder="Paste invite link or code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="w-full bg-green-800 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
