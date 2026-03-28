"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListChecks, Loader2, Copy, CheckCircle, Zap,
  Star, ArrowRight, Shuffle,
} from "lucide-react";
import { GlassCard, NeonButton } from "@/components/ui";
import { ariaV2Service } from "@/lib/services";
import type { BulletVariantsResponse, BulletVariantResult, BulletFrameworkInfo } from "@/lib/services";

/* ── Framework color ──────────────────────────────────── */
const FW_COLORS: Record<string, string> = {
  cam: "text-brand-cyan",
  xyz: "text-blue-400",
  car: "text-purple-400",
  sai: "text-emerald-400",
  star_concise: "text-yellow-400",
};

const FW_BORDER: Record<string, string> = {
  cam: "border-brand-cyan/20",
  xyz: "border-blue-400/20",
  car: "border-purple-400/20",
  sai: "border-emerald-400/20",
  star_concise: "border-yellow-400/20",
};

const FW_BG: Record<string, string> = {
  cam: "bg-brand-cyan/10",
  xyz: "bg-blue-400/10",
  car: "bg-purple-400/10",
  sai: "bg-emerald-400/10",
  star_concise: "bg-yellow-400/10",
};

/* ── Single bullet result ─────────────────────────────── */
function BulletResultCard({ result, idx }: { result: BulletVariantResult; idx: number }) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, fw: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(fw);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3"
    >
      {/* Original */}
      <div>
        <p className="text-[10px] font-semibold text-textMuted uppercase tracking-wider mb-1">Original</p>
        <p className="text-xs text-textSecondary bg-black/20 rounded-lg px-3 py-2 border border-white/[0.04]">
          {result.original}
        </p>
      </div>

      {/* Variants */}
      <div className="space-y-2">
        {result.variants.map((v) => {
          const color = FW_COLORS[v.framework] || "text-textSecondary";
          const border = FW_BORDER[v.framework] || "border-white/[0.08]";
          const bg = FW_BG[v.framework] || "bg-white/[0.04]";

          return (
            <div key={v.framework} className={`rounded-lg border ${border} ${bg} p-3 space-y-1.5`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase ${color}`}>{v.framework_name}</span>
                  {v.front_loaded && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                      Front-loaded ✓
                    </span>
                  )}
                  <span className="text-[9px] text-textMuted">{v.word_count}w</span>
                </div>
                <button
                  onClick={() => handleCopy(v.rewritten, v.framework)}
                  className="p-1 rounded hover:bg-white/[0.08] transition-colors"
                >
                  {copied === v.framework ? (
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-textMuted" />
                  )}
                </button>
              </div>
              <p className="text-xs text-textSecondary leading-relaxed">{v.rewritten}</p>

              {/* Components breakdown */}
              {v.components && Object.keys(v.components).length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {Object.entries(v.components).map(([key, val]) => (
                    <span key={key} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-textMuted border border-white/[0.06]">
                      <span className="font-semibold">{key}:</span> {val}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recommendation */}
      {result.recommendation && (
        <div className="flex items-start gap-1.5 text-[10px] text-textMuted">
          <Star className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
          <span>{result.recommendation}</span>
        </div>
      )}
    </motion.div>
  );
}

/* ── Main component ───────────────────────────────────── */
interface Props {
  analysisId?: string;
  defaultBullets?: string[];
  jobContext?: Record<string, unknown>;
}

export default function AriaBulletVariants({ analysisId, defaultBullets, jobContext }: Props) {
  const [frameworks, setFrameworks] = useState<BulletFrameworkInfo[]>([]);
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [bullets, setBullets] = useState<string>(defaultBullets?.join("\n") || "");
  const [result, setResult] = useState<BulletVariantsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Load frameworks */
  useEffect(() => {
    ariaV2Service.listBulletFrameworks().then((res) => {
      setFrameworks(res.frameworks);
      setSelectedFrameworks(res.frameworks.map((f) => f.id));
    }).catch(() => { /* silent */ });
  }, []);

  const toggleFramework = (id: string) => {
    setSelectedFrameworks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    const bulletList = bullets.split("\n").map((b) => b.trim()).filter(Boolean);
    if (bulletList.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const res = await ariaV2Service.generateBulletVariants({
        analysis_id: analysisId,
        bullets: bulletList,
        frameworks: selectedFrameworks.length > 0 ? selectedFrameworks : undefined,
        job_context: jobContext,
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bullet variant generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-brand-cyan" />
          <h3 className="text-sm font-semibold text-textPrimary">Multi-Framework Bullet Variants</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 ml-1">
            {frameworks.length} frameworks
          </span>
        </div>

        {/* Framework toggles */}
        <div className="flex flex-wrap gap-1.5">
          {frameworks.map((fw) => {
            const active = selectedFrameworks.includes(fw.id);
            const color = active ? (FW_COLORS[fw.id] || "text-brand-cyan") : "text-textMuted";
            return (
              <button
                key={fw.id}
                onClick={() => toggleFramework(fw.id)}
                title={`${fw.structure}\nBest for: ${fw.best_for}`}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
                  active
                    ? `${FW_BG[fw.id] || "bg-brand-cyan/10"} ${color} ${FW_BORDER[fw.id] || "border-brand-cyan/20"}`
                    : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                {fw.name}
              </button>
            );
          })}
        </div>

        {/* Bullet input */}
        <div>
          <label className="block text-[10px] text-textMuted uppercase tracking-wider mb-1">
            Bullets (one per line)
          </label>
          <textarea
            value={bullets}
            onChange={(e) => setBullets(e.target.value)}
            rows={4}
            placeholder={"Managed a team of 5 engineers to deliver the project on time\nReduced server costs by implementing caching\nLed migration from monolith to microservices"}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-textSecondary placeholder:text-textMuted/50 focus:outline-none focus:border-brand-cyan/30 resize-none"
          />
        </div>

        <NeonButton
          onClick={handleGenerate}
          disabled={loading || !bullets.trim() || selectedFrameworks.length === 0}
          className="w-full"
        >
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Generating…</span>
          ) : (
            <span className="flex items-center gap-2"><Shuffle className="w-4 h-4" /> Generate Variants</span>
          )}
        </NeonButton>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </GlassCard>

      {/* Results */}
      <AnimatePresence>
        {result && result.results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {result.results.map((r, i) => (
              <BulletResultCard key={i} result={r} idx={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
