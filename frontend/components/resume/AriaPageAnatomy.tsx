"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, Layout, Loader2, Lightbulb, ArrowRight,
  BarChart3, Layers, MoveVertical,
} from "lucide-react";
import { GlassCard, NeonButton } from "@/components/ui";
import { ariaV2Service } from "@/lib/services";
import type { PageAnatomyResult, AttentionZone } from "@/lib/services";

/* ── Zone color mapping ───────────────────────────────── */
const ZONE_COLORS: Record<string, { bg: string; border: string; text: string; fill: string }> = {
  header_bar:    { bg: "bg-brand-cyan/10",  border: "border-brand-cyan/30",  text: "text-brand-cyan",  fill: "bg-brand-cyan" },
  left_rail:     { bg: "bg-purple-400/10",  border: "border-purple-400/30",  text: "text-purple-400",  fill: "bg-purple-400" },
  body_core:     { bg: "bg-blue-400/10",    border: "border-blue-400/30",    text: "text-blue-400",    fill: "bg-blue-400" },
  right_margin:  { bg: "bg-yellow-400/10",  border: "border-yellow-400/30",  text: "text-yellow-400",  fill: "bg-yellow-400" },
  footer_zone:   { bg: "bg-white/5",        border: "border-white/10",       text: "text-textMuted",   fill: "bg-white/30" },
};

/* ── Zone card ────────────────────────────────────────── */
function ZoneCard({ zone, idx }: { zone: AttentionZone; idx: number }) {
  const colors = ZONE_COLORS[zone.zone] || ZONE_COLORS.body_core;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.08 }}
      className={`rounded-xl border ${colors.border} ${colors.bg} p-4 space-y-2`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colors.fill}`} />
          <span className={`text-xs font-semibold ${colors.text}`}>{zone.label}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-textMuted">
            weight: {zone.weight.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-textMuted">Impact:</span>
          <span className={`text-xs font-bold ${colors.text}`}>{(zone.impact_score * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Impact bar */}
      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${zone.impact_score * 100}%` }}
          transition={{ duration: 0.7, delay: idx * 0.08 + 0.3 }}
          className={`h-full rounded-full ${colors.fill}`}
        />
      </div>

      {/* Description */}
      <p className="text-[10px] text-textMuted">{zone.description}</p>

      {/* Optimal content */}
      {zone.optimal_content && zone.optimal_content.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-textMuted uppercase tracking-wider mb-1">Optimal Content</p>
          <div className="flex flex-wrap gap-1">
            {zone.optimal_content.map((c, i) => (
              <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Current content */}
      {zone.current_content && zone.current_content.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-textMuted uppercase tracking-wider mb-1">Currently Placed</p>
          <div className="flex flex-wrap gap-1">
            {zone.current_content.map((c, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-textSecondary border border-white/[0.06]">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ── Main component ───────────────────────────────────── */
interface Props {
  analysisId?: string;
  resumeJson?: Record<string, unknown>;
  careerSituation?: string;
}

export default function AriaPageAnatomy({ analysisId, resumeJson, careerSituation }: Props) {
  const [result, setResult] = useState<PageAnatomyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!analysisId && !resumeJson) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ariaV2Service.analyzePageAnatomy({
        analysis_id: analysisId,
        resume_json: resumeJson,
        career_situation: careerSituation,
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Page anatomy analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <GlassCard className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-brand-cyan" />
          <h3 className="text-sm font-semibold text-textPrimary">Page Anatomy & Attention Zones</h3>
        </div>
        <p className="text-[10px] text-textMuted">
          Analyzes your resume layout using F-pattern / Z-pattern eye-tracking models.
          Shows where recruiters look first and how to optimize content placement.
        </p>

        <NeonButton onClick={handleAnalyze} disabled={loading} className="w-full">
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</span>
          ) : (
            <span className="flex items-center gap-2"><Layout className="w-4 h-4" /> Analyze Layout</span>
          )}
        </NeonButton>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </GlassCard>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary */}
            <GlassCard className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[10px] text-textMuted uppercase tracking-wider">Pattern</p>
                  <p className="text-sm font-bold text-brand-cyan uppercase">{result.pattern.replace("_", "-")}</p>
                </div>
                <div>
                  <p className="text-[10px] text-textMuted uppercase tracking-wider">Placement Score</p>
                  <p className="text-lg font-bold text-textPrimary">{Math.round(result.overall_placement_score * 100)}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-textMuted uppercase tracking-wider">Zones</p>
                  <p className="text-lg font-bold text-textPrimary">{result.zones.length}</p>
                </div>
              </div>
            </GlassCard>

            {/* Zone cards */}
            {result.zones.map((zone, idx) => (
              <ZoneCard key={zone.zone} zone={zone} idx={idx} />
            ))}

            {/* Recommended section order */}
            {result.section_order && result.section_order.length > 0 && (
              <GlassCard className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <MoveVertical className="w-4 h-4 text-brand-cyan" />
                  <h4 className="text-xs font-semibold text-textPrimary">Recommended Section Order</h4>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {result.section_order.map((section, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                        {i + 1}. {section}
                      </span>
                      {i < result.section_order.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-textMuted" />
                      )}
                    </span>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <GlassCard className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  <h4 className="text-xs font-semibold text-textPrimary">Layout Recommendations</h4>
                </div>
                <ul className="space-y-1">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="text-[10px] text-textMuted flex items-start gap-1.5">
                      <span className="text-yellow-400 mt-0.5">→</span> {rec}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
