/**
 * PlatformAdmin — platform-level administration panel.
 *
 * Accessible only to users with is_platform_admin = true.
 * Non-platform-admins are redirected to the leagues list.
 *
 * Responsibilities:
 *   - Manual data sync: trigger ESPN schedule + field + results scraping
 */

import { useState } from "react";
import { Navigate } from "react-router-dom";
import { adminApi } from "../api/endpoints";
import { useAuthStore } from "../store/authStore";

export function PlatformAdmin() {
  const user = useAuthStore((s) => s.user);

  const [syncStatus, setSyncStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [syncResult, setSyncResult] = useState<string>("");

  // Redirect anyone who isn't a platform admin.
  if (user && !user.is_platform_admin) {
    return <Navigate to="/leagues" replace />;
  }

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
      <h1 className="text-2xl font-bold text-gray-900">Platform Admin</h1>

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
