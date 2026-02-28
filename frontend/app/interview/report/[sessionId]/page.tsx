"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AuthGate from "../../../../components/AuthGate";
import { apiRequest } from "../../../../lib/api";
import { getAccessTokenOrThrow } from "../../../../lib/auth";

type SessionAnalytics = {
  session_id: string;
  generated_at?: number;
  role: string;
  offer_probability_snapshot?: {
    offer_probability?: number;
    confidence_band?: string;
    drivers_negative?: string[];
    delta_vs_last_session?: number;
    what_to_fix_next?: string[];
  };
  summary: {
    decision?: string;
    score?: number;
    risk_flags?: string[];
    metric_usage_score?: number;
    ownership_clarity_score?: number;
    tradeoff_depth_score?: number;
  };
};

type ProgressPoint = {
  session_id: string;
  generated_at: number;
  score: number;
};

type UserProgress = {
  points: ProgressPoint[];
};

function SessionReportContent() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = String(params?.sessionId || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [progressPoints, setProgressPoints] = useState<ProgressPoint[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const authToken = await getAccessTokenOrThrow();
        const [data, progressData] = await Promise.all([
          apiRequest<SessionAnalytics>(`/api/session/${encodeURIComponent(sessionId)}/analytics`, {
            method: "GET",
            retries: 0,
            authToken,
          }),
          apiRequest<UserProgress>("/api/user/progress?limit=32", {
            method: "GET",
            retries: 0,
            authToken,
          }),
        ]);
        if (!active) return;
        setAnalytics(data);
        setProgressPoints(Array.isArray(progressData?.points) ? progressData.points : []);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Failed to load report");
      } finally {
        if (active) setLoading(false);
      }
    };
    if (sessionId) load();
    return () => {
      active = false;
    };
  }, [sessionId]);

  if (loading) {
    return <div style={styles.state}>Loading report...</div>;
  }
  if (error) {
    return <div style={styles.state}>Error: {error}</div>;
  }
  if (!analytics) {
    return <div style={styles.state}>No report found.</div>;
  }

  const snapshot = analytics.offer_probability_snapshot || {};
  const summary = analytics.summary || {};
  const probability = Math.round(Number(snapshot.offer_probability || 0));
  const confidenceBand = String(snapshot.confidence_band || "medium").toLowerCase();
  const spread = confidenceBand === "high" ? 4 : confidenceBand === "medium" ? 8 : 12;
  const low = Math.max(0, probability - spread);
  const high = Math.min(100, probability + spread);
  const verdict = probability >= 70 ? "Likely" : probability >= 55 ? "Borderline" : "Unlikely";
  const delta = Math.round(Number(snapshot.delta_vs_last_session || 0));

  const trajectory = useMemo(() => {
    const sorted = [...progressPoints]
      .filter((point) => point && point.session_id)
      .sort((left, right) => Number(left.generated_at || 0) - Number(right.generated_at || 0));
    const currentIdx = sorted.findIndex((point) => point.session_id === analytics.session_id);
    if (currentIdx <= 0) return "Initial baseline";
    const previous = Number(sorted[currentIdx - 1]?.score || 0);
    const current = Number(sorted[currentIdx]?.score || 0);
    const deltaScore = Math.round(current - previous);
    if (deltaScore > 0) return `Rising +${deltaScore}`;
    if (deltaScore < 0) return `Falling ${deltaScore}`;
    return "Flat";
  }, [analytics.session_id, progressPoints]);

  const why = (snapshot.drivers_negative || summary.risk_flags || ["No material blockers flagged."]).slice(0, 2);
  const changed = [
    `Offer delta ${delta >= 0 ? "+" : ""}${delta}`,
    `Interview score ${Math.round(Number(summary.score || 0))}`,
    `Decision ${String(summary.decision || "pending")}`,
  ];
  const nextMove = (snapshot.what_to_fix_next || [
    "Lead with ownership.",
    "Use measurable outcomes.",
  ]).slice(0, 2);
  const generatedAtTs = Number(analytics.generated_at || 0);
  const generatedLabel = generatedAtTs > 0 ? new Date(generatedAtTs * 1000).toISOString() : new Date().toISOString();
  const confidenceMethodTag = "confidence_envelope_v1";

  return (
    <div style={styles.page} className="report-root">
      <style>{`@media print {
        .report-root { background: #ffffff !important; color: #111111 !important; padding: 0 !important; }
        .report-wrap { max-width: 100% !important; gap: 12px !important; }
        .report-strip, .report-section, .report-footer { border-color: #cfcfcf !important; }
        .report-kicker, .report-muted { color: #444 !important; opacity: 1 !important; }
        .report-cta { display: none !important; }
        .report-metric { font-size: 72px !important; }
      }`}</style>
      <div style={styles.wrap} className="report-wrap">
        <section style={styles.verdictBlock} className="report-section">
          <div style={styles.kicker}>Executive Audit</div>
          <div style={styles.verdictValue} className="report-metric">{probability}%</div>
          <div style={styles.verdictLabel}>{verdict}</div>
          <div style={styles.band}>Confidence band {low}%–{high}%</div>
          <div style={styles.meta} className="report-muted">Role {analytics.role || "—"}</div>
        </section>

        <section style={styles.strip} className="report-strip">
          <span style={styles.stripItem}>Trajectory {trajectory}</span>
          <span style={styles.stripItem}>Metric {Math.round((Number(summary.metric_usage_score || 0) / 5) * 100)}%</span>
          <span style={styles.stripItem}>Ownership {Math.round((Number(summary.ownership_clarity_score || 0) / 5) * 100)}%</span>
          <span style={styles.stripItem}>Trade-off {Math.round((Number(summary.tradeoff_depth_score || 0) / 5) * 100)}%</span>
        </section>

        <section style={styles.sections}>
          <article style={styles.section} className="report-section">
            <h2 style={styles.sectionTitle}>Why</h2>
            {why.map((item) => (
              <div key={item} style={styles.line}>• {item}</div>
            ))}
          </article>
          <article style={styles.section} className="report-section">
            <h2 style={styles.sectionTitle}>What Changed</h2>
            {changed.map((item) => (
              <div key={item} style={styles.line}>• {item}</div>
            ))}
          </article>
          <article style={styles.section} className="report-section">
            <h2 style={styles.sectionTitle}>Next Move</h2>
            {nextMove.map((item) => (
              <div key={item} style={styles.line}>• {item}</div>
            ))}
          </article>
        </section>

        <section style={styles.footerMeta} className="report-footer">
          <div style={styles.footerMetaLine}>Session {analytics.session_id}</div>
          <div style={styles.footerMetaLine}>Generated {generatedLabel}</div>
          <div style={styles.footerMetaLine}>Method {confidenceMethodTag}</div>
        </section>

        <button style={styles.cta} className="report-cta" onClick={() => (window.location.href = "/interview")}>Run Next Session</button>
      </div>
    </div>
  );
}

export default function SessionReportPage() {
  return (
    <AuthGate>
      <SessionReportContent />
    </AuthGate>
  );
}

const styles: Record<string, CSSProperties> = {
  state: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg)",
    color: "var(--text-primary)",
  },
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text-primary)",
    padding: "28px clamp(16px, 2.8vw, 40px) 40px",
  },
  wrap: {
    maxWidth: 920,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 22,
  },
  verdictBlock: {
    textAlign: "center",
    background: "transparent",
    borderRadius: 0,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    alignItems: "center",
    padding: "32px 0 20px",
  },
  kicker: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "var(--text-muted)",
    opacity: 0.85,
  },
  verdictValue: {
    fontSize: "clamp(64px, 10vw, 118px)",
    lineHeight: 0.95,
    letterSpacing: -1.5,
    fontWeight: 700,
  },
  verdictLabel: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-muted)",
  },
  band: {
    fontSize: 13,
    color: "var(--text-muted)",
  },
  meta: {
    fontSize: 12,
    color: "var(--text-muted)",
  },
  strip: {
    borderTop: "1px solid var(--border-subtle)",
    borderBottom: "1px solid var(--border-subtle)",
    padding: "8px 0",
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
  },
  stripItem: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--text-muted)",
    opacity: 0.74,
  },
  sections: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  section: {
    borderTop: "1px solid var(--border-subtle)",
    padding: "12px 0",
  },
  sectionTitle: {
    margin: 0,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-muted)",
  },
  line: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 1.4,
    color: "var(--text-muted)",
  },
  footerMeta: {
    borderTop: "1px solid var(--border-subtle)",
    paddingTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  footerMetaLine: {
    fontSize: 11,
    color: "var(--text-muted)",
    letterSpacing: "0.02em",
  },
  cta: {
    border: 0,
    borderRadius: 6,
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    padding: "12px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
};
