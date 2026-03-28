"use client";

import { motion } from "framer-motion";
import {
  CheckCircle, XCircle, AlertTriangle, Shield, Brain,
  Award, TrendingUp, ArrowRight,
} from "lucide-react";
import { GlassCard, StatusBadge, NeonButton } from "@/components/ui";
import type { AriaScoreCard } from "@/lib/services";

/* ── Dual Score Ring ───────────────────────────────────── */
function DualScoreRing({
  label, score, max, size = 100,
}: { label: string; score: number; max: number; size?: number }) {
  const pct = Math.round((score / max) * 100);
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = pct >= 80 ? "var(--brand-green)" : pct >= 60 ? "var(--brand-amber)" : "var(--brand-red)";
  const bg = pct >= 80 ? "brand-green" : pct >= 60 ? "brand-amber" : "brand-red";

  return (
    <div className="flex flex-col items-center">
      <div className="relative" ref={(el) => { if (el) { el.style.width = `${size}px`; el.style.height = `${size}px`; } }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={6} strokeDasharray={c} strokeLinecap="round"
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-textPrimary">{score}</span>
          <span className="text-[9px] text-textMuted">/ {max}</span>
        </div>
      </div>
      <span className="text-xs text-textMuted mt-1.5">{label}</span>
      <StatusBadge variant={bg as "green" | "amber" | "red"} className="mt-1">{pct}%</StatusBadge>
    </div>
  );
}

/* ── Check row ─────────────────────────────────────────── */
function CheckRow({ check }: {
  check: { id: string; name: string; passed: boolean; score: number; detail: string; fix: string | null };
}) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02]">
      <span className={`flex-shrink-0 mt-0.5 ${check.passed ? "text-brand-green" : "text-brand-red"}`}>
        {check.passed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-textMuted">{check.id}</span>
          <span className="text-sm font-medium text-textPrimary">{check.name}</span>
        </div>
        <p className="text-xs text-textMuted mt-0.5">{check.detail}</p>
        {!check.passed && check.fix && (
          <p className="text-[10px] text-brand-amber mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Fix: {check.fix}
          </p>
        )}
      </div>
      <span className={`text-xs font-bold tabular-nums ${check.passed ? "text-brand-green" : "text-brand-red"}`}>
        {check.score}/1
      </span>
    </div>
  );
}

/* ── Grade badge ───────────────────────────────────────── */
function GradeBadge({ grade }: { grade: string }) {
  const variant =
    grade === "A+" || grade === "A" ? "green" :
    grade === "B+" || grade === "B" ? "cyan" :
    grade === "C+" || grade === "C" ? "amber" : "red";
  return (
    <span className={`text-3xl font-black ${
      variant === "green" ? "text-brand-green" :
      variant === "cyan" ? "text-brand-cyan" :
      variant === "amber" ? "text-brand-amber" : "text-brand-red"
    }`}>
      {grade}
    </span>
  );
}

/* ── Main component ────────────────────────────────────── */
interface Props {
  scoreCard: AriaScoreCard;
  onGenerate?: () => void;
  onRescan?: () => void;
  generating?: boolean;
}

export default function AriaScoreDashboard({ scoreCard, onGenerate, onRescan, generating }: Props) {
  const {
    ats_score, ats_max, content_score, content_max,
    total_score, total_max, grade, meets_threshold,
    ats_checks, content_checks, failed_checks, summary,
  } = scoreCard;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5"
    >
      {/* Top row: Grade + dual rings + summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Grade */}
        <GlassCard className="p-6 flex flex-col items-center justify-center" hover={false}>
          <GradeBadge grade={grade} />
          <p className="text-xs text-textMuted mt-2">Overall Grade</p>
          <StatusBadge variant={meets_threshold ? "green" : "amber"} className="mt-2" pulse={!meets_threshold}>
            {meets_threshold ? "Interview Ready" : "Needs Improvement"}
          </StatusBadge>
          <p className="text-[10px] text-textMuted mt-2 text-center">{total_score}/{total_max} checks passed</p>
        </GlassCard>

        {/* Dual rings */}
        <GlassCard className="p-6 flex items-center justify-center gap-8" hover={false}>
          <DualScoreRing label="ATS Parse" score={ats_score} max={ats_max} />
          <div className="h-16 w-px bg-white/[0.06]" />
          <DualScoreRing label="Content" score={content_score} max={content_max} />
        </GlassCard>

        {/* Summary + failed highlights */}
        <GlassCard className="lg:col-span-2 p-5" hover={false}>
          <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-brand-purple" /> Intelligence Summary
          </h3>
          <p className="text-xs text-textSecondary leading-relaxed mb-3">{summary}</p>
          {failed_checks.length > 0 && (
            <div>
              <p className="text-[10px] text-brand-red font-medium mb-1.5">Priority Fixes ({failed_checks.length})</p>
              <div className="space-y-1">
                {failed_checks.slice(0, 3).map((fc) => (
                  <div key={fc.id} className="flex items-start gap-2 text-xs">
                    <XCircle className="w-3 h-3 text-brand-red flex-shrink-0 mt-0.5" />
                    <span className="text-textMuted">
                      <span className="font-mono text-brand-red">{fc.id}</span> {fc.name} — {fc.fix || fc.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Check details: ATS + Content side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ATS checks */}
        <GlassCard className="p-5" hover={false}>
          <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-brand-cyan" /> Factor A — ATS Parsability
            <span className="ml-auto text-xs font-mono tabular-nums text-textMuted">{ats_score}/{ats_max}</span>
          </h3>
          <div className="space-y-1.5">
            {ats_checks.map((check) => <CheckRow key={check.id} check={check} />)}
          </div>
        </GlassCard>

        {/* Content checks */}
        <GlassCard className="p-5" hover={false}>
          <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-brand-purple" /> Factor B — Content Quality
            <span className="ml-auto text-xs font-mono tabular-nums text-textMuted">{content_score}/{content_max}</span>
          </h3>
          <div className="space-y-1.5">
            {content_checks.map((check) => <CheckRow key={check.id} check={check} />)}
          </div>
        </GlassCard>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3 pt-2">
        {onGenerate && (
          <NeonButton onClick={onGenerate} disabled={generating}>
            {generating ? (
              <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 animate-pulse" /> Generating Resume...</span>
            ) : (
              <span className="flex items-center gap-2"><ArrowRight className="w-4 h-4" /> Generate ARIA Resume</span>
            )}
          </NeonButton>
        )}
        {onRescan && (
          <NeonButton onClick={onRescan} variant="secondary" size="sm">
            Re-scan
          </NeonButton>
        )}
      </div>
    </motion.div>
  );
}
