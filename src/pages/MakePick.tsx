/**
 * MakePick — pick a golfer for the next scheduled tournament.
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PickForm } from "../components/PickForm";
import { GolferAvatar } from "../components/GolferAvatar";
import { FlagIcon } from "../components/FlagIcon";
import { useLeagueTournaments } from "../hooks/useLeague";
import { useMyPicks, useSubmitPick, useTournamentField, useChangePick, useAllGolfers } from "../hooks/usePick";
import { fmtTournamentName } from "../utils";

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

export function MakePick() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<{ golferName: string; pgaTourId: string; changed: boolean } | null>(null);

  const { data: leagueTournaments } = useLeagueTournaments(leagueId!);
  const { data: myPicks } = useMyPicks(leagueId!);
  const submitPick = useSubmitPick(leagueId!);
  const changePick = useChangePick(leagueId!);

  // Target the earliest actionable tournament: prefer scheduled, then in_progress.
  // In_progress tournaments are still pickable if the chosen golfer hasn't teed off yet
  // (the backend enforces the tee_time check).
  const tournament = leagueTournaments
    ?.filter((t) => t.status === "scheduled" || t.status === "in_progress")
    .sort((a, b) => {
      // Scheduled before in_progress so a pending pick always lands on the right week.
      // Within the same status, sort by start_date ascending.
      if (a.status !== b.status) {
        return a.status === "scheduled" ? -1 : 1;
      }
      return a.start_date.localeCompare(b.start_date);
    })[0];

  const { data: field } = useTournamentField(tournament?.id);
  const { data: allGolfers } = useAllGolfers();

  const existingPick = myPicks?.find((p) => p.tournament_id === tournament?.id);

  // When the tournament is scheduled but no field entries exist yet, fall back to
  // all known golfers so users can pick early. The backend allows this pre-field pick.
  const fieldNotReleased =
    tournament?.status === "scheduled" && Array.isArray(field) && field.length === 0;
  const effectiveField = fieldNotReleased ? (allGolfers ?? []) : (field ?? []);

  // Set of golfer IDs already used this season (for the "Used" greyed-out display).
  const usedGolferIds = new Set(myPicks?.map((p) => p.golfer_id) ?? []);

  async function handleSubmit(golferId: string) {
    setError("");
    const wasChange = !!existingPick;
    try {
      if (existingPick) {
        await changePick.mutateAsync({ pickId: existingPick.id, golfer_id: golferId });
      } else {
        await submitPick.mutateAsync({ tournament_id: tournament!.id, golfer_id: golferId });
      }
      const golfer = field?.find((g) => g.id === golferId);
      setConfirmed({ golferName: golfer?.name ?? "your golfer", pgaTourId: golfer?.pga_tour_id ?? "", changed: wasChange });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Failed to save pick. Please try again.");
    }
  }

  if (confirmed) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center space-y-5">
          <div className="relative w-20 h-20 mx-auto">
            <GolferAvatar
              pgaTourId={confirmed.pgaTourId}
              name={confirmed.golferName}
              className="w-20 h-20"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-green-700">
              {confirmed.changed ? "Pick Updated" : "Pick Submitted"}
            </p>
            <h1 className="text-2xl font-bold text-gray-900">{confirmed.golferName}</h1>
            {tournament && (
              <p className="text-sm text-gray-500">{fmtTournamentName(tournament.name)}</p>
            )}
          </div>
          <Link
            to={`/leagues/${leagueId}/picks`}
            className="inline-block w-full bg-green-800 hover:bg-green-700 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
          >
            View My Picks
          </Link>
          <Link
            to={`/leagues/${leagueId}`}
            className="inline-block text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="space-y-1 mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-green-700">
            Pick Golfer
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Make Your Pick</h1>
        </div>
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center mx-auto">
            <FlagIcon className="w-6 h-6" />
          </div>
          <p className="font-semibold text-gray-700">No upcoming tournaments</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            There are no scheduled tournaments to pick for right now.
          </p>
          <Link
            to={`/leagues/${leagueId}`}
            className="inline-block text-sm font-semibold text-green-700 hover:text-green-900 mt-2 transition-colors"
          >
            Back to dashboard →
          </Link>
        </div>
      </div>
    );
  }

  // Still loading: field query hasn't resolved yet, or pre-field golfers haven't loaded.
  if (field === undefined || (fieldNotReleased && allGolfers === undefined)) {
    return (
      <div className="max-w-lg mx-auto">
        <p className="text-gray-400">Loading tournament field…</p>
      </div>
    );
  }

  // Shared tournament context header — shown whenever a tournament is known.
  const tournamentHeader = (
    <div className="relative overflow-hidden bg-gradient-to-r from-green-900 to-green-700 text-white rounded-2xl px-6 py-5">
      <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-green-300 mb-1">
        {existingPick ? "Change Your Pick" : "Make Your Pick"}
      </p>
      <p className="text-xl font-bold text-white">{fmtTournamentName(tournament.name)}</p>
      <div className="flex items-center gap-3 mt-2 text-sm text-green-300">
        <span>{formatDate(tournament.start_date)}–{formatDate(tournament.end_date)}</span>
        {formatPurse(tournament.purse_usd) && (
          <>
            <span className="text-green-600">·</span>
            <span>{formatPurse(tournament.purse_usd)}</span>
          </>
        )}
        {tournament.effective_multiplier >= 2 && (
          <>
            <span className="text-green-600">·</span>
            <span className="font-bold text-amber-300">{tournament.effective_multiplier}× MAJOR</span>
          </>
        )}
      </div>
    </div>
  );

  // Pick is locked — golfer has already teed off, no changes allowed.
  if (existingPick?.is_locked) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        {tournamentHeader}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-200 text-gray-500 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-700">Pick locked</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            Your pick of <span className="font-medium text-gray-600">{existingPick.golfer.name}</span> is locked — they've already teed off.
          </p>
          <Link
            to={`/leagues/${leagueId}`}
            className="inline-block text-sm font-semibold text-green-700 hover:text-green-900 mt-2 transition-colors"
          >
            Back to dashboard →
          </Link>
        </div>
      </div>
    );
  }

  // IN_PROGRESS with no field entries — can't pick without tee time data.
  if (effectiveField.length === 0) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        {tournamentHeader}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-700">Field not yet available</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            The player field for this tournament hasn't been announced yet.
            Check back closer to the start date — picks will open automatically.
          </p>
          <Link
            to={`/leagues/${leagueId}`}
            className="inline-block text-sm font-semibold text-green-700 hover:text-green-900 mt-2 transition-colors"
          >
            Back to dashboard →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {tournamentHeader}
      {fieldNotReleased && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-xs text-amber-700 leading-relaxed">
            The official field hasn't been announced yet. You can pick early from all known golfers, but your pick may be subject to change if the golfer doesn't enter the tournament.
          </p>
        </div>
      )}
      {tournament.status === "in_progress" && (
        <p className="text-xs text-gray-400 leading-relaxed">
          This tournament is underway. You can still pick a golfer who hasn't teed off yet.
        </p>
      )}
      {tournament.is_team_event && (
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
          </svg>
          <p className="text-xs text-blue-700 leading-relaxed">
            <span className="font-semibold">Team event.</span> Golfers compete in two-person teams this week. Pick one individual golfer — both partners appear in the list separately. Each golfer is tracked independently: picking one only uses up that golfer for the season, not their teammate. If you've already used one partner in a previous tournament, you can still pick the other. Points are based on that golfer's share of the team's earnings.
          </p>
        </div>
      )}
      <PickForm
        field={effectiveField}
        usedGolferIds={usedGolferIds}
        existingPick={existingPick}
        onSubmit={handleSubmit}
        submitting={submitPick.isPending || changePick.isPending}
        error={error}
      />
    </div>
  );
}
