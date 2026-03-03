/**
 * Leaderboard — full season standings for the league.
 */

import { useParams } from "react-router-dom";
import { useStandings } from "../hooks/usePick";
import { StandingsTable } from "../components/StandingsTable";

export function Leaderboard() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { data: standings, isLoading } = useStandings(leagueId!);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
        {standings && (
          <p className="text-sm text-gray-500 mt-0.5">{standings.season_year} Season</p>
        )}
      </div>

      {isLoading ? (
        <p className="text-gray-400">Loading…</p>
      ) : standings ? (
        <StandingsTable rows={standings.rows} />
      ) : (
        <p className="text-gray-400">No standings available yet.</p>
      )}
    </div>
  );
}
