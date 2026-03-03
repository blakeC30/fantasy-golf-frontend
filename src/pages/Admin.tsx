/**
 * Admin — platform admin panel.
 *
 * Members management (role changes, removal) + manual data sync trigger.
 * Only accessible to users with is_platform_admin = true (enforced by Layout nav
 * and by the backend require_platform_admin dependency).
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { adminApi } from "../api/endpoints";
import {
  useApproveRequest,
  useDenyRequest,
  useLeague,
  useLeagueMembers,
  useLeagueTournaments,
  usePendingRequests,
  useRemoveMember,
  useUpdateLeagueTournaments,
  useUpdateMemberRole,
} from "../hooks/useLeague";
import { useTournaments } from "../hooks/usePick";
import { useAuthStore } from "../store/authStore";

export function Admin() {
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

  // Tournament schedule state
  const { data: allTournaments } = useTournaments();
  const { data: leagueTournaments } = useLeagueTournaments(leagueId!);
  const updateSchedule = useUpdateLeagueTournaments(leagueId!);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scheduleSaved, setScheduleSaved] = useState(false);

  // Initialise checkboxes once the league's current schedule loads.
  useEffect(() => {
    if (leagueTournaments) {
      setSelectedIds(new Set(leagueTournaments.map((t) => t.id)));
    }
  }, [leagueTournaments]);

  function toggleTournament(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setScheduleSaved(false);
  }

  async function handleSaveSchedule() {
    await updateSchedule.mutateAsync([...selectedIds]);
    setScheduleSaved(true);
  }

  // Group all tournaments by month for display.
  const byMonth = allTournaments?.reduce<Record<string, typeof allTournaments>>((acc, t) => {
    const key = t.start_date.slice(0, 7); // "YYYY-MM"
    (acc[key] ??= []).push(t);
    return acc;
  }, {});

  // Current user's role — determines whether the schedule section is editable.
  const myMembership = members?.find((m) => m.user_id === currentUser?.id);
  const isAdmin = myMembership?.role === "admin";

  const [syncStatus, setSyncStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [syncResult, setSyncResult] = useState<string>("");

  async function handleFullSync() {
    setSyncStatus("running");
    setSyncResult("");
    try {
      const result = await adminApi.fullSync();
      setSyncResult(JSON.stringify(result, null, 2));
      setSyncStatus("done");
    } catch {
      setSyncStatus("error");
      setSyncResult("Sync failed — check backend logs.");
    }
  }

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">Admin</h1>

      {/* Invite link — admin only */}
      {isAdmin && league && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Invite Link</h2>
          <p className="text-sm text-gray-500 mb-3">
            Share this link to let people request to join your league.
            You'll approve or deny requests below.
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

      {/* Pending join requests — admin only */}
      {isAdmin && (
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
                            m.role === "admin"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isMe && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                updateRole.mutate({
                                  userId: m.user_id,
                                  role: m.role === "admin" ? "member" : "admin",
                                })
                              }
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {m.role === "admin" ? "Demote" : "Promote"}
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

      {/* Tournament Schedule — admin only */}
      {isAdmin && (
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-gray-800">Tournament Schedule</h2>
            <button
              onClick={handleSaveSchedule}
              disabled={updateSchedule.isPending}
              className="bg-green-800 hover:bg-green-700 disabled:opacity-40 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
            >
              {updateSchedule.isPending ? "Saving…" : scheduleSaved ? "Saved ✓" : "Save Schedule"}
            </button>
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
                      {tournaments.map((t) => {
                        const checked = selectedIds.has(t.id);
                        const isPast = t.status === "completed";
                        return (
                          <label
                            key={t.id}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                              isPast ? "opacity-50" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTournament(t.id)}
                              className="accent-green-800 h-4 w-4 flex-shrink-0"
                            />
                            <span className="flex-1 text-sm text-gray-900">{t.name}</span>
                            <span className="text-xs text-gray-400">{t.start_date}</span>
                            {t.multiplier >= 2 && (
                              <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                2× MAJOR
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {/* Data sync */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Data Sync</h2>
        <p className="text-sm text-gray-500 mb-4">
          Pulls the latest PGA Tour schedule, tournament fields, and results from ESPN.
          The scheduler runs this automatically daily at 6 AM UTC.
        </p>
        <button
          onClick={handleFullSync}
          disabled={syncStatus === "running"}
          className="bg-green-800 hover:bg-green-700 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
        >
          {syncStatus === "running" ? "Syncing…" : "Run Full Sync"}
        </button>

        {syncResult && (
          <pre
            className={`mt-4 text-xs rounded-lg p-4 overflow-auto max-h-64 ${
              syncStatus === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-gray-50 text-gray-700 border border-gray-200"
            }`}
          >
            {syncResult}
          </pre>
        )}
      </section>
    </div>
  );
}
