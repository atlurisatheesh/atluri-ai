import { createClient } from "@supabase/supabase-js";

const E2E_BYPASS_KEY = "atluriin.e2e.bypass";

function shouldUseE2EDummySupabase(): boolean {
  if (process.env.NEXT_PUBLIC_E2E_BYPASS_AUTH === "true") {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(E2E_BYPASS_KEY) === "1";
  } catch {
    return false;
  }
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  (shouldUseE2EDummySupabase() ? "https://example.supabase.co" : "");

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (shouldUseE2EDummySupabase() ? "e2e_dummy_key" : "");

const isBrowser = typeof window !== "undefined";
const isLocalhost =
  isBrowser &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

if (isLocalhost) {
  try {
    window.localStorage.removeItem("supabase.auth.token");
    const staleKeys = Object.keys(window.localStorage).filter(
      (key) => key.startsWith("sb-") && key.endsWith("-auth-token")
    );
    staleKeys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or enable E2E bypass for automated QA runs)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: !isLocalhost,
    detectSessionInUrl: !isLocalhost,
    persistSession: !isLocalhost,
  },
});
