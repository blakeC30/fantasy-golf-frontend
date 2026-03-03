/**
 * Welcome — public landing page.
 *
 * Shown to unauthenticated visitors at /. Authenticated users are immediately
 * redirected to /leagues.
 */

import { Link, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function Welcome() {
  const token = useAuthStore((s) => s.token);

  if (token) return <Navigate to="/leagues" replace />;

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      {/* ── Sticky nav ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-bold text-green-900 tracking-tight">
            ⛳ Fantasy Golf
          </span>
          <nav className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold bg-green-800 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get started free
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-950 via-green-800 to-green-700 pt-36 pb-28 px-6">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-24 w-80 h-80 rounded-full bg-black/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-green-400/10 blur-2xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-green-300 mb-5">
            Fantasy golf, reimagined
          </span>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-6">
            Your fantasy golf league,{" "}
            <span className="text-green-300">
              without the spreadsheets.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-green-100 max-w-2xl mx-auto mb-10 leading-relaxed">
            Pick one PGA Tour golfer each week. Earn points based on what they
            actually win on Tour. Real prize money, automatically tracked.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-green-900 font-bold px-8 py-4 rounded-xl hover:bg-green-50 transition-colors text-base shadow-lg shadow-black/20"
            >
              Create a league — it's free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-6 text-sm text-green-400">
            No credit card required · Takes 2 minutes to set up
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">How it works</h2>
            <p className="text-gray-500 mt-3 text-lg max-w-xl mx-auto">
              Three steps. No formulas. No manual tracking.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Pick a golfer each week",
                description:
                  "Every week, choose one PGA Tour golfer competing in that week's tournament. The pick window closes at the first tee shot.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Earn their prize money",
                description:
                  "Your points equal the real prize money your golfer earns on Tour. Majors are worth double. Miss a week and you lose points.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "Win your league",
                description:
                  "Points accumulate all season long. The player with the most points when the season ends wins the league.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
                  </svg>
                ),
              },
            ].map(({ step, title, description, icon }) => (
              <div key={step} className="flex flex-col">
                <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center mb-5">
                  {icon}
                </div>
                <p className="text-[11px] font-bold text-green-600 uppercase tracking-[0.15em] mb-2">
                  Step {step}
                </p>
                <h3 className="font-bold text-gray-900 text-xl mb-3">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── No-repeat rule highlight ── */}
      <section className="py-20 px-6 bg-green-50 border-y border-green-100">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            The rule that makes it interesting
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5">
            Each golfer can only be picked{" "}
            <span className="text-green-700">once per season.</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
            Used Scottie Scheffler in week two? He's gone for the rest of your season. Every pick
            costs you a future option — that's what turns a simple game into a season-long
            strategic puzzle.
          </p>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Everything your league needs</h2>
            <p className="text-gray-500 mt-3 text-lg max-w-xl mx-auto">
              Built to replace spreadsheets, group chats, and manual score-tracking — for good.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                emoji: "📡",
                title: "Live PGA Tour data",
                description:
                  "Scores and prize money are pulled directly from the PGA Tour after every tournament. No manual entry, ever.",
              },
              {
                emoji: "⚡",
                title: "Automatic scoring",
                description:
                  "Points are calculated and standings updated automatically the moment a tournament closes.",
              },
              {
                emoji: "🔗",
                title: "Invite links",
                description:
                  "Share a link to bring players in. League managers approve requests before anyone gets access.",
              },
              {
                emoji: "🏆",
                title: "Major bonus",
                description:
                  "The Masters, US Open, The Open, and PGA Championship all carry a 2× points multiplier — because they should matter more.",
              },
              {
                emoji: "📅",
                title: "Custom schedule",
                description:
                  "League managers choose exactly which PGA Tour events count for their league each season.",
              },
              {
                emoji: "🌐",
                title: "Multiple leagues",
                description:
                  "One account, as many leagues as you want. Play with your work crew and your golf buddies.",
              },
            ].map(({ emoji, title, description }) => (
              <div
                key={title}
                className="group bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-green-200 hover:bg-green-50/50 transition-all duration-200"
              >
                <div className="text-3xl mb-4">{emoji}</div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Scoring explainer ── */}
      <section className="py-24 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid gap-16 md:grid-cols-2 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-green-700 mb-4">
                How scoring works
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5">
                Real money. Real points. No formulas to memorize.
              </h2>
              <p className="text-gray-500 leading-relaxed mb-5">
                Your score is the same number your golfer sees on their winner's check. Rory wins
                $3.6 million at the Masters? You get 3,600,000 points — doubled for the major.
              </p>
              <p className="text-gray-500 leading-relaxed">
                Miss a week without a pick and you'll lose points. Saving an elite golfer for a
                major instead of burning them in a weaker field is half the game.
              </p>
            </div>
            <div className="space-y-4">
              {/* Standard event card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
                  Standard tournament
                </p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Golfer earns</p>
                    <p className="text-3xl font-bold text-gray-900 tabular-nums">$1,620,000</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">You earn</p>
                    <p className="text-3xl font-bold text-green-700 tabular-nums">1,620,000 pts</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-400">
                  <span>Multiplier</span>
                  <span className="font-medium text-gray-600">1×</span>
                </div>
              </div>
              {/* Major card */}
              <div className="bg-green-900 rounded-2xl p-6 shadow-lg shadow-green-900/30">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-green-300 uppercase tracking-wider font-semibold">
                    Major championship
                  </p>
                  <span className="text-xs font-bold bg-amber-400 text-amber-900 px-2.5 py-1 rounded-full">
                    2× MAJOR
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-green-400 mb-1">Golfer earns</p>
                    <p className="text-3xl font-bold text-white tabular-nums">$3,600,000</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-400 mb-1">You earn</p>
                    <p className="text-3xl font-bold text-green-300 tabular-nums">7,200,000 pts</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-green-800 flex items-center justify-between text-sm text-green-400">
                  <span>Multiplier</span>
                  <span className="font-medium text-green-200">2×</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Setup steps ── */}
      <section className="py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Up and running in minutes</h2>
          <p className="text-gray-500 mb-14 text-lg">
            No configuration required. Just create, invite, and play.
          </p>
          <div className="relative">
            {/* Connector line */}
            <div className="hidden sm:block absolute top-7 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gray-200" />
            <div className="grid sm:grid-cols-3 gap-8">
              {[
                { n: "1", label: "Create your account", sub: "Email or Google sign-in, free forever." },
                { n: "2", label: "Start a league", sub: "Name it, set your rules, copy the invite link." },
                { n: "3", label: "Invite your group", sub: "Share the link and start picking when week one begins." },
              ].map(({ n, label, sub }) => (
                <div key={n} className="flex flex-col items-center text-center">
                  <div className="relative z-10 w-14 h-14 rounded-full bg-green-800 text-white text-xl font-extrabold flex items-center justify-center mb-4 shadow-md shadow-green-800/30">
                    {n}
                  </div>
                  <p className="font-bold text-gray-900 mb-1">{label}</p>
                  <p className="text-sm text-gray-500">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-28 px-6 bg-gradient-to-br from-green-950 via-green-900 to-green-700 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-green-400/10 blur-3xl" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Ready to ditch the spreadsheet?
          </h2>
          <p className="text-green-200 text-lg mb-10 leading-relaxed">
            Set up your league in minutes. Invite your group, choose your tournament schedule,
            and let the picks begin.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-3 bg-white text-green-900 font-bold px-10 py-4 rounded-xl hover:bg-green-50 transition-colors text-lg shadow-xl shadow-black/30"
          >
            Create your league — free
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <p className="mt-6 text-green-400 text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-green-200 hover:text-white underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 bg-green-950 border-t border-green-900">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-green-700">
          <span className="font-semibold">⛳ Fantasy Golf</span>
          <span>© {new Date().getFullYear()} · Free to play</span>
          <div className="flex gap-4">
            <Link to="/register" className="hover:text-green-400 transition-colors">
              Create account
            </Link>
            <Link to="/login" className="hover:text-green-400 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
