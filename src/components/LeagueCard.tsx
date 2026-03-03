/**
 * LeagueCard — rich at-a-glance card for a single league.
 *
 * Fetches standings (rank, points, pick count) and membership (role) for the
 * current user independently so each card loads progressively. React Query
 * caches both queries, so navigating back from a league page is instant.
 */

import { Link } from "react-router-dom";
import { type League } from "../api/endpoints";
import { useLeagueMembers } from "../hooks/useLeague";
import { useStandings } from "../hooks/usePick";
import { useAuthStore } from "../store/authStore";

function rankStyle(rank: number): string {
  if (rank === 1) return "text-amber-500";
  if (rank === 2) return "text-slate-400";
  if (rank === 3) return "text-orange-400";
  return "text-gray-800";
}

function formatPoints(pts: number): string {
  return "$" + Math.round(pts).toLocaleString();
}

export function LeagueCard({ league }: { league: League }) {
  const currentUser = useAuthStore((s) => s.user);
  const { data: standings } = useStandings(league.id);
  const { data: members } = useLeagueMembers(league.id);

  const myRow = standings?.rows.find((r) => r.user_id === currentUser?.id);
  const isManager = members?.find((m) => m.user_id === currentUser?.id)?.role === "manager";
  const memberCount = standings?.rows.length;

  return (
    <Link
      to={`/leagues/${league.id}`}
      className="group flex flex-col bg-white rounded-xl border border-gray-200 border-l-[5px] border-l-green-700 hover:border-l-green-500 hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-green-800 transition-colors">
            {league.name}
          </h2>
          {isManager && (
            <span className="flex-shrink-0 mt-0.5 text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
              Manager
            </span>
          )}
        </div>
        {league.description && (
          <p className="text-sm text-gray-500 leading-relaxed mt-0.5">{league.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="border-t border-gray-100 px-5 py-3 grid grid-cols-3 gap-2">
        {/* Rank */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Rank
          </p>
          <p className={`text-2xl font-bold tabular-nums leading-none ${myRow ? rankStyle(myRow.rank) : "text-gray-200"}`}>
            {myRow ? (myRow.is_tied ? `T${myRow.rank}` : `${myRow.rank}`) : "—"}
          </p>
        </div>

        {/* Points */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Points
          </p>
          <p className="text-2xl font-bold tabular-nums leading-none text-gray-800">
            {myRow ? formatPoints(myRow.total_points) : "—"}
          </p>
        </div>

        {/* Members */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Members
          </p>
          <p className="text-2xl font-bold tabular-nums leading-none text-gray-800">
            {memberCount ?? "—"}
          </p>
        </div>
      </div>
    </Link>
  );
}
