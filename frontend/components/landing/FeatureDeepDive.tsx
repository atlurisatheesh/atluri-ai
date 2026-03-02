"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Code2, Target, FileText, Users, Shield, Cpu, Database, ChevronRight } from "lucide-react";

const FEATURES = [
  {
    id: "copilot", icon: <Brain className="w-5 h-5" />, label: "NeuralWhisper™",
    title: "Live AI Copilot",
    desc: "Real-time speech-to-text with Deepgram/Whisper + GPT-4o structured responses. Detects interview questions, generates STAR answers, and provides key talking points — all in under 2 seconds.",
    highlights: ["Sub-2s latency", "STAR answer generation", "Confidence scoring", "Stealth-compatible overlay"],
  },
  {
    id: "coding", icon: <Code2 className="w-5 h-5" />, label: "CodeForge™",
    title: "AI Coding Lab",
    desc: "Practice coding interviews with real company questions. The AI analyzes your approach, detects patterns (sliding window, DP, graphs), and coaches you on communication — just like a real senior interviewer.",
    highlights: ["Pattern detection", "5-tab AI assistant", "Company-tagged problems", "Runtime & memory stats"],
  },
  {
    id: "mock", icon: <Target className="w-5 h-5" />, label: "SimuDrill™",
    title: "Mock Interviews",
    desc: "AI-generated interviews calibrated to specific companies. Get scored on 6 dimensions: communication, technical depth, problem-solving, confidence, and time management. Detailed feedback after every session.",
    highlights: ["Company-calibrated", "6-dimension scoring", "Detailed feedback", "Session history"],
  },
  {
    id: "resume", icon: <FileText className="w-5 h-5" />, label: "ProfileCraft™",
    title: "Resume Lab",
    desc: "Upload your resume for instant ATS compatibility analysis. AI rewrites weak bullets with action verbs and quantified impact. Choose from 8+ professionally designed templates optimized for ATS scanners.",
    highlights: ["ATS scoring engine", "AI bullet rewrites", "JD keyword matching", "8+ templates"],
  },
  {
    id: "duo", icon: <Users className="w-5 h-5" />, label: "MentorLink™",
    title: "Duo Mode",
    desc: "Invite a friend or mentor to join your live interview session. They see the real-time transcript and can send discreet hints — like having a subject expert whispering in your ear.",
    highlights: ["6-digit session codes", "Real-time transcript sharing", "Quick hint templates", "Role-based views"],
  },
  {
    id: "stealth", icon: <Shield className="w-5 h-5" />, label: "PhantomVeil™",
    title: "Stealth Mode",
    desc: "Configure overlay transparency, position, keyboard shortcuts, and anti-detection measures. Quick profiles let you switch between maximum stealth, balanced, and training modes in one click.",
    highlights: ["Adjustable transparency", "Screen share detection", "Tab blur auto-hide", "Quick profiles"],
  },
  {
    id: "documents", icon: <Database className="w-5 h-5" />, label: "DocuMind™",
    title: "Knowledge Base",
    desc: "Upload company research, job descriptions, and study notes. Documents are chunked, embedded, and indexed in a vector store for intelligent retrieval during live interviews.",
    highlights: ["RAG pipeline", "Smart chunking", "Vector embeddings", "Toggle per-doc"],
  },
];

export default function FeatureDeepDive() {
  const [active, setActive] = useState("copilot");
  const feature = FEATURES.find((f) => f.id === active)!;

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <span className="text-xs font-mono text-brand-purple tracking-widest uppercase">Deep Dive</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-3">7 AI Engines. One Platform.</h2>
          <p className="text-textMuted mt-3 max-w-lg mx-auto">Click any feature to explore what makes it best-in-class.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left tabs */}
          <div className="lg:col-span-4 space-y-2">
            {FEATURES.map((f) => (
              <button key={f.id} onClick={() => setActive(f.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${active === f.id ? "bg-white/[0.06] border border-white/[0.1]" : "hover:bg-white/[0.03]"}`}>
                <div className={`w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center ${active === f.id ? "bg-brand-cyan/20 text-brand-cyan" : "bg-white/5 text-textMuted"}`}>{f.icon}</div>
                <div>
                  <p className={`text-sm font-medium ${active === f.id ? "text-white" : "text-textSecondary"}`}>{f.label}</p>
                  <p className="text-[10px] text-textMuted">{f.title}</p>
                </div>
                {active === f.id && <ChevronRight className="w-4 h-4 text-brand-cyan ml-auto" />}
              </button>
            ))}
          </div>

          {/* Right detail */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">{feature.icon}</div>
                  <div>
                    <p className="text-xs text-brand-cyan font-mono">{feature.label}</p>
                    <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-textSecondary leading-relaxed mb-6">{feature.desc}</p>
                <div className="grid grid-cols-2 gap-3">
                  {feature.highlights.map((h) => (
                    <div key={h} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03]">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                      <span className="text-sm text-textPrimary">{h}</span>
                    </div>
                  ))}
                </div>
                {/* Mock UI preview */}
                <div className="mt-6 rounded-xl bg-black/30 border border-white/[0.06] p-6 flex items-center justify-center min-h-[160px]">
                  <p className="text-xs text-textMuted">Interactive {feature.label} preview</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
