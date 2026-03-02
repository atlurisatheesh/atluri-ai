"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, Clock, Target, Calendar, Zap,
  ArrowUpRight, ArrowDownRight, Minus, Award, Flame, Star,
  PieChart, CheckCircle,
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

/* ── Activity heatmap (GitHub-style) ── */
const DAYS = ["Mon", "", "Wed", "", "Fri", "", ""];
function ActivityHeatmap() {
  const weeks = 12;
  const cells: number[][] = Array.from({ length: weeks }, () =>
    Array.from({ length: 7 }, () => Math.random() < 0.35 ? 0 : Math.floor(Math.random() * 4) + 1)
  );
  const levelColor = (l: number) =>
    l === 0 ? "bg-white/[0.03]" : l === 1 ? "bg-brand-green/20" : l === 2 ? "bg-brand-green/40" : l === 3 ? "bg-brand-green/60" : "bg-brand-green";
  return (
    <div className="flex gap-1">
      <div className="flex flex-col gap-1 text-[9px] text-textMuted mr-1 pt-0">{DAYS.map((d, i) => <span key={i} className="h-3 leading-3">{d}</span>)}</div>
      {cells.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((level, di) => (
            <div key={di} className={`w-3 h-3 rounded-sm ${levelColor(level)}`} title={`${level} sessions`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Mini pie chart (CSS only) ── */
function CategoryPie({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  let cum = 0;
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-24 h-24 rounded-full" style={{ background: `conic-gradient(${data.map((d) => { const start = cum; cum += (d.value / total) * 360; return `${d.color} ${start}deg ${cum}deg`; }).join(", ")})` }}>
        <div className="absolute inset-2 rounded-full bg-canvas" />
      </div>
      <div className="space-y-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
            <span className="text-xs text-textSecondary">{d.label}</span>
            <span className="text-xs text-textMuted ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Achievements data ── */
const ACHIEVEMENTS = [
  { icon: <Flame className="w-5 h-5" />, name: "7-Day Streak", desc: "Practice 7 days in a row", unlocked: true, color: "brand-orange" },
  { icon: <Star className="w-5 h-5" />, name: "First 90+", desc: "Score 90+ on any session", unlocked: true, color: "brand-amber" },
  { icon: <Target className="w-5 h-5" />, name: "Mock Master", desc: "Complete 10 mock interviews", unlocked: false, color: "brand-purple" },
  { icon: <Award className="w-5 h-5" />, name: "Resume Pro", desc: "Achieve 90+ ATS score", unlocked: false, color: "brand-green" },
  { icon: <CheckCircle className="w-5 h-5" />, name: "Duo Pioneer", desc: "Complete a duo session", unlocked: true, color: "brand-cyan" },
  { icon: <Zap className="w-5 h-5" />, name: "Speed Demon", desc: "Answer in under 30 seconds", unlocked: false, color: "brand-red" },
];

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

          {/* Activity heatmap + Category pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <h3 className="text-sm font-semibold text-textPrimary mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-brand-green" /> Activity (Last 12 Weeks)</h3>
              <ActivityHeatmap />
              <div className="flex items-center gap-3 mt-3 text-[9px] text-textMuted">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((l) => (
                  <div key={l} className={`w-3 h-3 rounded-sm ${l === 0 ? "bg-white/[0.03]" : l === 1 ? "bg-brand-green/20" : l === 2 ? "bg-brand-green/40" : l === 3 ? "bg-brand-green/60" : "bg-brand-green"}`} />
                ))}
                <span>More</span>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="text-sm font-semibold text-textPrimary mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-brand-purple" /> Sessions by Category</h3>
              <CategoryPie data={[
                { label: "Technical", value: 12, color: "var(--brand-cyan)" },
                { label: "Behavioral", value: 8, color: "var(--brand-purple)" },
                { label: "System Design", value: 5, color: "var(--brand-green)" },
                { label: "Mock", value: 6, color: "var(--brand-amber)" },
                { label: "Coding", value: 4, color: "var(--brand-orange)" },
              ]} />
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
    {
      label: "Achievements",
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACHIEVEMENTS.map((a, i) => (
            <motion.div key={a.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <GlassCard className={`p-5 ${!a.unlocked ? "opacity-40" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.unlocked ? `bg-${a.color}/20 text-${a.color}` : "bg-white/5 text-textMuted"}`}>{a.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-textPrimary flex items-center gap-2">{a.name} {a.unlocked && <CheckCircle className="w-3.5 h-3.5 text-brand-green" />}</p>
                    <p className="text-xs text-textMuted">{a.desc}</p>
                  </div>
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
