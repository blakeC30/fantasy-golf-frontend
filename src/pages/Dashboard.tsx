/**
 * Dashboard — per-league home page.
 *
 * Shows: current/upcoming tournament, the user's pick for it, and a
 * standings preview (top 5).
 */

import { Link, useParams } from "react-router-dom";
import { useLeague, useLeagueTournaments } from "../hooks/useLeague";
import { fmtTournamentName } from "../utils";
import { useMyPicks, useStandings } from "../hooks/usePick";
import { StandingsTable } from "../components/StandingsTable";
import { GolferAvatar } from "../components/GolferAvatar";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPurse(purse: number | null): string | null {
  if (purse === null) return null;
  if (purse >= 1_000_000) {
    const m = purse / 1_000_000;
    return `$${m % 1 === 0 ? m : m.toFixed(1)}M purse`;
  }
  return `$${Math.round(purse / 1000)}K purse`;
}

export function Dashboard() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { data: league } = useLeague(leagueId!);
  const { data: tournaments } = useLeagueTournaments(leagueId!);
  const { data: myPicks } = useMyPicks(leagueId!);
  const { data: standings } = useStandings(leagueId!);

  // The "active" tournament is any in_progress one, or the nearest upcoming scheduled
  // one (smallest start_date in the future). The backend returns DESC order, so we
  // sort ASC here to find the soonest scheduled tournament, not the furthest.
  const nearestScheduled = tournaments
    ?.filter((t) => t.status === "scheduled")
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

  const active =
    tournaments?.find((t) => t.status === "in_progress") ?? nearestScheduled;

  const myPickForActive = myPicks?.find((p) => p.tournament_id === active?.id);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-green-700">
          League Dashboard
        </p>
        <h1 className="text-3xl font-bold text-gray-900">{league?.name ?? "…"}</h1>
      </div>

      {/* Current tournament card */}
      {active ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Gradient header band */}
          <div className="bg-gradient-to-r from-green-900 to-green-700 px-5 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-green-300">
                  {active.status === "in_progress" ? "Live Now" : "Up Next"}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-white leading-tight">
                    {fmtTournamentName(active.name)}
                  </h2>
                  {active.effective_multiplier >= 2 && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-400 text-amber-900">
                      {active.effective_multiplier}× MAJOR
                    </span>
                  )}
                  {active.effective_multiplier > 1 && active.effective_multiplier < 2 && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-200 text-blue-900">
                      {active.effective_multiplier}× FEATURED
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <span>{formatDate(active.start_date)}–{formatDate(active.end_date)}</span>
                  {formatPurse(active.purse_usd) && (
                    <>
                      <span className="text-white/30">·</span>
                      <span>{formatPurse(active.purse_usd)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card body — pick status */}
          <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            {myPickForActive ? (
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <GolferAvatar
                    pgaTourId={myPickForActive.golfer.pga_tour_id}
                    name={myPickForActive.golfer.name}
                    className="w-11 h-11"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Your pick</p>
                  <p className="text-base font-bold text-gray-900">{myPickForActive.golfer.name}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-amber-600 font-medium">No pick yet</p>
                  <p className="text-sm text-gray-500">Pick before the tournament begins</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              {myPickForActive ? (
                <>
                  {(() => {
                    const displayPoints = myPickForActive.points_earned;
                    return displayPoints !== null ? (
                      <span className="text-lg font-bold text-green-700">
                        ${Math.round(displayPoints).toLocaleString()}
                      </span>
                    ) : (
                      <Link
                        to={`/leagues/${leagueId}/pick`}
                        className="text-sm font-semibold text-green-700 hover:text-green-900 border border-green-200 hover:border-green-400 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Change pick →
                      </Link>
                    );
                  })()}
                </>
              ) : (
                <Link
                  to={`/leagues/${leagueId}/pick`}
                  className="inline-flex items-center gap-2 bg-green-800 hover:bg-green-700 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-sm transition-colors"
                >
                  Make your pick
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-200 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          </div>
          <p className="font-semibold text-gray-700">No tournaments scheduled</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            The league manager can configure the schedule in Manage League.
          </p>
        </div>
      )}

      {/* Standings preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Standings</h2>
          <Link
            to={`/leagues/${leagueId}/leaderboard`}
            className="text-sm font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-1.5 rounded-lg transition-colors"
          >
            Full leaderboard →
          </Link>
        </div>
        {standings ? (
          <StandingsTable rows={standings.rows} limit={5} />
        ) : (
          <p className="text-gray-400 text-sm">Loading standings…</p>
        )}
      </div>
    </div>
  );
}
