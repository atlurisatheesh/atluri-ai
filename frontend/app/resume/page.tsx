"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Upload, CheckCircle, AlertTriangle, XCircle,
  Award, Edit3, Eye, Download, Sparkles, BarChart2, Target,
  Briefcase, GraduationCap, Mail, Star, ArrowRight,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { GlassCard, NeonButton, StatusBadge } from "@/components/ui";

/* ── Mock ATS data ──────────────────────────────────────── */
const MOCK_ATS = {
  score: 78,
  sections: [
    { label: "Contact Info", status: "pass", icon: <Mail className="w-3.5 h-3.5" />, detail: "Email, phone, LinkedIn found" },
    { label: "Work Experience", status: "pass", icon: <Briefcase className="w-3.5 h-3.5" />, detail: "4 positions with dates and bullets" },
    { label: "Education", status: "pass", icon: <GraduationCap className="w-3.5 h-3.5" />, detail: "B.S. Computer Science detected" },
    { label: "Skills Section", status: "warn", icon: <Star className="w-3.5 h-3.5" />, detail: "8 skills found — add 4-5 more for ATS matching" },
    { label: "Power Verbs", status: "warn", icon: <Sparkles className="w-3.5 h-3.5" />, detail: "60% of bullets start with action verbs — aim for 90%+" },
    { label: "Quantified Impact", status: "fail", icon: <BarChart2 className="w-3.5 h-3.5" />, detail: "Only 3 of 16 bullets contain metrics — add numbers" },
    { label: "JD Keyword Match", status: "warn", icon: <Target className="w-3.5 h-3.5" />, detail: "Matched 12 of 20 keywords (60%)" },
  ],
};

const TEMPLATES = [
  { id: 1, name: "Executive Edge", style: "Modern", color: "#00D4FF", premium: false },
  { id: 2, name: "Silicon Valley", style: "Tech-focused", color: "#7B61FF", premium: false },
  { id: 3, name: "Wall Street", style: "Finance", color: "#FFB800", premium: true },
  { id: 4, name: "Creative Canvas", style: "Design", color: "#FF6B35", premium: true },
  { id: 5, name: "Data-Driven", style: "Analytics", color: "#00FF88", premium: false },
  { id: 6, name: "Leadership One", style: "Executive", color: "#FF4466", premium: true },
  { id: 7, name: "Clean Slate", style: "Minimalist", color: "#FFFFFF", premium: false },
  { id: 8, name: "ATS Magnet", style: "ATS-optimized", color: "#00D4FF", premium: false },
];

const SAMPLE_BULLETS = [
  { original: "Worked on the backend team", improved: "Architected and deployed 12 microservices handling 50K req/s, reducing latency by 40%" },
  { original: "Helped with the ML pipeline", improved: "Engineered an end-to-end ML pipeline that increased model accuracy from 82% to 94%, driving $2.1M in annual revenue" },
  { original: "Was responsible for testing", improved: "Established a comprehensive CI/CD testing framework with 95% code coverage, reducing production bugs by 67%" },
];

function ScoreRing({ value }: { value: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color = value >= 80 ? "var(--brand-green)" : value >= 60 ? "var(--brand-amber)" : "var(--brand-red)";
  return (
    <svg width={100} height={100} className="-rotate-90">
      <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
      <motion.circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={c} strokeLinecap="round"
        initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.2, ease: "easeOut" }} />
    </svg>
  );
}

export default function ResumePage() {
  const [view, setView] = useState<"upload" | "analysis" | "editor" | "templates">("upload");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [jd, setJd] = useState("");

  const handleUpload = () => setView("analysis");

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-green to-brand-cyan flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-textPrimary">ProfileCraft™ — AI Resume Lab</h1>
              <p className="text-xs text-textMuted">ATS-optimized resume analysis, enhancement, and templates</p>
            </div>
          </div>
          <div className="flex gap-2">
            {(["upload", "analysis", "editor", "templates"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-xs capitalize transition ${view === v ? "bg-brand-cyan/20 text-brand-cyan" : "text-textMuted hover:text-textSecondary"}`}>{v}</button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Upload */}
          {view === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl mx-auto space-y-4">
              <div
                className={`rounded-2xl bg-white/[0.03] backdrop-blur-xl border p-10 text-center border-2 border-dashed transition-all cursor-pointer ${dragOver ? "border-brand-cyan bg-brand-cyan/5" : "border-white/[0.08] hover:border-white/[0.15]"}`}
                onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e: React.DragEvent) => { e.preventDefault(); setDragOver(false); handleUpload(); }}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleUpload} />
                <Upload className="w-10 h-10 mx-auto text-textMuted mb-3" />
                <p className="text-sm text-textPrimary font-medium">Drop your resume here or click to upload</p>
                <p className="text-xs text-textMuted mt-1">PDF, DOCX, or TXT — max 10 MB</p>
              </div>

              <GlassCard className="p-5">
                <label className="text-xs text-textMuted mb-2 block">Paste job description (optional — boosts keyword matching)</label>
                <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={4} className="w-full p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-textPrimary placeholder-textMuted outline-none resize-none focus:border-brand-cyan/30" placeholder="Paste the full job posting here..." />
              </GlassCard>
            </motion.div>
          )}

          {/* Analysis */}
          {view === "analysis" && (
            <motion.div key="analysis" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
                {/* Score */}
                <GlassCard className="p-6 flex flex-col items-center justify-center">
                  <div className="relative">
                    <ScoreRing value={MOCK_ATS.score} />
                    <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-textPrimary">{MOCK_ATS.score}</span>
                  </div>
                  <p className="text-xs text-textMuted mt-2">ATS Compatibility Score</p>
                  <StatusBadge variant={MOCK_ATS.score >= 80 ? "green" : "amber"} className="mt-2">
                    {MOCK_ATS.score >= 80 ? "Strong" : "Needs Work"}
                  </StatusBadge>
                </GlassCard>

                {/* Section checks */}
                <GlassCard className="lg:col-span-3 p-5">
                  <h2 className="text-sm font-semibold text-textPrimary mb-3">Section-by-Section Analysis</h2>
                  <div className="space-y-2">
                    {MOCK_ATS.sections.map((s) => (
                      <div key={s.label} className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                        <span className={`flex-shrink-0 mt-0.5 ${s.status === "pass" ? "text-brand-green" : s.status === "warn" ? "text-brand-amber" : "text-brand-red"}`}>
                          {s.status === "pass" ? <CheckCircle className="w-4 h-4" /> : s.status === "warn" ? <AlertTriangle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {s.icon}
                            <span className="text-sm font-medium text-textPrimary">{s.label}</span>
                          </div>
                          <p className="text-xs text-textMuted mt-0.5">{s.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>

              {/* Bullet improvements */}
              <GlassCard className="p-5">
                <h2 className="text-sm font-semibold text-textPrimary mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand-amber" /> AI-Powered Bullet Rewrites</h2>
                <div className="space-y-3">
                  {SAMPLE_BULLETS.map((b, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-brand-red/5 border border-brand-red/10">
                        <p className="text-[10px] text-brand-red font-medium mb-1">Original</p>
                        <p className="text-sm text-textSecondary">{b.original}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-brand-green/5 border border-brand-green/10">
                        <p className="text-[10px] text-brand-green font-medium mb-1">AI-Enhanced</p>
                        <p className="text-sm text-textSecondary">{b.improved}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <div className="flex justify-center gap-3">
                <NeonButton onClick={() => setView("editor")}><Edit3 className="w-4 h-4 mr-1" /> Edit Resume</NeonButton>
                <NeonButton onClick={() => setView("templates")} className="!bg-brand-purple/20 !text-brand-purple"><Eye className="w-4 h-4 mr-1" /> Browse Templates</NeonButton>
              </div>
            </motion.div>
          )}

          {/* Editor */}
          {view === "editor" && (
            <motion.div key="editor" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left: editable resume */}
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-textPrimary">Resume Editor</h2>
                  <div className="flex gap-2">
                    <button className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-textMuted hover:text-textPrimary transition flex items-center gap-1"><Download className="w-3 h-3" /> Export PDF</button>
                    <NeonButton className="!text-xs !px-3 !py-1.5"><Sparkles className="w-3 h-3 mr-1" /> AI Enhance</NeonButton>
                  </div>
                </div>
                <div className="space-y-4">
                  {["Name & Contact", "Summary", "Experience", "Education", "Skills"].map((section) => (
                    <div key={section}>
                      <label className="text-[10px] text-textMuted uppercase tracking-wider">{section}</label>
                      <textarea className="w-full mt-1 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-textPrimary placeholder-textMuted outline-none resize-none focus:border-brand-cyan/30 min-h-[80px]" placeholder={`Enter ${section.toLowerCase()}...`} />
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Right: preview */}
              <GlassCard className="p-5">
                <h2 className="text-sm font-semibold text-textPrimary mb-3">Live Preview</h2>
                <div className="bg-white rounded-lg p-8 min-h-[600px]">
                  <h3 className="text-xl font-bold text-gray-900">John Doe</h3>
                  <p className="text-sm text-gray-500">john.doe@email.com • (555) 123-4567 • linkedin.com/in/johndoe</p>
                  <div className="mt-4 border-t border-gray-200 pt-3">
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Summary</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">Full-stack engineer with 5+ years building scalable web applications at high-growth startups. Expertise in React, Node.js, and cloud infrastructure.</p>
                  </div>
                  <div className="mt-3 border-t border-gray-200 pt-3">
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Experience</h4>
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-gray-700">Senior Software Engineer — Acme Corp</p>
                      <p className="text-[10px] text-gray-400">Jan 2022 – Present</p>
                      <ul className="mt-1 text-xs text-gray-600 list-disc list-inside space-y-0.5">
                        <li>Architected microservices handling 50K req/s</li>
                        <li>Reduced deployment time by 60% with CI/CD overhaul</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Templates */}
          {view === "templates" && (
            <motion.div key="templates" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {TEMPLATES.map((t) => (
                  <GlassCard key={t.id} className="overflow-hidden cursor-pointer hover:scale-[1.02] transition-all group">
                    {/* Color preview bar */}
                    <div className="h-2" style={{ background: t.color }} />
                    {/* Mini layout preview */}
                    <div className="p-4 bg-white/[0.02] min-h-[180px] flex flex-col gap-2">
                      <div className="w-20 h-2 rounded" style={{ background: t.color }} />
                      <div className="w-full h-1.5 rounded bg-gray-700/30" />
                      <div className="w-3/4 h-1.5 rounded bg-gray-700/20" />
                      <div className="mt-2 space-y-1.5">
                        {[1, 2, 3].map((l) => (
                          <div key={l} className="flex gap-2">
                            <div className="w-1 h-1 rounded-full mt-1" style={{ background: t.color }} />
                            <div className="flex-1 h-1.5 rounded bg-gray-700/15" />
                          </div>
                        ))}
                      </div>
                      <div className="mt-auto space-y-1">
                        <div className="w-16 h-1.5 rounded" style={{ background: t.color, opacity: 0.5 }} />
                        <div className="w-full h-1.5 rounded bg-gray-700/10" />
                      </div>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-textPrimary">{t.name}</p>
                        <p className="text-[10px] text-textMuted">{t.style}</p>
                      </div>
                      {t.premium ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-amber/20 text-brand-amber font-medium">PRO</span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-green/20 text-brand-green font-medium">FREE</span>
                      )}
                    </div>
                  </GlassCard>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
