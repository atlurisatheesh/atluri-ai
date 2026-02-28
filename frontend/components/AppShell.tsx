"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ChatBox from "./ChatBox";
import ResumeUpload from "./ResumeUpload";
import JobInput from "./JobInput";
import Interview from "./Interview";
import CodingInterviewLite from "./CodingInterviewLite";
import AuthGate from "./AuthGate";
import DashboardPanel from "./DashboardPanel";
import InlineToast from "./InlineToast";
import { supabase } from "../lib/supabase";
import { apiRequest } from "../lib/api";
import { getAccessTokenOrThrow } from "../lib/auth";

type StrategyTrack = "launch" | "depth" | "stealth" | "enterprise";

const STRATEGY_TRACK_KEY = "atluriin.strategy.track.v1";

export default function AppShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [mode, setMode] = useState("chat");
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [companyMode, setCompanyMode] = useState("general");
  const [modeSaving, setModeSaving] = useState(false);
  const [stealthDownloading, setStealthDownloading] = useState(false);
  const [showStealthModal, setShowStealthModal] = useState(false);
  const [stealthToast, setStealthToast] = useState("");
  const [strategyTrack, setStrategyTrack] = useState<StrategyTrack>("launch");
  const [interviewAutoStartNonce, setInterviewAutoStartNonce] = useState(0);
  const [modeFocusText, setModeFocusText] = useState("clear and structured answers");

  const [companyModes, setCompanyModes] = useState<Array<{ id: string; label: string; interview_focus?: string }>>([
    { id: "general", label: "General", interview_focus: "clear and structured answers" },
    { id: "amazon", label: "Amazon", interview_focus: "leadership principles + measurable outcomes" },
    { id: "google", label: "Google", interview_focus: "rigorous reasoning + trade-offs" },
    { id: "meta", label: "Meta", interview_focus: "impact, ownership, execution speed" },
  ]);

  useEffect(() => {
    try {
      const stored = String(window.localStorage.getItem(STRATEGY_TRACK_KEY) || "launch") as StrategyTrack;
      if (["launch", "depth", "stealth", "enterprise"].includes(stored)) {
        setStrategyTrack(stored);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadCompanyMode = async () => {
      try {
        const authToken = await getAccessTokenOrThrow();
        const [snapshotResult, modesResult] = await Promise.all([
          apiRequest<any>("/api/context/snapshot", { method: "GET", retries: 0, authToken }),
          apiRequest<{ items: Array<{ id: string; label: string; interview_focus?: string }> }>("/api/context/company-modes", {
            method: "GET",
            retries: 0,
            authToken,
          }),
        ]);
        if (!active) return;
        const nextMode = String(snapshotResult?.company_mode || "general");
        setCompanyMode(nextMode);
        const modes = Array.isArray(modesResult?.items) ? modesResult.items : [];
        if (modes.length > 0) {
          setCompanyModes(modes);
          const selected = modes.find((item) => item.id === nextMode);
          setModeFocusText(String(selected?.interview_focus || "clear and structured answers"));
        }
      } catch {
      }
    };
    loadCompanyMode();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const requestedMode = String(searchParams.get("mode") || "").toLowerCase();
    if (["chat", "resume", "job", "interview", "dashboard", "coding"].includes(requestedMode)) {
      setMode(requestedMode);
    }
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    const applySession = async () => {
      let user: any = null;
      try {
        const sessionResult = await supabase.auth.getSession();
        user = sessionResult.data.session?.user || null;
      } catch {
        user = null;
      }
      const metadataName = String(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name || "").trim();
      const emailName = String(user?.email || "").split("@")[0] || "";
      const resolvedName = metadataName || emailName || "User";
      if (!mounted) return;
      setDisplayName(user ? resolvedName : "");
      setAuthResolved(true);
    };
    applySession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      const metadataName = String(user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name || "").trim();
      const emailName = String(user?.email || "").split("@")[0] || "";
      const resolvedName = metadataName || emailName || "User";
      setDisplayName(user ? resolvedName : "");
      setAuthResolved(true);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!showMoreTools) return;
      const node = moreMenuRef.current;
      if (!node) return;
      if (!node.contains(event.target as Node)) {
        setShowMoreTools(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowMoreTools(false);
        setShowStealthModal(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [showMoreTools]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const pushToast = (message: string, durationMs = 2800) => {
    setStealthToast(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setStealthToast("");
      toastTimerRef.current = null;
    }, durationMs);
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      router.push("/login?next=/app");
    } catch {
      pushToast("Logout failed. Try again.", 3200);
    } finally {
      setSigningOut(false);
    }
  };

  const selectCompanyMode = async (nextMode: string) => {
    if (!nextMode || nextMode === companyMode || modeSaving) return;
    try {
      setModeSaving(true);
      setCompanyMode(nextMode);
      const selectedLocal = companyModes.find((item) => item.id === nextMode);
      if (selectedLocal?.interview_focus) {
        setModeFocusText(selectedLocal.interview_focus);
      }
      const authToken = await getAccessTokenOrThrow();
      const data = await apiRequest<{ company_mode: string }>("/api/context/company-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_mode: nextMode }),
        retries: 1,
        authToken,
      });
      const finalMode = String(data?.company_mode || nextMode);
      setCompanyMode(finalMode);
      const selected = companyModes.find((item) => item.id === finalMode);
      if (selected?.interview_focus) {
        setModeFocusText(selected.interview_focus);
      }
    } catch {
    } finally {
      setModeSaving(false);
    }
  };

  const selectStrategyTrack = (track: StrategyTrack) => {
    setStrategyTrack(track);
    try {
      window.localStorage.setItem(STRATEGY_TRACK_KEY, track);
    } catch {
    }
  };

  const downloadStealthInstaller = async () => {
    if (stealthDownloading) return;
    try {
      setStealthDownloading(true);
      const response = await fetch("/api/desktop-installer");
      if (!response.ok) {
        throw new Error(`installer_unavailable_${response.status}`);
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^\"]+)"?/i);
      const filename = filenameMatch?.[1] || "AtluriIn-Practice-Setup.exe";

      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
      pushToast("Installer download started.");
    } catch {
      pushToast("Installer unavailable. Build desktop with npm run dist:win.", 4200);
    } finally {
      setStealthDownloading(false);
    }
  };

  const requestStealthInstaller = () => {
    setStrategyTrack("stealth");
    try {
      window.localStorage.setItem(STRATEGY_TRACK_KEY, "stealth");
    } catch {
    }
    setShowStealthModal(true);
  };

  const signal = useMemo(() => {
    const base = companyMode === "amazon" ? 76 : companyMode === "google" ? 80 : companyMode === "meta" ? 74 : 72;
    const modeBoost = mode === "interview" ? 7 : mode === "dashboard" ? 4 : mode === "coding" ? 3 : 0;
    const credibility = Math.max(42, Math.min(96, base + modeBoost));
    const risk = Math.max(8, Math.min(86, 88 - credibility));
    const pressure = Math.max(16, Math.min(90, mode === "interview" ? 66 : 38));
    return { credibility, risk, pressure };
  }, [companyMode, mode]);

  const trackCopy: Record<StrategyTrack, { label: string; title: string; sub: string }> = {
    launch: { label: "Senior SWE", title: "Architecture + Ownership", sub: "Outcome-first." },
    depth: { label: "PM L6", title: "Decision + Prioritization", sub: "Executive precision." },
    stealth: { label: "Stealth Mode", title: "Desktop + Local Practice", sub: "Install and run locally." },
    enterprise: { label: "Program", title: "Consistency + Governance", sub: "Audit-grade trust." },
  };

  const showDecisionHome = mode === "chat" || mode === "dashboard";

  const headerPrimaryModeItems: Array<{ id: string; label: string }> = [
    { id: "chat", label: "Home" },
    { id: "interview", label: "Pressure Lab" },
  ];
  const headerMoreModeItems: Array<{ id: string; label: string }> = [
    { id: "dashboard", label: "Performance" },
    { id: "coding", label: "Coding" },
    { id: "resume", label: "Resume" },
    { id: "job", label: "Job" },
  ];

  const heroUtilityActions: Array<{ label: string; mode: string }> = [
    { label: "Performance", mode: "dashboard" },
    { label: "Resume", mode: "resume" },
    { label: "Role", mode: "job" },
  ];

  const heroSignals = [
    `Signal ${Math.round(signal.credibility)}%`,
    `Risk ${Math.round(signal.risk)}%`,
    `Pressure ${Math.round(signal.pressure)}%`,
    `Mode ${companyMode}`,
  ];

  return (
    <AuthGate>
      <div style={styles.page}>
        <div style={styles.main}>
          <div style={styles.topRow}>
            <div style={styles.brand}>AtluriIn</div>
            <div style={styles.topActions}>
              {authResolved && !displayName && (
                <>
                  <Link href="/login?next=/app" style={styles.topLink}>
                    Login
                  </Link>
                  <Link href="/signup?next=/app" style={styles.topButton}>
                    Sign Up
                  </Link>
                </>
              )}
              {authResolved && Boolean(displayName) && (
                <>
                  <div style={styles.userPill}>{displayName}</div>
                  <button
                    style={styles.topButton}
                    onClick={handleSignOut}
                    disabled={signingOut}
                  >
                    {signingOut ? "Signing out" : "Logout"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={styles.modeBar}>
            <div style={styles.modeButtons}>
              {headerPrimaryModeItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setMode(item.id);
                    setShowMoreTools(false);
                  }}
                  style={mode === item.id ? styles.modeButtonActive : styles.modeButton}
                >
                  {item.label}
                </button>
              ))}
              <div style={styles.moreWrap} ref={moreMenuRef}>
                <button
                  style={
                    headerMoreModeItems.some((item) => item.id === mode)
                      ? styles.modeButtonActive
                      : styles.modeButton
                  }
                  onClick={() => setShowMoreTools((v) => !v)}
                >
                  {headerMoreModeItems.some((item) => item.id === mode)
                    ? `${headerMoreModeItems.find((item) => item.id === mode)?.label} ▾`
                    : "More ▾"}
                </button>
                {showMoreTools && (
                  <div style={styles.moreMenu}>
                    {headerMoreModeItems.map((item) => (
                      <button
                        key={item.id}
                        style={mode === item.id ? styles.moreItemActive : styles.moreItem}
                        onClick={() => {
                          setMode(item.id);
                          setShowMoreTools(false);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                    <button
                      style={styles.moreItem}
                      onClick={() => {
                        setShowMoreTools(false);
                        router.push("/demo");
                      }}
                    >
                      Demo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {showDecisionHome && (
            <section style={styles.hero}>
              <div style={styles.heroLeft}>
                <div style={styles.heroKicker}>{trackCopy[strategyTrack].label}</div>
                <h1 style={styles.heroTitle}>One screen. One decision.</h1>
                <p style={styles.heroSub}>{trackCopy[strategyTrack].sub}</p>
                <div style={styles.heroPrimaryRow}>
                  <button
                    style={styles.actionPrimary}
                    onClick={() => {
                      setMode("interview");
                      setInterviewAutoStartNonce((v) => v + 1);
                    }}
                  >
                    Start Pressure Lab
                  </button>
                </div>
                <div style={styles.heroUtilityRow}>
                  {heroUtilityActions.map((item) => (
                    <button
                      key={item.mode}
                      style={styles.actionSurface}
                      onClick={() => setMode(item.mode)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <aside style={styles.heroRightRail}>
                {heroSignals.map((item) => (
                  <span key={item} style={styles.signal}>
                    {item}
                  </span>
                ))}
              </aside>
            </section>
          )}

          {(mode === "chat" || mode === "interview" || mode === "coding") && (
            <section style={styles.modeStrip}>
              <div style={styles.modeStripTitle}>Company Context</div>
              <div style={styles.modeChips}>
                {companyModes
                  .filter((item) => ["general", "amazon", "google", "meta"].includes(String(item.id).toLowerCase()))
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => selectCompanyMode(item.id)}
                      disabled={modeSaving}
                      style={companyMode === item.id ? styles.modeChipActive : styles.modeChip}
                    >
                      {item.label}
                    </button>
                  ))}
              </div>
              <div style={styles.modeFocus}>Focus: {modeFocusText}</div>
              <div style={styles.trackRow}>
                {([
                  { id: "launch", label: "Senior SWE" },
                  { id: "depth", label: "PM L6" },
                  { id: "stealth", label: stealthDownloading ? "Downloading..." : "Stealth Mode" },
                  { id: "enterprise", label: "Program" },
                ] as Array<{ id: StrategyTrack; label: string }>).map((track) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      if (track.id === "stealth") {
                        requestStealthInstaller();
                        return;
                      }
                      selectStrategyTrack(track.id);
                    }}
                    disabled={track.id === "stealth" && stealthDownloading}
                    style={strategyTrack === track.id ? styles.trackButtonActive : styles.trackButton}
                  >
                    {track.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {mode === "chat" && <ChatBox />}
          {mode === "resume" && <ResumeUpload />}
          {mode === "job" && <JobInput />}
          {mode === "interview" && (
            <Interview
              strategyTrack={strategyTrack}
              autoStartNonce={interviewAutoStartNonce}
            />
          )}
          {mode === "coding" && (
            <CodingInterviewLite strategyTrack={strategyTrack} />
          )}
          {mode === "dashboard" && (
            <DashboardPanel strategyTrack={strategyTrack} />
          )}
        </div>

        {showStealthModal && (
          <div style={styles.stealthModalBackdrop} onClick={() => setShowStealthModal(false)}>
            <div style={styles.stealthModalCard} onClick={(event) => event.stopPropagation()}>
              <div style={styles.stealthModalTitle}>Install Stealth Mode locally?</div>
              <p style={styles.stealthModalText}>
                This will download the AtluriIn Desktop installer (.exe).
              </p>
              <div style={styles.stealthModalActions}>
                <button
                  style={styles.stealthModalCancel}
                  onClick={() => setShowStealthModal(false)}
                  disabled={stealthDownloading}
                >
                  Not now
                </button>
                <button
                  style={styles.stealthModalConfirm}
                  onClick={() => {
                    setShowStealthModal(false);
                    void downloadStealthInstaller();
                  }}
                  disabled={stealthDownloading}
                >
                  {stealthDownloading ? "Downloading..." : "Download .exe"}
                </button>
              </div>
            </div>
          </div>
        )}

        <InlineToast message={stealthToast} />
      </div>
    </AuthGate>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
  },
  main: {
    width: "100%",
    maxWidth: 1120,
    margin: "0 auto",
    padding: "28px clamp(16px, 2.8vw, 40px) 40px",
    display: "flex",
    flexDirection: "column",
    gap: 26,
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  brand: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: 0.2,
  },
  topActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  userPill: {
    borderRadius: 999,
    padding: "6px 11px",
    background: "var(--surface-1)",
    color: "var(--text-muted)",
    fontSize: 12,
    fontWeight: 500,
  },
  topLink: {
    textDecoration: "none",
    color: "var(--text-muted)",
    padding: "7px 11px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
  },
  topButton: {
    border: 0,
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  modeBar: {
    paddingTop: 8,
    borderTop: "1px solid var(--border-subtle)",
  },
  modeButtons: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    position: "relative",
  },
  modeButton: {
    border: 0,
    background: "var(--surface-1)",
    color: "var(--text-muted)",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },
  modeButtonActive: {
    border: 0,
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  moreWrap: {
    position: "relative",
  },
  moreMenu: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    minWidth: 170,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 10,
    padding: 6,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    zIndex: 20,
  },
  moreItem: {
    textAlign: "left",
    border: 0,
    background: "var(--surface-1)",
    color: "var(--text-muted)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },
  moreItemActive: {
    textAlign: "left",
    border: 0,
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 7fr) minmax(180px, 3fr)",
    gap: 18,
    padding: "36px 0 14px",
  },
  heroLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  heroKicker: {
    fontSize: 12,
    textTransform: "uppercase",
    color: "var(--text-muted)",
    letterSpacing: "0.08em",
  },
  heroTitle: {
    margin: 0,
    fontSize: "clamp(34px, 6vw, 62px)",
    lineHeight: 1.02,
    letterSpacing: -1,
    fontWeight: 700,
  },
  heroSub: {
    margin: 0,
    fontSize: 13,
    color: "var(--text-muted)",
  },
  heroPrimaryRow: {
    marginTop: 2,
    display: "flex",
  },
  heroUtilityRow: {
    marginTop: 2,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  heroRightRail: {
    borderLeft: "1px solid var(--border-subtle)",
    paddingLeft: 14,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    alignSelf: "center",
  },
  signal: {
    fontSize: 11,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    opacity: 0.82,
  },
  actionPrimary: {
    border: 0,
    background: "var(--accent)",
    color: "var(--bg)",
    borderRadius: 6,
    minHeight: 44,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  actionSurface: {
    border: 0,
    background: "transparent",
    color: "var(--text-muted)",
    borderRadius: 4,
    padding: "6px 2px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: 12,
  },
  modeStrip: {
    borderTop: "1px solid var(--border-subtle)",
    paddingTop: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  modeStripTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    color: "var(--text-muted)",
    letterSpacing: "0.08em",
    fontWeight: 600,
  },
  modeChips: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  modeChip: {
    border: 0,
    borderRadius: 999,
    padding: "6px 11px",
    background: "var(--surface-1)",
    color: "var(--text-muted)",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    opacity: 0.82,
  },
  modeChipActive: {
    border: 0,
    borderRadius: 999,
    padding: "6px 11px",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  modeFocus: {
    fontSize: 13,
    color: "var(--text-muted)",
  },
  trackRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  trackButton: {
    border: 0,
    borderRadius: 999,
    padding: "6px 11px",
    background: "var(--surface-1)",
    color: "var(--text-muted)",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },
  trackButtonActive: {
    border: 0,
    borderRadius: 999,
    padding: "6px 11px",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  stealthModalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "color-mix(in srgb, var(--bg) 58%, transparent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 80,
    padding: 16,
  },
  stealthModalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 12,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  stealthModalTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  stealthModalText: {
    margin: 0,
    fontSize: 13,
    color: "var(--text-muted)",
    lineHeight: 1.5,
  },
  stealthModalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
  stealthModalCancel: {
    border: 0,
    borderRadius: 6,
    padding: "10px 14px",
    background: "var(--surface-1)",
    color: "var(--text-muted)",
    fontSize: 12,
    cursor: "pointer",
  },
  stealthModalConfirm: {
    border: 0,
    borderRadius: 6,
    padding: "10px 14px",
    background: "var(--accent)",
    color: "var(--bg)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
};
