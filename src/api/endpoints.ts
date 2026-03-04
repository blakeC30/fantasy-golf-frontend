/**
 * Typed API functions — one function per backend endpoint.
 *
 * All functions return the unwrapped response data (not the axios response).
 * TypeScript types mirror the backend Pydantic schemas exactly.
 */

import { api } from "./client";

// ---------------------------------------------------------------------------
// Types (mirror backend schemas)
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  display_name: string;
  is_platform_admin: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface League {
  id: string;
  name: string;
  description: string | null;
  no_pick_penalty: number;
  invite_code: string;
  is_public: boolean;
  created_at: string;
}

export interface LeagueMember {
  user_id: string;
  league_id: string;
  role: "manager" | "member";
  status: "pending" | "approved";
  joined_at: string;
  user: User;
}

export interface Tournament {
  id: string;
  pga_tour_id: string;
  name: string;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;
  multiplier: number;
  purse_usd: number | null;
  status: "scheduled" | "in_progress" | "completed";
  is_team_event: boolean;
}

// Returned by GET /leagues/{id}/tournaments — includes the league's effective
// multiplier, which resolves to the per-league override or the global default.
export interface LeagueTournamentOut extends Tournament {
  effective_multiplier: number;
}

export interface Golfer {
  id: string;
  pga_tour_id: string;
  name: string;
  world_ranking: number | null;
  country: string | null;
}

export interface Pick {
  id: string;
  user_id?: string; // present on all-picks responses; absent on mine-only responses
  tournament_id: string;
  golfer_id: string;
  points_earned: number | null;
  earnings_usd: number | null; // raw golfer earnings before multiplier
  submitted_at: string;
  golfer: Golfer;
  tournament: Tournament;
}

export interface StandingsRow {
  rank: number;
  is_tied: boolean; // true when two or more players share this rank
  user_id: string;
  display_name: string;
  total_points: number;
  pick_count: number;
  missed_count: number;
}

export interface LeagueJoinPreview {
  league_id: string;
  name: string;
  description: string | null;
  member_count: number;
  /** null = no relationship, "pending" = awaiting approval, "approved" = already a member */
  user_status: "pending" | "approved" | null;
}

export interface LeagueRequestOut {
  league_id: string;
  league_name: string;
  league_description: string | null;
  requested_at: string;
}

export interface StandingsResponse {
  league_id: string;
  season_year: number;
  rows: StandingsRow[];
}

export interface PickerInfo {
  user_id: string;
  display_name: string;
  points_earned: number | null;
}

export interface GolferPickGroup {
  golfer_id: string;
  golfer_name: string;
  pick_count: number;
  pickers: PickerInfo[];
  earnings_usd: number | null;
}

export interface TournamentPicksSummary {
  tournament_status: "scheduled" | "in_progress" | "completed";
  member_count: number;
  picks_by_golfer: GolferPickGroup[]; // sorted by pick_count desc
  no_pick_members: { user_id: string; display_name: string }[];
  winner: { golfer_name: string; pick_count: number } | null;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  register: (email: string, password: string, display_name: string) =>
    api.post<TokenResponse>("/auth/register", { email, password, display_name }).then((r) => r.data),

  login: (email: string, password: string) =>
    api.post<TokenResponse>("/auth/login", { email, password }).then((r) => r.data),

  google: (id_token: string) =>
    api.post<TokenResponse>("/auth/google", { id_token }).then((r) => r.data),

  refresh: () =>
    api.post<TokenResponse>("/auth/refresh").then((r) => r.data),

  logout: () =>
    api.post("/auth/logout").then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const usersApi = {
  me: () =>
    api.get<User>("/users/me").then((r) => r.data),

  updateMe: (display_name: string) =>
    api.patch<User>("/users/me", { display_name }).then((r) => r.data),

  myLeagues: () =>
    api.get<League[]>("/users/me/leagues").then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Leagues
// ---------------------------------------------------------------------------

export const leaguesApi = {
  create: (name: string, description?: string, no_pick_penalty?: number) =>
    api.post<League>("/leagues", { name, description, no_pick_penalty }).then((r) => r.data),

  get: (leagueId: string) =>
    api.get<League>(`/leagues/${leagueId}`).then((r) => r.data),

  update: (leagueId: string, data: { name?: string; description?: string | null; no_pick_penalty?: number }) =>
    api.patch<League>(`/leagues/${leagueId}`, data).then((r) => r.data),

  leave: (leagueId: string) =>
    api.delete(`/leagues/${leagueId}/members/me`).then((r) => r.data),

  delete: (leagueId: string) =>
    api.delete(`/leagues/${leagueId}`).then((r) => r.data),

  joinPreview: (inviteCode: string) =>
    api.get<LeagueJoinPreview>(`/leagues/join/${inviteCode}`).then((r) => r.data),

  joinByCode: (inviteCode: string) =>
    api.post<LeagueMember>(`/leagues/join/${inviteCode}`).then((r) => r.data),

  cancelMyRequest: (leagueId: string) =>
    api.delete(`/leagues/${leagueId}/requests/me`).then((r) => r.data),

  myRequests: () =>
    api.get<LeagueRequestOut[]>("/leagues/my-requests").then((r) => r.data),

  members: (leagueId: string) =>
    api.get<LeagueMember[]>(`/leagues/${leagueId}/members`).then((r) => r.data),

  updateMemberRole: (leagueId: string, userId: string, role: "manager" | "member") =>
    api.patch<LeagueMember>(`/leagues/${leagueId}/members/${userId}/role`, { role }).then((r) => r.data),

  removeMember: (leagueId: string, userId: string) =>
    api.delete(`/leagues/${leagueId}/members/${userId}`).then((r) => r.data),

  pendingRequests: (leagueId: string) =>
    api.get<LeagueMember[]>(`/leagues/${leagueId}/requests`).then((r) => r.data),

  approveRequest: (leagueId: string, userId: string) =>
    api.post<LeagueMember>(`/leagues/${leagueId}/requests/${userId}/approve`).then((r) => r.data),

  denyRequest: (leagueId: string, userId: string) =>
    api.delete(`/leagues/${leagueId}/requests/${userId}`).then((r) => r.data),

  getTournaments: (leagueId: string) =>
    api.get<LeagueTournamentOut[]>(`/leagues/${leagueId}/tournaments`).then((r) => r.data),

  updateTournaments: (leagueId: string, tournaments: { tournament_id: string; multiplier: number | null }[]) =>
    api.put<LeagueTournamentOut[]>(`/leagues/${leagueId}/tournaments`, { tournaments }).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Tournaments
// ---------------------------------------------------------------------------

export const tournamentsApi = {
  list: (status?: Tournament["status"]) =>
    api.get<Tournament[]>("/tournaments", { params: status ? { status } : {} }).then((r) => r.data),

  get: (id: string) =>
    api.get<Tournament>(`/tournaments/${id}`).then((r) => r.data),

  field: (id: string) =>
    api.get<Golfer[]>(`/tournaments/${id}/field`).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Golfers
// ---------------------------------------------------------------------------

export const golfersApi = {
  list: (search?: string) =>
    api.get<Golfer[]>("/golfers", { params: search ? { search } : {} }).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Picks
// ---------------------------------------------------------------------------

export const picksApi = {
  submit: (leagueId: string, tournament_id: string, golfer_id: string) =>
    api.post<Pick>(`/leagues/${leagueId}/picks`, { tournament_id, golfer_id }).then((r) => r.data),

  change: (leagueId: string, pickId: string, golfer_id: string) =>
    api.patch<Pick>(`/leagues/${leagueId}/picks/${pickId}`, { golfer_id }).then((r) => r.data),

  mine: (leagueId: string) =>
    api.get<Pick[]>(`/leagues/${leagueId}/picks/mine`).then((r) => r.data),

  all: (leagueId: string) =>
    api.get<Pick[]>(`/leagues/${leagueId}/picks`).then((r) => r.data),

  tournamentSummary: (leagueId: string, tournamentId: string) =>
    api
      .get<TournamentPicksSummary>(`/leagues/${leagueId}/picks/tournament/${tournamentId}`)
      .then((r) => r.data),

  // Manager-only: create, replace, or delete any member's pick for a tournament.
  // golfer_id = null removes the pick entirely.
  adminOverride: (leagueId: string, data: { user_id: string; tournament_id: string; golfer_id: string | null }) =>
    api.put<Pick | null>(`/leagues/${leagueId}/picks/admin-override`, data).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Standings
// ---------------------------------------------------------------------------

export const standingsApi = {
  get: (leagueId: string) =>
    api.get<StandingsResponse>(`/leagues/${leagueId}/standings`).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const adminApi = {
  fullSync: (year?: number) =>
    api.post("/admin/sync", null, { params: year ? { year } : {} }).then((r) => r.data),

  syncTournament: (pgaTourId: string) =>
    api.post(`/admin/sync/${pgaTourId}`).then((r) => r.data),
};
