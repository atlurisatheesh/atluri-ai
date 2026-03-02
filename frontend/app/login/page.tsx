"use client";

import type { CSSProperties } from "react";
import { supabase } from "../../lib/supabase";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/app";
  const [formError, setFormError] = useState("");
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
    <div style={styles.page}>
      <div style={styles.wrap}>
        <section style={styles.hero}>
          <div style={styles.kicker}>Intelligence Terminal</div>
          <h1 style={styles.title}>Resume your decision loop.</h1>
          <p style={styles.subtitle}>Run calibration. Read the verdict. Execute next move.</p>
        </section>

        <section style={styles.formSurface}>
          <button
            onClick={() => { supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: nextPath } }); }}
            style={styles.oauthButton}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 8, verticalAlign: "middle" }}><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Continue with Google
          </button>

          <button
            onClick={() => { supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: nextPath } }); }}
            style={{ ...styles.oauthButton, marginTop: 8 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8, verticalAlign: "middle" }}><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            Continue with GitHub
          </button>

          <button
            onClick={() => { supabase.auth.signInWithOAuth({ provider: "microsoft", options: { redirectTo: nextPath } }); }}
            style={{ ...styles.oauthButton, marginTop: 8 }}
          >
            <svg width="18" height="18" viewBox="0 0 21 21" style={{ marginRight: 8, verticalAlign: "middle" }}><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
            Continue with Microsoft
          </button>

          <div style={styles.oauthDivider}>
            <span style={styles.oauthDividerLine} />
            <span style={styles.oauthDividerText}>or</span>
            <span style={styles.oauthDividerLine} />
          </div>

          <form
            onSubmit={(e) => {
              void (async () => {
                e.preventDefault();
                setFormError("");
                setSubmitting(true);
                const form = e.currentTarget as HTMLFormElement & {
                  email: { value: string };
                  password: { value: string };
                };

                const email = form.email.value.trim();
                const password = form.password.value;

                if (!email || !password) {
                  setFormError("Email and password are required.");
                  setSubmitting(false);
                  return;
                }

                const result = await supabase.auth.signInWithPassword({ email, password });
                if (result.error) {
                  setFormError(parseAuthError(result.error, "Login failed. Please try again."));
                  setSubmitting(false);
                  return;
                }
                router.replace(nextPath);
              })().catch((loginError) => {
                setFormError(parseAuthError(loginError, "Login failed. Check network and try again."));
                setSubmitting(false);
              });
            }}
            style={styles.form}
          >
            <input name="email" placeholder="Email" style={styles.input} />
            <input name="password" type="password" placeholder="Password" style={styles.input} />

            {formError ? <p style={styles.error}>{formError}</p> : null}

            <button disabled={submitting} style={styles.primaryButton}>
              {submitting ? "Please wait..." : "Login"}
            </button>
          </form>

          {showDevBypass ? (
            <button
              onClick={() => {
                enableLocalDevSession();
                router.replace(nextPath);
              }}
              style={styles.devBypass}
            >
              Dev mode: Skip login
            </button>
          ) : null}

          <p style={styles.footerText}>
            New here? <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} style={styles.footerLink}>Create account</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text-primary)",
    padding: "28px clamp(16px, 2.8vw, 40px)",
  },
  wrap: {
    maxWidth: 980,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: 22,
    alignItems: "start",
  },
  hero: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    paddingTop: 8,
  },
  kicker: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "var(--text-muted)",
  },
  title: {
    margin: 0,
    fontSize: "clamp(36px, 6vw, 62px)",
    lineHeight: 1.03,
    letterSpacing: -1,
  },
  subtitle: {
    margin: 0,
    fontSize: 15,
    color: "var(--text-muted)",
  },
  formSurface: {
    background: "var(--surface-1)",
    borderRadius: 12,
    padding: "16px 16px",
  },
  googleButton: {
    width: "100%",
    border: 0,
    borderRadius: 9,
    padding: "10px 12px",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    fontWeight: 600,
    cursor: "pointer",
  },
  oauthButton: {
    width: "100%",
    border: 0,
    borderRadius: 9,
    padding: "10px 12px",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
  },
  oauthDivider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "14px 0 4px",
  },
  oauthDividerLine: {
    flex: 1,
    height: 1,
    background: "var(--surface-2)",
  },
  oauthDividerText: {
    fontSize: 12,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  },
  form: {
    marginTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  input: {
    width: "100%",
    border: 0,
    borderRadius: 9,
    padding: "10px 12px",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    fontSize: 14,
    outline: "none",
  },
  error: {
    margin: 0,
    fontSize: 13,
    color: "var(--danger)",
  },
  primaryButton: {
    width: "100%",
    border: 0,
    borderRadius: 9,
    padding: "10px 12px",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    fontWeight: 600,
    cursor: "pointer",
  },
  footerText: {
    marginTop: 12,
    marginBottom: 0,
    color: "var(--text-muted)",
    fontSize: 13,
  },
  footerLink: {
    color: "var(--text-primary)",
    textDecoration: "none",
  },
  devBypass: {
    width: "100%",
    marginTop: 10,
    border: "1px dashed var(--text-muted)",
    borderRadius: 9,
    padding: "8px 12px",
    background: "transparent",
    color: "var(--text-muted)",
    fontSize: 12,
    cursor: "pointer",
    opacity: 0.6,
  },
  warningBanner: {
    background: "rgba(255, 170, 0, 0.1)",
    border: "1px solid rgba(255, 170, 0, 0.3)",
    borderRadius: 9,
    padding: "10px 12px",
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 1.5,
    color: "#ffaa00",
  },
};
