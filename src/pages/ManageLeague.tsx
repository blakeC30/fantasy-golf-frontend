/**
 * ManageLeague — league manager panel.
 *
 * Members management (role changes, removal), join request approval,
 * tournament schedule selection, and league settings editing.
 * Non-managers are redirected to the league dashboard.
 */

import { useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import {
  useApproveRequest,
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
import { fmtTournamentName } from "../utils";
import { useAuthStore } from "../store/authStore";

export function ManageLeague() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const currentUser = useAuthStore((s) => s.user);

  const { data: league } = useLeague(leagueId!);
  const { data: members, isLoading } = useLeagueMembers(leagueId!);
  const updateRole = useUpdateMemberRole(leagueId!);
  const removeMember = useRemoveMember(leagueId!);

  const { data: pendingRequests } = usePendingRequests(leagueId!);
  const approveRequest = useApproveRequest(leagueId!);
  const denyRequest = useDenyRequest(leagueId!);

  const [linkCopied, setLinkCopied] = useState(false);

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

  // Current user's role — redirect non-managers back to the league dashboard.
  const myMembership = members?.find((m) => m.user_id === currentUser?.id);
  const isManager = myMembership?.role === "manager";

  // Wait for members to load before redirecting — avoids a flash redirect
  // on initial render before the query resolves.
  if (!isLoading && members !== undefined && !isManager) {
    return <Navigate to={`/leagues/${leagueId}`} replace />;
  }

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">League Management</h1>

      {/* Invite link — manager only */}
      {isManager && league && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Invite Link</h2>
          <p className="text-sm text-gray-500 mb-3">
            Share this link to let people request to join your league.
            As league manager, you'll approve or deny requests below.
          </p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <span className="text-sm text-gray-700 flex-1 truncate font-mono">
              {window.location.origin}/join/{league.invite_code}
            </span>
            <button
              onClick={copyInviteLink}
              className="text-xs font-semibold text-green-700 hover:text-green-900 whitespace-nowrap"
            >
              {linkCopied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </section>
      )}

      {/* League Settings — manager only, edit-gated */}
      {isManager && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">League Settings</h2>
            {!settingsEditing && (
              <button
                onClick={() => setSettingsEditing(true)}
                className="text-sm font-semibold text-green-700 hover:text-green-900"
              >
                Edit
              </button>
            )}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {/* Name */}
            <div className="flex items-center gap-4 px-4 py-3">
              <span className="text-sm text-gray-500 w-36 flex-shrink-0">Name</span>
              {settingsEditing ? (
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              ) : (
                <span className="text-sm text-gray-900">{league?.name}</span>
              )}
            </div>
            {/* Description */}
            <div className="flex items-start gap-4 px-4 py-3">
              <span className="text-sm text-gray-500 w-36 flex-shrink-0 pt-1">Description</span>
              {settingsEditing ? (
                <textarea
                  value={settingsDescription}
                  onChange={(e) => setSettingsDescription(e.target.value)}
                  rows={2}
                  className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-700 resize-none"
                />
              ) : (
                <span className="text-sm text-gray-900">
                  {league?.description || <span className="text-gray-400">No description</span>}
                </span>
              )}
            </div>
            {/* No-pick penalty */}
            <div className="flex items-center gap-4 px-4 py-3">
              <span className="text-sm text-gray-500 w-36 flex-shrink-0">No-pick penalty</span>
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
                <span className="text-sm text-gray-900">
                  {league?.no_pick_penalty.toLocaleString()} pts
                </span>
              )}
            </div>
          </div>
          {settingsEditing && (
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleSaveSettings}
                disabled={updateLeague.isPending}
                className="bg-green-800 hover:bg-green-700 disabled:opacity-40 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
              >
                {updateLeague.isPending ? "Saving…" : "Save Settings"}
              </button>
              <button
                onClick={handleCancelSettings}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      )}

      {/* Pending join requests — manager only */}
      {isManager && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Join Requests
            {pendingRequests && pendingRequests.length > 0 && (
              <span className="ml-2 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </h2>
          {!pendingRequests || pendingRequests.length === 0 ? (
            <p className="text-sm text-gray-400">No pending requests.</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
              {pendingRequests.map((r) => (
                <div key={r.user_id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{r.user.display_name}</p>
                    <p className="text-xs text-gray-400">{r.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => approveRequest.mutate(r.user_id)}
                      disabled={approveRequest.isPending}
                      className="text-xs font-semibold text-green-700 hover:underline disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Deny ${r.user.display_name}'s request?`))
                          denyRequest.mutate(r.user_id);
                      }}
                      disabled={denyRequest.isPending}
                      className="text-xs text-red-500 hover:underline disabled:opacity-40"
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
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">League Members</h2>
        {isLoading ? (
          <p className="text-gray-400">Loading…</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members?.map((m) => {
                  const isMe = m.user_id === currentUser?.id;
                  return (
                    <tr key={m.user_id} className={isMe ? "bg-green-50" : ""}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {m.user.display_name}
                        {isMe && <span className="ml-1 text-xs text-green-600">(you)</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{m.user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            m.role === "manager"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {m.role === "manager" ? "League Manager" : "Member"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isMe && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                updateRole.mutate({
                                  userId: m.user_id,
                                  role: m.role === "manager" ? "member" : "manager",
                                })
                              }
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {m.role === "manager" ? "Remove manager" : "Make manager"}
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${m.user.display_name} from the league?`))
                                  removeMember.mutate(m.user_id);
                              }}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </td>
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
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-gray-800">Tournament Schedule</h2>
            {!scheduleEditing && (
              <button
                onClick={() => setScheduleEditing(true)}
                className="text-sm font-semibold text-green-700 hover:text-green-900"
              >
                Edit
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Select which PGA Tour events count for your league. Picks and standings
            are scoped to only these tournaments.
          </p>

          {!allTournaments ? (
            <p className="text-gray-400 text-sm">Loading tournaments…</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(byMonth ?? {})
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, tournaments]) => (
                  <div key={month}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      {new Date(month + "-15").toLocaleString("default", { month: "long", year: "numeric" })}
                    </p>
                    <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                      {[...tournaments]
                        .sort((a, b) => a.start_date.localeCompare(b.start_date))
                        .map((t) => {
                          const checked = selectedIds.has(t.id);
                          const isPast = t.status === "completed";
                          const effectiveMultiplier = multipliers[t.id] ?? t.multiplier;
                          return (
                            <div
                              key={t.id}
                              className={`flex items-center gap-3 px-4 py-3 ${
                                scheduleEditing ? "cursor-pointer hover:bg-gray-50" : "cursor-default"
                              } ${isPast ? "opacity-50" : ""}`}
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
                                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
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
                              <span className="text-xs text-gray-400 flex-shrink-0">{t.start_date}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
            </div>
          )}
          {scheduleEditing && (
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleSaveSchedule}
                disabled={updateSchedule.isPending}
                className="bg-green-800 hover:bg-green-700 disabled:opacity-40 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
              >
                {updateSchedule.isPending ? "Saving…" : "Save Schedule"}
              </button>
              <button
                onClick={handleCancelSchedule}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          )}
        </section>
      )}

    </div>
  );
}
