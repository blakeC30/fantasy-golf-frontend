/**
 * MyPicks — season history of the current user's picks and points earned.
 */

import { Link, useParams } from "react-router-dom";
import { useMyPicks } from "../hooks/usePick";
import { useLeagueTournaments } from "../hooks/useLeague";
import { TournamentBadge } from "../components/TournamentBadge";
import { GolferAvatar } from "../components/GolferAvatar";
import { FlagIcon } from "../components/FlagIcon";
import { fmtTournamentName } from "../utils";

function formatPoints(pts: number | null): string {
  if (pts === null) return "—";
  if (pts >= 1_000_000) return `$${(pts / 1_000_000).toFixed(2)}M`;
  if (pts >= 1_000) return `$${(pts / 1_000).toFixed(1)}K`;
  return `$${pts.toLocaleString()}`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

export function MyPicks() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { data: picks, isLoading } = useMyPicks(leagueId!);
  const { data: leagueTournaments } = useLeagueTournaments(leagueId!);

  const nextTournament = leagueTournaments
    ?.filter((t) => t.status === "scheduled")
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

  const hasPickForNext = nextTournament
    ? picks?.some((p) => p.tournament_id === nextTournament.id)
    : false;

  const sorted = picks
    ?.slice()
    .sort((a, b) => a.tournament.start_date.localeCompare(b.tournament.start_date));

  const totalEarned = picks?.reduce((sum, p) => sum + (p.points_earned ?? 0), 0) ?? 0;

  // Tournaments that are locked for picks: completed, in progress, or start date already passed.
  const today = new Date().toISOString().slice(0, 10);
  const completedTournaments = leagueTournaments?.filter(
    (t) => t.status === "completed" || t.status === "in_progress" || t.start_date <= today
  ) ?? [];
  // Picks for which we have a final score
  const scoredPicks = picks?.filter((p) => p.points_earned !== null) ?? [];
  // Picks that earned money (made the cut)
  const cutsMade = scoredPicks.filter((p) => p.points_earned! > 0);
  // Picks submitted for completed tournaments (to measure submission rate)
  const submittedForCompleted = picks?.filter((p) =>
    completedTournaments.some((t) => t.id === p.tournament_id)
  ) ?? [];
  // Best single tournament
  const bestPick = scoredPicks.reduce<(typeof scoredPicks)[0] | null>(
    (best, p) => (best === null || p.points_earned! > best.points_earned! ? p : best),
    null
  );
  const avgEarnings = scoredPicks.length > 0 ? totalEarned / scoredPicks.length : null;
  const showStats = completedTournaments.length > 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-green-700">
            Season History
          </p>
          <h1 className="text-3xl font-bold text-gray-900">My Picks</h1>
        </div>
        <Link
          to={`/leagues/${leagueId}/pick`}
          className="inline-flex items-center gap-2 bg-green-800 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-colors"
        >
          {hasPickForNext ? "Change Pick" : "Make Pick"}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      {/* Season total */}
      {picks && picks.length > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-green-700 rounded-2xl p-6 text-white shadow-lg shadow-green-900/20">
          {/* Decorative blob */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-green-300 mb-2">
            Season Total
          </p>
          <p className="text-4xl font-extrabold tabular-nums">{formatPoints(totalEarned)}</p>
          <p className="text-sm text-green-300 mt-2">
            {picks.length} pick{picks.length !== 1 ? "s" : ""} submitted
          </p>
        </div>
      )}

      {/* Stats grid — only shown once at least one pick has been scored */}
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Pick Rate"
            value={completedTournaments.length > 0
              ? `${submittedForCompleted.length}/${completedTournaments.length}`
              : `${picks?.length ?? 0}`}
            sub={completedTournaments.length > 0
              ? `${Math.round((submittedForCompleted.length / completedTournaments.length) * 100)}% of tournaments`
              : "picks submitted"}
          />
          <StatCard
            label="Cuts Made"
            value={`${cutsMade.length}/${scoredPicks.length}`}
            sub={scoredPicks.length > 0 ? `${Math.round((cutsMade.length / scoredPicks.length) * 100)}% cut rate` : "no scored picks yet"}
          />
          <StatCard
            label="Best Pick"
            value={formatPoints(bestPick?.points_earned ?? null)}
            sub={bestPick?.golfer.name}
          />
          <StatCard
            label="Avg per Start"
            value={formatPoints(avgEarnings !== null ? Math.round(avgEarnings) : null)}
            sub="per scored tournament"
          />
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-400">Loading…</p>
      ) : sorted && sorted.length > 0 ? (
        <div className="space-y-3">
          {sorted.map((pick) => (
            <div
              key={pick.id}
              className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4 hover:shadow-sm transition-all"
            >
              <div className="space-y-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{fmtTournamentName(pick.tournament.name)}</p>
                <TournamentBadge tournament={pick.tournament} showDates />
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <GolferAvatar
                  pgaTourId={pick.golfer.pga_tour_id}
                  name={pick.golfer.name}
                  className="w-9 h-9"
                />
                <div className="text-right space-y-0.5">
                <p className="text-sm font-medium text-gray-600">{pick.golfer.name}</p>
                <p
                  className={`text-lg font-bold tabular-nums ${
                    pick.points_earned === null
                      ? "text-gray-300"
                      : pick.points_earned > 0
                      ? "text-green-700"
                      : "text-red-500"
                  }`}
                >
                  {formatPoints(pick.points_earned)}
                </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center mx-auto">
            <FlagIcon className="w-6 h-6" />
          </div>
          <p className="font-semibold text-gray-700">No picks yet this season</p>
          <p className="text-sm text-gray-400">Make your first pick for an upcoming tournament.</p>
          <Link
            to={`/leagues/${leagueId}/pick`}
            className="inline-block text-sm font-semibold text-green-700 hover:text-green-900 mt-2 transition-colors"
          >
            Make your first pick →
          </Link>
        </div>
      )}
    </div>
  );
}
