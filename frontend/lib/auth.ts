import { supabase } from "./supabase";

const E2E_BYPASS_KEY = "atluriin.e2e.bypass";
const E2E_USER_KEY = "atluriin.e2e.user_id";

function _shouldBypassAuth(): boolean {
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

function _b64urlEncode(raw: string): string {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    const bytes = new TextEncoder().encode(raw);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window
      .btoa(binary)
      .replace(/=+$/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const buffer = require("buffer").Buffer;
  return buffer
    .from(String(raw || ""), "utf-8")
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function _unsignedDevJwt(sub: string): string {
  const header = _b64urlEncode(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = _b64urlEncode(JSON.stringify({ sub }));
  return `${header}.${payload}.`;
}

function _getE2EUserId(): string {
  if (typeof window === "undefined") {
    return "e2e-user";
  }
  try {
    const existing = String(window.localStorage.getItem(E2E_USER_KEY) || "").trim();
    if (existing) return existing;
    const created = `e2e-${Date.now()}`;
    window.localStorage.setItem(E2E_USER_KEY, created);
    return created;
  } catch {
    return "e2e-user";
  }
}

export async function getAccessTokenOrThrow(): Promise<string> {
  // E2E bypass – dev mode
  if (_shouldBypassAuth()) {
    return _unsignedDevJwt(_getE2EUserId());
  }

  // Local auth – read JWT from localStorage (set by our auth client)
  let token = "";
  try {
    const sessionResult = await supabase.auth.getSession();
    token = sessionResult.data.session?.access_token || "";
  } catch {
    token = "";
  }

  if (!token) {
    throw new Error("Please sign in to continue.");
  }

  return token;
}
