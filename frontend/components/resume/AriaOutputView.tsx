"use client";

import { motion } from "framer-motion";
import {
  FileText, Award, Target, Brain, Zap, Download, Copy,
  CheckCircle, User, Briefcase, GraduationCap, Wrench, Mail,
} from "lucide-react";
import { GlassCard, NeonButton, StatusBadge } from "@/components/ui";
import AriaScoreDashboard from "./AriaScoreDashboard";
import AriaKeywordPanel from "./AriaKeywordPanel";
import AriaGapBrief from "./AriaGapBrief";
import AriaPrecisionEdits from "./AriaPrecisionEdits";
import type { AriaScoreCard, AriaKeywordMatrix, AriaGenerateResult } from "@/lib/services";
import { useState } from "react";

/* ── Tab definition ────────────────────────────────────── */
const TABS = [
  { id: "resume", label: "Generated Resume", icon: FileText },
  { id: "score", label: "Score Card", icon: Award },
  { id: "keywords", label: "Keywords", icon: Target },
  { id: "gaps", label: "Gap Brief", icon: Brain },
  { id: "edits", label: "Precision Edits", icon: Zap },
] as const;

type TabId = typeof TABS[number]["id"];

/* ── Section renderers for the generated resume ────────── */
function ResumeSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="text-xs font-semibold text-textPrimary flex items-center gap-1.5 mb-2 uppercase tracking-wider">
        {icon} {title}
      </h4>
      {children}
    </div>
  );
}

function ResumeBullet({ text }: { text: string }) {
  return (
    <li className="text-xs text-textSecondary leading-relaxed flex items-start gap-1.5">
      <span className="text-brand-cyan mt-1">•</span>
      <span>{text}</span>
    </li>
  );
}

/* ── Main 5-block output view ──────────────────────────── */
interface Props {
  result: AriaGenerateResult;
  onRegenerate?: () => void;
}

export default function AriaOutputView({ result, onRegenerate }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("resume");
  const [copied, setCopied] = useState(false);

  const resume = result.resume as Record<string, unknown>;
  const headline = (resume.headline as string) || "";
  const summary = (resume.summary as string) || "";
  const contact = (resume.contact_info as Record<string, string>) || {};
  const experience = (resume.experience as Array<Record<string, unknown>>) || [];
  const educationArr = (resume.education as Array<Record<string, string>>) || [];
  const skillsArr = (resume.skills as string[]) || [];
  const certsArr = (resume.certifications as string[]) || [];
  const personalitySections = (resume.personality_sections as Record<string, string>) || {};

  const handleCopy = async () => {
    const text = JSON.stringify(result.resume, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5"
    >
      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/20"
                  : "text-textMuted hover:text-textSecondary"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
        <div className="flex-1" />
        <div className="flex items-center gap-2 pr-2">
          <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-textMuted hover:text-textPrimary transition border border-white/[0.06]">
            {copied ? <><CheckCircle className="w-3 h-3 text-brand-green" /> Copied</> : <><Copy className="w-3 h-3" /> Copy JSON</>}
          </button>
          <button className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-textMuted hover:text-textPrimary transition border border-white/[0.06]">
            <Download className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "resume" && (
        <motion.div key="resume" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <GlassCard className="p-6" hover={false}>
            {/* Status header */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-lg font-bold text-textPrimary">{headline || "ARIA-Generated Resume"}</h2>
                {contact.email && (
                  <p className="text-xs text-textMuted mt-0.5">
                    {[contact.email, contact.phone, contact.linkedin].filter(Boolean).join(" • ")}
                  </p>
                )}
              </div>
              <StatusBadge variant="green">
                <Award className="w-3 h-3" /> Grade {result.score_card.grade}
              </StatusBadge>
            </div>

            {/* Summary */}
            {summary && (
              <ResumeSection title="Professional Summary" icon={<User className="w-3.5 h-3.5 text-brand-cyan" />}>
                <p className="text-sm text-textSecondary leading-relaxed">{summary}</p>
              </ResumeSection>
            )}

            {/* Experience */}
            {experience.length > 0 && (
              <ResumeSection title="Experience" icon={<Briefcase className="w-3.5 h-3.5 text-brand-purple" />}>
                <div className="space-y-4">
                  {experience.map((exp, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-textPrimary">
                          {(exp.title as string) || ""} — {(exp.company as string) || ""}
                        </span>
                        <span className="text-[10px] text-textMuted">{(exp.dates as string) || ""}</span>
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {((exp.bullets as string[]) || []).map((b, j) => <ResumeBullet key={j} text={b} />)}
                      </ul>
                    </div>
                  ))}
                </div>
              </ResumeSection>
            )}

            {/* Education */}
            {educationArr.length > 0 && (
              <ResumeSection title="Education" icon={<GraduationCap className="w-3.5 h-3.5 text-brand-green" />}>
                <div className="space-y-2">
                  {educationArr.map((edu, i) => (
                    <div key={i} className="text-xs text-textSecondary">
                      <span className="font-medium text-textPrimary">{edu.degree || edu.school}</span>
                      {edu.school && edu.degree && <> — {edu.school}</>}
                      {edu.year && <span className="text-textMuted ml-2">{edu.year}</span>}
                    </div>
                  ))}
                </div>
              </ResumeSection>
            )}

            {/* Skills */}
            {skillsArr.length > 0 && (
              <ResumeSection title="Skills" icon={<Wrench className="w-3.5 h-3.5 text-brand-amber" />}>
                <div className="flex flex-wrap gap-1.5">
                  {skillsArr.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-[10px] bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/15 font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              </ResumeSection>
            )}

            {/* Certifications */}
            {certsArr.length > 0 && (
              <ResumeSection title="Certifications" icon={<Award className="w-3.5 h-3.5 text-brand-amber" />}>
                <div className="space-y-1">
                  {certsArr.map((c, i) => (
                    <div key={i} className="text-xs text-textSecondary flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-brand-green" /> {c}
                    </div>
                  ))}
                </div>
              </ResumeSection>
            )}

            {/* Personality sections */}
            {Object.keys(personalitySections).length > 0 && (
              Object.entries(personalitySections).map(([key, val]) => (
                <ResumeSection
                  key={key}
                  title={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  icon={<Mail className="w-3.5 h-3.5 text-brand-purple" />}
                >
                  <p className="text-xs text-textSecondary leading-relaxed">{val}</p>
                </ResumeSection>
              ))
            )}
          </GlassCard>
        </motion.div>
      )}

      {activeTab === "score" && (
        <motion.div key="score" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AriaScoreDashboard scoreCard={result.score_card} onRescan={onRegenerate} />
        </motion.div>
      )}

      {activeTab === "keywords" && (
        <motion.div key="keywords" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AriaKeywordPanel data={result.keyword_matrix} />
        </motion.div>
      )}

      {activeTab === "gaps" && (
        <motion.div key="gaps" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AriaGapBrief data={result.gap_brief as unknown as Parameters<typeof AriaGapBrief>[0]["data"]} />
        </motion.div>
      )}

      {activeTab === "edits" && (
        <motion.div key="edits" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AriaPrecisionEdits edits={result.precision_edits} />
        </motion.div>
      )}

      {/* Bottom actions */}
      <div className="flex justify-center gap-3 pt-2">
        {onRegenerate && (
          <NeonButton onClick={onRegenerate} variant="secondary" size="sm">
            Regenerate with Different Tone
          </NeonButton>
        )}
      </div>
    </motion.div>
  );
}
