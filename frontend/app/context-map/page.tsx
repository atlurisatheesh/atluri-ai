"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, Target, AlertTriangle, Star, Brain, Loader2, MessageSquare } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { GlassCard, NeonButton } from "@/components/ui";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface ContextMap {
  top_5_strengths: string[];
  top_3_gaps: string[];
  predicted_questions: Array<{
    question: string;
    category: string;
    difficulty: string;
    suggested_framework: string;
  }>;
  star_stories: Array<{
    situation: string;
    task: string;
    action: string;
    result: string;
    applicable_to: string[];
  }>;
  value_proposition: string;
  red_flags: string[];
  company_talking_points: string[];
  interview_strategy: string;
}

export default function ContextMapPage() {
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("Software Engineer");
  const [round, setRound] = useState("Technical");
  const [contextMap, setContextMap] = useState<ContextMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (resumeText.trim().length < 20 || jdText.trim().length < 20) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/intelligence/context-map`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jdText,
          company: company || "General",
          role,
          interview_round: round,
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      setContextMap(await res.json());
    } catch (err: any) {
      setError(err.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-3">
            <Map className="w-6 h-6 text-cyan-400" />
            Pre-Interview Context Map
          </h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Generate an intelligence briefing from your resume + job description. Predicted questions, STAR stories, and strategy.
          </p>
        </div>

        {/* Input Form */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <GlassCard>
            <label className="text-xs text-neutral-500 mb-2 block">Resume</label>
            <textarea
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
              placeholder="Paste your resume text..."
              className="w-full h-40 bg-transparent text-neutral-200 placeholder-neutral-600 resize-none outline-none text-sm leading-relaxed"
            />
          </GlassCard>
          <GlassCard>
            <label className="text-xs text-neutral-500 mb-2 block">Job Description</label>
            <textarea
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder="Paste the job description..."
              className="w-full h-40 bg-transparent text-neutral-200 placeholder-neutral-600 resize-none outline-none text-sm leading-relaxed"
            />
          </GlassCard>
        </div>

        <GlassCard className="mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Company</label>
              <input type="text" value={company} onChange={e => setCompany(e.target.value)}
                placeholder="e.g. Google"
                className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none placeholder-neutral-600" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Role</label>
              <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Senior Software Engineer"
                className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none placeholder-neutral-600" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Interview Round</label>
              <select value={round} onChange={e => setRound(e.target.value)} title="Interview Round"
                className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none">
                <option value="Phone Screen">Phone Screen</option>
                <option value="Technical">Technical</option>
                <option value="Behavioral">Behavioral</option>
                <option value="System Design">System Design</option>
                <option value="Hiring Manager">Hiring Manager</option>
                <option value="Final Round">Final Round</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <NeonButton onClick={handleGenerate} disabled={loading || resumeText.trim().length < 20 || jdText.trim().length < 20}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                </span>
              ) : "Generate Briefing"}
            </NeonButton>
          </div>
        </GlassCard>

        {error && (
          <div className="text-red-400 text-sm mb-4 px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/20">{error}</div>
        )}

        <AnimatePresence>
          {contextMap && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Value Proposition */}
              <GlassCard>
                <h2 className="text-sm font-medium text-cyan-400 mb-2">Your Value Proposition</h2>
                <p className="text-neutral-200 text-sm leading-relaxed">{contextMap.value_proposition}</p>
              </GlassCard>

              {/* Strategy */}
              <GlassCard>
                <h2 className="text-sm font-medium text-purple-400 mb-2">Interview Strategy</h2>
                <p className="text-neutral-300 text-sm leading-relaxed">{contextMap.interview_strategy}</p>
              </GlassCard>

              {/* Strengths & Gaps */}
              <div className="grid grid-cols-2 gap-4">
                <GlassCard>
                  <h3 className="text-sm font-medium text-green-400 flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4" />
                    Top 5 Strengths
                  </h3>
                  <ul className="space-y-1.5">
                    {contextMap.top_5_strengths.map((s, i) => (
                      <li key={i} className="text-xs text-neutral-300 flex items-start gap-2">
                        <span className="text-green-400">{i + 1}.</span> {s}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
                <GlassCard>
                  <h3 className="text-sm font-medium text-amber-400 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    Top 3 Gaps
                  </h3>
                  <ul className="space-y-1.5">
                    {contextMap.top_3_gaps.map((g, i) => (
                      <li key={i} className="text-xs text-neutral-300 flex items-start gap-2">
                        <span className="text-amber-400">{i + 1}.</span> {g}
                      </li>
                    ))}
                  </ul>
                  {contextMap.red_flags.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-neutral-800/30">
                      <p className="text-xs text-red-400/80 mb-1">Red Flags to Address</p>
                      {contextMap.red_flags.map((r, i) => (
                        <p key={i} className="text-xs text-neutral-500">• {r}</p>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </div>

              {/* Predicted Questions */}
              <GlassCard>
                <h3 className="text-sm font-medium text-neutral-300 flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  Predicted Questions ({contextMap.predicted_questions.length})
                </h3>
                <div className="space-y-3">
                  {contextMap.predicted_questions.map((q, i) => (
                    <div key={i} className="bg-neutral-800/20 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300">{q.category}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          q.difficulty === "hard" ? "bg-red-500/10 text-red-300" :
                          q.difficulty === "medium" ? "bg-amber-500/10 text-amber-300" :
                          "bg-green-500/10 text-green-300"
                        }`}>{q.difficulty}</span>
                        <span className="text-xs text-neutral-500">→ {q.suggested_framework}</span>
                      </div>
                      <p className="text-sm text-neutral-200">{q.question}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* STAR Stories */}
              <GlassCard>
                <h3 className="text-sm font-medium text-neutral-300 flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4 text-purple-400" />
                  Prepared STAR Stories
                </h3>
                <div className="space-y-4">
                  {contextMap.star_stories.map((story, i) => (
                    <div key={i} className="bg-neutral-800/20 rounded-lg px-4 py-3">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {story.applicable_to.map((tag, j) => (
                          <span key={j} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div><span className="text-neutral-500">S:</span> <span className="text-neutral-300">{story.situation}</span></div>
                        <div><span className="text-neutral-500">T:</span> <span className="text-neutral-300">{story.task}</span></div>
                        <div><span className="text-neutral-500">A:</span> <span className="text-neutral-300">{story.action}</span></div>
                        <div><span className="text-neutral-500">R:</span> <span className="text-neutral-300">{story.result}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Company Talking Points */}
              {contextMap.company_talking_points.length > 0 && (
                <GlassCard>
                  <h3 className="text-sm font-medium text-neutral-300 mb-3">Company Talking Points</h3>
                  <ul className="space-y-1.5">
                    {contextMap.company_talking_points.map((p, i) => (
                      <li key={i} className="text-xs text-neutral-400 flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">→</span> {p}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
