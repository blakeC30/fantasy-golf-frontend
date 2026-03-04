/**
 * ManageLeague — league manager panel.
 *
 * Members management (role changes, removal), join request approval,
 * tournament schedule selection, and league settings editing.
 * Non-managers are redirected to the league dashboard.
 */

import { Fragment, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  useApproveRequest,
  useDeleteLeague,
  useDenyRequest,
  useLeague,
  useLeagueMembers,
  useLeagueTournaments,
  usePendingRequests,
  useRemoveMember,
  useUpdateLeague,
  useUpdateLeagueTournaments,
  useUpdateMemberRole,
} from "../hooks/useLeague";
import { useTournaments } from "../hooks/usePick";
import { fmtTournamentName, isoWeekKey } from "../utils";
import { useAuthStore } from "../store/authStore";

// ---------------------------------------------------------------------------
// Small icon helpers
// ---------------------------------------------------------------------------

function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-8 h-8 bg-green-50 text-green-700 rounded-lg flex items-center justify-center flex-shrink-0">
      {children}
    </div>
  );
}

export function ManageLeague() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data: league } = useLeague(leagueId!);
  const { data: members, isLoading } = useLeagueMembers(leagueId!);
  const updateRole = useUpdateMemberRole(leagueId!);
  const removeMember = useRemoveMember(leagueId!);

  const { data: pendingRequests } = usePendingRequests(leagueId!);
  const approveRequest = useApproveRequest(leagueId!);
  const denyRequest = useDenyRequest(leagueId!);

  const deleteLeague = useDeleteLeague();
  const [dangerStep, setDangerStep] = useState<"idle" | "editing" | "confirming">("idle");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [linkCopied, setLinkCopied] = useState(false);
  const [membersEditing, setMembersEditing] = useState(false);

  function copyInviteLink() {
    if (!league) return;
    const url = `${window.location.origin}/join/${league.invite_code}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  // ---------------------------------------------------------------------------
  // League settings state — edit-gated, initialized from server data
  // ---------------------------------------------------------------------------

  const updateLeague = useUpdateLeague(leagueId!);
  const [settingsEditing, setSettingsEditing] = useState(false);
  const [settingsName, setSettingsName] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsNoPick, setSettingsNoPick] = useState(-50000);

  useEffect(() => {
    if (league) {
      setSettingsName(league.name);
      setSettingsDescription(league.description ?? "");
      setSettingsNoPick(league.no_pick_penalty);
    }
  }, [league]);

  function handleCancelSettings() {
    if (league) {
      setSettingsName(league.name);
      setSettingsDescription(league.description ?? "");
      setSettingsNoPick(league.no_pick_penalty);
    }
    setSettingsEditing(false);
  }

  async function handleSaveSettings() {
    await updateLeague.mutateAsync({
      name: settingsName,
      description: settingsDescription || null,
      no_pick_penalty: settingsNoPick,
    });
    setSettingsEditing(false);
  }

  // ---------------------------------------------------------------------------
  // Tournament schedule state
  // ---------------------------------------------------------------------------

  const { data: allTournaments } = useTournaments();
  const { data: leagueTournaments } = useLeagueTournaments(leagueId!);
  const updateSchedule = useUpdateLeagueTournaments(leagueId!);
  const [scheduleEditing, setScheduleEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Per-tournament multiplier overrides. Key = tournament id, value = multiplier.
  const [multipliers, setMultipliers] = useState<Record<string, number>>({});
  const [scheduleSaved, setScheduleSaved] = useState(false);

  // Initialize checkboxes + multipliers from the server's saved schedule exactly
  // once per mount. Using a ref flag prevents background React Query refetches
  // from overwriting the user's unsaved changes.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (leagueTournaments && !initializedRef.current) {
      setSelectedIds(new Set(leagueTournaments.map((t) => t.id)));
      setMultipliers(
        Object.fromEntries(leagueTournaments.map((t) => [t.id, t.effective_multiplier]))
      );
      initializedRef.current = true;
    }
  }, [leagueTournaments]);

  // Fast lookup from tournament id → global tournament (for default multiplier).
  const allTournamentsById = Object.fromEntries(
    (allTournaments ?? []).map((t) => [t.id, t])
  );

  function toggleTournament(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setScheduleSaved(false);
  }

  function setMultiplierFor(id: string, value: number) {
    setMultipliers((prev) => ({ ...prev, [id]: value }));
    setScheduleSaved(false);
  }

  function handleCancelSchedule() {
    if (leagueTournaments) {
      setSelectedIds(new Set(leagueTournaments.map((t) => t.id)));
      setMultipliers(
        Object.fromEntries(leagueTournaments.map((t) => [t.id, t.effective_multiplier]))
      );
    }
    setScheduleSaved(false);
    setScheduleEditing(false);
  }

  async function handleSaveSchedule() {
    await updateSchedule.mutateAsync(
      [...selectedIds].map((id) => ({
        tournament_id: id,
        multiplier: multipliers[id] ?? allTournamentsById[id]?.multiplier ?? 1.0,
      }))
    );
    setScheduleSaved(true);
    setScheduleEditing(false);
  }

  // Group all tournaments by month, sorted earliest to latest within each group.
  const byMonth = allTournaments?.reduce<Record<string, typeof allTournaments>>((acc, t) => {
    const key = t.start_date.slice(0, 7); // "YYYY-MM"
    (acc[key] ??= []).push(t);
    return acc;
  }, {});

  // True when 2+ selected tournaments share an ISO week — blocks schedule save.
  const hasScheduleConflicts = (() => {
    const counts = new Map<string, number>();
    for (const t of allTournaments ?? []) {
      if (selectedIds.has(t.id)) {
        const wk = isoWeekKey(t.start_date);
        counts.set(wk, (counts.get(wk) ?? 0) + 1);
      }
    }
    return [...counts.values()].some((c) => c > 1);
  })();

  // Current user's role — redirect non-managers back to the league dashboard.
  const myMembership = members?.find((m) => m.user_id === currentUser?.id);
  const isManager = myMembership?.role === "manager";

  // Wait for members to load before redirecting — avoids a flash redirect
  // on initial render before the query resolves.
  if (!isLoading && members !== undefined && !isManager) {
    return <Navigate to={`/leagues/${leagueId}`} replace />;
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-green-700">
          Manager Panel
        </p>
        <h1 className="text-3xl font-bold text-gray-900">{league?.name ?? "League Management"}</h1>
      </div>

      {/* Invite link — manager only */}
      {isManager && league && (
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <SectionIcon>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
            </SectionIcon>
            <h2 className="text-base font-bold text-gray-900">Invite Link</h2>
          </div>
          <p className="text-sm text-gray-500">
            Share this link to let people request to join your league.
            As league manager, you'll approve or deny requests below.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-200">
            {/* Full invite URL */}
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-gray-700 flex-1 truncate font-mono text-xs">
                {window.location.origin}/join/{league.invite_code}
              </span>
              <button
                onClick={copyInviteLink}
                className={`flex-shrink-0 text-sm font-semibold px-4 py-1.5 rounded-lg border transition-colors ${
                  linkCopied
                    ? "bg-green-50 border-green-300 text-green-700"
                    : "border-gray-300 text-gray-700 hover:border-green-400 hover:text-green-700"
                }`}
              >
                {linkCopied ? "✓ Copied!" : "Copy link"}
              </button>
            </div>
            {/* Bare join code */}
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-xs text-gray-400">Join code</span>
              <span className="font-mono text-sm font-semibold text-gray-800 tracking-wider">
                {league.invite_code}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* League Settings — manager only, edit-gated */}
      {isManager && (
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SectionIcon>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </SectionIcon>
              <h2 className="text-base font-bold text-gray-900">League Settings</h2>
            </div>
            {!settingsEditing && (
              <button
                onClick={() => setSettingsEditing(true)}
                className="text-sm font-semibold text-green-700 hover:text-green-900 transition-colors"
              >
                Edit
              </button>
            )}
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
            {/* Name */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 px-4 py-3">
              <span className="text-sm text-gray-500 sm:w-36 sm:flex-shrink-0">Name</span>
              {settingsEditing ? (
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  maxLength={60}
                  className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              ) : (
                <span className="text-sm font-medium text-gray-900 break-words">{league?.name}</span>
              )}
            </div>
            {/* Description */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-4 px-4 py-3">
              <span className="text-sm text-gray-500 sm:w-36 sm:flex-shrink-0 sm:pt-1">Description</span>
              {settingsEditing ? (
                <textarea
                  value={settingsDescription}
                  onChange={(e) => setSettingsDescription(e.target.value)}
                  rows={2}
                  maxLength={200}
                  className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-700 resize-none"
                />
              ) : (
                <span className="text-sm text-gray-900 break-words">
                  {league?.description || <span className="text-gray-400">No description</span>}
                </span>
              )}
            </div>
            {/* No-pick penalty */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 px-4 py-3">
              <span className="text-sm text-gray-500 sm:w-36 sm:flex-shrink-0">No-pick penalty</span>
              {settingsEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settingsNoPick}
                    onChange={(e) => setSettingsNoPick(parseInt(e.target.value, 10) || 0)}
                    className="w-36 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                  <span className="text-xs text-gray-400">points per missed pick</span>
                </div>
              ) : (
                <span className="text-sm font-medium text-gray-900">
                  {league?.no_pick_penalty.toLocaleString()} pts
                </span>
              )}
            </div>
          </div>
          {settingsEditing && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveSettings}
                disabled={updateLeague.isPending}
                className="bg-green-800 hover:bg-green-700 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
              >
                {updateLeague.isPending ? "Saving…" : "Save Settings"}
              </button>
              <button
                onClick={handleCancelSettings}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      )}

      {/* Pending join requests — manager only */}
      {isManager && (
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <SectionIcon>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </SectionIcon>
            <h2 className="text-base font-bold text-gray-900">
              Join Requests
              {pendingRequests && pendingRequests.length > 0 && (
                <span className="ml-2 text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {pendingRequests.length}
                </span>
              )}
            </h2>
          </div>
          {!pendingRequests || pendingRequests.length === 0 ? (
            <p className="text-sm text-gray-400">No pending requests.</p>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
              {pendingRequests.map((r) => (
                <div key={r.user_id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{r.user.display_name}</p>
                    <p className="text-xs text-gray-400">{r.user.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => approveRequest.mutate(r.user_id)}
                      disabled={approveRequest.isPending}
                      className="text-xs font-bold text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Deny ${r.user.display_name}'s request?`))
                          denyRequest.mutate(r.user_id);
                      }}
                      disabled={denyRequest.isPending}
                      className="text-xs font-medium text-red-500 hover:underline disabled:opacity-40 transition-colors"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Members */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SectionIcon>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </SectionIcon>
            <h2 className="text-base font-bold text-gray-900">League Members</h2>
          </div>
          {isManager && (
            membersEditing ? (
              <button
                onClick={() => setMembersEditing(false)}
                className="text-sm font-semibold text-green-700 hover:text-green-900 transition-colors"
              >
                Done
              </button>
            ) : (
              <button
                onClick={() => setMembersEditing(true)}
                className="text-sm font-semibold text-green-700 hover:text-green-900 transition-colors"
              >
                Edit
              </button>
            )
          )}
        </div>
        {isLoading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full text-sm">
              <thead className="bg-green-900 text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider font-semibold">Name</th>
                  <th className="hidden sm:table-cell px-4 py-2.5 text-left text-xs uppercase tracking-wider font-semibold">Email</th>
                  <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider font-semibold">Role</th>
                  {membersEditing && (
                    <th className="px-4 py-2.5 text-right text-xs uppercase tracking-wider font-semibold">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members?.map((m) => {
                  const isMe = m.user_id === currentUser?.id;
                  return (
                    <tr key={m.user_id} className={isMe ? "bg-green-50" : "hover:bg-gray-50"}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {m.user.display_name}
                        {isMe && <span className="ml-1.5 text-xs text-green-600 font-normal">(you)</span>}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-500">{m.user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            m.role === "manager"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {m.role === "manager" ? "League Manager" : "Member"}
                        </span>
                      </td>
                      {membersEditing && (
                        <td className="px-4 py-3 text-right">
                          {!isMe && (
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() =>
                                  updateRole.mutate({
                                    userId: m.user_id,
                                    role: m.role === "manager" ? "member" : "manager",
                                  })
                                }
                                className="text-xs font-medium text-blue-600 hover:underline transition-colors"
                              >
                                {m.role === "manager" ? "Remove manager" : "Make manager"}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Remove ${m.user.display_name} from the league?`))
                                    removeMember.mutate(m.user_id);
                                }}
                                className="text-xs font-medium text-red-500 hover:underline transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Tournament Schedule — manager only */}
      {isManager && (
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SectionIcon>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              </SectionIcon>
              <h2 className="text-base font-bold text-gray-900">Tournament Schedule</h2>
            </div>
            {!scheduleEditing && (
              <button
                onClick={() => setScheduleEditing(true)}
                className="text-sm font-semibold text-green-700 hover:text-green-900 transition-colors"
              >
                Edit
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Select which PGA Tour events count for your league. Picks and standings
            are scoped to only these tournaments.
          </p>
          {scheduleSaved && !scheduleEditing && (
            <p className="text-sm text-green-700 font-medium">✓ Schedule saved.</p>
          )}

          {!allTournaments ? (
            <p className="text-gray-400 text-sm">Loading tournaments…</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(byMonth ?? {})
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, monthTournaments]) => {
                  // Group by ISO week within this month to detect same-week conflicts.
                  const weekEntries = Object.entries(
                    [...monthTournaments]
                      .sort((a, b) => a.start_date.localeCompare(b.start_date))
                      .reduce<Record<string, typeof monthTournaments>>((acc, t) => {
                        const wk = isoWeekKey(t.start_date);
                        (acc[wk] ??= []).push(t);
                        return acc;
                      }, {})
                  ).sort(([a], [b]) => a.localeCompare(b));

                  return (
                    <div key={month}>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        {new Date(month + "-15").toLocaleString("default", { month: "long", year: "numeric" })}
                      </p>
                      <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                        {weekEntries.map(([weekKey, weekTournaments]) => {
                          const selectedInWeek = weekTournaments.filter((t) => selectedIds.has(t.id));
                          const hasWeekConflict = selectedInWeek.length > 1;
                          return (
                            <Fragment key={weekKey}>
                              {weekTournaments.map((t) => {
                                const checked = selectedIds.has(t.id);
                                const isPast = t.status === "completed";
                                const effectiveMultiplier = multipliers[t.id] ?? t.multiplier;
                                return (
                                  <div
                                    key={t.id}
                                    className={`flex items-center gap-3 px-4 py-3 ${
                                      scheduleEditing ? "cursor-pointer hover:bg-gray-100" : "cursor-default"
                                    } ${isPast ? "opacity-50" : ""} ${hasWeekConflict && checked ? "bg-amber-50" : ""}`}
                                    onClick={() => scheduleEditing && toggleTournament(t.id)}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {}}
                                      disabled={!scheduleEditing}
                                      className="accent-green-800 h-4 w-4 flex-shrink-0 disabled:opacity-60 pointer-events-none"
                                    />
                                    <span className="flex-1 text-sm text-gray-900">{fmtTournamentName(t.name)}</span>

                                    {/* Multiplier — picker when editing + checked, badge otherwise */}
                                    {checked && scheduleEditing ? (
                                      <div
                                        className="flex items-center gap-1 flex-shrink-0"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {[1.0, 1.5, 2.0].map((preset) => (
                                          <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setMultiplierFor(t.id, preset)}
                                            className={`text-xs px-2 py-0.5 rounded font-semibold transition-colors ${
                                              effectiveMultiplier === preset
                                                ? preset >= 2
                                                  ? "bg-amber-500 text-white"
                                                  : preset === 1.5
                                                  ? "bg-blue-600 text-white"
                                                  : "bg-green-800 text-white"
                                                : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                                            }`}
                                          >
                                            {preset === 1.0 ? "1×" : preset === 1.5 ? "1.5×" : "2×"}
                                          </button>
                                        ))}
                                      </div>
                                    ) : checked && effectiveMultiplier !== 1.0 ? (
                                      <span
                                        className={`flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${
                                          effectiveMultiplier >= 2
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-blue-50 text-blue-700"
                                        }`}
                                      >
                                        {effectiveMultiplier}×
                                      </span>
                                    ) : null}
                                    <span className="hidden sm:block text-xs text-gray-400 flex-shrink-0">{t.start_date}</span>
                                  </div>
                                );
                              })}
                              {hasWeekConflict && (
                                <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-50 text-amber-800 text-xs">
                                  <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                  </svg>
                                  <span>
                                    Only one tournament per week is allowed. Uncheck either{" "}
                                    <strong>{fmtTournamentName(selectedInWeek[0].name)}</strong>
                                    {" "}or{" "}
                                    <strong>{fmtTournamentName(selectedInWeek[1].name)}</strong>.
                                  </span>
                                </div>
                              )}
                            </Fragment>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
          {scheduleEditing && (
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveSchedule}
                disabled={updateSchedule.isPending || hasScheduleConflicts}
                className="bg-green-800 hover:bg-green-700 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
              >
                {updateSchedule.isPending ? "Saving…" : "Save Schedule"}
              </button>
              <button
                onClick={handleCancelSchedule}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      )}

      {/* Danger Zone — manager only */}
      {isManager && (
        <section className="bg-white rounded-2xl border border-red-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-gray-900">Danger Zone</h2>
            </div>
            {dangerStep === "idle" && (
              <button
                onClick={() => setDangerStep("editing")}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Edit
              </button>
            )}
            {dangerStep === "editing" && (
              <button
                onClick={() => setDangerStep("idle")}
                className="text-sm font-semibold text-green-700 hover:text-green-900 transition-colors"
              >
                Done
              </button>
            )}
          </div>

          <p className="text-sm text-gray-500">
            Permanently delete this league and all of its data — members, picks, and standings.
            This action cannot be undone.
          </p>

          {dangerStep === "editing" && (
            <button
              onClick={() => setDangerStep("confirming")}
              className="text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl transition-colors"
            >
              Delete League
            </button>
          )}

          {dangerStep === "confirming" && (
            <div className="space-y-3 bg-red-50 border border-red-200 rounded-xl p-4">
              {deleteLeague.error && (
                <p className="text-sm text-red-700">Failed to delete league. Please try again.</p>
              )}
              <p className="text-sm text-gray-700">
                Type <span className="font-semibold">{league?.name}</span> to confirm deletion.
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={league?.name}
                className="w-full border border-red-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-shadow"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    deleteLeague.mutate(leagueId!, {
                      onSuccess: () => navigate("/leagues"),
                    });
                  }}
                  disabled={deleteConfirmText !== league?.name || deleteLeague.isPending}
                  className="text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl transition-colors"
                >
                  {deleteLeague.isPending ? "Deleting…" : "Confirm Delete"}
                </button>
                <button
                  onClick={() => { setDangerStep("editing"); setDeleteConfirmText(""); deleteLeague.reset(); }}
                  disabled={deleteLeague.isPending}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
