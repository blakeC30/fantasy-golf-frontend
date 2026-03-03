/**
 * TournamentBadge — shows tournament status and major/multiplier indicator.
 */

import type { Tournament } from "../api/endpoints";

function formatPurse(purse: number | null): string | null {
  if (purse === null) return null;
  if (purse >= 1_000_000) {
    const m = purse / 1_000_000;
    return `$${m % 1 === 0 ? m : m.toFixed(1)}M`;
  }
  return `$${Math.round(purse / 1000)}K`;
}

const STATUS_STYLE: Record<Tournament["status"], string> = {
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-600",
};

const STATUS_LABEL: Record<Tournament["status"], string> = {
  scheduled: "Upcoming",
  in_progress: "Live",
  completed: "Final",
};

interface Props {
  // Accept both plain Tournament and LeagueTournamentOut (which adds effective_multiplier).
  tournament: Tournament & { effective_multiplier?: number };
  showDates?: boolean;
}

export function TournamentBadge({ tournament, showDates = false }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[tournament.status]}`}
      >
        {STATUS_LABEL[tournament.status]}
      </span>

      {formatPurse(tournament.purse_usd) && (
        <span className="text-xs text-gray-400">
          {formatPurse(tournament.purse_usd)} purse
        </span>
      )}

      {showDates && (
        <span className="text-xs text-gray-500">
          {tournament.start_date} – {tournament.end_date}
        </span>
      )}
    </div>
  );
}
