/**
 * Picks — season history of picks and points earned, viewable for any league member.
 */

import { useState, useRef, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useMyPicks, useAllPicks } from "../hooks/usePick";
import { useLeague, useLeagueTournaments, useLeagueMembers } from "../hooks/useLeague";
import { useAuthStore } from "../store/authStore";
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

type StatusFilter = "default" | "upcoming" | "all";
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
  const currentUser = useAuthStore((s) => s.user);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [memberDropdownSearch, setMemberDropdownSearch] = useState("");
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const memberDropdownInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(e.target as Node)) {
        setMemberDropdownOpen(false);
        setMemberDropdownSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (memberDropdownOpen) memberDropdownInputRef.current?.focus();
  }, [memberDropdownOpen]);

  const { data: allPicks } = useAllPicks(leagueId!);
  const { data: members } = useLeagueMembers(leagueId!);
  const { data: leagueTournaments } = useLeagueTournaments(leagueId!);
  const { data: league } = useLeague(leagueId!);
  const { data: myPicksData, isLoading } = useMyPicks(leagueId!);
  const approvedMembers = members?.filter((m) => m.status === "approved") ?? [];

  // Default to the current user; allow switching via dropdown.
  const viewingUserId = selectedUserId ?? currentUser?.id ?? null;
  const isViewingSelf = !selectedUserId || selectedUserId === currentUser?.id;

  // Current user always uses myPicksData (includes in-progress tournament picks).
  // Other members use allPicks filtered by user — all-picks only exposes completed tournaments.
  const picks = isViewingSelf
    ? myPicksData ?? null
    : viewingUserId
    ? (allPicks?.filter((p) => p.user_id === viewingUserId) ?? null)
    : null;

  const liveTournament = leagueTournaments?.find((t) => t.status === "in_progress");
  const hasLiveTournament = !!liveTournament;

  // Only show the next upcoming tournament if there is no live one.
  const nextTournament = hasLiveTournament
    ? undefined
    : leagueTournaments
        ?.filter((t) => t.status === "scheduled")
        .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

  // hasPickForNext always reflects the current user — used for the Make Pick button label.
  const hasPickForNext = nextTournament
    ? myPicksData?.some((p) => p.tournament_id === nextTournament.id)
    : false;

  // Live tournament pick for current user — used to determine if pick button should show.
  const myLivePick = liveTournament
    ? myPicksData?.find((p) => p.tournament_id === liveTournament.id)
    : undefined;
  // Hide the pick button when the live tournament's pick is locked (golfer has teed off).
  const pickActionAvailable = hasLiveTournament ? !myLivePick?.is_locked : !!nextTournament;

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
  // Picks submitted for final (status === "completed") tournaments only
  const submittedForFinal = picks?.filter((p) =>
    leagueTournaments?.some((t) => t.id === p.tournament_id && t.status === "completed")
  ) ?? [];
  // Best single tournament
  const bestPick = scoredPicks.reduce<(typeof scoredPicks)[0] | null>(
    (best, p) => (best === null || p.points_earned! > best.points_earned! ? p : best),
    null
  );
  const finalTournamentCount = completedTournaments.filter((t) => t.status === "completed").length;
  const avgEarnings = finalTournamentCount > 0 ? totalEarned / finalTournamentCount : null;
  const showStats = completedTournaments.length > 0;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("default");
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

  // Unified history: filtered by statusFilter
  const historyRows = [
    ...(leagueTournaments ?? [])
      .filter((t) => {
        if (statusFilter === "upcoming") return t.status === "scheduled";
        if (statusFilter === "all") return true;
        // default: completed/in_progress + the single next scheduled tournament
        return t.status !== "scheduled" || t.id === nextTournament?.id;
      })
      .map((t) => ({
        key: `t-${t.id}`,
        tournament: t,
        pick: picksByTournamentId.get(t.id) ?? null,
      })),
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
          <h1 className="text-3xl font-bold text-gray-900">Picks</h1>
        </div>
        {pickActionAvailable && (
          <Link
            to={`/leagues/${leagueId}/pick`}
            className="inline-flex items-center gap-2 bg-green-800 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-colors"
          >
            {hasPickForNext ? "Change Pick" : "Make Pick"}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        )}
      </div>

      {/* Member selector */}
      {approvedMembers.length > 1 && (() => {
        const sortedMembers = [...approvedMembers].sort((a, b) =>
          a.user.display_name.localeCompare(b.user.display_name)
        );
        const viewingMember = sortedMembers.find((m) => m.user_id === viewingUserId);
        const filteredMembers = memberDropdownSearch
          ? sortedMembers.filter((m) =>
              m.user.display_name.toLowerCase().includes(memberDropdownSearch.toLowerCase())
            )
          : sortedMembers;
        return (
          <div ref={memberDropdownRef} className="relative inline-block">
            <button
              type="button"
              onClick={() => { setMemberDropdownOpen((o) => !o); setMemberDropdownSearch(""); }}
              className="min-w-[180px] flex items-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 hover:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-700 transition-colors"
            >
              <span className="flex-1 text-left truncate">
                {viewingMember ? viewingMember.user.display_name : "Select a member…"}
              </span>
              <svg
                className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${memberDropdownOpen ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {memberDropdownOpen && (
              <div className="absolute left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
                <div className="px-3 py-2 border-b border-gray-100">
                  <input
                    ref={memberDropdownInputRef}
                    type="text"
                    value={memberDropdownSearch}
                    onChange={(e) => setMemberDropdownSearch(e.target.value)}
                    placeholder="Search…"
                    className="w-full text-sm outline-none placeholder-gray-400 bg-transparent"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredMembers.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">No results.</p>
                  ) : (
                    filteredMembers.map((m) => (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => {
                          setSelectedUserId(m.user_id);
                          setMemberDropdownOpen(false);
                          setMemberDropdownSearch("");
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-3 transition-colors ${
                          m.user_id === viewingUserId ? "bg-green-50 text-green-900" : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span className="truncate">{m.user.display_name}</span>
                        {m.user_id === currentUser?.id && (
                          <span className="text-xs shrink-0 font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            you
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

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
            label="Submission Rate"
            value={finalTournamentCount === 0 ? "—" : `${Math.round((submittedForFinal.length / finalTournamentCount) * 100)}%`}
            sub={finalTournamentCount > 0 ? `${submittedForFinal.length} / ${finalTournamentCount} tournaments` : undefined}
          />
          <StatCard
            label="Cuts Missed"
            value={scoredPicks.length > 0 ? `${Math.round((cutsMissed.length / scoredPicks.length) * 100)}%` : "—"}
            sub={scoredPicks.length > 0 ? `${cutsMissed.length} of ${scoredPicks.length} picks` : undefined}
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
          {/* Status filter */}
          <div className="flex items-center gap-1 pb-1">
            {(
              [
                ["default", "Recent"],
                ["upcoming", "Upcoming"],
                ["all", "All"],
              ] as [StatusFilter, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                  statusFilter === val
                    ? "bg-green-800 text-white"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

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

          {historyRows.map(({ key, tournament, pick }) => {
            const isClickable = tournament.status === "in_progress" || tournament.status === "completed";
            const rowClass = `bg-white border rounded-xl p-5 flex items-center justify-between gap-4 transition-all ${
              !pick && completedTournaments.some((t) => t.id === tournament.id)
                ? "border-red-100"
                : "border-gray-200"
            } ${isClickable ? "hover:shadow-sm hover:border-green-300 cursor-pointer" : ""}`;
            const rowContent = (
              <>
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">{fmtTournamentName(tournament.name)}</p>
                  <TournamentBadge tournament={tournament} showDates />
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {pick ? (() => {
                    const multiplier = "effective_multiplier" in tournament
                      ? (tournament as { effective_multiplier: number }).effective_multiplier
                      : 1;
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
                      <p className={`text-sm font-medium ${tournament.status === "scheduled" ? "text-gray-400" : "text-red-400"}`}>
                        {tournament.status === "scheduled" ? "No pick yet" : "No pick"}
                      </p>
                      {tournament.status === "completed" && league?.no_pick_penalty !== undefined ? (
                        <p className="text-lg font-bold text-red-500 tabular-nums">
                          {formatPoints(league.no_pick_penalty)}
                        </p>
                      ) : (
                        <p className="text-lg font-bold text-gray-300 tabular-nums">—</p>
                      )}
                    </div>
                  )}
                  {isClickable && (
                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  )}
                </div>
              </>
            );

            return isClickable ? (
              <Link
                key={key}
                to={`/leagues/${leagueId}/tournaments/${tournament.id}`}
                className={rowClass}
              >
                {rowContent}
              </Link>
            ) : (
              <div key={key} className={rowClass}>
                {rowContent}
              </div>
            );
          })}
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
