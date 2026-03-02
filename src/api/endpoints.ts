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
  slug: string;
  description: string | null;
  no_pick_penalty: number;
  created_at: string;
}

export interface LeagueMember {
  user_id: string;
  league_id: string;
  role: "admin" | "member";
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
  tournament_id: string;
  golfer_id: string;
  points_earned: number | null;
  submitted_at: string;
  golfer: Golfer;
  tournament: Tournament;
}

export interface StandingsRow {
  rank: number;
  user_id: string;
  display_name: string;
  total_points: number;
  pick_count: number;
  missed_count: number;
}

export interface StandingsResponse {
  league_id: string;
  season_year: number;
  rows: StandingsRow[];
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
  create: (name: string, slug: string, description?: string, no_pick_penalty?: number) =>
    api.post<League>("/leagues", { name, slug, description, no_pick_penalty }).then((r) => r.data),

  get: (slug: string) =>
    api.get<League>(`/leagues/${slug}`).then((r) => r.data),

  join: (slug: string) =>
    api.post<LeagueMember>(`/leagues/${slug}/join`).then((r) => r.data),

  members: (slug: string) =>
    api.get<LeagueMember[]>(`/leagues/${slug}/members`).then((r) => r.data),

  updateMemberRole: (slug: string, userId: string, role: "admin" | "member") =>
    api.patch<LeagueMember>(`/leagues/${slug}/members/${userId}/role`, { role }).then((r) => r.data),

  removeMember: (slug: string, userId: string) =>
    api.delete(`/leagues/${slug}/members/${userId}`).then((r) => r.data),

  getTournaments: (slug: string) =>
    api.get<Tournament[]>(`/leagues/${slug}/tournaments`).then((r) => r.data),

  updateTournaments: (slug: string, tournamentIds: string[]) =>
    api.put<Tournament[]>(`/leagues/${slug}/tournaments`, { tournament_ids: tournamentIds }).then((r) => r.data),
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
  submit: (slug: string, tournament_id: string, golfer_id: string) =>
    api.post<Pick>(`/leagues/${slug}/picks`, { tournament_id, golfer_id }).then((r) => r.data),

  change: (slug: string, pickId: string, golfer_id: string) =>
    api.patch<Pick>(`/leagues/${slug}/picks/${pickId}`, { golfer_id }).then((r) => r.data),

  mine: (slug: string) =>
    api.get<Pick[]>(`/leagues/${slug}/picks/mine`).then((r) => r.data),

  all: (slug: string) =>
    api.get<Pick[]>(`/leagues/${slug}/picks`).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Standings
// ---------------------------------------------------------------------------

export const standingsApi = {
  get: (slug: string) =>
    api.get<StandingsResponse>(`/leagues/${slug}/standings`).then((r) => r.data),
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
