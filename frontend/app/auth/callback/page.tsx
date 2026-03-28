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
  const next = searchParams.get("next") || "/dashboard";
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
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg,#0a0a0a)] text-[var(--text-primary,#e0e0e0)]">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-[var(--danger,#ff4444)] text-sm">{error}</p>
            <p className="text-[var(--text-muted,#888)] text-[13px] mt-2">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="text-sm mb-2">Completing sign in...</div>
            <div className="w-6 h-6 border-2 border-[var(--text-muted,#888)] border-t-transparent rounded-full animate-spin mx-auto" />
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg,#0a0a0a)] text-[var(--text-primary,#e0e0e0)]">
        <div className="text-sm">Completing sign in...</div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
