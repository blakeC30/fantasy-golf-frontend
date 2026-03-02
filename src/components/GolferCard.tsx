/**
 * GolferCard — displays a golfer's details in the pick form.
 * Highlights when selected; greyed out when already used this season.
 */

import type { Golfer } from "../api/endpoints";

interface Props {
  golfer: Golfer;
  selected?: boolean;
  alreadyUsed?: boolean;
  onClick?: () => void;
}

export function GolferCard({ golfer, selected, alreadyUsed, onClick }: Props) {
  const base =
    "flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors";

  const style = alreadyUsed
    ? `${base} opacity-40 cursor-not-allowed border-gray-200 bg-gray-50`
    : selected
    ? `${base} border-green-600 bg-green-50 ring-2 ring-green-500`
    : `${base} border-gray-200 bg-white hover:border-green-400 hover:bg-green-50`;

  return (
    <div
      className={style}
      onClick={alreadyUsed ? undefined : onClick}
      role={alreadyUsed ? undefined : "button"}
      tabIndex={alreadyUsed ? -1 : 0}
      onKeyDown={(e) => {
        if (!alreadyUsed && (e.key === "Enter" || e.key === " ")) onClick?.();
      }}
    >
      {/* World ranking badge */}
      <div className="w-8 h-8 rounded-full bg-green-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
        {golfer.world_ranking ?? "—"}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{golfer.name}</p>
        {golfer.country && (
          <p className="text-xs text-gray-500 truncate">{golfer.country}</p>
        )}
      </div>

      {alreadyUsed && (
        <span className="text-xs text-gray-400 shrink-0">Used</span>
      )}
      {selected && !alreadyUsed && (
        <span className="text-xs text-green-700 font-semibold shrink-0">Selected</span>
      )}
    </div>
  );
}
