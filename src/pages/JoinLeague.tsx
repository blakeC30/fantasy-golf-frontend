/**
 * JoinLeague — landing page for invite links.
 *
 * First fetches a league preview (name, member count, user's current status)
 * without committing anything, then lets the user confirm or cancel.
 *
 * States handled:
 *   - Loading: fetching preview
 *   - Invalid link: 404 from preview fetch
 *   - Already approved: redirect to the league dashboard
 *   - Pending: show status + option to cancel the request
 *   - No relationship: show confirm/cancel form
 */

import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useJoinByCode, useJoinPreview, useCancelMyRequest } from "../hooks/useLeague";

export function JoinLeague() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { data: preview, isLoading, isError } = useJoinPreview(inviteCode ?? "");
  const joinByCode = useJoinByCode();
  const cancelRequest = useCancelMyRequest();
  const [submitted, setSubmitted] = useState(false);
  const [joinError, setJoinError] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (isError || !preview) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-red-600 font-medium">Invalid invite link — league not found.</p>
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

  // Already an approved member — redirect straight to the dashboard.
  if (preview.user_status === "approved") {
    return <Navigate to={`/leagues/${preview.league_id}`} replace />;
  }

  const isPending = preview.user_status === "pending" || submitted;

  async function handleConfirm() {
    setJoinError("");
    try {
      const membership = await joinByCode.mutateAsync(inviteCode!);
      if (membership.status === "approved") {
        navigate(`/leagues/${membership.league_id}`);
      } else {
        setSubmitted(true);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setJoinError(msg ?? "Failed to submit join request.");
    }
  }

  async function handleCancel() {
    await cancelRequest.mutateAsync(String(preview!.league_id));
    navigate("/leagues");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white rounded-xl border border-gray-200 p-8 space-y-5">
        {/* League info */}
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-700">
            {isPending ? "Request pending" : "You've been invited to join"}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">{preview.name}</h1>
          {preview.description && (
            <p className="text-sm text-gray-500">{preview.description}</p>
          )}
          <p className="text-xs text-gray-400">
            {preview.member_count} member{preview.member_count !== 1 ? "s" : ""}
          </p>
        </div>

        {isPending ? (
          /* Pending state */
          <div className="space-y-3 text-center">
            <p className="text-sm text-gray-600">
              Your join request is waiting for approval from a league manager. You'll
              get access once they approve it.
            </p>
            <button
              onClick={() => navigate("/leagues")}
              className="w-full bg-green-800 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg"
            >
              Back to my leagues
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelRequest.isPending}
              className="w-full text-sm text-red-500 hover:underline disabled:opacity-40"
            >
              {cancelRequest.isPending ? "Cancelling…" : "Withdraw request"}
            </button>
          </div>
        ) : (
          /* Confirm state */
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center">
              Joining requires manager approval. Your request will be reviewed before
              you get access.
            </p>
            {joinError && (
              <p className="text-xs text-red-600 text-center">{joinError}</p>
            )}
            <button
              onClick={handleConfirm}
              disabled={joinByCode.isPending}
              className="w-full bg-green-800 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold py-2 rounded-lg"
            >
              {joinByCode.isPending ? "Submitting…" : "Request to Join"}
            </button>
            <button
              onClick={() => navigate("/leagues")}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
