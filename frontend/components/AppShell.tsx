"use client";

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
      const displayNameValue = String(user?.display_name || "").trim();
      const emailName = String(user?.email || "").split("@")[0] || "";
      const resolvedName = displayNameValue || emailName || "User";
      if (!mounted) return;
      setDisplayName(user ? resolvedName : "");
      setAuthResolved(true);
    };
    applySession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      const displayNameValue = String(user?.display_name || "").trim();
      const emailName = String(user?.email || "").split("@")[0] || "";
      const resolvedName = displayNameValue || emailName || "User";
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
      // Clear E2E dev bypass keys so logout actually works
      try {
        window.localStorage.removeItem("atluriin.e2e.bypass");
        window.localStorage.removeItem("atluriin.e2e.user_id");
        // Clear local auth tokens
        window.localStorage.removeItem("atluriin.auth.token");
        window.localStorage.removeItem("atluriin.auth.user");
      } catch { /* ignore */ }
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
      <div className="min-h-screen bg-[var(--bg)]">
        <div className="w-full max-w-[1120px] mx-auto px-[clamp(16px,2.8vw,40px)] pt-7 pb-10 flex flex-col gap-[26px]">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <div className="text-xl font-bold tracking-[0.2px]">AtluriIn</div>
            <div className="flex gap-2 items-center">
              {authResolved && !displayName && (
                <>
                  <Link href="/login?next=/app" className="no-underline text-[var(--text-muted)] py-[7px] px-[11px] rounded-lg text-xs font-medium">
                    Login
                  </Link>
                  <Link href="/signup?next=/app" className="border-0 bg-[var(--surface-2)] text-[var(--text-primary)] rounded-md py-2 px-3 text-xs font-semibold cursor-pointer">
                    Sign Up
                  </Link>
                </>
              )}
              {authResolved && Boolean(displayName) && (
                <>
                  <div className="rounded-full px-[11px] py-1.5 bg-[var(--surface-1)] text-[var(--text-muted)] text-xs font-medium">{displayName}</div>
                  <button
                    className="border-0 bg-[var(--surface-2)] text-[var(--text-primary)] rounded-md py-2 px-3 text-xs font-semibold cursor-pointer"
                    onClick={handleSignOut}
                    disabled={signingOut}
                  >
                    {signingOut ? "Signing out" : "Logout"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <div className="flex gap-2 flex-wrap relative">
              {headerPrimaryModeItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setMode(item.id);
                    setShowMoreTools(false);
                  }}
                  className={mode === item.id ? "border-0 bg-[var(--surface-2)] text-[var(--text-primary)] rounded-lg py-2 px-3 text-xs font-semibold cursor-pointer" : "border-0 bg-[var(--surface-1)] text-[var(--text-muted)] rounded-lg py-2 px-3 text-xs font-medium cursor-pointer"}
                >
                  {item.label}
                </button>
              ))}
              <div className="relative" ref={moreMenuRef}>
                <button
                  className={
                    headerMoreModeItems.some((item) => item.id === mode)
                      ? "border-0 bg-[var(--surface-2)] text-[var(--text-primary)] rounded-lg py-2 px-3 text-xs font-semibold cursor-pointer"
                      : "border-0 bg-[var(--surface-1)] text-[var(--text-muted)] rounded-lg py-2 px-3 text-xs font-medium cursor-pointer"
                  }
                  onClick={() => setShowMoreTools((v) => !v)}
                >
                  {headerMoreModeItems.some((item) => item.id === mode)
                    ? `${headerMoreModeItems.find((item) => item.id === mode)?.label} â–¾`
                    : "More â–¾"}
                </button>
                {showMoreTools && (
                  <div className="absolute top-[calc(100%+8px)] left-0 min-w-[170px] bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-[10px] p-1.5 flex flex-col gap-1.5 z-20">
                    {headerMoreModeItems.map((item) => (
                      <button
                        key={item.id}
                        className={mode === item.id ? "text-left border-0 bg-[var(--surface-2)] text-[var(--text-primary)] rounded-lg py-2 px-2.5 text-xs font-semibold cursor-pointer" : "text-left border-0 bg-[var(--surface-1)] text-[var(--text-muted)] rounded-lg py-2 px-2.5 text-xs font-medium cursor-pointer"}
                        onClick={() => {
                          setMode(item.id);
                          setShowMoreTools(false);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                    <button
                      className="text-left border-0 bg-[var(--surface-1)] text-[var(--text-muted)] rounded-lg py-2 px-2.5 text-xs font-medium cursor-pointer"
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
            <section className="grid grid-cols-[minmax(0,7fr)_minmax(180px,3fr)] gap-[18px] pt-9 pb-3.5">
              <div className="flex flex-col gap-3">
                <div className="text-xs uppercase text-[var(--text-muted)] tracking-[0.08em]">{trackCopy[strategyTrack].label}</div>
                <h1 className="m-0 text-[clamp(34px,6vw,62px)] leading-[1.02] tracking-[-1px] font-bold">One screen. One decision.</h1>
                <p className="m-0 text-[13px] text-[var(--text-muted)]">{trackCopy[strategyTrack].sub}</p>
                <div className="mt-0.5 flex">
                  <button
                    className="border-0 bg-[var(--accent)] text-[var(--bg)] rounded-md min-h-[44px] py-2.5 px-5 text-sm font-semibold cursor-pointer"
                    onClick={() => {
                      setMode("interview");
                      setInterviewAutoStartNonce((v) => v + 1);
                    }}
                  >
                    Start Pressure Lab
                  </button>
                </div>
                <div className="mt-0.5 flex gap-2.5 flex-wrap">
                  {heroUtilityActions.map((item) => (
                    <button
                      key={item.mode}
                      className="border-0 bg-transparent text-[var(--text-muted)] rounded py-1.5 px-0.5 text-left cursor-pointer text-xs"
                      onClick={() => setMode(item.mode)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <aside className="border-l border-[var(--border-subtle)] pl-3.5 flex flex-col gap-2 self-center">
                {heroSignals.map((item) => (
                  <span key={item} className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.04em] opacity-[0.82]">
                    {item}
                  </span>
                ))}
              </aside>
            </section>
          )}

          {(mode === "chat" || mode === "interview" || mode === "coding") && (
            <section className="border-t border-[var(--border-subtle)] pt-3.5 flex flex-col gap-2.5">
              <div className="text-[11px] uppercase text-[var(--text-muted)] tracking-[0.08em] font-semibold">Company Context</div>
              <div className="flex gap-2 flex-wrap">
                {companyModes
                  .filter((item) => ["general", "amazon", "google", "meta"].includes(String(item.id).toLowerCase()))
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => selectCompanyMode(item.id)}
                      disabled={modeSaving}
                      className={companyMode === item.id ? "border-0 rounded-full py-1.5 px-[11px] bg-[var(--surface-2)] text-[var(--text-primary)] text-xs font-semibold cursor-pointer" : "border-0 rounded-full py-1.5 px-[11px] bg-[var(--surface-1)] text-[var(--text-muted)] text-xs font-medium cursor-pointer opacity-[0.82]"}
                    >
                      {item.label}
                    </button>
                  ))}
              </div>
              <div className="text-[13px] text-[var(--text-muted)]">Focus: {modeFocusText}</div>
              <div className="flex gap-2 flex-wrap">
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
                    className={strategyTrack === track.id ? "border-0 rounded-full py-1.5 px-[11px] bg-[var(--surface-2)] text-[var(--text-primary)] text-xs font-semibold cursor-pointer" : "border-0 rounded-full py-1.5 px-[11px] bg-[var(--surface-1)] text-[var(--text-muted)] text-xs font-medium cursor-pointer"}
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
          <div className="fixed inset-0 bg-[color-mix(in_srgb,var(--bg)_58%,transparent)] flex items-center justify-center z-[80] p-4" onClick={() => setShowStealthModal(false)}>
            <div className="w-full max-w-[420px] rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] p-[18px] flex flex-col gap-3" onClick={(event) => event.stopPropagation()}>
              <div className="text-base font-bold text-[var(--text-primary)]">Install Stealth Mode locally?</div>
              <p className="m-0 text-[13px] text-[var(--text-muted)] leading-[1.5]">
                This will download the AtluriIn Desktop installer (.exe).
              </p>
              <div className="flex justify-end gap-2">
                <button
                  className="border-0 rounded-md py-2.5 px-3.5 bg-[var(--surface-1)] text-[var(--text-muted)] text-xs cursor-pointer"
                  onClick={() => setShowStealthModal(false)}
                  disabled={stealthDownloading}
                >
                  Not now
                </button>
                <button
                  className="border-0 rounded-md py-2.5 px-3.5 bg-[var(--accent)] text-[var(--bg)] text-xs font-semibold cursor-pointer"
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

