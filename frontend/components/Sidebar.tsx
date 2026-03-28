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
    <div className="w-[268px] bg-gradient-to-b from-[#071021] via-[#0a1530] to-[#0d1f3c] text-[#dbeafe] flex flex-col p-[18px] gap-2.5 border-r border-[rgba(125,211,252,0.2)] shadow-[8px_0_30px_rgba(2,6,23,0.45)]">
      <div className="mb-2">
        <div className="text-[26px] font-extrabold text-[#f8fafc] tracking-[0.2px]">AtluriIn AI</div>
        <div className="mt-1 text-xs text-[#93c5fd] font-semibold">Interview Performance OS</div>
      </div>

      {primaryNavItems.map((item) => (
        <button
          key={item.mode}
          className={`p-3 px-3.5 rounded-[10px] cursor-pointer font-bold text-left ${
            activeMode === item.mode
              ? "bg-gradient-to-b from-[rgba(37,99,235,0.32)] to-[rgba(14,116,144,0.3)] border border-[rgba(125,211,252,0.6)] font-extrabold text-[#e0f2fe] shadow-[0_0_0_1px_rgba(125,211,252,0.3),0_6px_20px_rgba(14,165,233,0.18)]"
              : "bg-[rgba(15,23,42,0.5)] border border-[rgba(125,211,252,0.18)] text-[#cbd5e1]"
          }`}
          onClick={() => setMode(item.mode)}
        >
          {item.label}
        </button>
      ))}

      <div className="mt-0.5 text-[11px] text-[#93c5fd] font-extrabold tracking-[0.6px] uppercase">Setup</div>
      <div className="grid gap-1.5">
        {setupNavItems.map((item) => (
          <button
            key={item.mode}
            className={`py-2.5 px-[11px] rounded-[9px] cursor-pointer font-bold text-left text-xs ${
              activeMode === item.mode
                ? "bg-gradient-to-b from-[rgba(37,99,235,0.26)] to-[rgba(14,116,144,0.24)] border border-[rgba(125,211,252,0.45)] font-extrabold text-[#e0f2fe]"
                : "bg-[rgba(15,23,42,0.42)] border border-[rgba(125,211,252,0.14)] text-[#cbd5e1]"
            }`}
            onClick={() => setMode(item.mode)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Link href="/demo" className="block p-3 px-3.5 rounded-[10px] cursor-pointer bg-[rgba(15,23,42,0.5)] border border-[rgba(125,211,252,0.18)] font-bold text-[#cbd5e1] no-underline text-left">🎬 Demo</Link>

      <div className="mt-3 p-3 rounded-[10px] bg-[rgba(15,23,42,0.56)] border border-[rgba(125,211,252,0.25)] text-xs leading-[1.4]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="font-extrabold mb-2 text-[#e0f2fe]">Session Status</div>
          <button className="rounded-full border border-[rgba(125,211,252,0.35)] bg-[rgba(15,23,42,0.72)] text-[#bae6fd] text-[11px] font-bold py-1 px-2.5 cursor-pointer" onClick={() => setShowDiagnostics((v) => !v)}>
            {showDiagnostics ? "Hide" : "Show"}
          </button>
        </div>
        <div className="opacity-95 mb-0.5 text-[#cbd5e1]">Interview: {snapshot.interview.active ? "Active" : snapshot.interview.done ? "Completed" : "Not started"}</div>
        <div className="opacity-95 mb-0.5 text-[#cbd5e1]">Credibility: {snapshot.credibility.has_snapshot ? "Available" : "Unavailable"}</div>
        <div className="opacity-95 mb-0.5 text-[#cbd5e1]">Company: {selectedCompany?.label || "General"}</div>

        {showDiagnostics && (
          <>
            <div className="mt-2 mb-2 border-t border-[rgba(125,211,252,0.2)]" />
            <div className="font-extrabold mb-2 text-[#e0f2fe]">Diagnostics</div>
            <div className="opacity-95 mb-0.5 text-[#cbd5e1]">
              Resume: {contextStatus.resume_loaded ? `Loaded (${contextStatus.resume_chars} chars)` : "Not loaded"}
            </div>
            <div className="opacity-95 mb-0.5 text-[#cbd5e1]">
              JD: {contextStatus.job_loaded ? `Loaded (${contextStatus.job_chars} chars)` : "Not loaded"}
            </div>
            <div className="opacity-95 mb-0.5 text-[#cbd5e1]">Role: {snapshot.interview.role || "—"}</div>
            <div className="opacity-85 mt-0.5 mb-0.5 text-[11px] text-[#93c5fd]">Company Mode</div>
            <input
              className="w-full mt-0.5 mb-1 rounded-lg border border-[rgba(125,211,252,0.3)] bg-[rgba(2,6,23,0.65)] text-[#e2e8f0] py-1.5 px-2 text-xs outline-none"
              value={companyModeQuery}
              onChange={(e) => setCompanyModeQuery(e.target.value)}
              placeholder="Search company"
            />
            <select
              title="Company mode"
              className="w-full mt-0.5 mb-1 rounded-lg border border-[rgba(125,211,252,0.3)] bg-[rgba(2,6,23,0.65)] text-[#e2e8f0] py-1.5 px-2 text-xs outline-none"
              value={companyMode}
              onChange={(e) => onCompanyModeChange(e.target.value)}
            >
              {filteredCompanyModes.map((mode) => (
                <option key={mode.id} value={mode.id}>{mode.label}</option>
              ))}
            </select>
            {filteredCompanyModes.length === 0 && (
              <div className="mt-1 mb-1 text-[11px] opacity-90 leading-[1.35]">No companies match your search.</div>
            )}
            {selectedCompany?.interview_focus && (
              <div className="mt-1 mb-1 text-[11px] opacity-90 leading-[1.35]">Focus: {selectedCompany.interview_focus}</div>
            )}
            {!companyModesLoadedFromApi && (
              <div className="mt-1 mb-1 text-[11px] opacity-90 leading-[1.35]">Showing fallback list (4). Sign in and check API connectivity to load all companies.</div>
            )}
            <div className="opacity-85 mt-0.5 mb-0.5 text-[11px] text-[#93c5fd]">
              Updated: {snapshot.interview.updated_at ? new Date(snapshot.interview.updated_at * 1000).toLocaleString() : "—"}
            </div>

            <button className="mt-2.5 w-full bg-gradient-to-b from-[#0f172a] to-[#111827] text-[#e0f2fe] border border-[rgba(125,211,252,0.4)] rounded-lg py-[7px] px-2.5 cursor-pointer text-xs font-bold" onClick={resetContext} disabled={resetting}>
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

      <div className="mt-auto rounded-[10px] border border-[rgba(125,211,252,0.25)] bg-[rgba(15,23,42,0.56)] py-2.5 px-3 flex items-center justify-between">
        <div className="text-xs text-[#93c5fd] font-semibold">Tier</div>
        <div className="rounded-full border border-[rgba(125,211,252,0.45)] py-1 px-2.5 text-[11px] text-[#e0f2fe] font-extrabold bg-[rgba(2,132,199,0.2)]">Free</div>
      </div>
    </div>
  );
}
