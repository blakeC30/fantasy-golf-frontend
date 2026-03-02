/**
 * MakePick — pick a golfer for the next scheduled tournament.
 */

import { useState } from "react";
import { useParams } from "react-router-dom";
import { PickForm } from "../components/PickForm";
import { useLeagueTournaments } from "../hooks/useLeague";
import { useMyPicks, useSubmitPick, useTournamentField, useChangePick } from "../hooks/usePick";

export function MakePick() {
  const { slug } = useParams<{ slug: string }>();
  const [error, setError] = useState("");

  const { data: leagueTournaments } = useLeagueTournaments(slug!);
  const { data: myPicks } = useMyPicks(slug!);
  const submitPick = useSubmitPick(slug!);
  const changePick = useChangePick(slug!);

  // Target the earliest upcoming scheduled tournament in the league's schedule.
  const tournament = leagueTournaments
    ?.filter((t) => t.status === "scheduled")
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

  const { data: field } = useTournamentField(tournament?.id);

  const existingPick = myPicks?.find((p) => p.tournament_id === tournament?.id);

  // Set of golfer IDs already used this season (for the "Used" greyed-out display).
  const usedGolferIds = new Set(myPicks?.map((p) => p.golfer_id) ?? []);

  async function handleSubmit(golferId: string) {
    setError("");
    try {
      if (existingPick) {
        await changePick.mutateAsync({ pickId: existingPick.id, golfer_id: golferId });
      } else {
        await submitPick.mutateAsync({ tournament_id: tournament!.id, golfer_id: golferId });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Failed to save pick. Please try again.");
    }
  }

  if (!tournament) {
    return (
      <div className="text-center py-16 text-gray-400">
        No upcoming tournaments to pick for right now.
      </div>
    );
  }

  if (!field) {
    return <p className="text-gray-400">Loading tournament field…</p>;
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Make Your Pick</h1>
      <PickForm
        tournament={tournament}
        field={field}
        usedGolferIds={usedGolferIds}
        existingPick={existingPick}
        onSubmit={handleSubmit}
        submitting={submitPick.isPending || changePick.isPending}
        error={error}
      />
    </div>
  );
}
