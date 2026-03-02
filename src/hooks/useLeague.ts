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

export function useLeague(slug: string) {
  return useQuery({
    queryKey: ["league", slug],
    queryFn: () => leaguesApi.get(slug),
    enabled: !!slug,
  });
}

export function useLeagueMembers(slug: string) {
  return useQuery({
    queryKey: ["leagueMembers", slug],
    queryFn: () => leaguesApi.members(slug),
    enabled: !!slug,
  });
}

export function useCreateLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      slug,
      description,
      no_pick_penalty,
    }: {
      name: string;
      slug: string;
      description?: string;
      no_pick_penalty?: number;
    }) => leaguesApi.create(name, slug, description, no_pick_penalty),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myLeagues"] }),
  });
}

export function useJoinLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => leaguesApi.join(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myLeagues"] }),
  });
}

export function useUpdateMemberRole(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "admin" | "member" }) =>
      leaguesApi.updateMemberRole(slug, userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leagueMembers", slug] }),
  });
}

export function useRemoveMember(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => leaguesApi.removeMember(slug, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leagueMembers", slug] }),
  });
}

export function useLeagueTournaments(slug: string) {
  return useQuery({
    queryKey: ["leagueTournaments", slug],
    queryFn: () => leaguesApi.getTournaments(slug),
    enabled: !!slug,
  });
}

export function useUpdateLeagueTournaments(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tournamentIds: string[]) => leaguesApi.updateTournaments(slug, tournamentIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leagueTournaments", slug] }),
  });
}
