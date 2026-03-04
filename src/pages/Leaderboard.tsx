/**
 * Leaderboard — full season standings + per-tournament pick analysis.
 *
 * Pick breakdown section:
 *   - Tournament dropdown (all league tournaments, soonest first)
 *   - Picks are hidden until the tournament is in_progress or completed
 *   - Table view:  golfer | pickers | points (if completed)
 *   - Chart view:  CSS bar chart — golfer on X, # picks on Y
 *   - Stats cards: submission rate, most popular pick, contrarian pick,
 *                  best/worst result (completed only)
 */

import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useStandings, useTournamentPicksSummary } from "../hooks/usePick";
import { useLeagueTournaments } from "../hooks/useLeague";
import { StandingsTable } from "../components/StandingsTable";
import { fmtTournamentName } from "../utils";
import type { GolferPickGroup } from "../api/endpoints";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPoints(pts: number | null): string {
  if (pts === null) return "—";
  if (pts >= 1_000_000) return `$${(pts / 1_000_000).toFixed(2)}M`;
  if (pts >= 1_000) return `$${(pts / 1_000).toFixed(1)}K`;
  return `$${pts.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Pure CSS bar chart (no library needed)
// ---------------------------------------------------------------------------

interface BarChartProps {
  groups: GolferPickGroup[];
  noPicks: number;
  isCompleted: boolean;
}

function PickBarChart({ groups, noPicks, isCompleted }: BarChartProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  // Build chart data: one bar per golfer + one "No Pick" bar if applicable.
  const bars: { label: string; fullName: string; count: number; points: number | null; names: string[] }[] = [
    ...groups.map((g) => ({
      label: g.golfer_name.split(" ").pop() ?? g.golfer_name, // last name only for space
      fullName: g.golfer_name,
      count: g.pick_count,
      points: isCompleted ? (g.pickers[0]?.points_earned ?? null) : null,
      names: g.pickers.map((p) => p.display_name),
    })),
    ...(noPicks > 0
      ? [{ label: "No Pick", fullName: "No Pick", count: noPicks, points: null, names: [] }]
      : []),
  ];

  const maxCount = Math.max(...bars.map((b) => b.count), 1);

  // Color: green for golfers, red for No Pick; amber for top pick
  function barColor(b: typeof bars[0], i: number): string {
    if (b.label === "No Pick") return "bg-red-200";
    if (i === 0) return "bg-green-700"; // most picked
    return "bg-green-400";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2 h-40 px-1">
        {bars.map((b, i) => (
          <div
            key={b.label}
            className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
            onMouseEnter={() =>
              setTooltip(
                b.names.length
                  ? `${b.fullName}: ${b.names.join(", ")}`
                  : b.label === "No Pick"
                  ? "No pick submitted"
                  : b.fullName
              )
            }
            onMouseLeave={() => setTooltip(null)}
          >
            {/* Count label above bar */}
            <span className="text-[10px] text-gray-500 font-medium">{b.count}</span>
            {/* Bar */}
            <div
              className={`w-full rounded-t transition-opacity group-hover:opacity-80 ${barColor(b, i)}`}
              style={{ height: `${(b.count / maxCount) * 100}%`, minHeight: "4px" }}
            />
          </div>
        ))}
      </div>

      {/* X-axis labels */}
      <div className="flex gap-2 px-1">
        {bars.map((b) => (
          <div key={b.label} className="flex-1 text-center">
            <span className="text-[10px] text-gray-500 leading-tight line-clamp-2 block">
              {b.label}
            </span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <p className="text-xs text-gray-600 bg-gray-100 rounded px-3 py-1.5 mt-1">{tooltip}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats cards
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

function StatCard({ label, value, sub, color = "text-gray-900" }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pick breakdown section
// ---------------------------------------------------------------------------

function TournamentPicksSection({ leagueId }: { leagueId: string }) {
  const { data: leagueTournaments } = useLeagueTournaments(leagueId);
  const [selectedId, setSelectedId] = useState<string>("");
  const [view, setView] = useState<"table" | "chart">("table");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sort: in_progress first, then completed desc, then scheduled asc
  const sorted = [...(leagueTournaments ?? [])].sort((a, b) => {
    const order = { in_progress: 0, completed: 1, scheduled: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return a.start_date.localeCompare(b.start_date);
  });

  const selectedTournament = sorted.find((t) => t.id === selectedId);

  const {
    data: summary,
    isLoading,
    error,
  } = useTournamentPicksSummary(leagueId, selectedId || null);

  const isCompleted = selectedTournament?.status === "completed";
  const isScheduled = selectedTournament?.status === "scheduled";

  // Derived stats
  const totalPickers = summary
    ? summary.picks_by_golfer.reduce((s, g) => s + g.pick_count, 0)
    : 0;
  const submissionRate = summary ? (totalPickers / summary.member_count) * 100 : 0;
  const topPick = summary?.picks_by_golfer[0];
  const uniquePick = summary?.picks_by_golfer.filter((g) => g.pick_count === 1).length ?? 0;

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-900">Tournament Breakdown</h2>
        <div ref={dropdownRef} className="relative w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="w-full sm:min-w-[220px] flex items-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 hover:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-700 transition-colors"
          >
            <span className="flex-1 text-left truncate">
              {selectedTournament ? fmtTournamentName(selectedTournament.name) : "Select a tournament…"}
            </span>
            <svg
              className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-full sm:w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10 max-h-72 overflow-y-auto">
              {sorted.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setSelectedId(t.id); setDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-3 transition-colors ${
                    t.id === selectedId ? "bg-green-50 text-green-900" : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <span className="truncate">{fmtTournamentName(t.name)}</span>
                  <span className={`text-xs shrink-0 font-medium px-2 py-0.5 rounded-full ${
                    t.status === "in_progress"
                      ? "bg-green-100 text-green-700"
                      : t.status === "completed"
                      ? "bg-gray-100 text-gray-500"
                      : "bg-blue-50 text-blue-600"
                  }`}>
                    {t.status === "in_progress" ? "Live" : t.status === "completed" ? "Final" : "Upcoming"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!selectedId && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
          Select a tournament above to see pick breakdown.
        </div>
      )}

      {selectedId && isScheduled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-1">
          <p className="text-sm font-semibold text-amber-800">Picks are locked</p>
          <p className="text-xs text-amber-600">
            Pick selections are revealed once the tournament begins to prevent copying.
          </p>
        </div>
      )}

      {selectedId && isLoading && (
        <p className="text-gray-400 text-sm">Loading picks…</p>
      )}

      {selectedId && !isScheduled && !isLoading && error && (
        <p className="text-gray-400 text-sm">No pick data available for this tournament yet.</p>
      )}

      {summary && !isScheduled && (
        <div className="space-y-5">
          {/* Stats row */}
          <div className={`grid grid-cols-2 gap-3 ${isCompleted ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
            <StatCard
              label="Submission rate"
              value={`${Math.round(submissionRate)}%`}
              sub={`${totalPickers} of ${summary.member_count} members`}
              color={submissionRate === 100 ? "text-green-700" : "text-gray-900"}
            />
            <StatCard
              label="Most popular"
              value={topPick ? topPick.golfer_name.split(" ").pop()! : "—"}
              sub={topPick ? `${topPick.pick_count} pick${topPick.pick_count !== 1 ? "s" : ""}` : undefined}
            />
            <StatCard
              label="Unique picks"
              value={`${uniquePick}`}
              sub="golfers picked by exactly 1 member"
            />
            {isCompleted && summary.winner && (
              <StatCard
                label="Picked the winner"
                value={`${summary.winner.pick_count}`}
                sub={`picked ${summary.winner.golfer_name.split(" ").pop()}`}
                color={summary.winner.pick_count > 0 ? "text-green-700" : "text-gray-900"}
              />
            )}
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-200 rounded-lg p-1 w-fit">
            <button
              onClick={() => setView("table")}
              className={`text-xs font-semibold px-3 py-1 rounded-md transition-colors ${
                view === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setView("chart")}
              className={`text-xs font-semibold px-3 py-1 rounded-md transition-colors ${
                view === "chart" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              Chart
            </button>
          </div>

          {/* Table view */}
          {view === "table" && (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-green-900 text-white">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider font-semibold">#</th>
                    <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider font-semibold">Golfer</th>
                    <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider font-semibold">Picked by</th>
                    {isCompleted && <th className="px-4 py-2.5 text-right text-xs uppercase tracking-wider font-semibold">Points</th>}
                  </tr>
                </thead>
                <tbody>
                  {summary.picks_by_golfer.map((g, i) => (
                    <tr
                      key={g.golfer_id}
                      className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                    >
                      <td className="px-4 py-3 text-gray-400 tabular-nums">{g.pick_count}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{g.golfer_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {g.pickers.map((p) => (
                            <span
                              key={p.user_id}
                              className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium"
                            >
                              {p.display_name}
                            </span>
                          ))}
                        </div>
                      </td>
                      {isCompleted && (
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">
                          {formatPoints(g.pickers[0]?.points_earned ?? null)}
                        </td>
                      )}
                    </tr>
                  ))}
                  {summary.no_pick_members.length > 0 && (
                    <tr className="border-t border-gray-100 bg-red-50">
                      <td className="px-4 py-3 text-red-400 tabular-nums">0</td>
                      <td className="px-4 py-3 text-gray-400 italic">No pick</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {summary.no_pick_members.map((m) => (
                            <span
                              key={m.user_id}
                              className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium"
                            >
                              {m.display_name}
                            </span>
                          ))}
                        </div>
                      </td>
                      {isCompleted && <td />}
                    </tr>
                  )}
                  {summary.picks_by_golfer.length === 0 && (
                    <tr>
                      <td colSpan={isCompleted ? 4 : 3} className="px-4 py-6 text-center text-gray-400">
                        No picks submitted for this tournament.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Chart view */}
          {view === "chart" && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs text-gray-400 mb-4">Number of picks per golfer</p>
              {summary.picks_by_golfer.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No picks to display.</p>
              ) : (
                <PickBarChart
                  groups={summary.picks_by_golfer}
                  noPicks={summary.no_pick_members.length}
                  isCompleted={isCompleted}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function Leaderboard() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { data: standings, isLoading } = useStandings(leagueId!);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-green-700">
          Season Standings
        </p>
        <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
        {standings && (
          <p className="text-sm text-gray-500">{standings.season_year} Season</p>
        )}
      </div>

      {/* Season standings */}
      {isLoading ? (
        <p className="text-gray-400">Loading…</p>
      ) : standings ? (
        <StandingsTable rows={standings.rows} />
      ) : (
        <p className="text-gray-400">No standings available yet.</p>
      )}

      {/* Pick breakdown */}
      <TournamentPicksSection leagueId={leagueId!} />
    </div>
  );
}
