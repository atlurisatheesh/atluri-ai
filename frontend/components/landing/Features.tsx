"use client";

import { motion } from "framer-motion";
import { Brain, Shield, Mic, Building2, BarChart3, Zap } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Answer Engine",
    description: "GPT-4o generates perfect responses in real-time, tailored to the exact question being asked.",
    color: "brand-cyan",
    border: "border-brand-cyan/20",
    bg: "bg-brand-cyan/5",
    glow: "shadow-brand-cyan/10",
    tag: "CORE",
  },
  {
    icon: Shield,
    title: "Stealth Mode",
    description: "100% undetectable. Runs silently in the background — no screen-share footprint, no detection risk.",
    color: "brand-green",
    border: "border-brand-green/20",
    bg: "bg-brand-green/5",
    glow: "shadow-brand-green/10",
    tag: "CRITICAL",
  },
  {
    icon: Mic,
    title: "Real-Time Transcription",
    description: "Whisper-powered audio capture transcribes interviewer questions instantly with sub-second latency.",
    color: "brand-purple",
    border: "border-brand-purple/20",
    bg: "bg-brand-purple/5",
    glow: "shadow-brand-purple/10",
    tag: "LIVE",
  },
  {
    icon: Building2,
    title: "35+ Company Modes",
    description: "FAANG, Big-4, startups — each mode mimics the company's real interview style and evaluation rubric.",
    color: "brand-amber",
    border: "border-brand-amber/20",
    bg: "bg-brand-amber/5",
    glow: "shadow-brand-amber/10",
    tag: "INTEL",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Track your improvement across sessions with detailed scoring, pacing analysis, and skill-gap reports.",
    color: "brand-cyan",
    border: "border-brand-cyan/20",
    bg: "bg-brand-cyan/5",
    glow: "shadow-brand-cyan/10",
    tag: "SIGNAL",
  },
  {
    icon: Zap,
    title: "Instant Coaching",
    description: "Live feedback as you speak — get coached on tone, structure, and content without pausing.",
    color: "brand-green",
    border: "border-brand-green/20",
    bg: "bg-brand-green/5",
    glow: "shadow-brand-green/10",
    tag: "REAL-TIME",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function Features() {
  return (
    <section id="features" className="section-padding bg-transparent">
      <div className="max-w-7xl mx-auto px-6">
        {/* heading */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-cyan/25 bg-brand-cyan/5 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
            <span className="text-[10px] text-brand-cyan font-bold tracking-[0.18em] uppercase">Capability Matrix</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-textPrimary mb-4 max-w-2xl leading-tight">
            Six Pillars.<br />
            <span className="bg-gradient-to-r from-brand-cyan to-brand-purple bg-clip-text text-transparent">Operator-Grade Execution.</span>
          </h2>
          <p className="text-textSecondary max-w-xl leading-relaxed">Every component engineered for high-stakes performance. No generic prep scripts.</p>
        </motion.div>

        {/* grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={cardVariants}>
              <div className={`h-full p-5 rounded-xl border ${f.border} ${f.bg} backdrop-blur-sm hover:shadow-lg ${f.glow} transition-all duration-300 group relative overflow-hidden`}>
                {/* grid texture */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                <div className="relative">
                  {/* header row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-lg border ${f.border} ${f.bg} flex items-center justify-center`}>
                      <f.icon className={`w-5 h-5 text-${f.color}`} />
                    </div>
                    <span className={`text-[9px] font-bold tracking-[0.15em] text-${f.color} px-2 py-0.5 rounded-full border ${f.border} ${f.bg}`}>
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-textPrimary mb-2">{f.title}</h3>
                  <p className="text-sm text-textSecondary leading-relaxed">{f.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
