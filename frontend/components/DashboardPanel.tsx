"use client";

import type { CSSProperties } from "react";
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
    `${status || "Ready"}${shareState ? ` · ${shareState}` : ""}`,
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
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>Decision Console</h2>
        <span style={styles.refreshState}>{loading ? "Refreshing" : "Ready"}</span>
      </div>

      <section style={styles.topSplit}>
        <div style={styles.offerBlock}>
          <div style={styles.offerKicker}>Offer Probability</div>
          <div style={styles.offerValueRow}>
            <div style={styles.offerValue}>{offerProbabilityValue}%</div>
            <div style={styles.offerVerdict}>{verdict}</div>
          </div>
          <div style={styles.offerMeta}>Confidence {confidenceLow}%–{confidenceHigh}% · Profile {roleProfile} · Delta {offerDelta >= 0 ? "+" : ""}{offerDelta}</div>
          <div style={styles.offerGuidance}>
            {(offerProbability?.what_to_fix_next || ["Tighten ownership. Add measurable impact."])[0]}
          </div>
        </div>

        <aside style={styles.controlRail}>
          <button style={styles.actionPrimary} onClick={() => (window.location.href = "/interview")}>Start Next Session</button>
          <button style={styles.actionSubtle} onClick={() => (window.location.href = latestSessionId ? `/interview/report/${encodeURIComponent(latestSessionId)}` : "/interview")}>Open Latest Report</button>
          <button style={styles.actionSubtle} onClick={shareImprovementSnapshot}>Share Snapshot</button>
          <button style={styles.actionSubtle} onClick={loadDashboard} disabled={loading}>Refresh</button>
        </aside>
      </section>

      <section style={styles.signalStrip}>
        {signalItems.map((item) => (
          <span key={item} style={styles.signalItem}>{item}</span>
        ))}
      </section>

      <div style={styles.actionNote}>{(offerProbability?.drivers_negative || ["No major blockers flagged."]).slice(0, 1).join(" · ")}</div>
    </div>
  );
}

function directionGlyph(direction?: string) {
  if (direction === "up") return "↗";
  if (direction === "down") return "↘";
  return "→";
}

const styles: Record<string, CSSProperties> = {
  page: {
    width: "100%",
    maxWidth: 980,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-muted)",
  },
  refreshState: {
    fontSize: 12,
    color: "var(--text-muted)",
    opacity: 0.75,
  },
  topSplit: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 7fr) minmax(210px, 3fr)",
    gap: 16,
  },
  offerBlock: {
    background: "var(--surface-1)",
    borderRadius: 6,
    padding: "28px 22px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  offerKicker: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "var(--text-muted)",
  },
  offerValueRow: {
    display: "flex",
    gap: 10,
    alignItems: "baseline",
  },
  offerValue: {
    fontSize: "clamp(72px, 11vw, 124px)",
    lineHeight: 0.95,
    letterSpacing: -1.2,
    fontWeight: 700,
  },
  offerVerdict: {
    fontSize: 14,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  offerMeta: {
    fontSize: 12,
    color: "var(--text-muted)",
  },
  offerGuidance: {
    marginTop: 2,
    fontSize: 13,
    color: "var(--text-muted)",
    lineHeight: 1.35,
  },
  controlRail: {
    borderLeft: "1px solid var(--border-subtle)",
    paddingLeft: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    alignSelf: "center",
  },
  signalStrip: {
    borderTop: "1px solid var(--border-subtle)",
    borderBottom: "1px solid var(--border-subtle)",
    padding: "8px 0",
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
  },
  signalItem: {
    fontSize: 11,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    opacity: 0.68,
  },
  actionPrimary: {
    border: 0,
    borderRadius: 6,
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    padding: "12px 13px",
    textAlign: "left",
    cursor: "pointer",
    fontWeight: 600,
  },
  actionSubtle: {
    border: 0,
    borderRadius: 4,
    background: "transparent",
    color: "var(--text-muted)",
    padding: "6px 0",
    textAlign: "left",
    cursor: "pointer",
    fontSize: 12,
  },
  actionNote: {
    borderTop: "1px solid var(--border-subtle)",
    paddingTop: 10,
    fontSize: 12,
    color: "var(--text-muted)",
    lineHeight: 1.4,
  },
};
