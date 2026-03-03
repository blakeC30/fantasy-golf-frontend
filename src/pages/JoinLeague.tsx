/**
 * JoinLeague — landing page for invite links.
 *
 * Accessible at /join/:inviteCode (no auth required to reach the page, but
 * the API call requires a valid JWT — unauthenticated users are redirected
 * to /login by the axios interceptor).
 *
 * Private leagues (default): shows a "request submitted" confirmation.
 * Public leagues: auto-approved, so we redirect straight to the dashboard.
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { LeagueMember } from "../api/endpoints";
import { useJoinByCode } from "../hooks/useLeague";

export function JoinLeague() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const joinByCode = useJoinByCode();
  const [error, setError] = useState("");
  const [membership, setMembership] = useState<LeagueMember | null>(null);

  useEffect(() => {
    if (!inviteCode) return;
    joinByCode
      .mutateAsync(inviteCode)
      .then((m) => {
        if (m.status === "approved") {
          // Public league or already approved — go straight to the dashboard.
          navigate(`/leagues/${m.league_id}`);
        } else {
          // Private league — show pending confirmation instead of redirecting.
          setMembership(m);
        }
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        // Already a member or already pending — send them to their leagues list.
        if (msg?.toLowerCase().includes("already")) {
          navigate("/leagues");
        } else {
          setError(msg ?? "Failed to submit join request.");
        }
      });
  }, [inviteCode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => navigate("/leagues")}
            className="text-sm text-green-700 hover:underline"
          >
            Back to my leagues
          </button>
        </div>
      </div>
    );
  }

  if (membership) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-xl font-bold text-gray-900">Request submitted!</h1>
          <p className="text-gray-500 text-sm">
            Your join request has been sent to the league admin. You'll have access
            once they approve it.
          </p>
          <button
            onClick={() => navigate("/leagues")}
            className="text-sm text-green-700 hover:underline"
          >
            Back to my leagues
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Submitting join request…</p>
    </div>
  );
}
