"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, FileText, Building2, Briefcase, Clock,
  Palette, Brain, ChevronRight, Loader2, AlertCircle,
  GraduationCap, Wrench, Shield,
} from "lucide-react";
import { GlassCard, NeonButton } from "@/components/ui";
import type { AriaIntakeInput } from "@/lib/services";

/* ── Career situations ─────────────────────────────────── */
const CAREER_SITUATIONS = [
  { value: "standard", label: "Standard Application", desc: "Lateral move at similar level", icon: Briefcase },
  { value: "promotion", label: "Going Up", desc: "Targeting a more senior role", icon: ChevronRight },
  { value: "pivot", label: "Career Pivot", desc: "Switching industries or functions", icon: Brain },
  { value: "gap", label: "Career Gap", desc: "Returning after time away", icon: Clock },
  { value: "executive", label: "Executive", desc: "C-Suite / VP / Director level", icon: Shield },
  { value: "entry", label: "Entry Level", desc: "First job or early career", icon: GraduationCap },
] as const;

/* ── Tone modes ────────────────────────────────────────── */
const TONE_MODES = [
  { value: "corporate", label: "Corporate", desc: "Formal, structured, enterprise-ready" },
  { value: "conversational", label: "Conversational", desc: "Warm, approachable, startup-friendly" },
  { value: "technical", label: "Technical", desc: "Engineering-focused, specs & metrics" },
  { value: "narrative", label: "Narrative", desc: "Story-driven, impact-focused" },
] as const;

/* ── Culture signals ───────────────────────────────────── */
const CULTURE_OPTIONS = [
  "Move fast", "Data-driven", "Mission-first", "Innovation culture",
  "Process-oriented", "Customer obsessed", "Engineering excellence", "Growth mindset",
];

interface Props {
  onSubmit: (data: AriaIntakeInput) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export default function AriaActivationForm({ onSubmit, loading, error }: Props) {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [yearsExp, setYearsExp] = useState<number | "">("");
  const [careerSituation, setCareerSituation] = useState<AriaIntakeInput["career_situation"]>("standard");
  const [toneMode, setToneMode] = useState<AriaIntakeInput["tone_mode"]>("corporate");
  const [cultures, setCultures] = useState<string[]>([]);
  const [skills, setSkills] = useState("");
  const [education, setEducation] = useState("");
  const [certifications, setCertifications] = useState("");

  const toggleCulture = (c: string) =>
    setCultures((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const canSubmit = resumeText.trim().length > 50 && !loading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      resume_text: resumeText.trim(),
      job_description: jobDescription.trim() || undefined,
      target_company: targetCompany.trim() || undefined,
      current_title: currentTitle.trim() || undefined,
      years_experience: typeof yearsExp === "number" ? yearsExp : undefined,
      career_situation: careerSituation,
      tone_mode: toneMode,
      company_culture: cultures.length > 0 ? cultures.join(", ") : undefined,
      skills_and_tools: skills.trim() || undefined,
      education: education.trim() || undefined,
      certifications: certifications.trim() || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto space-y-5"
    >
      {/* Hero */}
      <div className="text-center space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" /> ARIA Intelligence Engine
        </div>
        <h2 className="text-2xl font-bold text-textPrimary">Activate Your Resume Intelligence</h2>
        <p className="text-sm text-textMuted max-w-lg mx-auto">
          ARIA&apos;s dual-brain architecture analyzes your resume through 5 intelligence passes — ATS Parse Brain + Human Persuasion Brain — to maximize both machine readability and human impact.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-red/10 border border-brand-red/20 text-brand-red text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column: Resume + JD */}
        <div className="space-y-4">
          {/* Resume text - required */}
          <GlassCard className="p-5" hover={false}>
            <label className="text-xs text-textMuted flex items-center gap-1.5 mb-2">
              <FileText className="w-3.5 h-3.5" /> Your Resume <span className="text-brand-red">*</span>
            </label>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={10}
              className="w-full p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-textPrimary placeholder-textMuted outline-none resize-none focus:border-brand-cyan/30"
              placeholder="Paste your full resume text here... (minimum 50 characters)"
            />
            <p className="text-[10px] text-textMuted mt-1">
              {resumeText.length} chars {resumeText.length < 50 && resumeText.length > 0 && "— need at least 50"}
            </p>
          </GlassCard>

          {/* Job description - optional but powerful */}
          <GlassCard className="p-5" hover={false}>
            <label className="text-xs text-textMuted flex items-center gap-1.5 mb-2">
              <Briefcase className="w-3.5 h-3.5" /> Target Job Description
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-green/15 text-brand-green">+40% accuracy</span>
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={6}
              className="w-full p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-textPrimary placeholder-textMuted outline-none resize-none focus:border-brand-cyan/30"
              placeholder="Paste the full job posting here for keyword extraction and gap analysis..."
            />
          </GlassCard>
        </div>

        {/* Right column: Context fields */}
        <div className="space-y-4">
          {/* Company + Title */}
          <GlassCard className="p-5 space-y-3" hover={false}>
            <div>
              <label className="text-xs text-textMuted flex items-center gap-1.5 mb-1.5">
                <Building2 className="w-3.5 h-3.5" /> Target Company
              </label>
              <input
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-textPrimary placeholder-textMuted outline-none focus:border-brand-cyan/30"
                placeholder="e.g. Google, Stripe, Series B startup..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-textMuted mb-1.5 block">Current Title</label>
                <input
                  value={currentTitle}
                  onChange={(e) => setCurrentTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-textPrimary placeholder-textMuted outline-none focus:border-brand-cyan/30"
                  placeholder="e.g. Software Engineer"
                />
              </div>
              <div>
                <label className="text-xs text-textMuted mb-1.5 block">Years of Experience</label>
                <input
                  type="number"
                  value={yearsExp}
                  onChange={(e) => setYearsExp(e.target.value ? parseInt(e.target.value) : "")}
                  min={0}
                  max={50}
                  className="w-full p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-textPrimary placeholder-textMuted outline-none focus:border-brand-cyan/30"
                  placeholder="e.g. 5"
                />
              </div>
            </div>
          </GlassCard>

          {/* Career Situation */}
          <GlassCard className="p-5" hover={false}>
            <label className="text-xs text-textMuted mb-2 block">Career Situation</label>
            <div className="grid grid-cols-2 gap-2">
              {CAREER_SITUATIONS.map((cs) => {
                const Icon = cs.icon;
                return (
                  <button
                    key={cs.value}
                    onClick={() => setCareerSituation(cs.value)}
                    className={`p-2.5 rounded-lg text-left transition-all border ${
                      careerSituation === cs.value
                        ? "bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan"
                        : "bg-white/[0.02] border-white/[0.06] text-textMuted hover:border-white/[0.12]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{cs.label}</span>
                    </div>
                    <p className="text-[9px] opacity-60 mt-0.5">{cs.desc}</p>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Tone Mode */}
          <GlassCard className="p-5" hover={false}>
            <label className="text-xs text-textMuted flex items-center gap-1.5 mb-2">
              <Palette className="w-3.5 h-3.5" /> Tone Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TONE_MODES.map((tm) => (
                <button
                  key={tm.value}
                  onClick={() => setToneMode(tm.value)}
                  className={`p-2.5 rounded-lg text-left transition-all border ${
                    toneMode === tm.value
                      ? "bg-brand-purple/10 border-brand-purple/30 text-brand-purple"
                      : "bg-white/[0.02] border-white/[0.06] text-textMuted hover:border-white/[0.12]"
                  }`}
                >
                  <span className="text-xs font-medium">{tm.label}</span>
                  <p className="text-[9px] opacity-60 mt-0.5">{tm.desc}</p>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Company Culture */}
          <GlassCard className="p-5" hover={false}>
            <label className="text-xs text-textMuted mb-2 block">Company Culture Signals</label>
            <div className="flex flex-wrap gap-1.5">
              {CULTURE_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleCulture(c)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border ${
                    cultures.includes(c)
                      ? "bg-brand-green/15 border-brand-green/30 text-brand-green"
                      : "bg-white/[0.03] border-white/[0.06] text-textMuted hover:border-white/[0.12]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Expandable: Skills, Education, Certs */}
      <GlassCard className="p-5" hover={false}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-textMuted flex items-center gap-1.5 mb-1.5">
              <Wrench className="w-3.5 h-3.5" /> Key Skills &amp; Tools
            </label>
            <textarea
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-textPrimary placeholder-textMuted outline-none resize-none focus:border-brand-cyan/30"
              placeholder="Python, React, AWS, Figma..."
            />
          </div>
          <div>
            <label className="text-xs text-textMuted flex items-center gap-1.5 mb-1.5">
              <GraduationCap className="w-3.5 h-3.5" /> Education
            </label>
            <textarea
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-textPrimary placeholder-textMuted outline-none resize-none focus:border-brand-cyan/30"
              placeholder="BS Computer Science, MIT, 2019"
            />
          </div>
          <div>
            <label className="text-xs text-textMuted flex items-center gap-1.5 mb-1.5">
              <Shield className="w-3.5 h-3.5" /> Certifications
            </label>
            <textarea
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-textPrimary placeholder-textMuted outline-none resize-none focus:border-brand-cyan/30"
              placeholder="AWS Solutions Architect, PMP..."
            />
          </div>
        </div>
      </GlassCard>

      {/* Submit */}
      <div className="flex justify-center pt-2">
        <NeonButton onClick={handleSubmit} disabled={!canSubmit} size="lg">
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Running 5-Pass Intelligence...</span>
          ) : (
            <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Activate ARIA Analysis</span>
          )}
        </NeonButton>
      </div>
    </motion.div>
  );
}
