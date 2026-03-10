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
  const sign = pts < 0 ? "-" : "";
  const abs = Math.abs(pts);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
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
      className="group flex flex-col bg-white rounded-2xl border border-gray-200 hover:border-green-400 shadow-sm hover:shadow-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
    >
      {/* Gradient header */}
      <div className="bg-gradient-to-br from-green-900 to-green-700 px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="font-bold text-white text-xl leading-tight">
            {league.name}
          </h2>
          {isManager && (
            <span className="flex-shrink-0 mt-0.5 text-xs font-semibold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
              Manager
            </span>
          )}
        </div>
        {league.description && (
          <p className="text-sm text-green-200 leading-relaxed mt-0.5 line-clamp-2">
            {league.description}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="px-5 py-4 grid grid-cols-3 divide-x divide-gray-100">
        <div className="pr-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Rank</p>
          <p className={`text-2xl font-bold tabular-nums leading-none ${myRow ? rankStyle(myRow.rank) : "text-gray-200"}`}>
            {myRow ? (myRow.is_tied ? `T${myRow.rank}` : `${myRow.rank}`) : "—"}
          </p>
        </div>
        <div className="px-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Points</p>
          <p className="text-xl font-bold tabular-nums leading-none text-gray-800 truncate">
            {myRow ? formatPoints(myRow.total_points) : "—"}
          </p>
        </div>
        <div className="pl-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Members</p>
          <p className="text-2xl font-bold tabular-nums leading-none text-gray-800">
            {memberCount ?? "—"}
          </p>
        </div>
      </div>

      {/* Tournament section */}
      <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
        {tournaments === undefined ? null : current ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                <p className="text-xs font-semibold text-gray-700 truncate">{fmtTournamentName(current.name)}</p>
                {current.effective_multiplier >= 2 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex-shrink-0">
                    {current.effective_multiplier}× MAJOR
                  </span>
                )}
                {current.effective_multiplier > 1 && current.effective_multiplier < 2 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 flex-shrink-0">
                    {current.effective_multiplier}×
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {formatDate(current.start_date)}–{formatDate(current.end_date)}
                {current.status === "in_progress" && (
                  <span className="ml-1.5 text-green-600 font-semibold">· Live</span>
                )}
                {formatPurse(current.purse_usd) && (
                  <span className="ml-1.5">· {formatPurse(current.purse_usd)} purse</span>
                )}
              </p>
              {myPickForCurrent ? (
                <p className="text-[11px] text-green-700 font-medium mt-0.5 flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {myPickForCurrent.golfer.name}
                </p>
              ) : current.status === "scheduled" ? (
                <p className="text-[11px] text-amber-600 font-medium mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 inline-block" />
                  No pick yet
                </p>
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
                className="flex-shrink-0 text-xs font-bold text-white bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors"
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
