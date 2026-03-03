/**
 * App — root router.
 *
 * Public routes (/login, /register, /join/:inviteCode) are accessible without auth.
 * All other routes are wrapped in <Layout>, which redirects to /login if there
 * is no token.
 */

import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Leagues } from "./pages/Leagues";
import { Dashboard } from "./pages/Dashboard";
import { MakePick } from "./pages/MakePick";
import { MyPicks } from "./pages/MyPicks";
import { Leaderboard } from "./pages/Leaderboard";
import { Admin } from "./pages/Admin";
import { JoinLeague } from "./pages/JoinLeague";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/join/:inviteCode" element={<JoinLeague />} />

      {/* Auth-guarded — all share the Layout shell */}
      <Route element={<Layout />}>
        <Route path="/leagues" element={<Leagues />} />
        <Route path="/leagues/:leagueId" element={<Dashboard />} />
        <Route path="/leagues/:leagueId/pick" element={<MakePick />} />
        <Route path="/leagues/:leagueId/picks" element={<MyPicks />} />
        <Route path="/leagues/:leagueId/leaderboard" element={<Leaderboard />} />
        <Route path="/leagues/:leagueId/admin" element={<Admin />} />
      </Route>

      {/* Default: send root to /leagues */}
      <Route path="/" element={<Navigate to="/leagues" replace />} />
      <Route path="*" element={<Navigate to="/leagues" replace />} />
    </Routes>
  );
}
