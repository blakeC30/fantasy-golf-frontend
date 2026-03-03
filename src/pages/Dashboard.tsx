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
import { TournamentBadge } from "../components/TournamentBadge";

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
      {/* League title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{league?.name ?? "…"}</h1>
      </div>

      {/* Current tournament card */}
      {active ? (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {active.status === "in_progress" ? "In Progress" : "Up Next"}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-gray-900">{fmtTournamentName(active.name)}</h2>
                {active.effective_multiplier >= 2 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {active.effective_multiplier}× MAJOR
                  </span>
                )}
                {active.effective_multiplier > 1 && active.effective_multiplier < 2 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {active.effective_multiplier}× FEATURED
                  </span>
                )}
              </div>
              <TournamentBadge tournament={active} showDates />
            </div>

            {myPickForActive ? (
              <div className="text-right">
                <p className="text-xs text-gray-400">Your pick</p>
                <p className="font-semibold text-gray-900">{myPickForActive.golfer.name}</p>
                {myPickForActive.points_earned !== null ? (
                  <p className="text-sm text-green-700 font-medium">
                    ${myPickForActive.points_earned.toLocaleString()}
                  </p>
                ) : (
                  <Link
                    to={`/leagues/${leagueId}/pick`}
                    className="text-xs text-green-700 hover:underline"
                  >
                    Change pick →
                  </Link>
                )}
              </div>
            ) : (
              <Link
                to={`/leagues/${leagueId}/pick`}
                className="bg-green-800 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg whitespace-nowrap"
              >
                Make your pick →
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-400">
          No tournaments scheduled for this league yet. The league manager can configure the schedule in Manage League.
        </div>
      )}

      {/* Standings preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Standings</h2>
          <Link
            to={`/leagues/${leagueId}/leaderboard`}
            className="text-sm text-green-700 hover:underline"
          >
            View full leaderboard →
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
