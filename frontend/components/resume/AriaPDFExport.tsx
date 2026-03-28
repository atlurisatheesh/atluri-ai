"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download, FileText, Loader2, Palette, CheckCircle,
} from "lucide-react";
import { GlassCard, NeonButton } from "@/components/ui";
import { ariaV2Service } from "@/lib/services";

/* ── Style presets ────────────────────────────────────── */
const STYLES = [
  { id: "classic" as const, label: "Classic", desc: "Traditional serif — finance, legal", color: "text-blue-400" },
  { id: "modern" as const, label: "Modern", desc: "Clean sans-serif — tech, startups", color: "text-brand-cyan" },
  { id: "minimal" as const, label: "Minimal", desc: "Maximum whitespace — design, consulting", color: "text-textSecondary" },
  { id: "executive" as const, label: "Executive", desc: "Bold category headers — C-suite, VP", color: "text-purple-400" },
  { id: "tech" as const, label: "Tech", desc: "Monospace accents — engineering, data", color: "text-emerald-400" },
];

/* ── Main component ───────────────────────────────────── */
interface Props {
  analysisId?: string;
  resumeJson?: Record<string, unknown>;
}

export default function AriaPDFExport({ analysisId, resumeJson }: Props) {
  const [style, setStyle] = useState<"classic" | "modern" | "minimal" | "executive" | "tech">("modern");
  const [loading, setLoading] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const handleExportPDF = async () => {
    if (!analysisId && !resumeJson) return;
    setLoading(true);
    setError(null);
    setDownloaded(false);
    try {
      const blob = await ariaV2Service.exportPDF({
        analysis_id: analysisId,
        resume_json: resumeJson,
        style,
      });
      // Download the blob
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume-${style}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "PDF export failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewHTML = async () => {
    if (!analysisId && !resumeJson) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ariaV2Service.exportHTML({
        analysis_id: analysisId,
        resume_json: resumeJson,
        style,
      });
      setHtmlPreview(res.html);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "HTML preview failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-cyan" />
          <h3 className="text-sm font-semibold text-textPrimary">PDF / HTML Export</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 ml-1">
            5 styles
          </span>
        </div>

        {/* Style selector */}
        <div className="grid grid-cols-5 gap-1.5">
          {STYLES.map((s) => {
            const active = style === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-center transition-all border ${
                  active
                    ? "bg-brand-cyan/10 border-brand-cyan/20"
                    : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                <Palette className={`w-4 h-4 ${active ? s.color : "text-textMuted"}`} />
                <span className={`text-[10px] font-medium ${active ? s.color : "text-textMuted"}`}>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Selected style description */}
        {STYLES.find((s) => s.id === style) && (
          <p className="text-[10px] text-textMuted text-center">
            {STYLES.find((s) => s.id === style)?.desc}
          </p>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <NeonButton onClick={handleExportPDF} disabled={loading} className="w-full">
            {loading ? (
              <span className="flex items-center gap-2 justify-center"><Loader2 className="w-4 h-4 animate-spin" /></span>
            ) : downloaded ? (
              <span className="flex items-center gap-2 justify-center"><CheckCircle className="w-4 h-4 text-emerald-400" /> Downloaded</span>
            ) : (
              <span className="flex items-center gap-2 justify-center"><Download className="w-4 h-4" /> Export PDF</span>
            )}
          </NeonButton>

          <button
            onClick={handlePreviewHTML}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-xs font-medium border border-white/[0.08] bg-white/[0.03] text-textSecondary hover:bg-white/[0.06] transition-colors disabled:opacity-50"
          >
            <span className="flex items-center gap-2 justify-center"><FileText className="w-4 h-4" /> Preview HTML</span>
          </button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </GlassCard>

      {/* HTML Preview */}
      {htmlPreview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-textPrimary">HTML Preview</h4>
              <button
                onClick={() => setHtmlPreview(null)}
                className="text-[10px] text-textMuted hover:text-textSecondary"
              >
                Close
              </button>
            </div>
            <div
              className="rounded-lg bg-white overflow-auto max-h-[600px] shadow-inner min-h-[200px]"
            >
              <iframe
                srcDoc={htmlPreview}
                title="Resume Preview"
                className="w-full min-h-[600px] border-0"
                sandbox="allow-same-origin"
              />
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
