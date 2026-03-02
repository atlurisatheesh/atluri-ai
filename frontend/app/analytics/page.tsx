"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, Clock, Target, Calendar, Zap,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { DashboardLayout } from "../../components/dashboard";
import { GlassCard, AnimatedCounter, ProgressRing, Tabs, StatusBadge } from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { getAccessTokenOrThrow } from "../../lib/auth";

/* ── mock chart placeholder (recharts can be wired later) ── */
function MiniBarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((v, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${(v / max) * 100}%` }}
          transition={{ delay: i * 0.06, duration: 0.4 }}
          className="flex-1 rounded-t bg-gradient-to-t from-brand-cyan/60 to-brand-cyan/20 min-h-[4px]"
        />
      ))}
    </div>
  );
}

/* ── types ───────────────────────────────────────────── */
type SessionItem = {
  session_id: string;
  score: number | null;
  created_at?: string;
};

type ProgressSummary = {
  latest_score: number;
  score_direction: string;
  metric_usage_direction: string;
  ownership_direction: string;
  pressure_response_direction: string;
};

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const authToken = await getAccessTokenOrThrow();
        const [hist, prog] = await Promise.all([
          apiRequest<{ items: SessionItem[] }>("/api/history/interviews?limit=20", { method: "GET", retries: 0, authToken }),
          apiRequest<{ summary: ProgressSummary }>("/api/user/progress?limit=24", { method: "GET", retries: 0, authToken }),
        ]);
        if (!active) return;
        setSessions(hist.items || []);
        setProgress(prog.summary || null);
      } catch {} finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const scores = sessions.map((s) => s.score ?? 0).reverse();
  const totalSessions = sessions.length;
  const avgScore = totalSessions > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / totalSessions) : 0;
  const latestScore = progress?.latest_score ?? 0;
  const bestScore = Math.max(...scores, 0);

  const directionIcon = (dir?: string) => {
    if (dir === "up") return <ArrowUpRight className="w-4 h-4 text-brand-green" />;
    if (dir === "down") return <ArrowDownRight className="w-4 h-4 text-brand-red" />;
    return <Minus className="w-4 h-4 text-textMuted" />;
  };

  const skills = [
    { label: "Score Trend", direction: progress?.score_direction },
    { label: "Metric Usage", direction: progress?.metric_usage_direction },
    { label: "Ownership", direction: progress?.ownership_direction },
    { label: "Pressure Response", direction: progress?.pressure_response_direction },
  ];

  const tabItems = [
    {
      label: "Overview",
      content: (
        <div className="space-y-6">
          {/* Stat row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Sessions", value: totalSessions, icon: <Calendar className="w-5 h-5" />, color: "text-brand-cyan" },
              { label: "Latest Score", value: latestScore, suffix: "/100", icon: <Target className="w-5 h-5" />, color: "text-brand-green" },
              { label: "Average Score", value: avgScore, suffix: "/100", icon: <BarChart3 className="w-5 h-5" />, color: "text-brand-purple" },
              { label: "Best Score", value: bestScore, suffix: "/100", icon: <Zap className="w-5 h-5" />, color: "text-brand-amber" },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <GlassCard className="p-5">
                  <span className={s.color}>{s.icon}</span>
                  <p className="text-2xl font-bold text-textPrimary mt-2">
                    {loading ? <span className="inline-block w-12 h-7 bg-white/[0.06] rounded animate-pulse" /> : <><AnimatedCounter target={s.value} />{s.suffix || ""}</>}
                  </p>
                  <p className="text-xs text-textMuted mt-1">{s.label}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <h3 className="text-sm font-semibold text-textPrimary mb-4">Score History</h3>
              {scores.length > 0 ? <MiniBarChart data={scores} /> : <p className="text-sm text-textMuted">No sessions yet</p>}
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-sm font-semibold text-textPrimary mb-4">Skill Trends</h3>
              <div className="space-y-4">
                {skills.map((sk) => (
                  <div key={sk.label} className="flex items-center justify-between">
                    <span className="text-sm text-textSecondary">{sk.label}</span>
                    <div className="flex items-center gap-2">
                      {directionIcon(sk.direction)}
                      <span className="text-sm text-textPrimary capitalize">{sk.direction || "flat"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      ),
    },
    {
      label: "Session History",
      content: (
        <div className="space-y-3">
          {sessions.length === 0 && !loading && (
            <GlassCard className="p-8 text-center">
              <p className="text-textMuted">No sessions recorded yet. Start a mock interview!</p>
            </GlassCard>
          )}
          {sessions.map((s, i) => (
            <motion.div key={s.session_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard hover className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center">
                    <Clock className="w-5 h-5 text-brand-purple" />
                  </div>
                  <div>
                    <p className="text-sm text-textPrimary font-medium">Session {s.session_id.slice(0, 8)}</p>
                    <p className="text-xs text-textMuted">{s.created_at || "Unknown date"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge variant={s.score && s.score >= 70 ? "green" : s.score && s.score >= 50 ? "amber" : "red"}>
                    {s.score ?? "N/A"}/100
                  </StatusBadge>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-textPrimary mb-1">Analytics</h1>
        <p className="text-sm text-textSecondary mb-6">Track your interview performance and skill progression.</p>
      </motion.div>
      <Tabs tabs={tabItems} />
    </DashboardLayout>
  );
}
