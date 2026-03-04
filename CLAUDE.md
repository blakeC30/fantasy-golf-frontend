# Fantasy Golf Frontend

React + TypeScript + Vite app. See the root `CLAUDE.md` for project-wide rules and domain logic.

## Tech

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** — utility-first, no component library
- **Zustand** (`src/store/authStore.ts`) — auth state only (token + user), never localStorage
- **React Query / TanStack Query** — all server state
- **React Router v6** — file-based page components, `useParams` for `:leagueId`
- **Axios** (`src/api/client.ts`) — configured instance with JWT + refresh interceptors

## Directory Structure

```
src/
├── api/
│   ├── client.ts       # Axios instance — DO NOT import axios directly elsewhere
│   └── endpoints.ts    # All typed API functions + TypeScript interfaces
├── store/
│   └── authStore.ts    # Zustand: { token, user, setAuth, setToken, clearAuth }
├── hooks/
│   ├── useAuth.ts      # Auth actions (login, register, logout, session bootstrap)
│   ├── useLeague.ts    # All league/membership/join/tournament-schedule hooks
│   └── usePick.ts      # Tournaments, picks, standings hooks
├── pages/
│   ├── Welcome.tsx         # Public landing page — shown at / for unauthenticated visitors
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Leagues.tsx         # Post-login landing — league list + create/join forms
│   ├── Dashboard.tsx       # Per-league home — current tournament, pick status, standings
│   ├── MakePick.tsx        # Golfer selection form for upcoming tournament
│   ├── MyPicks.tsx         # Season pick history
│   ├── Leaderboard.tsx     # Full standings table
│   ├── ManageLeague.tsx    # Manager panel — invite, settings, members, schedule
│   ├── JoinLeague.tsx      # Invite-link landing page (auth gate + confirm form)
│   └── PlatformAdmin.tsx   # Platform admin only — data sync trigger
├── components/
│   ├── Layout.tsx          # Auth-guarded shell — top nav, auth gate
│   ├── LeagueCard.tsx      # League card on Leagues page (rank, points, tournament info)
│   ├── PickForm.tsx        # Golfer selection (used by MakePick)
│   ├── GolferCard.tsx      # Selectable golfer row inside PickForm
│   ├── StandingsTable.tsx  # Standings table (used by Dashboard + Leaderboard)
│   └── TournamentBadge.tsx # Status/major badge for a tournament
└── App.tsx                 # Route definitions
```

## Routes

```
/                               → Welcome (public landing page; redirects to /leagues if already authenticated)
/login                          → Login (public)
/register                       → Register (public)
/join/:inviteCode               → JoinLeague (public, but redirects to login if unauthenticated)
/leagues                        → Leagues (auth required)
/leagues/:leagueId              → Dashboard
/leagues/:leagueId/pick         → MakePick
/leagues/:leagueId/picks        → MyPicks
/leagues/:leagueId/leaderboard  → Leaderboard
/leagues/:leagueId/manage       → ManageLeague (manager only — self-redirects non-managers)
/admin                          → PlatformAdmin (platform admin only)
/*                              → redirect to /
```

**Welcome page auth pattern**: `Welcome.tsx` reads `useAuthStore` directly (not `useAuth`) to avoid triggering session bootstrap on a public page. If a token is in memory, it redirects immediately to `/leagues`.

## React Query Cache Keys

Always use these exact key shapes — mismatches cause stale data:

| Key | Hook |
|-----|------|
| `["myLeagues"]` | `useMyLeagues()` |
| `["league", leagueId]` | `useLeague(leagueId)` |
| `["leagueMembers", leagueId]` | `useLeagueMembers(leagueId)` |
| `["leagueTournaments", leagueId]` | `useLeagueTournaments(leagueId)` |
| `["pendingRequests", leagueId]` | `usePendingRequests(leagueId)` |
| `["myRequests"]` | `useMyRequests()` |
| `["myPicks", leagueId]` | `useMyPicks(leagueId)` |
| `["allPicks", leagueId]` | `useAllPicks(leagueId)` |
| `["standings", leagueId]` | `useStandings(leagueId)` |
| `["tournaments", status\|"all"]` | `useTournaments(status?)` |
| `["tournamentField", tournamentId]` | `useTournamentField(tournamentId)` |
| `["joinPreview", inviteCode]` | `useJoinPreview(inviteCode)` |

## API Conventions

- **Never import axios directly** — always use `src/api/client.ts`
- All API functions live in `src/api/endpoints.ts`, grouped by domain (`authApi`, `leaguesApi`, `picksApi`, etc.)
- All functions return unwrapped data (not the Axios response object)
- TypeScript interfaces in `endpoints.ts` mirror backend Pydantic schemas
- On 401, the Axios interceptor silently refreshes via the httpOnly cookie, then retries. If refresh fails, it clears auth and redirects to `/login` (skips redirect from public pages to avoid loops)

## Auth Pattern

- `useAuth()` (from `src/hooks/useAuth.ts`) — the only hook components should call for auth
- `useAuthStore` (Zustand) — internal; don't call directly from pages/components
- `?next` param preserved through login → register cross-links so post-auth redirect lands correctly
- `bootstrapping` state = true while silent session restore is in flight; show a loading state, don't redirect

## Mobile-First Requirement

**Every UI change must work well on both mobile and desktop.** The desktop layout should never change as a side effect of mobile work, and mobile must never be an afterthought.

- Tailwind's breakpoint is `sm` = **640px** — use `sm:` to introduce desktop-only styles, not to hide mobile styles
- The app uses a **fixed bottom tab bar** (`sm:hidden fixed bottom-0`) for league navigation on mobile, replacing the desktop header nav links (`hidden sm:flex`). Add `pb-24 sm:pb-8` to page content inside a league to clear it
- The footer is hidden on mobile inside leagues (`hidden sm:block`) to avoid overlap with the tab bar
- **Table columns**: hide low-priority columns on mobile with `hidden sm:table-cell` on both `<th>` and `<td>`
- **Dropdowns and popovers**: use `w-full sm:w-auto` so they don't overflow the viewport on small screens
- **Points / numeric values**: abbreviate with M/K notation to prevent overflow in tight grid cells
- **Test at 390×844** (iPhone 14 Pro size) — if it looks cramped or broken at that size, fix it before finishing

## UI/UX Standard

All UI work must be done as a **seasoned UI/UX engineer** would do it. Every screen should feel polished, intentional, and cohesive — not like a functional prototype. Apply these principles to every change:

- **Visual hierarchy**: use eyebrow labels (`text-xs font-bold uppercase tracking-[0.15em] text-green-700`), large headings (`text-3xl font-bold`), and subdued supporting text to guide the eye
- **Breathing room**: generous padding (`p-6`, `p-8`, `p-10`), section spacing (`space-y-8`), never cramped layouts
- **Rounded and soft**: `rounded-2xl` for cards and containers, `rounded-xl` for buttons and inputs
- **Depth and surface**: `shadow-sm` on cards, `shadow-lg` on elevated modals/confirmations, `border border-gray-200` for subtle separation
- **Gradient accents**: dark tournament/hero bands use `bg-gradient-to-r from-green-900 to-green-700` with white text; season-total cards use `bg-gradient-to-br from-green-900 via-green-800 to-green-700`
- **Empty states**: never just plain text — use a centered icon + heading + subtext + action link inside a `bg-gray-50 rounded-2xl p-16 text-center` container
- **Buttons**: primary = `bg-green-800 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl shadow-sm`; secondary/ghost = `border border-gray-300 hover:border-green-400 text-gray-700 rounded-xl`; destructive = `text-red-500 hover:text-red-700`
- **Section icon badges**: precede headings with `<div className="w-8 h-8 bg-green-50 text-green-700 rounded-lg flex items-center justify-center">` containing a small SVG
- **Overlay elements**: rings/outlines on focused/selected items need `p-1` buffer on the scroll container to avoid clipping

## Styling Conventions

- Color scheme: `green-800` (primary actions), `green-700` (hover), `green-50`/`green-100` (highlights), amber for warnings/majors
- Cards: `bg-white border border-gray-200 rounded-2xl p-6` (standard), `rounded-2xl p-10` (centered full-page cards)
- Primary button: `bg-green-800 hover:bg-green-700 disabled:opacity-40 text-white font-semibold py-3 px-6 rounded-xl shadow-sm`
- Text input: `w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500`
- Golf-style ranking: show `T2` for ties, no `#` prefix, first place as `1` (never `T1`)
- Use `tabular-nums` on numeric table columns for aligned digits
- Dates on dark backgrounds: `text-white/70` (not `text-green-300`, which is hard to read)

## Key Patterns

**Mutations always invalidate related queries:**
```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["myLeagues"] });
}
```

**Nested `<a>` tags are invalid HTML** — if a whole card is a `<Link>`, use a `<button>` + `useNavigate()` for inner interactive elements, with `e.preventDefault()` to stop the outer link firing.

**Form inputs should not reset when React Query refetches** — initialize from loaded data with `useEffect` + a `initializedRef` boolean guard.

**Error messages from the backend** live at `err.response?.data?.detail`.

**`enabled: !!param`** on queries that depend on a route param to avoid fetching with `undefined`.
