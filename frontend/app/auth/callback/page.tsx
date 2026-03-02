"use client";

/**
 * OAuth Callback Page
 *
 * After backend OAuth flow, the user is redirected here with:
 *   ?token=<JWT>&user=<urlencoded JSON>&next=/app
 * or on error:
 *   ?error=<message>&next=/app
 *
 * This page stores the session and redirects.
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const TOKEN_KEY = "atluriin.auth.token";
const USER_KEY = "atluriin.auth.user";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const handleCallback = () => {
      const errParam = searchParams.get("error");
      if (errParam) {
        setError(decodeURIComponent(errParam));
        setTimeout(() => {
          if (mounted) router.replace(`/login?error=${encodeURIComponent(errParam)}&next=${encodeURIComponent(next)}`);
        }, 2000);
        return;
      }

      const token = searchParams.get("token");
      const userParam = searchParams.get("user");

      if (!token || !userParam) {
        // Fallback: check if there's a code param (legacy Supabase flow — shouldn't happen)
        if (mounted) {
          setError("Missing authentication data. Redirecting to login...");
          setTimeout(() => {
            if (mounted) router.replace(`/login?error=auth_callback_failed&next=${encodeURIComponent(next)}`);
          }, 2000);
        }
        return;
      }

      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        // Store session in localStorage (same keys as supabase.ts local auth)
        window.localStorage.setItem(TOKEN_KEY, token);
        window.localStorage.setItem(USER_KEY, JSON.stringify(user));

        // Redirect to target page
        if (mounted) router.replace(next);
      } catch (err) {
        console.error("[auth/callback] Failed to parse user data:", err);
        if (mounted) {
          setError("Failed to process login. Redirecting...");
          setTimeout(() => {
            if (mounted) router.replace(`/login?error=auth_callback_failed&next=${encodeURIComponent(next)}`);
          }, 2000);
        }
      }
    };

    handleCallback();

    return () => { mounted = false; };
  }, [router, next, searchParams]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg, #0a0a0a)", color: "var(--text-primary, #e0e0e0)" }}>
      <div style={{ textAlign: "center" }}>
        {error ? (
          <>
            <p style={{ color: "var(--danger, #ff4444)", fontSize: 14 }}>{error}</p>
            <p style={{ color: "var(--text-muted, #888)", fontSize: 13, marginTop: 8 }}>Redirecting to login...</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, marginBottom: 8 }}>Completing sign in...</div>
            <div style={{ width: 24, height: 24, border: "2px solid var(--text-muted, #888)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg, #0a0a0a)", color: "var(--text-primary, #e0e0e0)" }}>
        <div style={{ fontSize: 14 }}>Completing sign in...</div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
