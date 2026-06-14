/**
 * Single source of truth for backend endpoints.
 *
 * Vercel does NOT proxy WebSockets, so the live interview + overlay views must
 * talk to the backend directly. Historically each page hardcoded the Railway URL,
 * so a backend redeploy meant editing several files — and a missed one caused the
 * "Connection issue. Retrying..." outages. Now the URL lives here and is overridable
 * via env, so a deploy/URL change is a one-line env update (set once in Vercel):
 *
 *   NEXT_PUBLIC_BACKEND_ORIGIN  → https origin of the backend API
 *   NEXT_PUBLIC_WS_URL          → wss origin (defaults: derived from the API origin)
 *   NEXT_PUBLIC_SITE_ORIGIN     → public site origin (this Vercel app)
 */

function strip(url: string): string {
  return String(url || "").trim().replace(/\/+$/g, "");
}

/** HTTP(S) origin of the backend API. */
export const BACKEND_ORIGIN: string = strip(
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://atluriin-backend-production-94e7.up.railway.app",
);

/** WebSocket origin (wss://). Derived from the API origin unless explicitly set. */
export const BACKEND_WS_ORIGIN: string = strip(
  process.env.NEXT_PUBLIC_WS_URL ||
    BACKEND_ORIGIN.replace(/^http(s)?:\/\//i, (_m, s) => (s ? "wss://" : "ws://")),
);

/** Public site origin (this Vercel deployment). */
export const SITE_ORIGIN: string = strip(
  process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://atluri-ai.vercel.app",
);
