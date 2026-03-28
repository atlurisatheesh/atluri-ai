"use client";

import { motion } from "framer-motion";
import {
  ArrowRight, Zap, BarChart2, FileText, Edit3,
} from "lucide-react";
import { GlassCard } from "@/components/ui";

/* ── Types ─────────────────────────────────────────────── */
interface PrecisionEdit {
  priority: number;
  section: string;
  current_text: string;
  suggested_text: string;
  rationale: string;
  expected_impact: string;
}

interface Props {
  edits: PrecisionEdit[];
  onApply?: (edit: PrecisionEdit) => void;
}

/* ── Priority color ────────────────────────────────────── */
const priorityColor = (p: number) =>
  p === 1 ? "brand-red" : p === 2 ? "brand-amber" : "brand-green";

export default function AriaPrecisionEdits({ edits, onApply }: Props) {
  if (edits.length === 0) {
    return (
      <GlassCard className="p-8 text-center" hover={false}>
        <p className="text-textMuted text-sm">No precision edits available yet.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5" hover={false}>
      <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-brand-amber" /> Top {edits.length} Precision Edits
        <span className="text-[10px] text-textMuted ml-1">(Highest ROI first)</span>
      </h3>

      <div className="space-y-4">
        {edits.map((edit, i) => {
          const pc = priorityColor(edit.priority);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-${pc}/15 text-${pc}`}>
                    #{edit.priority}
                  </span>
                  <span className="text-xs font-medium text-textPrimary flex items-center gap-1">
                    <FileText className="w-3 h-3 text-textMuted" /> {edit.section}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[10px] text-brand-green">
                  <BarChart2 className="w-3 h-3" /> {edit.expected_impact}
                </span>
              </div>

              {/* Before / After */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div className="p-3 border-r border-white/[0.04]">
                  <p className="text-[10px] text-brand-red font-medium mb-1">Current</p>
                  <p className="text-xs text-textMuted leading-relaxed">{edit.current_text}</p>
                </div>
                <div className="p-3 relative">
                  <p className="text-[10px] text-brand-green font-medium mb-1">Suggested</p>
                  <p className="text-xs text-textSecondary leading-relaxed">{edit.suggested_text}</p>
                  <ArrowRight className="w-4 h-4 text-brand-cyan absolute -left-2 top-1/2 -translate-y-1/2 hidden md:block" />
                </div>
              </div>

              {/* Rationale + Apply */}
              <div className="px-4 py-2.5 bg-white/[0.01] border-t border-white/[0.04] flex items-center justify-between">
                <p className="text-[10px] text-textMuted italic max-w-[70%]">{edit.rationale}</p>
                {onApply && (
                  <button
                    onClick={() => onApply(edit)}
                    className="flex items-center gap-1 text-[10px] px-3 py-1 rounded-lg bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 hover:bg-brand-cyan/20 transition font-medium"
                  >
                    <Edit3 className="w-3 h-3" /> Apply
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}
