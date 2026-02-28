"use client";

import type { CSSProperties } from "react";
import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";
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

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/app";
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const ensureUnauthed = async () => {
      try {
        const sessionResult = await supabase.auth.getSession();
        if (sessionResult.data.session) {
          router.replace(nextPath);
        }
      } catch {
      }
    };
    ensureUnauthed();
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
            onClick={() => {
              void (async () => {
                setFormError("");
                if (isLocalDevHost()) {
                  enableLocalDevSession();
                  router.replace(nextPath);
                  return;
                }
                const oauthResult = await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: window.location.origin + nextPath },
                });
                if (oauthResult.error) {
                  setFormError(parseAuthError(oauthResult.error, "Google sign-in failed. Please try again."));
                }
              })().catch((oauthError) => {
                setFormError(parseAuthError(oauthError, "Google sign-in failed. Check network and try again."));
              });
            }}
            style={styles.googleButton}
          >
            Continue with Google
          </button>

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

                if (isLocalDevHost()) {
                  enableLocalDevSession();
                  router.replace(nextPath);
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

          <p style={styles.footerText}>
            New here? <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} style={styles.footerLink}>Create account</Link>
          </p>
        </section>
      </div>
    </div>
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
};
