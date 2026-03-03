/**
 * Strips sponsorship suffixes from PGA Tour event names.
 * ESPN names include " pres. by Sponsor" or " presented by Sponsor".
 * Examples:
 *   "Arnold Palmer Invitational pres. by Mastercard" → "Arnold Palmer Invitational"
 *   "Cognizant Classic in The Palm Beaches"          → unchanged
 */
export function fmtTournamentName(name: string): string {
  return name.replace(/\s+(?:pres\.|presented)\s+by\s+.+$/i, "").trim();
}
