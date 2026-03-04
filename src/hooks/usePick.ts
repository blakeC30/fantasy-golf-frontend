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

export function useMyPicks(leagueId: string) {
  return useQuery({
    queryKey: ["myPicks", leagueId],
    queryFn: () => picksApi.mine(leagueId),
    enabled: !!leagueId,
  });
}

export function useAllPicks(leagueId: string) {
  return useQuery({
    queryKey: ["allPicks", leagueId],
    queryFn: () => picksApi.all(leagueId),
    enabled: !!leagueId,
  });
}

export function useTournamentPicksSummary(leagueId: string, tournamentId: string | null) {
  return useQuery({
    queryKey: ["tournamentPicksSummary", leagueId, tournamentId],
    queryFn: () => picksApi.tournamentSummary(leagueId, tournamentId!),
    enabled: !!leagueId && !!tournamentId,
    retry: false, // don't retry the 403 "scheduled" response
  });
}

export function useStandings(leagueId: string) {
  return useQuery({
    queryKey: ["standings", leagueId],
    queryFn: () => standingsApi.get(leagueId),
    enabled: !!leagueId,
  });
}

export function useSubmitPick(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tournament_id, golfer_id }: { tournament_id: string; golfer_id: string }) =>
      picksApi.submit(leagueId, tournament_id, golfer_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myPicks", leagueId] });
      qc.invalidateQueries({ queryKey: ["standings", leagueId] });
    },
  });
}

export function useChangePick(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pickId, golfer_id }: { pickId: string; golfer_id: string }) =>
      picksApi.change(leagueId, pickId, golfer_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myPicks", leagueId] }),
  });
}

export function useAdminOverridePick(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { user_id: string; tournament_id: string; golfer_id: string | null }) =>
      picksApi.adminOverride(leagueId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allPicks", leagueId] });
      qc.invalidateQueries({ queryKey: ["myPicks", leagueId] });
      qc.invalidateQueries({ queryKey: ["standings", leagueId] });
      qc.invalidateQueries({ queryKey: ["tournamentPicksSummary", leagueId] });
    },
  });
}
