/**
 * usePick — React Query hooks for picks, tournaments, and standings.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { picksApi, standingsApi, tournamentsApi } from "../api/endpoints";

export function useTournaments(status?: "scheduled" | "in_progress" | "completed") {
  return useQuery({
    queryKey: ["tournaments", status ?? "all"],
    queryFn: () => tournamentsApi.list(status),
  });
}

export function useTournamentField(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ["tournamentField", tournamentId],
    queryFn: () => tournamentsApi.field(tournamentId!),
    enabled: !!tournamentId,
  });
}

export function useMyPicks(slug: string) {
  return useQuery({
    queryKey: ["myPicks", slug],
    queryFn: () => picksApi.mine(slug),
    enabled: !!slug,
  });
}

export function useAllPicks(slug: string) {
  return useQuery({
    queryKey: ["allPicks", slug],
    queryFn: () => picksApi.all(slug),
    enabled: !!slug,
  });
}

export function useStandings(slug: string) {
  return useQuery({
    queryKey: ["standings", slug],
    queryFn: () => standingsApi.get(slug),
    enabled: !!slug,
  });
}

export function useSubmitPick(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tournament_id, golfer_id }: { tournament_id: string; golfer_id: string }) =>
      picksApi.submit(slug, tournament_id, golfer_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPicks", slug] });
      qc.invalidateQueries({ queryKey: ["standings", slug] });
    },
  });
}

export function useChangePick(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pickId, golfer_id }: { pickId: string; golfer_id: string }) =>
      picksApi.change(slug, pickId, golfer_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myPicks", slug] }),
  });
}
