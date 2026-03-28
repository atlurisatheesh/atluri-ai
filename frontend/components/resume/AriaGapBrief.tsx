"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle, CheckCircle, ShieldAlert, ArrowUpRight,
  Brain, Lightbulb, XCircle, RefreshCw,
} from "lucide-react";
import { GlassCard, StatusBadge } from "@/components/ui";

/* ── Types ─────────────────────────────────────────────── */
interface GapItem {
  keyword_or_skill: string;
  severity: "critical" | "moderate" | "minor";
  action: "acquire" | "reframe" | "acknowledge" | "bridge";
  recommendation: string;
}

interface GapBriefData {
  hard_gaps: GapItem[];
  soft_gaps: GapItem[];
  bridge_opportunities: string[];
  match_percentage: number;
  fabrication_risks: string[];
}

/* ── Severity / Action helpers ─────────────────────────── */
const severityBadge = (s: string) =>
  s === "critical" ? { variant: "red" as const, label: "Critical" } :
  s === "moderate" ? { variant: "amber" as const, label: "Moderate" } :
  { variant: "green" as const, label: "Minor" };

const actionIcon = (a: string) =>
  a === "acquire" ? <ArrowUpRight className="w-3 h-3 text-brand-red" /> :
  a === "reframe" ? <RefreshCw className="w-3 h-3 text-brand-purple" /> :
  a === "acknowledge" ? <CheckCircle className="w-3 h-3 text-brand-amber" /> :
  <Lightbulb className="w-3 h-3 text-brand-green" />;

const actionLabel = (a: string) =>
  a === "acquire" ? "Acquire" : a === "reframe" ? "Reframe" : a === "acknowledge" ? "Acknowledge" : "Bridge";

/* ── Gap Card ──────────────────────────────────────────── */
function GapCard({ gap }: { gap: GapItem }) {
  const badge = severityBadge(gap.severity);
  return (
    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-textPrimary">{gap.keyword_or_skill}</span>
        <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-textMuted">
        {actionIcon(gap.action)}
        <span className="font-semibold text-textSecondary">{actionLabel(gap.action)}</span>
      </div>
      <p className="text-xs text-textMuted leading-relaxed">{gap.recommendation}</p>
    </div>
  );
}

/* ── Main component ────────────────────────────────────── */
interface Props {
  data: GapBriefData;
}

export default function AriaGapBrief({ data }: Props) {
  const totalGaps = data.hard_gaps.length + data.soft_gaps.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Summary bar */}
      <GlassCard className="p-5" hover={false}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-2">
            <Brain className="w-4 h-4 text-brand-purple" /> Gap Intelligence Brief
          </h3>
          <div className="flex items-center gap-3">
            <StatusBadge variant={data.match_percentage >= 70 ? "green" : data.match_percentage >= 50 ? "amber" : "red"}>
              {data.match_percentage}% Match
            </StatusBadge>
            <span className="text-xs text-textMuted">{totalGaps} gap{totalGaps !== 1 ? "s" : ""} detected</span>
          </div>
        </div>

        {/* Match bar */}
        <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              data.match_percentage >= 70 ? "bg-brand-green" :
              data.match_percentage >= 50 ? "bg-brand-amber" : "bg-brand-red"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${data.match_percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Hard gaps */}
        <GlassCard className="p-5" hover={false}>
          <h4 className="text-xs font-semibold text-brand-red flex items-center gap-1.5 mb-3">
            <ShieldAlert className="w-3.5 h-3.5" /> Hard Gaps ({data.hard_gaps.length})
          </h4>
          {data.hard_gaps.length === 0 ? (
            <p className="text-xs text-textMuted py-4 text-center">No hard gaps detected — excellent!</p>
          ) : (
            <div className="space-y-2">
              {data.hard_gaps.map((g, i) => <GapCard key={i} gap={g} />)}
            </div>
          )}
        </GlassCard>

        {/* Soft gaps */}
        <GlassCard className="p-5" hover={false}>
          <h4 className="text-xs font-semibold text-brand-amber flex items-center gap-1.5 mb-3">
            <AlertTriangle className="w-3.5 h-3.5" /> Soft Gaps ({data.soft_gaps.length})
          </h4>
          {data.soft_gaps.length === 0 ? (
            <p className="text-xs text-textMuted py-4 text-center">No soft gaps detected.</p>
          ) : (
            <div className="space-y-2">
              {data.soft_gaps.map((g, i) => <GapCard key={i} gap={g} />)}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Bridge opportunities */}
      {data.bridge_opportunities.length > 0 && (
        <GlassCard className="p-5" hover={false}>
          <h4 className="text-xs font-semibold text-brand-green flex items-center gap-1.5 mb-3">
            <Lightbulb className="w-3.5 h-3.5" /> Bridge Opportunities
          </h4>
          <div className="space-y-2">
            {data.bridge_opportunities.map((b, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-brand-green/5 border border-brand-green/10">
                <CheckCircle className="w-3.5 h-3.5 text-brand-green flex-shrink-0 mt-0.5" />
                <p className="text-xs text-textSecondary">{b}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Fabrication risks */}
      {data.fabrication_risks.length > 0 && (
        <GlassCard className="p-5" hover={false}>
          <h4 className="text-xs font-semibold text-brand-red flex items-center gap-1.5 mb-3">
            <XCircle className="w-3.5 h-3.5" /> Fabrication Risk Warnings
          </h4>
          <div className="space-y-1.5">
            {data.fabrication_risks.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-textMuted">
                <XCircle className="w-3 h-3 text-brand-red flex-shrink-0 mt-0.5" /> {r}
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </motion.div>
  );
}
