/**
 * LeagueCard — rich at-a-glance card for a single league.
 *
 * Fetches standings, membership, league tournaments, and the current user's
 * picks independently so each card loads progressively. React Query caches
 * all queries, so navigating back from a league page is instant.
 */

import { Link, useNavigate } from "react-router-dom";
import { type League, type LeagueTournamentOut } from "../api/endpoints";
import { fmtTournamentName } from "../utils";
import { useLeagueMembers, useLeagueTournaments } from "../hooks/useLeague";
import { useMyPicks, useStandings } from "../hooks/usePick";
import { useAuthStore } from "../store/authStore";

function formatDate(dateStr: string): string {
  // Append time to avoid UTC→local date shift on midnight boundaries.
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPurse(purse: number | null): string | null {
  if (purse === null) return null;
  if (purse >= 1_000_000) {
    const m = purse / 1_000_000;
    return `$${m % 1 === 0 ? m : m.toFixed(1)}M`;
  }
  return `$${Math.round(purse / 1000)}K`;
}

function activeTournament(tournaments: LeagueTournamentOut[]): LeagueTournamentOut | undefined {
  return (
    tournaments.find((t) => t.status === "in_progress") ??
    tournaments.find((t) => t.status === "scheduled")
  );
}

function rankStyle(rank: number): string {
  if (rank === 1) return "text-amber-500";
  if (rank === 2) return "text-slate-400";
  if (rank === 3) return "text-orange-400";
  return "text-gray-800";
}

function formatPoints(pts: number): string {
  return "$" + Math.round(pts).toLocaleString();
}

export function LeagueCard({ league }: { league: League }) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const { data: standings } = useStandings(league.id);
  const { data: members } = useLeagueMembers(league.id);
  const { data: tournaments } = useLeagueTournaments(league.id);
  const { data: myPicks } = useMyPicks(league.id);

  const myRow = standings?.rows.find((r) => r.user_id === currentUser?.id);
  const isManager = members?.find((m) => m.user_id === currentUser?.id)?.role === "manager";
  const memberCount = standings?.rows.length;

  const current = tournaments ? activeTournament(tournaments) : undefined;
  const myPickForCurrent = myPicks?.find((p) => p.tournament_id === current?.id);

  return (
    <Link
      to={`/leagues/${league.id}`}
      className="group flex flex-col bg-white rounded-2xl border border-gray-200 border-l-[5px] border-l-green-700 hover:border-l-green-500 hover:shadow-lg transition-all"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-green-800 transition-colors">
            {league.name}
          </h2>
          {isManager && (
            <span className="flex-shrink-0 mt-0.5 text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
              Manager
            </span>
          )}
        </div>
        {league.description && (
          <p className="text-sm text-gray-500 leading-relaxed mt-0.5">{league.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="border-t border-gray-100 px-5 py-3 grid grid-cols-3 gap-2">
        {/* Rank */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Rank
          </p>
          <p className={`text-2xl font-bold tabular-nums leading-none ${myRow ? rankStyle(myRow.rank) : "text-gray-200"}`}>
            {myRow ? (myRow.is_tied ? `T${myRow.rank}` : `${myRow.rank}`) : "—"}
          </p>
        </div>

        {/* Points */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Points
          </p>
          <p className="text-2xl font-bold tabular-nums leading-none text-gray-800">
            {myRow ? formatPoints(myRow.total_points) : "—"}
          </p>
        </div>

        {/* Members */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Members
          </p>
          <p className="text-2xl font-bold tabular-nums leading-none text-gray-800">
            {memberCount ?? "—"}
          </p>
        </div>
      </div>

      {/* Current / upcoming tournament */}
      <div className="border-t border-gray-100 px-5 py-3">
        {tournaments === undefined ? null : current ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-semibold text-gray-700 truncate">{fmtTournamentName(current.name)}</p>
                {current.effective_multiplier >= 2 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex-shrink-0">
                    {current.effective_multiplier}× MAJOR
                  </span>
                )}
                {current.effective_multiplier > 1 && current.effective_multiplier < 2 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 flex-shrink-0">
                    {current.effective_multiplier}× FEATURED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400">
                {formatDate(current.start_date)}–{formatDate(current.end_date)}
                {current.status === "in_progress" && (
                  <span className="ml-1.5 text-green-600 font-medium">Live</span>
                )}
                {formatPurse(current.purse_usd) && (
                  <span className="ml-1.5">{formatPurse(current.purse_usd)} purse</span>
                )}
              </p>
              {myPickForCurrent ? (
                <p className="text-[11px] text-green-700 font-medium mt-0.5">
                  ✓ {myPickForCurrent.golfer.name}
                </p>
              ) : current.status === "scheduled" ? (
                <p className="text-[11px] text-amber-600 mt-0.5">No pick yet</p>
              ) : (
                <p className="text-[11px] text-gray-400 mt-0.5">Pick window closed</p>
              )}
            </div>
            {!myPickForCurrent && current.status === "scheduled" && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/leagues/${league.id}/pick`);
                }}
                className="flex-shrink-0 text-xs font-semibold text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-md transition-colors"
              >
                Pick →
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No upcoming tournaments</p>
        )}
      </div>
    </Link>
  );
}
