/**
 * Axios instance shared across all API calls.
 *
 * Responsibilities:
 *  1. Set base URL so every call goes to /api/v1/...
 *     In dev, Vite proxies /api → http://localhost:8000, so no CORS.
 *     In prod, nginx routes /api → the backend service.
 *  2. Attach the JWT access token from the auth store on every request.
 *  3. On 401: attempt one silent refresh via the httpOnly cookie, then
 *     retry the original request. If refresh fails, clear auth and redirect
 *     to /login so the user can re-authenticate.
 */

import axios from "axios";
import { useAuthStore } from "../store/authStore";

export const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true, // send httpOnly refresh-token cookie on every request
});

// --- Request interceptor: attach access token ---
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response interceptor: silent token refresh on 401 ---
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function drainQueue(token: string | null, err: unknown) {
  pendingQueue.forEach(({ resolve, reject }) =>
    token ? resolve(token) : reject(err)
  );
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt refresh on 401 and only once per request.
    if (error.response?.status !== 401 || original._retried) {
      return Promise.reject(error);
    }
    original._retried = true;

    if (isRefreshing) {
      // Another request is already refreshing — queue this one.
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    try {
      // POST /auth/refresh sends the httpOnly cookie automatically.
      const { data } = await axios.post(
        "/api/v1/auth/refresh",
        {},
        { withCredentials: true }
      );
      const newToken: string = data.access_token;
      useAuthStore.getState().setToken(newToken);
      drainQueue(newToken, null);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshErr) {
      drainQueue(null, refreshErr);
      useAuthStore.getState().clearAuth();
      // Only redirect if we're not already on a public page. Redirecting to
      // /login from /login causes a full browser reload and an infinite loop.
      const publicPaths = ["/login", "/register", "/join"];
      const onPublicPage = publicPaths.some((p) =>
        window.location.pathname.startsWith(p)
      );
      if (!onPublicPage) {
        window.location.href = "/login";
      }
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);
