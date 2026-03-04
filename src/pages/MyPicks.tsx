/**
 * MyPicks — season history of the current user's picks and points earned.
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMyPicks } from "../hooks/usePick";
import { useLeague, useLeagueTournaments } from "../hooks/useLeague";
import { TournamentBadge } from "../components/TournamentBadge";
import { GolferAvatar } from "../components/GolferAvatar";
import { FlagIcon } from "../components/FlagIcon";
import { fmtTournamentName } from "../utils";

function formatPoints(pts: number | null): string {
  if (pts === null) return "—";
  const sign = pts < 0 ? "-" : "";
  const abs = Math.abs(pts);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString()}`;
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

type SortField = "date" | "tournament" | "golfer" | "points";
type SortDir = "asc" | "desc";

function SortButton({ label, active, dir, onClick }: {
  label: string; active: boolean; dir: SortDir; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors ${
        active ? "text-green-700" : "text-gray-400 hover:text-gray-700"
      }`}
    >
      {label}
      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        {active && dir === "asc" ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
        ) : active && dir === "desc" ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
        )}
      </svg>
    </button>
  );
}

export function MyPicks() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { data: picks, isLoading } = useMyPicks(leagueId!);
  const { data: leagueTournaments } = useLeagueTournaments(leagueId!);
  const { data: league } = useLeague(leagueId!);

  const nextTournament = leagueTournaments
    ?.filter((t) => t.status === "scheduled")
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

  const hasPickForNext = nextTournament
    ? picks?.some((p) => p.tournament_id === nextTournament.id)
    : false;

  // Map submitted picks by tournament id for quick lookup
  const picksByTournamentId = new Map(picks?.map((p) => [p.tournament_id, p]) ?? []);

  // Tournaments that are locked for picks: completed, in progress, or start date already passed.
  const today = new Date().toISOString().slice(0, 10);
  const completedTournaments = leagueTournaments?.filter(
    (t) => t.status === "completed" || t.status === "in_progress" || t.start_date <= today
  ) ?? [];

  // Fully finished tournaments with no pick submitted — penalty applies to these.
  const noPickCompletedCount = completedTournaments.filter(
    (t) => t.status === "completed" && !picks?.some((p) => p.tournament_id === t.id)
  ).length;
  const penaltyTotal = noPickCompletedCount * (league?.no_pick_penalty ?? 0);

  const totalEarned =
    (picks?.reduce((sum, p) => sum + (p.points_earned ?? 0), 0) ?? 0) + penaltyTotal;
  // Picks for which we have a final score
  const scoredPicks = picks?.filter((p) => p.points_earned !== null) ?? [];
  // Picks that earned money (made the cut)
  const cutsMade = scoredPicks.filter((p) => p.points_earned! > 0);
  // Picks that earned $0 (missed the cut)
  const cutsMissed = scoredPicks.filter((p) => p.points_earned === 0);
  // Picks submitted for completed tournaments (to measure submission rate)
  const submittedForCompleted = picks?.filter((p) =>
    completedTournaments.some((t) => t.id === p.tournament_id)
  ) ?? [];
  // Best single tournament
  const bestPick = scoredPicks.reduce<(typeof scoredPicks)[0] | null>(
    (best, p) => (best === null || p.points_earned! > best.points_earned! ? p : best),
    null
  );
  const finalTournamentCount = completedTournaments.filter((t) => t.status === "completed").length;
  const avgEarnings = finalTournamentCount > 0 ? totalEarned / finalTournamentCount : null;
  const showStats = completedTournaments.length > 0;

  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "points" ? "desc" : field === "date" ? "desc" : "asc");
    }
  }

  // Unified history: all locked tournaments (with pick if exists) + future submitted picks
  const historyRows = [
    ...completedTournaments.map((t) => ({
      key: `t-${t.id}`,
      tournament: t,
      pick: picksByTournamentId.get(t.id) ?? null,
    })),
    // Picks for upcoming tournaments not yet in the locked list
    ...(picks ?? [])
      .filter((p) => !completedTournaments.some((t) => t.id === p.tournament_id))
      .map((p) => ({ key: `p-${p.id}`, tournament: p.tournament, pick: p })),
  ].sort((a, b) => {
    let cmp = 0;
    if (sortField === "date") {
      cmp = a.tournament.start_date.localeCompare(b.tournament.start_date);
    } else if (sortField === "tournament") {
      cmp = a.tournament.name.localeCompare(b.tournament.name);
    } else if (sortField === "golfer") {
      const aName = a.pick?.golfer.name ?? "\uffff"; // no-pick sorts last
      const bName = b.pick?.golfer.name ?? "\uffff";
      cmp = aName.localeCompare(bName);
    } else if (sortField === "points") {
      const penalty = league?.no_pick_penalty ?? 0;
      const noPick = (row: typeof a) =>
        !row.pick && row.tournament.status === "completed" ? penalty : (row.pick?.points_earned ?? 0);
      cmp = noPick(a) - noPick(b);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

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
          <p className="text-4xl font-extrabold tabular-nums">
            {totalEarned < 0 ? "-" : ""}${Math.round(Math.abs(totalEarned)).toLocaleString()}
          </p>
        </div>
      )}

      {/* Stats grid — only shown once at least one pick has been scored */}
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Pick Rate"
            value={(() => {
              const total = completedTournaments.length + (nextTournament ? 1 : 0);
              const submitted = submittedForCompleted.length + (hasPickForNext ? 1 : 0);
              return total > 0 ? `${Math.round((submitted / total) * 100)}%` : "—";
            })()}
            sub={(() => {
              const total = completedTournaments.length + (nextTournament ? 1 : 0);
              const submitted = submittedForCompleted.length + (hasPickForNext ? 1 : 0);
              return total > 0 ? `${submitted} / ${total} tournaments` : undefined;
            })()}
          />
          <StatCard
            label="Cuts Missed"
            value={finalTournamentCount > 0 ? `${Math.round((cutsMissed.length / finalTournamentCount) * 100)}%` : "—"}
            sub={`${cutsMissed.length} / ${finalTournamentCount} tournaments`}
          />
          <StatCard
            label="Best Pick"
            value={formatPoints(bestPick?.points_earned ?? null)}
            sub={bestPick?.golfer.name}
          />
          <StatCard
            label="Avg Points"
            value={formatPoints(avgEarnings !== null ? Math.round(avgEarnings) : null)}
          />
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-400">Loading…</p>
      ) : historyRows.length > 0 ? (
        <div className="space-y-2">
          {/* Sort controls */}
          <div className="flex items-center justify-between px-1 pb-1 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <SortButton label="Date" active={sortField === "date"} dir={sortDir} onClick={() => handleSort("date")} />
              <SortButton label="Tournament" active={sortField === "tournament"} dir={sortDir} onClick={() => handleSort("tournament")} />
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <SortButton label="Golfer" active={sortField === "golfer"} dir={sortDir} onClick={() => handleSort("golfer")} />
              <SortButton label="Points" active={sortField === "points"} dir={sortDir} onClick={() => handleSort("points")} />
            </div>
          </div>

          {historyRows.map(({ key, tournament, pick }) => (
            <div
              key={key}
              className={`bg-white border rounded-xl p-5 flex items-center justify-between gap-4 hover:shadow-sm transition-all ${
                !pick && completedTournaments.some((t) => t.id === tournament.id)
                  ? "border-red-100"
                  : "border-gray-200"
              }`}
            >
              <div className="space-y-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{fmtTournamentName(tournament.name)}</p>
                <TournamentBadge tournament={tournament} showDates />
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {pick ? (() => {
                  const multiplier = "effective_multiplier" in tournament
                    ? (tournament as { effective_multiplier: number }).effective_multiplier
                    : 1;
                  // points_earned is the authoritative value (matches standings/totals).
                  const displayPoints = pick.points_earned;
                  const missedCut = displayPoints === 0 && tournament.status === "completed";
                  const showBreakdown = multiplier > 1 && pick.earnings_usd !== null && pick.earnings_usd > 0;
                  return (
                    <>
                      <GolferAvatar
                        pgaTourId={pick.golfer.pga_tour_id}
                        name={pick.golfer.name}
                        className="w-9 h-9"
                      />
                      <div className="text-right space-y-0.5">
                        <p className="text-sm font-medium text-gray-600">{pick.golfer.name}</p>
                        <p
                          className={`text-lg font-bold leading-tight ${
                            displayPoints === null
                              ? "text-gray-300"
                              : missedCut
                              ? "text-gray-400"
                              : displayPoints > 0
                              ? "text-green-700 tabular-nums"
                              : "text-red-500 tabular-nums"
                          }`}
                        >
                          {missedCut ? "Missed Cut" : formatPoints(displayPoints)}
                        </p>
                        {showBreakdown && (
                          <p className="text-xs text-gray-400 tabular-nums leading-tight">
                            {formatPoints(pick.earnings_usd)} · {multiplier}×
                          </p>
                        )}
                      </div>
                    </>
                  );
                })() : (
                  <div className="text-right space-y-0.5">
                    <p className="text-sm font-medium text-red-400">No pick</p>
                    {tournament.status === "completed" && league?.no_pick_penalty !== undefined ? (
                      <p className="text-lg font-bold text-red-500 tabular-nums">
                        {formatPoints(league.no_pick_penalty)}
                      </p>
                    ) : (
                      <p className="text-lg font-bold text-gray-300 tabular-nums">—</p>
                    )}
                  </div>
                )}
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
