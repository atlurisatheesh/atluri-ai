"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, ArrowRight, ArrowLeft, Play, CheckCircle, XCircle,
  BarChart2, Clock, MessageSquare, Brain, Shield, Mic, Timer,
  Award, TrendingUp, Zap,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { GlassCard, NeonButton, StatusBadge } from "@/components/ui";

/* ── Constants ──────────────────────────────────────────── */
const INTERVIEW_TYPES = [
  { id: "technical", label: "Technical", icon: <Brain className="w-5 h-5" />, desc: "Algorithms, data structures, system design" },
  { id: "behavioral", label: "Behavioral", icon: <MessageSquare className="w-5 h-5" />, desc: "STAR method, leadership, conflict" },
  { id: "system_design", label: "System Design", icon: <Target className="w-5 h-5" />, desc: "Architecture, scalability, trade-offs" },
];

const COMPANIES = ["Google", "Amazon", "Meta", "Microsoft", "Apple", "Netflix", "Uber", "Airbnb", "Stripe", "Any"];

const DIMENSIONS = [
  { key: "overall", label: "Overall", color: "brand-cyan" },
  { key: "communication", label: "Communication", color: "brand-purple" },
  { key: "technical", label: "Technical Depth", color: "brand-green" },
  { key: "problem_solving", label: "Problem Solving", color: "brand-amber" },
  { key: "confidence", label: "Confidence", color: "brand-orange" },
  { key: "time_management", label: "Time Mgmt", color: "brand-red" },
];

const MOCK_QUESTIONS = [
  { q: "Tell me about a time you had to lead a team through a difficult situation.", time: 120 },
  { q: "How would you design a rate limiter for an API gateway?", time: 300 },
  { q: "What is your greatest weakness, and what are you doing about it?", time: 120 },
];

function ProgressRing({ value, size = 72, stroke = 5, color = "brand-cyan" }: { value: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`var(--${color})`} strokeWidth={stroke} strokeDasharray={c} strokeLinecap="round"
        initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </svg>
  );
}

export default function MockPage() {
  const [step, setStep] = useState<"type" | "company" | "config" | "live" | "report">("type");
  const [interviewType, setInterviewType] = useState("technical");
  const [company, setCompany] = useState("Any");
  const [duration, setDuration] = useState(30);
  const [currentQ, setCurrentQ] = useState(0);

  const mockScores = { overall: 82, communication: 78, technical: 88, problem_solving: 85, confidence: 72, time_management: 90 };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-textPrimary">SimuDrill™ — AI Mock Interview</h1>
            <p className="text-xs text-textMuted">Practice with AI-powered interviewers calibrated to real company standards</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-textMuted">
          {["Type", "Company", "Config", "Interview", "Report"].map((s, i) => {
            const stepKeys = ["type", "company", "config", "live", "report"];
            const idx = stepKeys.indexOf(step);
            return (
              <div key={s} className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i <= idx ? "bg-brand-cyan text-white" : "bg-white/5 text-textMuted"}`}>{i + 1}</span>
                <span className={i <= idx ? "text-textPrimary" : ""}>{s}</span>
                {i < 4 && <ArrowRight className="w-3 h-3 text-textMuted/40" />}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Type */}
          {step === "type" && (
            <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {INTERVIEW_TYPES.map((t) => (
                <GlassCard key={t.id} onClick={() => setInterviewType(t.id)} className={`p-5 cursor-pointer transition-all hover:scale-[1.02] ${interviewType === t.id ? "ring-1 ring-brand-cyan" : ""}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${interviewType === t.id ? "bg-brand-cyan/20 text-brand-cyan" : "bg-white/5 text-textMuted"}`}>
                    {t.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-textPrimary">{t.label}</h3>
                  <p className="text-xs text-textMuted mt-1">{t.desc}</p>
                </GlassCard>
              ))}
              <div className="col-span-full flex justify-end">
                <NeonButton onClick={() => setStep("company")}>Next <ArrowRight className="w-4 h-4 ml-1" /></NeonButton>
              </div>
            </motion.div>
          )}

          {/* Step 2: Company */}
          {step === "company" && (
            <motion.div key="company" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <GlassCard className="p-6">
                <h2 className="text-sm font-semibold text-textPrimary mb-4">Target Company</h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {COMPANIES.map((c) => (
                    <button key={c} onClick={() => setCompany(c)} className={`px-4 py-2.5 rounded-lg text-sm transition ${company === c ? "bg-brand-cyan/20 text-brand-cyan ring-1 ring-brand-cyan/30" : "bg-white/5 text-textSecondary hover:bg-white/10"}`}>{c}</button>
                  ))}
                </div>
                <div className="flex justify-between mt-6">
                  <button onClick={() => setStep("type")} className="flex items-center gap-1 text-sm text-textMuted hover:text-textPrimary transition"><ArrowLeft className="w-4 h-4" /> Back</button>
                  <NeonButton onClick={() => setStep("config")}>Next <ArrowRight className="w-4 h-4 ml-1" /></NeonButton>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Step 3: Config */}
          {step === "config" && (
            <motion.div key="config" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <GlassCard className="p-6">
                <h2 className="text-sm font-semibold text-textPrimary mb-4">Session Configuration</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-textMuted">Duration (minutes)</label>
                    <div className="flex gap-2 mt-2">
                      {[15, 30, 45, 60].map((d) => (
                        <button key={d} onClick={() => setDuration(d)} className={`px-4 py-2 rounded-lg text-sm ${duration === d ? "bg-brand-cyan/20 text-brand-cyan ring-1 ring-brand-cyan/30" : "bg-white/5 text-textSecondary hover:bg-white/10"}`}>{d}m</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-textMuted">
                    <span>Type: <span className="text-textPrimary font-medium capitalize">{interviewType.replace("_", " ")}</span></span>
                    <span>Company: <span className="text-textPrimary font-medium">{company}</span></span>
                    <span>Duration: <span className="text-textPrimary font-medium">{duration}m</span></span>
                  </div>
                </div>
                <div className="flex justify-between mt-6">
                  <button onClick={() => setStep("company")} className="flex items-center gap-1 text-sm text-textMuted hover:text-textPrimary transition"><ArrowLeft className="w-4 h-4" /> Back</button>
                  <NeonButton onClick={() => setStep("live")}><Play className="w-4 h-4 mr-1" /> Start Interview</NeonButton>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Step 4: Live Interview */}
          {step === "live" && (
            <motion.div key="live" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                    <span className="text-xs text-textMuted">Question {currentQ + 1} of {MOCK_QUESTIONS.length}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-textMuted">
                    <Timer className="w-3.5 h-3.5" /> {Math.floor(MOCK_QUESTIONS[currentQ].time / 60)}:{String(MOCK_QUESTIONS[currentQ].time % 60).padStart(2, "0")}
                  </div>
                </div>
                <p className="text-lg text-textPrimary font-medium mb-6">{MOCK_QUESTIONS[currentQ].q}</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-brand-cyan/10 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-brand-cyan" />
                  </div>
                  <div className="flex-1 h-1.5 rounded bg-white/5 overflow-hidden">
                    <motion.div className="h-full bg-brand-cyan/60 rounded" animate={{ width: ["0%", "60%", "30%", "80%", "45%"] }} transition={{ repeat: Infinity, duration: 3 }} />
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] min-h-[120px]">
                  <p className="text-sm text-textSecondary italic">Your answer will appear here as you speak...</p>
                </div>
              </GlassCard>
              <div className="flex justify-between">
                <button onClick={() => currentQ > 0 && setCurrentQ(currentQ - 1)} className="flex items-center gap-1 text-sm text-textMuted hover:text-textPrimary transition"><ArrowLeft className="w-4 h-4" /> Previous</button>
                {currentQ < MOCK_QUESTIONS.length - 1 ? (
                  <NeonButton onClick={() => setCurrentQ(currentQ + 1)}>Next Question <ArrowRight className="w-4 h-4 ml-1" /></NeonButton>
                ) : (
                  <NeonButton onClick={() => setStep("report")}><Award className="w-4 h-4 mr-1" /> Finish & View Report</NeonButton>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 5: Report */}
          {step === "report" && (
            <motion.div key="report" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              {/* Score overview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {DIMENSIONS.map((d) => (
                  <GlassCard key={d.key} className="p-4 flex flex-col items-center">
                    <div className="relative">
                      <ProgressRing value={mockScores[d.key as keyof typeof mockScores]} color={d.color} />
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-textPrimary">{mockScores[d.key as keyof typeof mockScores]}</span>
                    </div>
                    <span className="text-[10px] text-textMuted mt-2 text-center">{d.label}</span>
                  </GlassCard>
                ))}
              </div>

              {/* Detailed feedback */}
              <GlassCard className="p-6 space-y-4">
                <h2 className="text-sm font-semibold text-textPrimary flex items-center gap-2"><BarChart2 className="w-4 h-4 text-brand-cyan" /> Detailed Feedback</h2>
                {[
                  { title: "Strengths", icon: <CheckCircle className="w-4 h-4 text-brand-green" />, items: ["Clear problem decomposition", "Good use of examples to illustrate points", "Strong technical vocabulary"] },
                  { title: "Areas for Improvement", icon: <TrendingUp className="w-4 h-4 text-brand-amber" />, items: ["Practice STAR method for behavioral questions", "Mention trade-offs when discussing design choices", "Improve time management — spent too long on Q2"] },
                  { title: "Key Recommendations", icon: <Zap className="w-4 h-4 text-brand-purple" />, items: ["Run 2 more mock sessions this week focusing on system design", "Review common behavioral questions for " + company, "Practice thinking out loud — silence gaps were 5s+"] },
                ].map((section) => (
                  <div key={section.title}>
                    <p className="text-xs font-semibold text-textPrimary flex items-center gap-1.5 mb-2">{section.icon} {section.title}</p>
                    <ul className="space-y-1.5">
                      {section.items.map((item, i) => (
                        <li key={i} className="text-sm text-textSecondary flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-textMuted flex-shrink-0 mt-2" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </GlassCard>

              <div className="flex justify-center gap-3">
                <NeonButton onClick={() => { setStep("type"); setCurrentQ(0); }}>
                  <Play className="w-4 h-4 mr-1" /> New Interview
                </NeonButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
