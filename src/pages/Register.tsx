import { useState } from "react";
import { Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../hooks/useAuth";

export function Register() {
  const { register, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, displayName);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-green-900 text-center mb-1">⛳ Fantasy Golf</h1>
        <p className="text-center text-gray-500 text-sm mb-8">Create your account</p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Display name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="password"
              placeholder="Password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-800 hover:bg-green-700 disabled:opacity-40 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <hr className="flex-1 border-gray-200" />
            or
            <hr className="flex-1 border-gray-200" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={(cred) => {
                if (cred.credential) loginWithGoogle(cred.credential).catch(() => setError("Google sign-in failed."));
              }}
              onError={() => setError("Google sign-in failed.")}
              width="100%"
            />
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-green-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
