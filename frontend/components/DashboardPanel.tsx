"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import { getAccessTokenOrThrow } from "../lib/auth";

type StrategyTrack = "launch" | "depth" | "stealth" | "enterprise";

type OfferProbability = {
  offer_probability: number;
  confidence_band: "low" | "medium" | "high" | string;
  drivers_negative: string[];
  delta_vs_last_session: number;
  what_to_fix_next: string[];
};

type InterviewHistoryItem = {
  session_id: string;
  score: number | null;
};

type ProgressSummary = {
  latest_score: number;
  score_direction: string;
  metric_usage_direction: string;
  ownership_direction: string;
  pressure_response_direction: string;
};

type UserProgress = {
  summary: ProgressSummary;
};

type Overview = {
  sessions: { total: number; average_score: number };
  risk: { latest_risk_count: number };
  persona: { company_mode: string };
};

export default function DashboardPanel({ strategyTrack = "launch" }: { strategyTrack?: StrategyTrack }) {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [interviews, setInterviews] = useState<InterviewHistoryItem[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [offerProbability, setOfferProbability] = useState<OfferProbability | null>(null);
  const [shareState, setShareState] = useState("");
  const [status, setStatus] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setStatus("Updating intelligence view...");
      const authToken = await getAccessTokenOrThrow();
      const [overviewData, interviewsData, progressData, offerProbabilityData] = await Promise.all([
        apiRequest<Overview>("/api/dashboard/overview", { method: "GET", retries: 0, authToken }),
        apiRequest<{ items: InterviewHistoryItem[] }>("/api/history/interviews?limit=8", { method: "GET", retries: 0, authToken }),
        apiRequest<UserProgress>("/api/user/progress?limit=24", { method: "GET", retries: 0, authToken }),
        apiRequest<OfferProbability>("/api/user/offer-probability?limit=40", { method: "GET", retries: 0, authToken }),
      ]);
      setOverview(overviewData);
      setInterviews(interviewsData.items || []);
      setProgress(progressData);
      setOfferProbability(offerProbabilityData);
      setStatus("Updated");
    } catch (error: any) {
      setStatus(`Failed: ${error?.message || "unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const offerProbabilityValue = Math.round(Number(offerProbability?.offer_probability || 0));
  const offerDelta = Math.round(Number(offerProbability?.delta_vs_last_session || 0));
  const confidenceBand = String(offerProbability?.confidence_band || "low").toLowerCase();
  const spread = confidenceBand === "high" ? 4 : confidenceBand === "medium" ? 8 : 12;
  const confidenceLow = Math.max(0, offerProbabilityValue - spread);
  const confidenceHigh = Math.min(100, offerProbabilityValue + spread);
  const verdict = offerProbabilityValue >= 70 ? "Likely" : offerProbabilityValue >= 55 ? "Borderline" : "Unlikely";

  const roleProfile = useMemo(() => {
    if (strategyTrack === "depth") return "PM L6";
    if (strategyTrack === "stealth") return "Campus SDE";
    if (strategyTrack === "enterprise") return "Program";
    return "Senior SWE";
  }, [strategyTrack]);

  const signalItems = [
    `Score ${Math.round(Number(progress?.summary?.latest_score || 0))}`,
    `Score trend ${directionGlyph(progress?.summary?.score_direction)}`,
    `Metric trend ${directionGlyph(progress?.summary?.metric_usage_direction)}`,
    `Ownership ${directionGlyph(progress?.summary?.ownership_direction)}`,
    `Pressure ${directionGlyph(progress?.summary?.pressure_response_direction)}`,
    `Sessions ${overview?.sessions.total ?? 0}`,
    `Avg ${Math.round(Number(overview?.sessions.average_score || 0))}`,
    `Risk ${Math.round(Number(overview?.risk.latest_risk_count || 0))}`,
    `Mode ${overview?.persona.company_mode || "general"}`,
    `${status || "Ready"}${shareState ? ` Â· ${shareState}` : ""}`,
  ];

  const latestSessionId = String(interviews[0]?.session_id || "");

  const shareImprovementSnapshot = async () => {
    if (!latestSessionId) {
      setShareState("No completed session yet.");
      return;
    }
    try {
      setShareState("Creating share link...");
      const authToken = await getAccessTokenOrThrow();
      const payload = await apiRequest<{ share_path: string }>(`/api/session/${encodeURIComponent(latestSessionId)}/share`, {
        method: "POST",
        retries: 0,
        authToken,
      });
      const absolute = `${window.location.origin}${String(payload.share_path || "")}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(absolute);
      }
      setShareState("Share link copied.");
    } catch {
      setShareState("Share failed.");
    }
  };

  return (
    <div className="w-full max-w-[980px] mx-auto flex flex-col gap-[18px]">
      <div className="flex justify-between items-center gap-2.5">
        <h2 className="m-0 text-base font-semibold text-[var(--text-muted)]">Decision Console</h2>
        <span className="text-xs text-[var(--text-muted)] opacity-75">{loading ? "Refreshing" : "Ready"}</span>
      </div>

      <section className="grid grid-cols-[minmax(0,7fr)_minmax(210px,3fr)] gap-4">
        <div className="bg-[var(--surface-1)] rounded-md px-[22px] py-7 flex flex-col gap-2.5">
          <div className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Offer Probability</div>
          <div className="flex gap-2.5 items-baseline">
            <div className="text-[clamp(72px,11vw,124px)] leading-[0.95] tracking-[-1.2px] font-bold">{offerProbabilityValue}%</div>
            <div className="text-sm text-[var(--text-muted)] uppercase tracking-[0.08em]">{verdict}</div>
          </div>
          <div className="text-xs text-[var(--text-muted)]">Confidence {confidenceLow}%â€“{confidenceHigh}% Â· Profile {roleProfile} Â· Delta {offerDelta >= 0 ? "+" : ""}{offerDelta}</div>
          <div className="mt-0.5 text-[13px] text-[var(--text-muted)] leading-[1.35]">
            {(offerProbability?.what_to_fix_next || ["Tighten ownership. Add measurable impact."])[0]}
          </div>
        </div>

        <aside className="border-l border-[var(--border-subtle)] pl-3 flex flex-col gap-2 self-center">
          <button className="border-0 rounded-md bg-[var(--surface-2)] text-[var(--text-primary)] py-3 px-[13px] text-left cursor-pointer font-semibold" onClick={() => (window.location.href = "/interview")}>Start Next Session</button>
          <button className="border-0 rounded bg-transparent text-[var(--text-muted)] py-1.5 px-0 text-left cursor-pointer text-xs" onClick={() => (window.location.href = latestSessionId ? `/interview/report/${encodeURIComponent(latestSessionId)}` : "/interview")}>Open Latest Report</button>
          <button className="border-0 rounded bg-transparent text-[var(--text-muted)] py-1.5 px-0 text-left cursor-pointer text-xs" onClick={shareImprovementSnapshot}>Share Snapshot</button>
          <button className="border-0 rounded bg-transparent text-[var(--text-muted)] py-1.5 px-0 text-left cursor-pointer text-xs" onClick={loadDashboard} disabled={loading}>Refresh</button>
        </aside>
      </section>

      <section className="border-t border-b border-[var(--border-subtle)] py-2 flex gap-3.5 flex-wrap">
        {signalItems.map((item) => (
          <span key={item} className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.04em] opacity-[0.68]">{item}</span>
        ))}
      </section>

      <div className="border-t border-[var(--border-subtle)] pt-2.5 text-xs text-[var(--text-muted)] leading-[1.4]">{(offerProbability?.drivers_negative || ["No major blockers flagged."]).slice(0, 1).join(" Â· ")}</div>
    </div>
  );
}

function directionGlyph(direction?: string) {
  if (direction === "up") return "â†—";
  if (direction === "down") return "â†˜";
  return "â†’";
}

