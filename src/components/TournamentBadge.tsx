/**
 * TournamentBadge — shows tournament status and major/multiplier indicator.
 */

import type { Tournament } from "../api/endpoints";

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
  tournament: Tournament;
  showDates?: boolean;
}

export function TournamentBadge({ tournament, showDates = false }: Props) {
  const isMajor = tournament.multiplier >= 2;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[tournament.status]}`}
      >
        {STATUS_LABEL[tournament.status]}
      </span>

      {isMajor && (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
          {tournament.multiplier}× MAJOR
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
