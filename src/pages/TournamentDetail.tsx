/**
 * TournamentDetail — full leaderboard for a single tournament with expandable
 * hole-by-hole scorecards.
 *
 * Route: /leagues/:leagueId/tournaments/:tournamentId
 * Accessible by clicking any in_progress or completed row on the MyPicks page.
 *
 * Column order (ESPN-style):
 *   Pos | Golfer | Score | R1 | R2 | R3 | R4 | [PO...] | [Earnings]
 *
 * - Score  = total score to par for the tournament (E, -10, +2)
 * - R1–R4  = score to par for that individual round; blank if not yet played
 * - PO     = playoff round columns, only when any golfer has round_number > 4
 * - Earnings = raw prize money in USD, only shown when tournament is completed
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMyPicks, useTournamentLeaderboard, useGolferScorecard } from "../hooks/usePick";
import { GolferAvatar } from "../components/GolferAvatar";
import { fmtTournamentName } from "../utils";
import type { LeaderboardEntry, HoleResult } from "../api/endpoints";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format score-to-par ESPN-style: negative = "-3", zero = "E", positive = "+1" */
function fmtStp(stp: number | null | undefined): string {
  if (stp === null || stp === undefined) return "";
  if (stp === 0) return "E";
  return stp > 0 ? `+${stp}` : `${stp}`;
}

function stpClass(stp: number | null | undefined): string {
  if (stp == null) return "text-gray-400";
  if (stp < 0) return "text-green-700 font-semibold";
  if (stp > 0) return "text-red-500 font-semibold";
  return "text-gray-600";
}

function formatEarnings(usd: number | null): string {
  if (usd === null || usd === 0) return "—";
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toLocaleString()}`;
}

// Golf scorecard shapes:
//   Eagle (≤-2): double circle — rounded-full + outer ring
//   Birdie (-1):  single circle — rounded-full
//   Par (0):      no shape — plain text
//   Bogey (+1):   single square — rounded-sm border
//   Double (+2):  double square — rounded-sm border + outer ring
//   Triple+ (≥3): double square (same as double bogey, darker)
const RESULT_STYLES: Record<HoleResult, { chip: string; shape: "double-circle" | "circle" | "none" | "square" | "double-square" }> = {
  eagle:       { chip: "bg-yellow-50 text-yellow-800 border border-yellow-400 ring-2 ring-yellow-300 ring-offset-1",  shape: "double-circle" },
  birdie:      { chip: "bg-green-100 text-green-800 border border-green-400",                                          shape: "circle" },
  par:         { chip: "text-gray-600",                                                                                shape: "none" },
  bogey:       { chip: "bg-red-50 text-red-600 border border-red-300",                                                shape: "square" },
  double_bogey:{ chip: "bg-red-100 text-red-700 border border-red-400 ring-2 ring-red-300 ring-offset-1",             shape: "double-square" },
  triple_plus: { chip: "bg-red-200 text-red-800 border border-red-500 ring-2 ring-red-400 ring-offset-1",             shape: "double-square" },
};

const RESULT_LABELS: Record<HoleResult, string> = {
  eagle:       "Eagle",
  birdie:      "Birdie",
  par:         "Par",
  bogey:       "Bogey",
  double_bogey:"Dbl Bogey",
  triple_plus: "Triple+",
};

// ---------------------------------------------------------------------------
// Scorecard panel (rendered as a full-width table row)
// ---------------------------------------------------------------------------

function ScorecardPanel({
  tournamentId,
  entry,
  availableRounds,
  colSpan,
}: {
  tournamentId: string;
  entry: LeaderboardEntry;
  availableRounds: number[];
  colSpan: number;
}) {
  const [round, setRound] = useState<number>(availableRounds[availableRounds.length - 1] ?? 1);
  const [showLegend, setShowLegend] = useState(false);
  const { data: scorecard, isLoading } = useGolferScorecard(tournamentId, entry.golfer_id, round);

  // Split holes into front 9 (1-9) and back 9 (10-18)
  const front = scorecard?.holes.filter((h) => h.hole <= 9) ?? [];
  const back  = scorecard?.holes.filter((h) => h.hole >= 10) ?? [];
  const frontPar = front.reduce((s, h) => s + (h.par ?? 0), 0);
  const backPar  = back.reduce((s,  h) => s + (h.par ?? 0), 0);
  const frontScore = front.every((h) => h.score !== null) ? front.reduce((s, h) => s + (h.score ?? 0), 0) : null;
  const backScore  = back.every((h)  => h.score !== null) ? back.reduce((s,  h) => s + (h.score  ?? 0), 0) : null;

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div className="bg-gray-50 border-t border-gray-100 px-5 py-4 space-y-3">
          {/* Round tabs */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">Round</span>
            {availableRounds.map((r) => (
              <button
                key={r}
                onClick={() => setRound(r)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                  round === r
                    ? "bg-green-800 text-white"
                    : "bg-white border border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-700"
                }`}
              >
                {r <= 4 ? `R${r}` : `PO${r - 4}`}
              </button>
            ))}
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-400 py-2">Loading scorecard…</p>
          ) : !scorecard || scorecard.holes.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">
              Hole-by-hole data is not available for this round.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="text-xs border-collapse min-w-max">
                <thead>
                  <tr className="text-gray-400">
                    <th className="pr-3 pb-1 text-left font-semibold w-14">Hole</th>
                    {front.map((h) => (
                      <th key={h.hole} className="px-1 pb-1 text-center w-7 font-medium tabular-nums">{h.hole}</th>
                    ))}
                    <th className="px-2 pb-1 text-center font-semibold text-gray-500 w-10">Out</th>
                    {back.map((h) => (
                      <th key={h.hole} className="px-1 pb-1 text-center w-7 font-medium tabular-nums">{h.hole}</th>
                    ))}
                    {back.length > 0 && <th className="px-2 pb-1 text-center font-semibold text-gray-500 w-10">In</th>}
                    <th className="pl-2 pb-1 text-center font-semibold text-gray-700 w-12">Total</th>
                  </tr>
                  <tr className="text-gray-400 border-b border-gray-200">
                    <td className="pr-3 pb-1.5 font-semibold">Par</td>
                    {front.map((h) => <td key={h.hole} className="px-1 pb-1.5 text-center tabular-nums">{h.par ?? "—"}</td>)}
                    <td className="px-2 pb-1.5 text-center font-semibold text-gray-500 tabular-nums">{frontPar || "—"}</td>
                    {back.map((h)  => <td key={h.hole} className="px-1 pb-1.5 text-center tabular-nums">{h.par ?? "—"}</td>)}
                    {back.length > 0 && <td className="px-2 pb-1.5 text-center font-semibold text-gray-500 tabular-nums">{backPar || "—"}</td>}
                    <td className="pl-2 pb-1.5 text-center font-semibold text-gray-700 tabular-nums">{(frontPar + backPar) || "—"}</td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="pr-3 pt-1.5 font-semibold text-gray-700">Score</td>
                    {front.map((h) => (
                      <td key={h.hole} className="px-1 pt-1.5 text-center">
                        {h.score !== null && h.result ? (() => {
                          const { chip, shape } = RESULT_STYLES[h.result];
                          const rounded = shape === "circle" || shape === "double-circle" ? "rounded-full" : shape === "none" ? "" : "rounded-sm";
                          return shape === "none"
                            ? <span className={`text-xs font-semibold tabular-nums ${chip}`}>{h.score}</span>
                            : <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold tabular-nums ${rounded} ${chip}`}>{h.score}</span>;
                        })() : <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                    <td className="px-2 pt-1.5 text-center font-bold tabular-nums text-gray-700">{frontScore ?? "—"}</td>
                    {back.map((h) => (
                      <td key={h.hole} className="px-1 pt-1.5 text-center">
                        {h.score !== null && h.result ? (() => {
                          const { chip, shape } = RESULT_STYLES[h.result];
                          const rounded = shape === "circle" || shape === "double-circle" ? "rounded-full" : shape === "none" ? "" : "rounded-sm";
                          return shape === "none"
                            ? <span className={`text-xs font-semibold tabular-nums ${chip}`}>{h.score}</span>
                            : <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold tabular-nums ${rounded} ${chip}`}>{h.score}</span>;
                        })() : <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                    {back.length > 0 && <td className="px-2 pt-1.5 text-center font-bold tabular-nums text-gray-700">{backScore ?? "—"}</td>}
                    <td className={`pl-2 pt-1.5 text-center font-bold tabular-nums ${stpClass(scorecard.total_score_to_par)}`}>
                      {fmtStp(scorecard.total_score_to_par) || "—"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Legend (collapsed by default) */}
              <div className="mt-3">
                <button
                  onClick={() => setShowLegend((v) => !v)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showLegend ? "Hide legend ▲" : "Legend ▼"}
                </button>
                {showLegend && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {(Object.keys(RESULT_STYLES) as HoleResult[]).map((r) => {
                      const { chip, shape } = RESULT_STYLES[r];
                      const rounded = shape === "circle" || shape === "double-circle" ? "rounded-full" : shape === "none" ? "" : "rounded-sm";
                      return (
                        <span key={r} className="flex items-center gap-1.5 text-xs text-gray-500">
                          {shape === "none"
                            ? <span className={`text-xs font-semibold w-5 text-center ${chip}`}>4</span>
                            : <span className={`inline-flex items-center justify-center w-5 h-5 text-xs font-bold ${rounded} ${chip}`}>4</span>
                          }
                          {RESULT_LABELS[r]}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function TournamentDetail() {
  const { leagueId, tournamentId } = useParams<{ leagueId: string; tournamentId: string }>();
  const [expandedGolferId, setExpandedGolferId] = useState<string | null>(null);

  const { data: leaderboard, isLoading, error } = useTournamentLeaderboard(tournamentId);
  const { data: myPicks } = useMyPicks(leagueId!);

  const myPickedGolferId = myPicks?.find((p) => p.tournament_id === tournamentId)?.golfer_id ?? null;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-gray-400">Loading leaderboard…</p>
      </div>
    );
  }

  if (error || !leaderboard) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Link to={`/leagues/${leagueId}/picks`} className="inline-flex items-center gap-1.5 text-sm text-green-700 hover:text-green-900 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to Picks
        </Link>
        <p className="text-gray-500">Leaderboard not available for this tournament.</p>
      </div>
    );
  }

  const isCompleted = leaderboard.tournament_status === "completed";

  // Detect playoff rounds (round_number > 4 means playoff)
  const playoffRoundNums = [
    ...new Set(
      leaderboard.entries.flatMap((e) =>
        e.rounds.filter((r) => r.round_number > 4).map((r) => r.round_number)
      )
    ),
  ].sort((a, b) => a - b);

  function posLabel(entry: LeaderboardEntry): string {
    if (entry.finish_position !== null) {
      return entry.is_tied ? `T${entry.finish_position}` : `${entry.finish_position}`;
    }
    if (entry.status === "WD" || entry.status === "CUT" || entry.status === "MDF" || entry.status === "DQ") {
      return entry.status;
    }
    return "—";
  }

  function isWithdrawnOrCut(entry: LeaderboardEntry): boolean {
    return entry.status === "WD" || entry.status === "CUT" || entry.status === "MDF" || entry.status === "DQ";
  }

  // Total column count for scorecard colspan
  const totalCols = 2 /* pos + golfer */ + 1 /* score */ + 4 /* R1-R4 */ + playoffRoundNums.length + (isCompleted ? 1 : 0);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back link */}
      <Link
        to={`/leagues/${leagueId}/picks`}
        className="inline-flex items-center gap-1.5 text-sm text-green-700 hover:text-green-900 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to Picks
      </Link>

      {/* Tournament header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-900 to-green-700 text-white rounded-2xl px-6 py-5">
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-green-300 mb-1">
          {isCompleted ? "Final" : "Live"}
        </p>
        <p className="text-xl font-bold">{fmtTournamentName(leaderboard.tournament_name)}</p>
        {myPickedGolferId && (
          <p className="text-sm text-green-300 mt-1">Your pick is highlighted below</p>
        )}
      </div>

      {/* Leaderboard table */}
      {leaderboard.entries.length === 0 ? (
        <p className="text-gray-400 text-sm">No field data available yet.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide w-14">Pos</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Golfer</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center w-14">Score</th>
                  {[1, 2, 3, 4].map((r) => (
                    <th key={r} className="px-2 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center w-10">R{r}</th>
                  ))}
                  {playoffRoundNums.map((r, i) => (
                    <th key={r} className="px-2 py-2.5 text-xs font-semibold text-amber-500 uppercase tracking-wide text-center w-10">
                      {playoffRoundNums.length === 1 ? "PO" : `PO${i + 1}`}
                    </th>
                  ))}
                  {isCompleted && (
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Earnings</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {leaderboard.entries.map((entry, idx) => {
                  const isMyPick = entry.golfer_id === myPickedGolferId;
                  const isFaded = isWithdrawnOrCut(entry);
                  const isExpanded = expandedGolferId === entry.golfer_id;

                  // Rounds that have data (score or tee_time) — used for scorecard tabs
                  const availableRounds = entry.rounds
                    .filter((r) => r.score !== null || r.tee_time !== null)
                    .map((r) => r.round_number)
                    .sort((a, b) => a - b);

                  // Show the cut line above the first player who did not make the cut
                  const prevEntry = idx > 0 ? leaderboard.entries[idx - 1] : null;
                  const showCutLine = !entry.made_cut && (prevEntry === null || prevEntry.made_cut);

                  return (
                    <>
                      {showCutLine && (
                        <tr key={`cut-line-${idx}`} className="border-b border-gray-100">
                          <td colSpan={totalCols} className="px-4 py-1.5 bg-gray-50">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-px bg-gray-300" />
                              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Cut Line</span>
                              <div className="flex-1 h-px bg-gray-300" />
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr
                        key={entry.golfer_id}
                        onClick={() => availableRounds.length > 0 && setExpandedGolferId((p) => p === entry.golfer_id ? null : entry.golfer_id)}
                        className={[
                          "border-b border-gray-100 last:border-0 transition-colors",
                          isMyPick ? "border-l-2 border-l-green-600 bg-green-50 hover:bg-green-100" : "hover:bg-gray-50",
                          availableRounds.length > 0 ? "cursor-pointer" : "cursor-default",
                          isFaded ? "opacity-50" : "",
                        ].filter(Boolean).join(" ")}
                      >
                        {/* Position */}
                        <td className={`px-4 py-3 text-sm font-bold tabular-nums ${isFaded ? "text-gray-400" : "text-gray-800"}`}>
                          {posLabel(entry)}
                        </td>

                        {/* Golfer */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <GolferAvatar
                              pgaTourId={entry.golfer_pga_tour_id}
                              name={entry.golfer_name}
                              className="w-8 h-8 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className={`text-sm font-semibold truncate ${isMyPick ? "text-green-900" : "text-gray-800"}`}>
                                {entry.golfer_name}
                                {isMyPick && (
                                  <span className="ml-1.5 text-xs font-bold text-green-600">★</span>
                                )}
                              </p>
                              {entry.golfer_country && (
                                <p className="text-xs text-gray-400">{entry.golfer_country}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Score (total to par) */}
                        <td className={`px-3 py-3 text-sm text-center font-bold tabular-nums ${stpClass(entry.total_score_to_par)}`}>
                          {fmtStp(entry.total_score_to_par) || "—"}
                        </td>

                        {/* R1–R4 */}
                        {[1, 2, 3, 4].map((r) => {
                          const rd = entry.rounds.find((x) => x.round_number === r);
                          const hasScore = rd?.score_to_par !== null && rd?.score_to_par !== undefined;
                          return (
                            <td key={r} className={`px-2 py-3 text-xs text-center tabular-nums ${hasScore ? stpClass(rd!.score_to_par) : "text-gray-300"}`}>
                              {hasScore ? fmtStp(rd!.score_to_par) : ""}
                            </td>
                          );
                        })}

                        {/* Playoff rounds */}
                        {playoffRoundNums.map((r) => {
                          const rd = entry.rounds.find((x) => x.round_number === r);
                          const hasScore = rd?.score_to_par !== null && rd?.score_to_par !== undefined;
                          return (
                            <td key={r} className={`px-2 py-3 text-xs text-center tabular-nums ${hasScore ? stpClass(rd!.score_to_par) : "text-gray-300"}`}>
                              {hasScore ? fmtStp(rd!.score_to_par) : ""}
                            </td>
                          );
                        })}

                        {/* Earnings */}
                        {isCompleted && (
                          <td className="px-4 py-3 text-xs text-right tabular-nums text-gray-600">
                            {formatEarnings(entry.earnings_usd)}
                          </td>
                        )}
                      </tr>

                      {/* Expanded scorecard row */}
                      {isExpanded && availableRounds.length > 0 && (
                        <ScorecardPanel
                          key={`scorecard-${entry.golfer_id}`}
                          tournamentId={tournamentId!}
                          entry={entry}
                          availableRounds={availableRounds}
                          colSpan={totalCols}
                        />
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
