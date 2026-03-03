/**
 * MyPicks — season history of the current user's picks and points earned.
 */

import { Link, useParams } from "react-router-dom";
import { useMyPicks } from "../hooks/usePick";
import { TournamentBadge } from "../components/TournamentBadge";

function formatPoints(pts: number | null): string {
  if (pts === null) return "—";
  if (pts >= 1_000_000) return `$${(pts / 1_000_000).toFixed(2)}M`;
  if (pts >= 1_000) return `$${(pts / 1_000).toFixed(1)}K`;
  return `$${pts.toLocaleString()}`;
}

export function MyPicks() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { data: picks, isLoading } = useMyPicks(leagueId!);

  const sorted = picks
    ?.slice()
    .sort((a, b) => a.tournament.start_date.localeCompare(b.tournament.start_date));

  const totalEarned = picks?.reduce((sum, p) => sum + (p.points_earned ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Picks</h1>
        <Link
          to={`/leagues/${leagueId}/pick`}
          className="bg-green-800 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          Make Pick
        </Link>
      </div>

      {/* Season total */}
      {picks && picks.length > 0 && (
        <div className="bg-green-900 text-white rounded-xl px-5 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-green-200">Season total</span>
          <span className="text-xl font-bold">{formatPoints(totalEarned)}</span>
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-400">Loading…</p>
      ) : sorted && sorted.length > 0 ? (
        <div className="space-y-3">
          {sorted.map((pick) => (
            <div
              key={pick.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{pick.tournament.name}</p>
                <TournamentBadge tournament={pick.tournament} showDates />
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm text-gray-500">{pick.golfer.name}</p>
                <p
                  className={`font-semibold ${
                    pick.points_earned === null
                      ? "text-gray-400"
                      : pick.points_earned > 0
                      ? "text-green-700"
                      : "text-red-500"
                  }`}
                >
                  {formatPoints(pick.points_earned)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p>No picks yet this season.</p>
          <Link to={`/leagues/${leagueId}/pick`} className="text-green-700 hover:underline text-sm mt-2 inline-block">
            Make your first pick →
          </Link>
        </div>
      )}
    </div>
  );
}
