"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "../lib/api";
import StatusBanner from "./StatusBanner";
import { showToast } from "../lib/toast";
import { getAccessTokenOrThrow } from "../lib/auth";

export default function Sidebar({ setMode, activeMode }: { setMode: (m: string) => void; activeMode?: string }) {
  const [resetting, setResetting] = useState(false);
  const [contextStatus, setContextStatus] = useState({
    resume_loaded: false,
    resume_chars: 0,
    job_loaded: false,
    job_chars: 0,
  });
  const [snapshot, setSnapshot] = useState({
    interview: {
      role: "",
      active: false,
      done: false,
      updated_at: 0,
    },
    credibility: {
      has_snapshot: false,
      updated_at: 0,
    },
  });
  const [status, setStatus] = useState<{ type: "error" | "success" | "info"; message: string }>({
    type: "info",
    message: "",
  });
  const [companyMode, setCompanyMode] = useState("general");
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [companyModeQuery, setCompanyModeQuery] = useState("");
  const [companyModesLoadedFromApi, setCompanyModesLoadedFromApi] = useState(false);
  const [companyModes, setCompanyModes] = useState<Array<{ id: string; label: string; interview_focus?: string; chat_style?: string }>>([
    { id: "general", label: "General", interview_focus: "clear and structured answers", chat_style: "balanced practical guidance" },
    { id: "amazon", label: "Amazon", interview_focus: "Leadership Principles, trade-offs, and measurable outcomes" },
    { id: "google", label: "Google", interview_focus: "structured reasoning, algorithmic rigor, and collaboration" },
    { id: "meta", label: "Meta", interview_focus: "product impact, ambiguity handling, and scaling decisions" },
  ]);

  useEffect(() => {
    const loadContextStatus = async () => {
      try {
        const authToken = await getAccessTokenOrThrow();
        const [statusResult, snapshotResult, modesResult] = await Promise.allSettled([
          apiRequest<any>("/api/context/status", {
            method: "GET",
            retries: 1,
            authToken,
          }),
          apiRequest<any>("/api/context/snapshot", {
            method: "GET",
            retries: 1,
            authToken,
          }),
          apiRequest<{ items: Array<{ id: string; label: string; interview_focus?: string; chat_style?: string }> }>("/api/context/company-modes", {
            method: "GET",
            retries: 1,
            authToken,
          }),
        ]);

        if (statusResult.status === "fulfilled") {
          const data = statusResult.value;
          setContextStatus({
            resume_loaded: Boolean(data.resume_loaded),
            resume_chars: Number(data.resume_chars || 0),
            job_loaded: Boolean(data.job_loaded),
            job_chars: Number(data.job_chars || 0),
          });
        }

        if (snapshotResult.status === "fulfilled") {
          const snap = snapshotResult.value;
          setSnapshot({
            interview: {
              role: String(snap?.interview?.role || ""),
              active: Boolean(snap?.interview?.active),
              done: Boolean(snap?.interview?.done),
              updated_at: Number(snap?.interview?.updated_at || 0),
            },
            credibility: {
              has_snapshot: Boolean(snap?.credibility?.has_snapshot),
              updated_at: Number(snap?.credibility?.updated_at || 0),
            },
          });
          setCompanyMode(String(snap?.company_mode || "general"));
        }

        const modes = modesResult.status === "fulfilled" ? modesResult.value : null;
        const incomingModes = Array.isArray(modes?.items)
          ? modes.items.filter((item) => item && typeof item.id === "string" && typeof item.label === "string")
          : [];
        if (incomingModes.length > 0) {
          setCompanyModes(incomingModes);
          setCompanyModesLoadedFromApi(true);
        } else {
          setCompanyModesLoadedFromApi(false);
          setStatus({ type: "error", message: "Using fallback company list. Could not load company modes from API." });
        }
      } catch (error: any) {
        setCompanyModesLoadedFromApi(false);
        setStatus({
          type: "error",
          message: `Using fallback company list: ${error?.message || "failed to load company modes"}`,
        });
      }
    };

    loadContextStatus();
    const refreshTimer = window.setInterval(loadContextStatus, 15000);

    const onUpdated = () => loadContextStatus();
    window.addEventListener("context-updated", onUpdated as EventListener);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("context-updated", onUpdated as EventListener);
    };
  }, []);

  const resetContext = async () => {
    try {
      setResetting(true);
      setStatus({ type: "info", message: "Resetting context..." });
      const authToken = await getAccessTokenOrThrow();
      await apiRequest("/api/context/reset", {
        method: "POST",
        retries: 1,
        authToken,
      });
      window.dispatchEvent(new CustomEvent("context-updated"));
      setStatus({ type: "success", message: "Context reset complete." });
      showToast({ type: "success", message: "Context reset complete." });
    } catch {
      setStatus({ type: "error", message: "Failed to reset context." });
      showToast({ type: "error", message: "Failed to reset context." });
    } finally {
      setResetting(false);
    }
  };

  const onCompanyModeChange = async (nextMode: string) => {
    try {
      setCompanyMode(nextMode);
      const authToken = await getAccessTokenOrThrow();
      const data = await apiRequest<{ company_mode: string }>("/api/context/company-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_mode: nextMode }),
        retries: 1,
        authToken,
      });
      setCompanyMode(String(data.company_mode || "general"));
      setStatus({ type: "success", message: "Company mode updated." });
      showToast({ type: "success", message: "Company mode updated." });
      window.dispatchEvent(new CustomEvent("context-updated"));
    } catch {
      setStatus({ type: "error", message: "Failed to update company mode." });
      showToast({ type: "error", message: "Failed to update company mode." });
    }
  };

  const selectedCompany = companyModes.find((mode) => mode.id === companyMode);
  const normalizedQuery = companyModeQuery.trim().toLowerCase();
  const filteredCompanyModes = normalizedQuery
    ? companyModes.filter((mode) => mode.label.toLowerCase().includes(normalizedQuery) || mode.id.toLowerCase().includes(normalizedQuery))
    : companyModes;
  const primaryNavItems = [
    { mode: "chat", label: "🧠 Copilot" },
    { mode: "interview", label: "🎙 Pressure Lab" },
    { mode: "coding", label: "💻 Coding Assistant" },
    { mode: "dashboard", label: "📊 Performance" },
  ];
  const setupNavItems = [
    { mode: "resume", label: "📁 Resume" },
    { mode: "job", label: "🎯 Job Target" },
  ];

  return (
    <div style={styles.sidebar}>
      <div style={styles.logoWrap}>
        <div style={styles.logo}>AtluriIn AI</div>
        <div style={styles.logoSub}>Interview Performance OS</div>
      </div>

      {primaryNavItems.map((item) => (
        <button
          key={item.mode}
          style={activeMode === item.mode ? styles.itemActive : styles.item}
          onClick={() => setMode(item.mode)}
        >
          {item.label}
        </button>
      ))}

      <div style={styles.groupLabel}>Setup</div>
      <div style={styles.setupGrid}>
        {setupNavItems.map((item) => (
          <button
            key={item.mode}
            style={activeMode === item.mode ? styles.setupItemActive : styles.setupItem}
            onClick={() => setMode(item.mode)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Link href="/demo" style={styles.itemLink}>🎬 Demo</Link>

      <div style={styles.statusCard}>
        <div style={styles.statusHeaderRow}>
          <div style={styles.statusTitle}>Session Status</div>
          <button style={styles.diagToggle} onClick={() => setShowDiagnostics((v) => !v)}>
            {showDiagnostics ? "Hide" : "Show"}
          </button>
        </div>
        <div style={styles.statusLine}>Interview: {snapshot.interview.active ? "Active" : snapshot.interview.done ? "Completed" : "Not started"}</div>
        <div style={styles.statusLine}>Credibility: {snapshot.credibility.has_snapshot ? "Available" : "Unavailable"}</div>
        <div style={styles.statusLine}>Company: {selectedCompany?.label || "General"}</div>

        {showDiagnostics && (
          <>
            <div style={styles.separator} />
            <div style={styles.statusTitle}>Diagnostics</div>
            <div style={styles.statusLine}>
              Resume: {contextStatus.resume_loaded ? `Loaded (${contextStatus.resume_chars} chars)` : "Not loaded"}
            </div>
            <div style={styles.statusLine}>
              JD: {contextStatus.job_loaded ? `Loaded (${contextStatus.job_chars} chars)` : "Not loaded"}
            </div>
            <div style={styles.statusLine}>Role: {snapshot.interview.role || "—"}</div>
            <div style={styles.statusSubLine}>Company Mode</div>
            <input
              style={styles.searchInput}
              value={companyModeQuery}
              onChange={(e) => setCompanyModeQuery(e.target.value)}
              placeholder="Search company"
            />
            <select
              style={styles.select}
              value={companyMode}
              onChange={(e) => onCompanyModeChange(e.target.value)}
            >
              {filteredCompanyModes.map((mode) => (
                <option key={mode.id} value={mode.id}>{mode.label}</option>
              ))}
            </select>
            {filteredCompanyModes.length === 0 && (
              <div style={styles.modeHint}>No companies match your search.</div>
            )}
            {selectedCompany?.interview_focus && (
              <div style={styles.modeHint}>Focus: {selectedCompany.interview_focus}</div>
            )}
            {!companyModesLoadedFromApi && (
              <div style={styles.modeHint}>Showing fallback list (4). Sign in and check API connectivity to load all companies.</div>
            )}
            <div style={styles.statusSubLine}>
              Updated: {snapshot.interview.updated_at ? new Date(snapshot.interview.updated_at * 1000).toLocaleString() : "—"}
            </div>

            <button style={styles.resetButton} onClick={resetContext} disabled={resetting}>
              {resetting ? "Resetting..." : "Reset Context"}
            </button>
          </>
        )}
        <StatusBanner
          type={status.type}
          message={status.message}
          actionLabel={status.type === "error" ? "Retry" : undefined}
          onAction={status.type === "error" ? resetContext : undefined}
        />
      </div>

      <div style={styles.profileDock}>
        <div style={styles.profileLine}>Tier</div>
        <div style={styles.tierBadge}>Free</div>
      </div>
    </div>
  );
}

const styles: any = {
  sidebar: {
    width: 268,
    background: "linear-gradient(180deg, #071021 0%, #0a1530 55%, #0d1f3c 100%)",
    color: "#dbeafe",
    display: "flex",
    flexDirection: "column",
    padding: 18,
    gap: 10,
    borderRight: "1px solid rgba(125, 211, 252, 0.2)",
    boxShadow: "8px 0 30px rgba(2, 6, 23, 0.45)",
  },
  logoWrap: {
    marginBottom: 8,
  },
  logo: {
    fontSize: 26,
    fontWeight: 800,
    color: "#f8fafc",
    letterSpacing: 0.2,
  },
  logoSub: {
    marginTop: 4,
    fontSize: 12,
    color: "#93c5fd",
    fontWeight: 600,
  },
  item: {
    padding: "12px 14px",
    borderRadius: 10,
    cursor: "pointer",
    background: "rgba(15, 23, 42, 0.5)",
    border: "1px solid rgba(125, 211, 252, 0.18)",
    fontWeight: 700,
    color: "#cbd5e1",
    textAlign: "left",
  },
  itemActive: {
    padding: "12px 14px",
    borderRadius: 10,
    cursor: "pointer",
    background: "linear-gradient(180deg, rgba(37, 99, 235, 0.32) 0%, rgba(14, 116, 144, 0.3) 100%)",
    border: "1px solid rgba(125, 211, 252, 0.6)",
    fontWeight: 800,
    color: "#e0f2fe",
    textAlign: "left",
    boxShadow: "0 0 0 1px rgba(125, 211, 252, 0.3), 0 6px 20px rgba(14, 165, 233, 0.18)",
  },
  itemLink: {
    display: "block",
    padding: "12px 14px",
    borderRadius: 10,
    cursor: "pointer",
    background: "rgba(15, 23, 42, 0.5)",
    border: "1px solid rgba(125, 211, 252, 0.18)",
    fontWeight: 700,
    color: "#cbd5e1",
    textDecoration: "none",
    textAlign: "left",
  },
  groupLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#93c5fd",
    fontWeight: 800,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  setupGrid: {
    display: "grid",
    gap: 6,
  },
  setupItem: {
    padding: "9px 11px",
    borderRadius: 9,
    cursor: "pointer",
    background: "rgba(15, 23, 42, 0.42)",
    border: "1px solid rgba(125, 211, 252, 0.14)",
    fontWeight: 700,
    color: "#cbd5e1",
    textAlign: "left",
    fontSize: 12,
  },
  setupItemActive: {
    padding: "9px 11px",
    borderRadius: 9,
    cursor: "pointer",
    background: "linear-gradient(180deg, rgba(37, 99, 235, 0.26) 0%, rgba(14, 116, 144, 0.24) 100%)",
    border: "1px solid rgba(125, 211, 252, 0.45)",
    fontWeight: 800,
    color: "#e0f2fe",
    textAlign: "left",
    fontSize: 12,
  },
  statusCard: {
    marginTop: 12,
    padding: "12px 12px",
    borderRadius: 10,
    background: "rgba(15, 23, 42, 0.56)",
    border: "1px solid rgba(125, 211, 252, 0.25)",
    fontSize: 12,
    lineHeight: 1.4,
  },
  statusTitle: {
    fontWeight: 800,
    marginBottom: 8,
    color: "#e0f2fe",
  },
  statusHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  diagToggle: {
    borderRadius: 999,
    border: "1px solid rgba(125, 211, 252, 0.35)",
    background: "rgba(15, 23, 42, 0.72)",
    color: "#bae6fd",
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 9px",
    cursor: "pointer",
  },
  statusLine: {
    opacity: 0.96,
    marginBottom: 2,
    color: "#cbd5e1",
  },
  statusSubLine: {
    opacity: 0.86,
    marginTop: 2,
    marginBottom: 2,
    fontSize: 11,
    color: "#93c5fd",
  },
  separator: {
    marginTop: 8,
    marginBottom: 8,
    borderTop: "1px solid rgba(125, 211, 252, 0.2)",
  },
  select: {
    width: "100%",
    marginTop: 2,
    marginBottom: 4,
    borderRadius: 8,
    border: "1px solid rgba(125, 211, 252, 0.3)",
    background: "rgba(2, 6, 23, 0.65)",
    color: "#e2e8f0",
    padding: "6px 8px",
    fontSize: 12,
    outline: "none",
  },
  searchInput: {
    width: "100%",
    marginTop: 2,
    marginBottom: 4,
    borderRadius: 8,
    border: "1px solid rgba(125, 211, 252, 0.3)",
    background: "rgba(2, 6, 23, 0.65)",
    color: "#e2e8f0",
    padding: "6px 8px",
    fontSize: 12,
    outline: "none",
  },
  modeHint: {
    marginTop: 4,
    marginBottom: 4,
    fontSize: 11,
    opacity: 0.9,
    lineHeight: 1.35,
  },
  resetButton: {
    marginTop: 10,
    width: "100%",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    color: "#e0f2fe",
    border: "1px solid rgba(125, 211, 252, 0.4)",
    borderRadius: 8,
    padding: "7px 10px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },
  profileDock: {
    marginTop: "auto",
    borderRadius: 10,
    border: "1px solid rgba(125, 211, 252, 0.25)",
    background: "rgba(15, 23, 42, 0.56)",
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileLine: {
    fontSize: 12,
    color: "#93c5fd",
    fontWeight: 600,
  },
  tierBadge: {
    borderRadius: 999,
    border: "1px solid rgba(125, 211, 252, 0.45)",
    padding: "4px 10px",
    fontSize: 11,
    color: "#e0f2fe",
    fontWeight: 800,
    background: "rgba(2, 132, 199, 0.2)",
  },
};
