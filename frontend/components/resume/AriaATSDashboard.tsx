"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Loader2,
  ChevronDown, ChevronUp, BarChart3, Zap, Monitor,
} from "lucide-react";
import { GlassCard, NeonButton } from "@/components/ui";
import { ariaV2Service } from "@/lib/services";
import type { ATSPlatformResult, ATSPlatformScore, ATSPlatformInfo } from "@/lib/services";

/* ── Grade color util ─────────────────────────────────── */
function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-emerald-400";
  if (grade.startsWith("B")) return "text-blue-400";
  if (grade.startsWith("C")) return "text-yellow-400";
  if (grade.startsWith("D")) return "text-orange-400";
  return "text-red-400";
}

function scoreBarColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 85) return "bg-emerald-400";
  if (pct >= 70) return "bg-blue-400";
  if (pct >= 55) return "bg-yellow-400";
  if (pct >= 40) return "bg-orange-400";
  return "bg-red-400";
}

/* ── Single platform card ─────────────────────────────── */
function PlatformCard({ platform }: { platform: ATSPlatformScore }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round((platform.score / platform.max_score) * 100);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
      >
        {/* Platform icon */}
        <Monitor className="w-4 h-4 text-textMuted flex-shrink-0" />

        {/* Name + grade */}
        <div className="flex-1 text-left">
          <span className="text-xs font-semibold text-textPrimary">{platform.display_name}</span>
        </div>

        {/* Score bar */}
        <div className="w-24 h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${scoreBarColor(platform.score, platform.max_score)}`}
          />
        </div>

        {/* Score text */}
        <span className="text-xs font-mono text-textSecondary w-12 text-right">{pct}%</span>

        {/* Grade badge */}
        <span className={`text-xs font-bold w-6 text-center ${gradeColor(platform.grade)}`}>
          {platform.grade}
        </span>

        {/* Pass/Fail */}
        {platform.pass ? (
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
        )}

        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-textMuted" /> : <ChevronDown className="w-3.5 h-3.5 text-textMuted" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-3 border-t border-white/[0.04] pt-3">
              {/* Category scores */}
              {platform.category_scores && Object.keys(platform.category_scores).length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(platform.category_scores).map(([cat, score]) => (
                    <div key={cat} className="flex items-center justify-between text-[10px]">
                      <span className="text-textMuted capitalize">{cat.replace(/_/g, " ")}</span>
                      <span className="text-textSecondary font-mono">{typeof score === "number" ? score.toFixed(1) : score}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {platform.warnings && platform.warnings.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Warnings
                  </p>
                  <ul className="space-y-0.5">
                    {platform.warnings.map((w, i) => (
                      <li key={i} className="text-[10px] text-textMuted flex items-start gap-1.5">
                        <span className="text-yellow-400 mt-0.5">•</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Optimization tips */}
              {platform.optimization_tips && platform.optimization_tips.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-brand-cyan uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Optimization Tips
                  </p>
                  <ul className="space-y-0.5">
                    {platform.optimization_tips.map((t, i) => (
                      <li key={i} className="text-[10px] text-textMuted flex items-start gap-1.5">
                        <span className="text-brand-cyan mt-0.5">→</span> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main component ───────────────────────────────────── */
interface Props {
  analysisId?: string;
  resumeJson?: Record<string, unknown>;
  jobSignals?: Record<string, unknown>;
}

export default function AriaATSDashboard({ analysisId, resumeJson, jobSignals }: Props) {
  const [result, setResult] = useState<ATSPlatformResult | null>(null);
  const [platforms, setPlatforms] = useState<ATSPlatformInfo[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Load available platforms */
  useEffect(() => {
    ariaV2Service.listATSPlatforms().then((res) => {
      setPlatforms(res.platforms);
      setSelectedPlatforms(res.platforms.map((p) => p.id));
    }).catch(() => { /* silent */ });
  }, []);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSimulate = async () => {
    if (!analysisId && !resumeJson) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ariaV2Service.simulateATSPlatforms({
        analysis_id: analysisId,
        resume_json: resumeJson,
        job_signals: jobSignals,
        platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ATS simulation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Config */}
      <GlassCard className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand-cyan" />
          <h3 className="text-sm font-semibold text-textPrimary">ATS Platform Simulator</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 ml-1">
            {platforms.length} platforms
          </span>
        </div>

        {/* Platform toggles */}
        <div className="flex flex-wrap gap-1.5">
          {platforms.map((p) => {
            const active = selectedPlatforms.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                  active
                    ? "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20"
                    : "bg-white/[0.02] text-textMuted border-white/[0.06] hover:border-white/[0.12]"
                }`}
                title={p.description}
              >
                {p.name}
              </button>
            );
          })}
        </div>

        <NeonButton
          onClick={handleSimulate}
          disabled={loading || selectedPlatforms.length === 0}
          className="w-full"
        >
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Simulating…</span>
          ) : (
            <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Run ATS Simulation</span>
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
            className="space-y-3"
          >
            {/* Summary bar */}
            <GlassCard className="p-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-[10px] text-textMuted uppercase tracking-wider">Avg Score</p>
                  <p className="text-lg font-bold text-textPrimary">{Math.round(result.average_score)}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-textMuted uppercase tracking-wider">Best</p>
                  <p className="text-lg font-bold text-emerald-400">{result.best_platform}</p>
                </div>
                <div>
                  <p className="text-[10px] text-textMuted uppercase tracking-wider">Worst</p>
                  <p className="text-lg font-bold text-red-400">{result.worst_platform}</p>
                </div>
                <div>
                  <p className="text-[10px] text-textMuted uppercase tracking-wider">Platforms</p>
                  <p className="text-lg font-bold text-brand-cyan">{result.platforms.length}</p>
                </div>
              </div>

              {/* Universal issues */}
              {result.universal_issues && result.universal_issues.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1">Universal Issues</p>
                  <ul className="space-y-0.5">
                    {result.universal_issues.map((issue, i) => (
                      <li key={i} className="text-[10px] text-textMuted flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" /> {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </GlassCard>

            {/* Per-platform cards */}
            {result.platforms
              .sort((a, b) => b.score - a.score)
              .map((p) => (
                <PlatformCard key={p.platform} platform={p} />
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
