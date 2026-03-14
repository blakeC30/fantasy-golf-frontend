/**
 * LeagueRules — read-only rules and league configuration page.
 *
 * Two sections:
 *   1. "Your League Settings" — the manager's specific choices for this league
 *      (no-pick penalty, playoff size, draft style, picks per round). Read-only
 *      for all members; managers can change these in Manage League.
 *   2. "How It Works" — the general game rules that apply to every league,
 *      adapted from Rules.md. Playoff rules are only shown when playoffs are
 *      enabled for this league.
 */

import { useParams } from "react-router-dom";
import { useLeague } from "../hooks/useLeague";
import { usePlayoffConfig } from "../hooks/usePlayoff";

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4 first:mt-0">
      {children}
    </h2>
  );
}

function RuleGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
      <div className="bg-gradient-to-r from-green-900 to-green-700 px-5 py-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-green-200">
          {title}
        </h3>
      </div>
      <ul className="divide-y divide-gray-100">{children}</ul>
    </div>
  );
}

function RuleRow({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
}) {
  return (
    <li className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4">
      <span className="text-sm font-medium text-gray-700 sm:w-56 shrink-0">
        {label}
      </span>
      <div className="flex-1 text-right sm:text-left">
        <span className="text-sm font-semibold text-gray-900">{value}</span>
        {note && (
          <p className="text-xs text-gray-400 mt-0.5 text-left">{note}</p>
        )}
      </div>
    </li>
  );
}

function RuleBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 py-2.5 px-5 border-t border-gray-100 first:border-t-0">
      <span className="mt-0.5 w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </span>
      <span className="text-sm text-gray-700 leading-relaxed">{children}</span>
    </li>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-4 flex gap-3">
      <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
      <p className="text-sm text-amber-800">{children}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function fmtPenalty(penalty: number): string {
  const abs = Math.abs(Math.round(penalty));
  return `-$${abs.toLocaleString()}`;
}

function fmtDraftStyle(style: string): string {
  if (style === "snake") return "Snake draft";
  if (style === "linear") return "Linear draft";
  if (style === "top_seed_priority") return "Top seed priority";
  return style;
}

function fmtPicksPerRound(arr: number[]): string {
  if (arr.length === 0) return "—";
  const all = arr.every((v) => v === arr[0]);
  if (all) return `${arr[0]} pick${arr[0] === 1 ? "" : "s"} per round`;
  return arr.map((v, i) => `Round ${i + 1}: ${v}`).join(", ");
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function LeagueRules() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { data: league } = useLeague(leagueId!);
  const { data: playoffConfig } = usePlayoffConfig(leagueId!);

  const playoffsEnabled =
    playoffConfig && playoffConfig.is_enabled && playoffConfig.playoff_size > 0;

  return (
    <div className="space-y-2 pb-4">
      {/* Page header */}
      <div className="space-y-1 mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-green-700">
          League Rules
        </p>
        <h1 className="text-3xl font-bold text-gray-900">
          {league?.name ?? "…"}
        </h1>
        <p className="text-sm text-gray-500">
          How this league is configured and how the game works.
        </p>
      </div>

      {/* ── Section 1: League Settings ─────────────────────────────────── */}
      <SectionHeader>Your League Settings</SectionHeader>

      <RuleGroup title="Scoring & Penalties">
        <RuleRow
          label="No-pick penalty"
          value={league ? fmtPenalty(league.no_pick_penalty) : "…"}
          note="Applied when you have no pick recorded once the pick window closes for a tournament."
        />
      </RuleGroup>

      <RuleGroup title="Playoffs">
        {playoffsEnabled ? (
          <>
            <RuleRow
              label="Status"
              value={
                <span className="inline-flex items-center gap-1.5 text-green-700">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  Enabled
                </span>
              }
            />
            <RuleRow
              label="Playoff size"
              value={`Top ${playoffConfig.playoff_size} players qualify`}
              note="Players are seeded from regular season standings."
            />
            <RuleRow
              label="Draft style"
              value={fmtDraftStyle(playoffConfig.draft_style)}
              note="Determines the order in which each pod member's preferences are resolved into picks."
            />
            <RuleRow
              label="Picks per round"
              value={fmtPicksPerRound(playoffConfig.picks_per_round)}
              note={
                playoffConfig.picks_per_round.every((v) => v === playoffConfig.picks_per_round[0])
                  ? "Each member submits a ranked preference list; this many picks are assigned per round."
                  : "Picks vary by round — the counts above show how many picks are assigned in each playoff round."
              }
            />
          </>
        ) : (
          <RuleRow
            label="Status"
            value={
              <span className="text-gray-400">Disabled for this season</span>
            }
          />
        )}
      </RuleGroup>

      {/* ── Section 2: General Rules ───────────────────────────────────── */}
      <SectionHeader>How It Works</SectionHeader>

      <RuleGroup title="Scoring">
        <RuleBullet>
          <strong>Points = golfer's tournament earnings × tournament multiplier.</strong>{" "}
          Your score for a week is exactly how much money your picked golfer earned
          at that tournament, multiplied by any bonus the manager applied.
        </RuleBullet>
        <RuleBullet>
          The multiplier is <strong>1×</strong> by default. Majors and other
          featured events may be set to <strong>1.5×</strong> or <strong>2×</strong> — a badge
          on each tournament card shows the active multiplier.
        </RuleBullet>
        <RuleBullet>
          Points accumulate across every tournament in the season. The player
          with the <strong>most total points at season end wins</strong>.
        </RuleBullet>
      </RuleGroup>

      <RuleGroup title="Weekly Picks">
        <RuleBullet>
          Each week you pick <strong>one golfer</strong> competing in that week's
          tournament. If you earn points, it is exactly the dollar amount that
          golfer earned on the PGA Tour.
        </RuleBullet>
        <RuleBullet>
          <strong>No-repeat rule:</strong> once you use a golfer during the
          regular season, that golfer is unavailable to you for the rest of the
          season. Plan ahead — saving elite golfers for high-value or multiplied
          tournaments is part of the strategy.
        </RuleBullet>
        <RuleBullet>
          The pick window for a tournament <strong>opens after the previous
          tournament's official earnings have been published</strong>. This ensures
          standings are accurate before you choose.
        </RuleBullet>
      </RuleGroup>

      <RuleGroup title="Pick Deadline & Locking">
        <RuleBullet>
          Your pick <strong>locks when your chosen golfer's Round 1 tee time
          passes</strong>. Once they tee off, you cannot change your pick — even if
          they withdraw mid-round.
        </RuleBullet>
        <RuleBullet>
          <strong>Late scratch protection:</strong> if your golfer withdraws
          before teeing off, the lock does not trigger at their scheduled tee
          time. You can switch to any golfer who hasn't teed off yet.
        </RuleBullet>
        <RuleBullet>
          <strong>Missed the deadline?</strong> You can still pick a golfer whose
          Round 1 tee time hasn't passed yet — even after the tournament has
          started. Once every golfer in the field has teed off, the pick window
          closes permanently.
        </RuleBullet>
        <RuleBullet>
          No picks or changes are accepted for completed tournaments under any
          circumstances.
        </RuleBullet>
      </RuleGroup>

      <RuleGroup title="No-Pick Penalty">
        <RuleBullet>
          If the pick window closes for a tournament and you have no pick on
          record, a penalty of <strong>{league ? fmtPenalty(league.no_pick_penalty) : "…"}</strong> is
          added to your total.
        </RuleBullet>
        <RuleBullet>
          Submitting a late pick (after the tournament starts but before the last
          Round 1 tee time) avoids the penalty entirely.
        </RuleBullet>
        <RuleBullet>
          The penalty only appears in standings once the tournament completes —
          it is not shown while a tournament is in progress.
        </RuleBullet>
      </RuleGroup>

      <RuleGroup title="Pick Visibility">
        <RuleBullet>
          <strong>Your own pick is always visible</strong> to you immediately
          after submitting.
        </RuleBullet>
        <RuleBullet>
          <strong>Other members' picks are hidden</strong> until every golfer in
          the field has teed off on Round 1. This prevents copying — picks only
          become public once the window is permanently closed.
        </RuleBullet>
      </RuleGroup>

      {/* Playoffs section — only shown when enabled */}
      {playoffsEnabled && (
        <>
          <SectionHeader>Playoffs</SectionHeader>

          <InfoBox>
            This league has playoffs enabled. The top{" "}
            <strong>{playoffConfig.playoff_size} players</strong> by regular
            season standings will qualify.
          </InfoBox>

          <RuleGroup title="Qualification & Format">
            <RuleBullet>
              The top <strong>{playoffConfig.playoff_size} players</strong> by
              regular season standings qualify. Seeding is automatic once the
              regular season ends — no manager action required.
            </RuleBullet>
            <RuleBullet>
              Players are placed into <strong>pods</strong> (matchup groups). The
              highest-scoring member of each pod advances to the next round; all
              others are eliminated. Ties are broken by regular season seed (lower
              seed wins).
            </RuleBullet>
            <RuleBullet>
              The playoff bracket spans the last tournaments in the league's
              schedule — those events are reserved as playoff rounds.
            </RuleBullet>
          </RuleGroup>

          <RuleGroup title="Playoff Picks — Preference List">
            <RuleBullet>
              Instead of picking one golfer, you submit a <strong>ranked
              preference list</strong> before each playoff tournament. The system
              assigns your picks automatically from your rankings when the
              playoff tournament begins.
            </RuleBullet>
            <RuleBullet>
              Picks are assigned <strong>within your pod only</strong> — two
              members in the same pod cannot be assigned the same golfer.
              Assignment follows the <strong>{fmtDraftStyle(playoffConfig.draft_style).toLowerCase()}</strong>{" "}
              order configured for this league.
            </RuleBullet>
            <RuleBullet>
              You must rank exactly enough golfers to cover all pick slots in your
              pod ({fmtPicksPerRound(playoffConfig.picks_per_round)}, ×{" "}
              pod size). This ensures coverage if your top choices are taken.
            </RuleBullet>
            <RuleBullet>
              <strong>No no-repeat rule in playoffs.</strong> Any golfer may be
              ranked regardless of whether you used them in the regular season.
            </RuleBullet>
          </RuleGroup>

          <RuleGroup title="Playoff Pick Deadline">
            <RuleBullet>
              You can submit and update your preference list as soon as the bracket
              is seeded (for Round 1) or as soon as the previous round's results
              are finalized (for subsequent rounds).
            </RuleBullet>
            <RuleBullet>
              The preference list <strong>locks when the very first Round 1 tee
              time of the playoff tournament passes</strong> — unlike the regular
              season, the lock is tied to the field's first tee time, not your
              specific golfer's.
            </RuleBullet>
            <RuleBullet>
              Failing to submit a preference list before the deadline results in a{" "}
              <strong>{league ? fmtPenalty(league.no_pick_penalty) : "…"} penalty
              per unresolved pick slot</strong>.
            </RuleBullet>
          </RuleGroup>

          <RuleGroup title="Playoff Scoring">
            <RuleBullet>
              Scoring uses the same formula as the regular season:{" "}
              <strong>earnings × tournament multiplier</strong>. Any multiplier
              the manager set for a playoff tournament applies here too.
            </RuleBullet>
            <RuleBullet>
              A round cannot be scored until official earnings are published —
              incomplete data is never locked in.
            </RuleBullet>
            <RuleBullet>
              Once a round is scored, the next round's preference window opens
              automatically for the advancing members.
            </RuleBullet>
          </RuleGroup>
        </>
      )}
    </div>
  );
}
