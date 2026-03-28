"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, FileText, MessageCircle, Zap, Copy, CheckCircle,
  Loader2, ChevronDown, ChevronUp, Sparkles, User,
} from "lucide-react";
import { GlassCard, NeonButton } from "@/components/ui";
import { ariaV2Service } from "@/lib/services";
import type { CoverLetterVariant, CoverLetterResult } from "@/lib/services";

/* ── Variant config ───────────────────────────────────── */
const VARIANT_META: Record<string, { label: string; icon: typeof Mail; color: string; desc: string }> = {
  traditional: {
    label: "Traditional",
    icon: FileText,
    color: "text-blue-400",
    desc: "Professional 4-paragraph format — ideal for formal applications.",
  },
  story: {
    label: "Story Arc",
    icon: Sparkles,
    color: "text-purple-400",
    desc: "Narrative-driven hook — memorable opening for creative roles.",
  },
  cold_email: {
    label: "Cold Email",
    icon: MessageCircle,
    color: "text-emerald-400",
    desc: "80-120 word recruiter outreach — punchy & scannable.",
  },
};

/* ── Single variant card ──────────────────────────────── */
function VariantCard({ variant }: { variant: CoverLetterVariant }) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const meta = VARIANT_META[variant.variant] || VARIANT_META.traditional;
  const Icon = meta.icon;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(variant.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${meta.color}`} />
          <span className="text-sm font-semibold text-textPrimary">{meta.label}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-textMuted">
            {variant.word_count} words
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-textMuted" />}
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-textMuted" /> : <ChevronDown className="w-4 h-4 text-textMuted" />}
        </div>
      </button>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-3">
              <p className="text-[10px] text-textMuted">{meta.desc}</p>
              <div className="whitespace-pre-wrap text-xs text-textSecondary leading-relaxed bg-black/20 rounded-lg p-4 border border-white/[0.04]">
                {variant.content}
              </div>
              {variant.key_evidence && variant.key_evidence.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-textMuted uppercase tracking-wider mb-1">Key Evidence Used</p>
                  <div className="flex flex-wrap gap-1">
                    {variant.key_evidence.map((ev, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Main component ───────────────────────────────────── */
interface Props {
  analysisId?: string;
  resumeText?: string;
  jobDescription?: string;
  companyName?: string;
}

export default function AriaCoverLetter({ analysisId, resumeText, jobDescription, companyName }: Props) {
  const [result, setResult] = useState<CoverLetterResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiringManager, setHiringManager] = useState("");
  const [selectedVariants, setSelectedVariants] = useState<string[]>(["traditional", "story", "cold_email"]);

  const toggleVariant = (v: string) => {
    setSelectedVariants((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  const handleGenerate = async () => {
    if (!analysisId && !resumeText) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ariaV2Service.generateCoverLetters({
        analysis_id: analysisId,
        resume_text: resumeText,
        job_description: jobDescription,
        company_name: companyName || undefined,
        hiring_manager: hiringManager || undefined,
        variants: selectedVariants as ("traditional" | "story" | "cold_email")[],
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Cover letter generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Config bar */}
      <GlassCard className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-brand-cyan" />
          <h3 className="text-sm font-semibold text-textPrimary">Cover Letter Generator</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 ml-1">
            3 variants
          </span>
        </div>

        {/* Hiring manager input */}
        <div>
          <label className="block text-[10px] text-textMuted uppercase tracking-wider mb-1">
            Hiring Manager (optional)
          </label>
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-textMuted" />
            <input
              value={hiringManager}
              onChange={(e) => setHiringManager(e.target.value)}
              placeholder="e.g. Sarah Chen, VP Engineering"
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-textSecondary placeholder:text-textMuted/50 focus:outline-none focus:border-brand-cyan/30"
            />
          </div>
        </div>

        {/* Variant toggles */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(VARIANT_META).map(([key, meta]) => {
            const Icon = meta.icon;
            const active = selectedVariants.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleVariant(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  active
                    ? "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20"
                    : "bg-white/[0.02] text-textMuted border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                <Icon className="w-3 h-3" /> {meta.label}
              </button>
            );
          })}
        </div>

        {/* Generate button */}
        <NeonButton
          onClick={handleGenerate}
          disabled={loading || selectedVariants.length === 0}
          className="w-full"
        >
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Generating…</span>
          ) : (
            <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Generate Cover Letters</span>
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
            {result.variants.map((v) => (
              <VariantCard key={v.variant} variant={v} />
            ))}
            {result.generation_notes && (
              <p className="text-[10px] text-textMuted italic">{result.generation_notes}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
