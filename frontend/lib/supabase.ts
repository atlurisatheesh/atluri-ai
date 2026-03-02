/**
 * Local auth client – replaces Supabase client.
 *
 * Stores JWT + user info in localStorage.
 * Provides a compatible-ish API surface so migration is minimal.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:9010";

const TOKEN_KEY = "atluriin.auth.token";
const USER_KEY = "atluriin.auth.user";

export interface LocalUser {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface LocalSession {
  access_token: string;
  user: LocalUser;
}

type AuthChangeEvent = "SIGNED_IN" | "SIGNED_OUT" | "INITIAL_SESSION";
type AuthChangeCallback = (event: AuthChangeEvent, session: LocalSession | null) => void;

const _listeners: Set<AuthChangeCallback> = new Set();

function _notify(event: AuthChangeEvent, session: LocalSession | null) {
  _listeners.forEach((cb) => {
    try { cb(event, session); } catch { /* swallow */ }
  });
}

function _getStoredSession(): LocalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const userJson = window.localStorage.getItem(USER_KEY);
    if (!token || !userJson) return null;
    return { access_token: token, user: JSON.parse(userJson) };
  } catch {
    return null;
  }
}

function _setStoredSession(session: LocalSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      window.localStorage.setItem(TOKEN_KEY, session.access_token);
      window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    }
  } catch { /* ignore */ }
}

// ── Auth methods (mirror supabase.auth.*) ────────────────────

async function signUp(params: {
  email: string;
  password: string;
  options?: { data?: { display_name?: string } };
}): Promise<{ data: { session: LocalSession | null; user: LocalUser | null }; error: Error | null }> {
  try {
    const res = await fetch(`${API_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: params.email,
        password: params.password,
        display_name: params.options?.data?.display_name || null,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: { session: null, user: null }, error: new Error(body.detail || `Signup failed (${res.status})`) };
    }
    const body = await res.json();
    const session: LocalSession = { access_token: body.access_token, user: body.user };
    _setStoredSession(session);
    _notify("SIGNED_IN", session);
    return { data: { session, user: session.user }, error: null };
  } catch (e) {
    return { data: { session: null, user: null }, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

async function signInWithPassword(params: {
  email: string;
  password: string;
}): Promise<{ data: { session: LocalSession | null; user: LocalUser | null }; error: Error | null }> {
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: params.email, password: params.password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: { session: null, user: null }, error: new Error(body.detail || `Login failed (${res.status})`) };
    }
    const body = await res.json();
    const session: LocalSession = { access_token: body.access_token, user: body.user };
    _setStoredSession(session);
    _notify("SIGNED_IN", session);
    return { data: { session, user: session.user }, error: null };
  } catch (e) {
    return { data: { session: null, user: null }, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

async function signOut(): Promise<{ error: Error | null }> {
  _setStoredSession(null);
  _notify("SIGNED_OUT", null);
  return { error: null };
}

async function getSession(): Promise<{ data: { session: LocalSession | null }; error: null }> {
  return { data: { session: _getStoredSession() }, error: null };
}

function onAuthStateChange(
  callback: (event: string, session: LocalSession | null) => void,
): { data: { subscription: { unsubscribe: () => void } } } {
  const wrapped: AuthChangeCallback = (event, session) => callback(event, session);
  _listeners.add(wrapped);

  // Fire INITIAL_SESSION asynchronously
  setTimeout(() => {
    const s = _getStoredSession();
    wrapped("INITIAL_SESSION", s);
  }, 0);

  return {
    data: {
      subscription: {
        unsubscribe: () => { _listeners.delete(wrapped); },
      },
    },
  };
}

// ── Exported "supabase" compatible object ────────────────────
export const supabase = {
  auth: {
    signUp,
    signInWithPassword,
    signInWithOAuth: async (opts: { provider: string; options?: { redirectTo?: string } }) => {
      // Redirect to backend OAuth endpoint which handles the full flow
      if (typeof window === "undefined") {
        return { error: new Error("OAuth redirect requires a browser environment.") };
      }
      const provider = opts.provider;
      const next = opts.options?.redirectTo || "/dashboard";
      // Build backend OAuth URL — backend will redirect to provider, then callback back to frontend
      const oauthUrl = `${API_URL}/api/auth/oauth/${provider}?next=${encodeURIComponent(next)}`;
      window.location.href = oauthUrl;
      // Return no error — the page will navigate away
      return { error: null };
    },
    signOut,
    getSession,
    onAuthStateChange,
    getUser: async () => {
      const s = _getStoredSession();
      return { data: { user: s?.user || null }, error: null };
    },
  },
};

