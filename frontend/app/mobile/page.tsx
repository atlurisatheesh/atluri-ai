"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiRequest } from "../../lib/api";
import { getAccessTokenOrThrow } from "../../lib/auth";

type LearningData = {
  sessions_completed: number;
  skills: Record<string, { current_score: number; trend: string; mastery: string }>;
  weak_areas: string[];
  strong_areas: string[];
  improvement_rate: number;
  recommended_focus: string[];
  difficulty_level: string;
};

type BalanceData = {
  credits: number;
  plan: string;
  plan_name: string;
};

export default function MobileCompanionPage() {
  const [learning, setLearning] = useState<LearningData | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getAccessTokenOrThrow();
        const [learningRes, balanceRes] = await Promise.all([
          apiRequest<LearningData>("/api/learning/profile", { authToken: token }).catch(() => null),
          apiRequest<BalanceData>("/api/billing/balance", { authToken: token }).catch(() => null),
        ]);
        setLearning(learningRes);
        setBalance(balanceRes);
      } catch {
        // Not logged in
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const skills = learning?.skills ?? {};
  const topSkills = Object.values(skills)
    .sort((a, b) => b.current_score - a.current_score)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-bg-primary text-txt-primary flex flex-col pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <header className="px-5 pt-[max(env(safe-area-inset-top),16px)] pb-4 bg-bg-secondary border-b border-white/[0.06]">
        <h1 className="font-display text-xl font-bold text-brand-cyan">InterviewGenius</h1>
        <p className="text-sm text-txt-secondary mt-0.5">Mobile Companion</p>
      </header>

      <main className="flex-1 px-4 py-5 space-y-5 overflow-y-auto">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Sessions" value={String(learning?.sessions_completed ?? 0)} />
          <StatCard label="Credits" value={String(balance?.credits ?? 0)} />
          <StatCard label="Level" value={learning?.difficulty_level ?? "—"} />
        </div>

        {/* Skills overview */}
        {topSkills.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-txt-secondary uppercase tracking-wider mb-3">Skills</h2>
            <div className="space-y-3">
              {topSkills.map((skill) => (
                <SkillRow key={skill.mastery + skill.current_score} skill={skill} />
              ))}
            </div>
          </section>
        )}

        {/* Recommendations */}
        {learning?.recommended_focus && learning.recommended_focus.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-txt-secondary uppercase tracking-wider mb-3">Focus Areas</h2>
            <div className="space-y-2">
              {learning.recommended_focus.map((rec, i) => (
                <motion.div
                  key={i}
                  className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <p className="text-sm text-txt-primary leading-relaxed">{rec}</p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Quick actions */}
        <section className="pt-2">
          <h2 className="text-sm font-semibold text-txt-secondary uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton href="/interview" label="Start Session" icon="🎯" />
            <ActionButton href="/resume" label="Resume AI" icon="📄" />
            <ActionButton href="/questions" label="Question Bank" icon="❓" />
            <ActionButton href="/dashboard" label="Dashboard" icon="📊" />
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
      <p className="text-lg font-display font-bold text-txt-primary">{value}</p>
      <p className="text-[11px] text-txt-muted mt-0.5">{label}</p>
    </div>
  );
}

function SkillRow({ skill }: { skill: { current_score: number; trend: string; mastery: string } }) {
  const pct = Math.min(100, Math.max(0, skill.current_score));
  const trendIcon = skill.trend === "improving" ? "↑" : skill.trend === "declining" ? "↓" : "—";

  const colorClass =
    skill.mastery === "mastered"
      ? "text-brand-green"
      : skill.mastery === "proficient"
      ? "text-brand-cyan"
      : skill.mastery === "developing"
      ? "text-brand-amber"
      : "text-brand-red";
  const barColor =
    skill.mastery === "mastered"
      ? "bg-brand-green"
      : skill.mastery === "proficient"
      ? "bg-brand-cyan"
      : skill.mastery === "developing"
      ? "bg-brand-amber"
      : "bg-brand-red";

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-txt-primary capitalize">
          {skill.mastery.replace("_", " ")}
        </span>
        <span className={`text-xs ${colorClass}`}>
          {Math.round(pct)}% {trendIcon}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/[0.06]">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function ActionButton({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.08] p-4 text-sm text-txt-primary hover:bg-white/[0.08] transition-colors active:scale-[0.97]"
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </a>
  );
}
