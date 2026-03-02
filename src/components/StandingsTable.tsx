/**
 * StandingsTable — displays league standings rows.
 */

import type { StandingsRow } from "../api/endpoints";
import { useAuthStore } from "../store/authStore";

function formatPoints(pts: number): string {
  if (pts >= 1_000_000) return `$${(pts / 1_000_000).toFixed(2)}M`;
  if (pts >= 1_000) return `$${(pts / 1_000).toFixed(1)}K`;
  return `$${pts.toLocaleString()}`;
}

interface Props {
  rows: StandingsRow[];
  limit?: number; // show only top N rows (undefined = all)
}

export function StandingsTable({ rows, limit }: Props) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const displayed = limit ? rows.slice(0, limit) : rows;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-green-900 text-white">
          <tr>
            <th className="px-4 py-2 text-left w-10">#</th>
            <th className="px-4 py-2 text-left">Player</th>
            <th className="px-4 py-2 text-right">Points</th>
            <th className="px-4 py-2 text-right hidden sm:table-cell">Picks</th>
            <th className="px-4 py-2 text-right hidden sm:table-cell">Missed</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((row, i) => {
            const isMe = row.user_id === currentUserId;
            return (
              <tr
                key={row.user_id}
                className={`border-t border-gray-100 ${
                  isMe ? "bg-green-50 font-semibold" : i % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
              >
                <td className="px-4 py-2 text-gray-500">{row.rank}</td>
                <td className="px-4 py-2">
                  {row.display_name}
                  {isMe && <span className="ml-1 text-green-700 text-xs">(you)</span>}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatPoints(row.total_points)}
                </td>
                <td className="px-4 py-2 text-right hidden sm:table-cell">{row.pick_count}</td>
                <td className="px-4 py-2 text-right hidden sm:table-cell text-red-500">
                  {row.missed_count > 0 ? row.missed_count : "—"}
                </td>
              </tr>
            );
          })}
          {displayed.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                No standings yet — picks will appear after tournaments complete.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
