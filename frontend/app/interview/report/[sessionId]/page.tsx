"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AuthGate from "../../../../components/AuthGate";
import SessionCard from "../../../../components/report/SessionCard";
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
    return <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text-primary)]">Loading report...</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text-primary)]">Error: {error}</div>;
  }
  if (!analytics) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text-primary)]">No report found.</div>;
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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] p-7 px-[clamp(16px,2.8vw,40px)] pb-10 report-root">
      <style>{`@media print {
        .report-root { background: #ffffff !important; color: #111111 !important; padding: 0 !important; }
        .report-wrap { max-width: 100% !important; gap: 12px !important; }
        .report-strip, .report-section, .report-footer { border-color: #cfcfcf !important; }
        .report-kicker, .report-muted { color: #444 !important; opacity: 1 !important; }
        .report-cta { display: none !important; }
        .report-metric { font-size: 72px !important; }
      }`}</style>
      <div className="max-w-[920px] mx-auto flex flex-col gap-[22px] report-wrap">
        <section className="text-center flex flex-col gap-1 items-center pt-8 pb-5 report-section">
          <div className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)] opacity-85">Executive Audit</div>
          <div className="text-[clamp(64px,10vw,118px)] leading-[0.95] tracking-[-1.5px] font-bold report-metric">{probability}%</div>
          <div className="text-sm uppercase tracking-[0.08em] text-[var(--text-muted)]">{verdict}</div>
          <div className="text-[13px] text-[var(--text-muted)]">Confidence band {low}%–{high}%</div>
          <div className="text-xs text-[var(--text-muted)] report-muted">Role {analytics.role || "—"}</div>
        </section>

        <section className="border-t border-b border-[var(--border-subtle)] py-2 flex gap-3.5 flex-wrap report-strip">
          <span className="text-[11px] uppercase tracking-[0.04em] text-[var(--text-muted)] opacity-75">Trajectory {trajectory}</span>
          <span className="text-[11px] uppercase tracking-[0.04em] text-[var(--text-muted)] opacity-75">Metric {Math.round((Number(summary.metric_usage_score || 0) / 5) * 100)}%</span>
          <span className="text-[11px] uppercase tracking-[0.04em] text-[var(--text-muted)] opacity-75">Ownership {Math.round((Number(summary.ownership_clarity_score || 0) / 5) * 100)}%</span>
          <span className="text-[11px] uppercase tracking-[0.04em] text-[var(--text-muted)] opacity-75">Trade-off {Math.round((Number(summary.tradeoff_depth_score || 0) / 5) * 100)}%</span>
        </section>

        <section className="flex flex-col">
          <article className="border-t border-[var(--border-subtle)] py-3 report-section">
            <h2 className="m-0 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Why</h2>
            {why.map((item) => (
              <div key={item} className="mt-1.5 text-xs leading-[1.4] text-[var(--text-muted)]">• {item}</div>
            ))}
          </article>
          <article className="border-t border-[var(--border-subtle)] py-3 report-section">
            <h2 className="m-0 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">What Changed</h2>
            {changed.map((item) => (
              <div key={item} className="mt-1.5 text-xs leading-[1.4] text-[var(--text-muted)]">• {item}</div>
            ))}
          </article>
          <article className="border-t border-[var(--border-subtle)] py-3 report-section">
            <h2 className="m-0 text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Next Move</h2>
            {nextMove.map((item) => (
              <div key={item} className="mt-1.5 text-xs leading-[1.4] text-[var(--text-muted)]">• {item}</div>
            ))}
          </article>
        </section>

        <section className="border-t border-[var(--border-subtle)] pt-2.5 flex flex-col gap-1 report-footer">
          <div className="text-[11px] text-[var(--text-muted)] tracking-[0.02em]">Session {analytics.session_id}</div>
          <div className="text-[11px] text-[var(--text-muted)] tracking-[0.02em]">Generated {generatedLabel}</div>
          <div className="text-[11px] text-[var(--text-muted)] tracking-[0.02em]">Method {confidenceMethodTag}</div>
        </section>

        <button className="border-0 rounded-md bg-[var(--surface-2)] text-[var(--text-primary)] py-3 px-3.5 text-[13px] font-semibold cursor-pointer self-start report-cta" onClick={() => (window.location.href = "/interview")}>Run Next Session</button>

        {/* Shareable Session Card */}
        <section className="border-t border-[var(--border-subtle)] pt-6 pb-4">
          <h2 className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)] mb-4 text-center">Share Your Result</h2>
          <SessionCard
            sessionId={analytics.session_id}
            score={Math.round(Number(summary.score || probability || 0))}
            role={analytics.role || "Interview"}
            strengths={(summary.risk_flags?.length === 0 ? ["Strong Performance"] : []).concat(
              (Number(summary.metric_usage_score || 0) >= 55 ? ["Metric-backed storytelling"] : []),
              (Number(summary.ownership_clarity_score || 0) >= 55 ? ["Strong ownership framing"] : []),
              (Number(summary.tradeoff_depth_score || 0) >= 55 ? ["Trade-off reasoning"] : []),
            )}
            questionsAnswered={0}
            duration="—"
            decision={String(summary.decision || verdict)}
            date={generatedAtTs > 0 ? new Date(generatedAtTs * 1000).toLocaleDateString() : undefined}
          />
        </section>
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

