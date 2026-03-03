/**
 * useLeague — React Query hooks for league data.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { leaguesApi, usersApi } from "../api/endpoints";

export function useMyLeagues() {
  return useQuery({
    queryKey: ["myLeagues"],
    queryFn: usersApi.myLeagues,
  });
}

export function useLeague(leagueId: string) {
  return useQuery({
    queryKey: ["league", leagueId],
    queryFn: () => leaguesApi.get(leagueId),
    enabled: !!leagueId,
  });
}

export function useLeagueMembers(leagueId: string) {
  return useQuery({
    queryKey: ["leagueMembers", leagueId],
    queryFn: () => leaguesApi.members(leagueId),
    enabled: !!leagueId,
  });
}

export function useCreateLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      description,
      no_pick_penalty,
    }: {
      name: string;
      description?: string;
      no_pick_penalty?: number;
    }) => leaguesApi.create(name, description, no_pick_penalty),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myLeagues"] }),
  });
}

export function useJoinByCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) => leaguesApi.joinByCode(inviteCode),
    // Only invalidate myLeagues when the join was auto-approved (public league).
    // For private leagues the request is pending — the user's league list won't change yet.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myLeagues"] }),
  });
}

export function useUpdateMemberRole(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "admin" | "member" }) =>
      leaguesApi.updateMemberRole(leagueId, userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leagueMembers", leagueId] }),
  });
}

export function useRemoveMember(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => leaguesApi.removeMember(leagueId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leagueMembers", leagueId] }),
  });
}

export function useLeagueTournaments(leagueId: string) {
  return useQuery({
    queryKey: ["leagueTournaments", leagueId],
    queryFn: () => leaguesApi.getTournaments(leagueId),
    enabled: !!leagueId,
  });
}

export function useUpdateLeagueTournaments(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tournamentIds: string[]) => leaguesApi.updateTournaments(leagueId, tournamentIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leagueTournaments", leagueId] }),
  });
}

export function usePendingRequests(leagueId: string) {
  return useQuery({
    queryKey: ["pendingRequests", leagueId],
    queryFn: () => leaguesApi.pendingRequests(leagueId),
    enabled: !!leagueId,
  });
}

export function useApproveRequest(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => leaguesApi.approveRequest(leagueId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendingRequests", leagueId] });
      qc.invalidateQueries({ queryKey: ["leagueMembers", leagueId] });
    },
  });
}

export function useDenyRequest(leagueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => leaguesApi.denyRequest(leagueId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pendingRequests", leagueId] }),
  });
}
