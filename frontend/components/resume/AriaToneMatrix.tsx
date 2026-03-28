"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Building2, Loader2, ArrowRightLeft, Sparkles,
  CheckCircle, XCircle, Sliders,
} from "lucide-react";
import { GlassCard, NeonButton } from "@/components/ui";
import { ariaV2Service } from "@/lib/services";
import type { IndustryToneProfile, ToneMatrixResult } from "@/lib/services";

/* ── Industry icon mapping ────────────────────────────── */
const INDUSTRY_ICONS: Record<string, string> = {
  tech_saas: "🚀",
  finance_banking: "🏦",
  consulting: "📊",
  healthcare: "🏥",
  creative_agency: "🎨",
  startup_earlystage: "⚡",
  government_public: "🏛️",
  education_academia: "🎓",
  sales_marketing: "📈",
  legal: "⚖️",
  nonprofit: "🤝",
  data_ai_ml: "🤖",
  product_management: "📋",
};

/* ── Main component ───────────────────────────────────── */
interface Props {
  analysisId?: string;
  resumeText?: string;
}

export default function AriaToneMatrix({ analysisId, resumeText }: Props) {
  const [industries, setIndustries] = useState<IndustryToneProfile[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [result, setResult] = useState<ToneMatrixResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Load industries on mount */
  useEffect(() => {
    ariaV2Service.listIndustries().then((res) => {
      setIndustries(res.industries);
      if (res.industries.length > 0) setSelectedIndustry(res.industries[0].id);
    }).catch(() => { /* silent */ });
  }, []);

  const handleAnalyze = async () => {
    if (!selectedIndustry || (!analysisId && !resumeText)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ariaV2Service.analyzeToneMatrix({
        analysis_id: analysisId,
        industry: selectedIndustry,
        resume_text: resumeText,
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Tone analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const selectedProfile = industries.find((i) => i.id === selectedIndustry);

  return (
    <div className="space-y-4">
      {/* Config */}
      <GlassCard className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-brand-cyan" />
          <h3 className="text-sm font-semibold text-textPrimary">Industry Tone Matrix</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 ml-1">
            {industries.length} industries
          </span>
        </div>

        {/* Industry selector grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {industries.map((ind) => {
            const active = selectedIndustry === ind.id;
            const icon = INDUSTRY_ICONS[ind.id] || "📄";
            return (
              <button
                key={ind.id}
                onClick={() => setSelectedIndustry(ind.id)}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-medium transition-all border text-left ${
                  active
                    ? "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20"
                    : "bg-white/[0.02] text-textMuted border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                <span>{icon}</span>
                <span className="truncate">{ind.label}</span>
              </button>
            );
          })}
        </div>

        {/* Selected profile preview */}
        {selectedProfile && (
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-textPrimary">{selectedProfile.label}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-textMuted">
                Formality: {selectedProfile.formality}/10
              </span>
            </div>
            <div className="flex gap-4 text-[10px]">
              <div>
                <span className="text-textMuted">Base tone: </span>
                <span className="text-textSecondary capitalize">{selectedProfile.base_tone}</span>
              </div>
              <div>
                <span className="text-textMuted">Proof style: </span>
                <span className="text-textSecondary capitalize">{selectedProfile.proof_style}</span>
              </div>
            </div>
            {selectedProfile.culture_keywords && selectedProfile.culture_keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedProfile.culture_keywords.slice(0, 6).map((kw, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-brand-cyan/5 text-brand-cyan/70 border border-brand-cyan/10">
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <NeonButton onClick={handleAnalyze} disabled={loading || !selectedIndustry} className="w-full">
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</span>
          ) : (
            <span className="flex items-center gap-2"><Sliders className="w-4 h-4" /> Analyze Tone</span>
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
            {/* Vocabulary swaps */}
            {result.vocabulary_swaps && result.vocabulary_swaps.length > 0 && (
              <GlassCard className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-semibold text-textPrimary">Vocabulary Swaps</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400 border border-purple-400/20">
                    {result.vocabulary_swaps.length} changes
                  </span>
                </div>
                <div className="space-y-1.5">
                  {result.vocabulary_swaps.map((swap, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2 text-[10px] p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                    >
                      <span className="text-red-400 line-through">{swap.original}</span>
                      <ArrowRightLeft className="w-3 h-3 text-textMuted flex-shrink-0" />
                      <span className="text-emerald-400 font-medium">{swap.replacement}</span>
                      <span className="text-textMuted ml-auto">— {swap.reason}</span>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Tone adjustments */}
            {result.tone_adjustments && result.tone_adjustments.length > 0 && (
              <GlassCard className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <h4 className="text-xs font-semibold text-textPrimary">Section Tone Adjustments</h4>
                </div>
                <div className="space-y-2">
                  {result.tone_adjustments.map((adj, i) => (
                    <div key={i} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-textPrimary capitalize">{adj.section}</span>
                        <span className="text-[10px] text-red-400/70">{adj.original_tone}</span>
                        <ArrowRightLeft className="w-3 h-3 text-textMuted" />
                        <span className="text-[10px] text-emerald-400">{adj.suggested_tone}</span>
                      </div>
                      <p className="text-[10px] text-textMuted italic">&ldquo;{adj.example}&rdquo;</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
