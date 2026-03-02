/**
 * JoinLeague — deep-link page for joining a league by slug.
 *
 * Accessible at /join/:slug so league admins can share a direct URL.
 * Automatically submits the join request and redirects to the dashboard.
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useJoinLeague } from "../hooks/useLeague";

export function JoinLeague() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const joinLeague = useJoinLeague();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    joinLeague
      .mutateAsync(slug)
      .then(() => navigate(`/leagues/${slug}`))
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        // "Already a member" isn't an error — just redirect.
        if (msg?.toLowerCase().includes("already")) {
          navigate(`/leagues/${slug}`);
        } else {
          setError(msg ?? "Failed to join league.");
        }
      });
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => navigate("/leagues")}
            className="text-sm text-green-700 hover:underline"
          >
            Back to leagues
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Joining league…</p>
    </div>
  );
}
