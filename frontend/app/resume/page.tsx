"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, CheckCircle, AlertTriangle,
  Award, Edit3, Eye, Download, Sparkles,
  ArrowRight, Search, X, Brain, History, Loader2,
  Mail, Shield, Layout, Globe, ListChecks,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { GlassCard, NeonButton, StatusBadge } from "@/components/ui";
import { TemplatePreview, TEMPLATE_REGISTRY, TEMPLATE_CATEGORIES } from "@/components/resume/TemplatePreview";
import type { TemplateInfo } from "@/components/resume/TemplatePreview";
import AriaActivationForm from "@/components/resume/AriaActivationForm";
import AriaScoreDashboard from "@/components/resume/AriaScoreDashboard";
import AriaOutputView from "@/components/resume/AriaOutputView";
import AriaCoverLetter from "@/components/resume/AriaCoverLetter";
import AriaATSDashboard from "@/components/resume/AriaATSDashboard";
import AriaPageAnatomy from "@/components/resume/AriaPageAnatomy";
import AriaToneMatrix from "@/components/resume/AriaToneMatrix";
import AriaBulletVariants from "@/components/resume/AriaBulletVariants";
import AriaPDFExport from "@/components/resume/AriaPDFExport";
import {
  ariaService,
  type AriaIntakeInput,
  type AriaIntakeResult,
  type AriaGenerateResult,
  type AriaScoreCard,
  type AriaAnalysisSummary,
} from "@/lib/services";

/* ── View type ─────────────────────────────────────────── */
type View = "activate" | "scoring" | "output" | "templates" | "history"
  | "cover_letter" | "ats_sim" | "anatomy" | "tone" | "bullets" | "export";

export default function ResumePage() {
  /* ── Navigation ─────────────────────────────────────── */
  const [view, setView] = useState<View>("activate");

  /* ── ARIA state ─────────────────────────────────────── */
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intakeResult, setIntakeResult] = useState<AriaIntakeResult | null>(null);
  const [scoreCard, setScoreCard] = useState<AriaScoreCard | null>(null);
  const [generateResult, setGenerateResult] = useState<AriaGenerateResult | null>(null);
  const [historyItems, setHistoryItems] = useState<AriaAnalysisSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  /* ── Templates state ────────────────────────────────── */
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQ, setSearchQ] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateInfo | null>(null);

  const filteredTemplates = useMemo(() => {
    return TEMPLATE_REGISTRY.filter((t) => {
      const matchesCat = activeCategory === "All" || t.category === activeCategory;
      const matchesSearch = !searchQ || t.name.toLowerCase().includes(searchQ.toLowerCase()) || t.tags.some((tag) => tag.includes(searchQ.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQ]);

  /* ── ARIA: Intake handler ───────────────────────────── */
  const handleIntake = useCallback(async (data: AriaIntakeInput) => {
    setLoading(true);
    setError(null);
    try {
      const result = await ariaService.intake(data);
      setIntakeResult(result);
      // Auto-generate after intake
      setGenerating(true);
      const genResult = await ariaService.generate({
        analysis_id: result.analysis_id,
        tone_mode: data.tone_mode,
      });
      setGenerateResult(genResult);
      setScoreCard(genResult.score_card);
      setView("output");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }, []);

  /* ── ARIA: Standalone score ─────────────────────────── */
  const handleScore = useCallback(async () => {
    if (!intakeResult) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await ariaService.score({ analysis_id: intakeResult.analysis_id });
      setScoreCard(res.score_card);
      setView("scoring");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Scoring failed.");
    } finally {
      setGenerating(false);
    }
  }, [intakeResult]);

  /* ── ARIA: Generate from score view ─────────────────── */
  const handleGenerate = useCallback(async () => {
    if (!intakeResult) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await ariaService.generate({ analysis_id: intakeResult.analysis_id });
      setGenerateResult(res);
      setScoreCard(res.score_card);
      setView("output");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }, [intakeResult]);

  /* ── ARIA: Load history ─────────────────────────────── */
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await ariaService.history();
      setHistoryItems(res.analyses || []);
    } catch {
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleHistoryClick = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const detail = await ariaService.detail(id) as AriaGenerateResult & { intake_analysis?: unknown };
      if (detail.resume && detail.score_card) {
        setGenerateResult(detail);
        setScoreCard(detail.score_card);
        setView("output");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load analysis.");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Nav tabs definition ────────────────────────────── */
  const TABS: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: "activate", label: "ARIA Intake", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: "scoring", label: "Score", icon: <Award className="w-3.5 h-3.5" /> },
    { id: "output", label: "Output", icon: <FileText className="w-3.5 h-3.5" /> },
    { id: "cover_letter", label: "Cover Letter", icon: <Mail className="w-3.5 h-3.5" /> },
    { id: "ats_sim", label: "ATS Sim", icon: <Shield className="w-3.5 h-3.5" /> },
    { id: "anatomy", label: "Layout", icon: <Layout className="w-3.5 h-3.5" /> },
    { id: "tone", label: "Tone", icon: <Globe className="w-3.5 h-3.5" /> },
    { id: "bullets", label: "Bullets", icon: <ListChecks className="w-3.5 h-3.5" /> },
    { id: "export", label: "Export", icon: <Download className="w-3.5 h-3.5" /> },
    { id: "templates", label: "Templates", icon: <Eye className="w-3.5 h-3.5" /> },
    { id: "history", label: "History", icon: <History className="w-3.5 h-3.5" /> },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-green to-brand-cyan flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-textPrimary">ARIA™ — AI Resume Intelligence</h1>
              <p className="text-xs text-textMuted">Dual-brain analysis: ATS Parse Brain + Human Persuasion Brain</p>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "history") loadHistory();
                  setView(tab.id);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  view === tab.id
                    ? "bg-brand-cyan/20 text-brand-cyan"
                    : "text-textMuted hover:text-textSecondary"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Global error */}
        {error && view !== "activate" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-red/10 border border-brand-red/20 text-brand-red text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            <button onClick={() => setError(null)} className="ml-auto" aria-label="Dismiss error"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ─── ARIA Activation Form ─────────────────── */}
          {view === "activate" && (
            <AriaActivationForm
              key="activate"
              onSubmit={handleIntake}
              loading={loading || generating}
              error={error}
            />
          )}

          {/* ─── Score Dashboard ──────────────────────── */}
          {view === "scoring" && scoreCard && (
            <motion.div key="scoring" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <AriaScoreDashboard
                scoreCard={scoreCard}
                onGenerate={handleGenerate}
                onRescan={handleScore}
                generating={generating}
              />
            </motion.div>
          )}

          {view === "scoring" && !scoreCard && (
            <motion.div key="scoring-empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center py-20">
              <Award className="w-12 h-12 mx-auto text-textMuted mb-3" />
              <p className="text-textMuted text-sm">No score available yet.</p>
              <p className="text-textMuted text-xs mt-1">Run an ARIA Intake first to get your 16-check score card.</p>
              <NeonButton onClick={() => setView("activate")} className="mt-4" size="sm">
                <ArrowRight className="w-4 h-4 mr-1" /> Go to ARIA Intake
              </NeonButton>
            </motion.div>
          )}

          {/* ─── 5-Block Output View ─────────────────── */}
          {view === "output" && generateResult && (
            <AriaOutputView
              key="output"
              result={generateResult}
              onRegenerate={handleGenerate}
            />
          )}

          {view === "output" && !generateResult && (
            <motion.div key="output-empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center py-20">
              <FileText className="w-12 h-12 mx-auto text-textMuted mb-3" />
              <p className="text-textMuted text-sm">No generated resume yet.</p>
              <p className="text-textMuted text-xs mt-1">Complete ARIA Intake to generate your optimized resume.</p>
              <NeonButton onClick={() => setView("activate")} className="mt-4" size="sm">
                <ArrowRight className="w-4 h-4 mr-1" /> Go to ARIA Intake
              </NeonButton>
            </motion.div>
          )}

          {/* ─── Cover Letter (v2) ───────────────────── */}
          {view === "cover_letter" && (
            <motion.div key="cover_letter" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <AriaCoverLetter
                analysisId={intakeResult?.analysis_id}
                resumeText={undefined}
                jobDescription={undefined}
                companyName={undefined}
              />
            </motion.div>
          )}

          {/* ─── ATS Platform Simulator (v2) ─────────── */}
          {view === "ats_sim" && (
            <motion.div key="ats_sim" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <AriaATSDashboard
                analysisId={intakeResult?.analysis_id}
                resumeJson={generateResult?.resume}
                jobSignals={intakeResult?.intake?.job_signals}
              />
            </motion.div>
          )}

          {/* ─── Page Anatomy (v2) ───────────────────── */}
          {view === "anatomy" && (
            <motion.div key="anatomy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <AriaPageAnatomy
                analysisId={intakeResult?.analysis_id}
                resumeJson={generateResult?.resume}
              />
            </motion.div>
          )}

          {/* ─── Tone Matrix (v2) ────────────────────── */}
          {view === "tone" && (
            <motion.div key="tone" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <AriaToneMatrix
                analysisId={intakeResult?.analysis_id}
              />
            </motion.div>
          )}

          {/* ─── Bullet Variants (v2) ────────────────── */}
          {view === "bullets" && (
            <motion.div key="bullets" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <AriaBulletVariants
                analysisId={intakeResult?.analysis_id}
              />
            </motion.div>
          )}

          {/* ─── PDF Export (v2) ──────────────────────── */}
          {view === "export" && (
            <motion.div key="export" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <AriaPDFExport
                analysisId={intakeResult?.analysis_id}
                resumeJson={generateResult?.resume}
              />
            </motion.div>
          )}

          {/* ─── Templates Gallery ───────────────────── */}
          {view === "templates" && (
            <motion.div key="templates" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
              {/* Hero banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-purple/20 via-brand-cyan/10 to-brand-green/20 border border-white/[0.06] p-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/5 rounded-full blur-3xl -mr-20 -mt-20" />
                <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-cyan" /> Professional Resume Templates
                </h2>
                <p className="text-xs text-textMuted mt-1 max-w-lg">
                  50 meticulously crafted templates — each with unique layouts, typography, and visual styles. All free. Pick one and start editing instantly.
                </p>
                {/* Search */}
                <div className="relative mt-4 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                  <input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Search templates..."
                    className="w-full pl-8 pr-8 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-textPrimary placeholder-textMuted outline-none focus:border-brand-cyan/40"
                  />
                  {searchQ && (
                    <button onClick={() => setSearchQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary" aria-label="Clear search">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category pills */}
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_CATEGORIES.map((cat) => {
                  const count = cat === "All" ? TEMPLATE_REGISTRY.length : TEMPLATE_REGISTRY.filter((t) => t.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        activeCategory === cat
                          ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30"
                          : "bg-white/[0.04] text-textMuted border border-white/[0.06] hover:border-white/[0.12] hover:text-textSecondary"
                      }`}
                    >
                      {cat} <span className="opacity-50 ml-1">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Template grid */}
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-textMuted text-sm">No templates match your search.</p>
                  <button onClick={() => { setSearchQ(""); setActiveCategory("All"); }} className="text-brand-cyan text-xs mt-2 hover:underline">Clear filters</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredTemplates.map((t, idx) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      <div
                        onClick={() => setSelectedTemplate(t)}
                        className="group cursor-pointer rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-brand-cyan/30 transition-all hover:shadow-lg hover:shadow-brand-cyan/5"
                      >
                        {/* Visual preview */}
                        <div className="relative overflow-hidden bg-white/[0.02] p-2">
                          <div className="rounded-lg overflow-hidden shadow-xl shadow-black/20 ring-1 ring-white/5">
                            <TemplatePreview id={t.id} />
                          </div>
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex gap-2">
                              <span className="px-3 py-1.5 rounded-lg bg-brand-cyan text-white text-xs font-semibold flex items-center gap-1 shadow-lg">
                                <Eye className="w-3 h-3" /> Preview
                              </span>
                              <span
                                onClick={(e) => { e.stopPropagation(); window.open(`/resume/editor?template=${t.id}`, '_blank'); }}
                                className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur text-white text-xs font-medium flex items-center gap-1 cursor-pointer hover:bg-white/20 transition"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </span>
                            </div>
                          </div>

                        </div>
                        {/* Info */}
                        <div className="p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-textPrimary group-hover:text-brand-cyan transition-colors">{t.name}</h3>
                            <div className="flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full" ref={(el) => { if (el) el.style.background = t.accent; }} />
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-brand-green/20 text-brand-green">
                                FREE
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] text-textMuted leading-relaxed">{t.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {t.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-textMuted">#{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Template detail modal */}
              <AnimatePresence>
                {selectedTemplate && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    <motion.div
                      initial={{ scale: 0.9, y: 30 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 30 }}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      className="bg-[#0d1117] border border-white/[0.08] rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col"
                    >
                      {/* Modal header */}
                      <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                        <div>
                          <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                            {selectedTemplate.name}
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-green/20 text-brand-green font-semibold">FREE</span>
                          </h2>
                          <p className="text-xs text-textMuted mt-0.5">{selectedTemplate.description}</p>
                        </div>
                        <button onClick={() => setSelectedTemplate(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-textMuted hover:text-textPrimary transition" aria-label="Close template preview">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Modal body */}
                      <div className="flex-1 overflow-y-auto p-5">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Large preview */}
                          <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/30 ring-1 ring-white/10">
                            <TemplatePreview id={selectedTemplate.id} />
                          </div>
                          {/* Details panel */}
                          <div className="space-y-5">
                            <div>
                              <h3 className="text-sm font-semibold text-textPrimary mb-2">Category</h3>
                              <span className="px-3 py-1 rounded-full text-xs border" ref={(el) => { if (el) { el.style.borderColor = selectedTemplate.accent + '40'; el.style.color = selectedTemplate.accent; el.style.background = selectedTemplate.accent + '15'; } }}>
                                {selectedTemplate.category}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-textPrimary mb-2">Tags</h3>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedTemplate.tags.map((tag) => (
                                  <span key={tag} className="text-xs px-2 py-0.5 rounded bg-white/[0.05] text-textMuted">#{tag}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-textPrimary mb-2">Features</h3>
                              <ul className="space-y-1.5">
                                {[
                                  "ATS-compatible formatting",
                                  "Print-ready PDF export",
                                  "Custom accent color",
                                  "Section reordering",
                                  "Free for all users",
                                ].map((f) => (
                                  <li key={f} className="flex items-center gap-2 text-xs text-textSecondary">
                                    <CheckCircle className="w-3 h-3 text-brand-green flex-shrink-0" /> {f}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="flex gap-3 pt-3">
                              <NeonButton onClick={() => { window.open(`/resume/editor?template=${selectedTemplate.id}`, '_blank'); setSelectedTemplate(null); }}>
                                <Edit3 className="w-4 h-4 mr-1" /> Use This Template
                              </NeonButton>
                              <button className="px-4 py-2 rounded-lg bg-white/5 text-textMuted text-sm hover:text-textPrimary transition flex items-center gap-1">
                                <Download className="w-3.5 h-3.5" /> Download PDF
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ─── History ─────────────────────────────── */}
          {view === "history" && (
            <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <GlassCard className="p-5" hover={false}>
                <h2 className="text-sm font-semibold text-textPrimary flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-brand-purple" /> Analysis History
                </h2>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-brand-cyan animate-spin" />
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-10 h-10 mx-auto text-textMuted mb-3 opacity-30" />
                    <p className="text-sm text-textMuted">No previous analyses found.</p>
                    <NeonButton onClick={() => setView("activate")} className="mt-4" size="sm">
                      Start Your First ARIA Analysis
                    </NeonButton>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {historyItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleHistoryClick(item.id)}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-brand-cyan/20 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center">
                            <Brain className="w-4 h-4 text-brand-purple" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-textPrimary">
                              {item.target_company || item.current_title || "Analysis"} — v{item.version}
                            </p>
                            <p className="text-[10px] text-textMuted">
                              {item.career_situation} • {item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {item.total_score !== null && (
                            <StatusBadge variant={item.total_score >= 14 ? "green" : item.total_score >= 10 ? "amber" : "red"}>
                              {item.total_score}/16
                            </StatusBadge>
                          )}
                          {item.is_latest && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-cyan/15 text-brand-cyan font-medium">Latest</span>
                          )}
                          <ArrowRight className="w-4 h-4 text-textMuted" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
