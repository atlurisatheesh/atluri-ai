"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

function parseAuthError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === "string") {
    const trimmed = error.trim();
    return trimmed && trimmed !== "{}" ? trimmed : fallback;
  }
  if (typeof error === "object") {
    const maybeMessage = String((error as { message?: unknown }).message || "").trim();
    if (maybeMessage && maybeMessage !== "{}") {
      return maybeMessage;
    }
  }
  return fallback;
}

const E2E_BYPASS_KEY = "atluriin.e2e.bypass";
const E2E_USER_KEY = "atluriin.e2e.user_id";

function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function enableLocalDevSession(): void {
  if (typeof window === "undefined") return;
  const uid = `e2e-${Date.now()}`;
  window.localStorage.setItem(E2E_BYPASS_KEY, "1");
  window.localStorage.setItem(E2E_USER_KEY, uid);
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showDevBypass, setShowDevBypass] = useState(false);

  useEffect(() => {
    // Defer localhost check to after hydration to avoid SSR mismatch
    if (isLocalDevHost()) setShowDevBypass(true);

    // If E2E bypass is active, skip everything and go to app
    if (isLocalDevHost() && typeof window !== "undefined" && window.localStorage.getItem(E2E_BYPASS_KEY) === "1") {
      router.replace(nextPath);
      return;
    }

    // Check if user already has a session (local JWT)
    supabase.auth.getSession().then((sessionResult) => {
      if (sessionResult.data.session) {
        router.replace(nextPath);
      }
    }).catch(() => {});
  }, [nextPath, router]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] px-[clamp(16px,2.8vw,40px)] py-7">
      <div className="max-w-[980px] mx-auto grid grid-cols-[1.2fr_1fr] gap-[22px] items-start">
        <section className="flex flex-col gap-2 pt-2">
          <div className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Intelligence Terminal</div>
          <h1 className="m-0 text-[clamp(36px,6vw,62px)] leading-[1.03] tracking-[-1px]">Create account. Establish baseline.</h1>
          <p className="m-0 text-[15px] text-[var(--text-muted)]">Start with one session and move from noise to decision signal.</p>
        </section>

        <section className="bg-[var(--surface-1)] rounded-xl p-4">
          <button
            onClick={() => { supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: nextPath } }); }}
            className="w-full border-0 rounded-[9px] px-3 py-2.5 bg-[var(--surface-2)] text-[var(--text-primary)] font-semibold cursor-pointer flex items-center justify-center text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" className="mr-2 align-middle"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Continue with Google
          </button>

          <button
            onClick={() => { supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: nextPath } }); }}
            className="w-full border-0 rounded-[9px] px-3 py-2.5 bg-[var(--surface-2)] text-[var(--text-primary)] font-semibold cursor-pointer flex items-center justify-center text-sm mt-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="mr-2 align-middle"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            Continue with GitHub
          </button>

          <button
            onClick={() => { supabase.auth.signInWithOAuth({ provider: "microsoft", options: { redirectTo: nextPath } }); }}
            className="w-full border-0 rounded-[9px] px-3 py-2.5 bg-[var(--surface-2)] text-[var(--text-primary)] font-semibold cursor-pointer flex items-center justify-center text-sm mt-2"
          >
            <svg width="18" height="18" viewBox="0 0 21 21" className="mr-2 align-middle"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
            Continue with Microsoft
          </button>

          <div className="flex items-center gap-3 mt-3.5 mb-1">
            <span className="flex-1 h-px bg-[var(--surface-2)]" />
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-[0.08em]">or</span>
            <span className="flex-1 h-px bg-[var(--surface-2)]" />
          </div>

          <form
            onSubmit={(e) => {
              void (async () => {
                e.preventDefault();
                setError("");
                setSubmitting(true);

                const form = e.currentTarget as HTMLFormElement & {
                  email: { value: string };
                  password: { value: string };
                  confirmPassword: { value: string };
                };

                const email = form.email.value.trim();
                const password = form.password.value;
                const confirmPassword = form.confirmPassword.value;

                if (!email || !password) {
                  setError("Email and password are required.");
                  setSubmitting(false);
                  return;
                }
                if (password.length < 6) {
                  setError("Password must be at least 6 characters.");
                  setSubmitting(false);
                  return;
                }
                if (password !== confirmPassword) {
                  setError("Passwords do not match.");
                  setSubmitting(false);
                  return;
                }

                const signUpResult = await supabase.auth.signUp({
                  email,
                  password,
                });

                if (signUpResult.error) {
                  setError(parseAuthError(signUpResult.error, "Sign up failed. Please try again."));
                  setSubmitting(false);
                  return;
                }

                if (signUpResult.data.session) {
                  router.replace(nextPath);
                  return;
                }

                // Should not reach here with local auth (session is always returned)
                setSubmitting(false);
              })().catch((signUpError) => {
                setError(parseAuthError(signUpError, "Sign up failed. Check network and try again."));
                setSubmitting(false);
              });
            }}
            className="mt-2.5 flex flex-col gap-2.5"
          >
            <input name="email" placeholder="Email" className="w-full border-0 rounded-[9px] px-3 py-2.5 bg-[var(--surface-2)] text-[var(--text-primary)] text-sm outline-none" />
            <input name="password" type="password" placeholder="Password" className="w-full border-0 rounded-[9px] px-3 py-2.5 bg-[var(--surface-2)] text-[var(--text-primary)] text-sm outline-none" />
            <input name="confirmPassword" type="password" placeholder="Confirm Password" className="w-full border-0 rounded-[9px] px-3 py-2.5 bg-[var(--surface-2)] text-[var(--text-primary)] text-sm outline-none" />

            {error ? <p className="m-0 text-[13px] text-[var(--danger)]">{error}</p> : null}

            <button disabled={submitting} className="w-full border-0 rounded-[9px] px-3 py-2.5 bg-[var(--surface-2)] text-[var(--text-primary)] font-semibold cursor-pointer">
              {submitting ? "Please wait..." : "Create account"}
            </button>
          </form>

          {showDevBypass ? (
            <button
              onClick={() => {
                enableLocalDevSession();
                router.replace(nextPath);
              }}
              className="w-full mt-2.5 border border-dashed border-[var(--text-muted)] rounded-[9px] px-3 py-2 bg-transparent text-[var(--text-muted)] text-xs cursor-pointer opacity-60"
            >
              Dev mode: Skip signup
            </button>
          ) : null}

          <p className="mt-3 mb-0 text-[var(--text-muted)] text-[13px]">
            Already have an account? <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="text-[var(--text-primary)] no-underline">Login</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageContent />
    </Suspense>
  );
}

