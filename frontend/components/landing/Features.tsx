"use client";

import { motion } from "framer-motion";
import { Brain, Shield, Mic, Building2, BarChart3, Zap } from "lucide-react";
import GlassCard from "../ui/GlassCard";

const features = [
  {
    icon: Brain,
    title: "AI Answer Engine",
    description: "GPT-4o generates perfect responses in real-time, tailored to the exact question being asked.",
    gradient: "from-brand-cyan to-blue-500",
  },
  {
    icon: Shield,
    title: "Stealth Mode",
    description: "100% undetectable. Runs silently in the background — no screen-share footprint, no detection risk.",
    gradient: "from-brand-purple to-pink-500",
  },
  {
    icon: Mic,
    title: "Real-Time Transcription",
    description: "Whisper-powered audio capture transcribes interviewer questions instantly with sub-second latency.",
    gradient: "from-brand-green to-emerald-400",
  },
  {
    icon: Building2,
    title: "35+ Company Modes",
    description: "FAANG, Big-4, startups — each mode mimics the company's real interview style and evaluation rubric.",
    gradient: "from-brand-amber to-yellow-400",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Track your improvement across sessions with detailed scoring, pacing analysis, and skill-gap reports.",
    gradient: "from-brand-orange to-red-400",
  },
  {
    icon: Zap,
    title: "Instant Coaching",
    description: "Live feedback as you speak — get coached on tone, structure, and content without pausing.",
    gradient: "from-teal-400 to-brand-cyan",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function Features() {
  return (
    <section id="features" className="section-padding bg-transparent">
      <div className="max-w-7xl mx-auto px-6">
        {/* heading */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <span className="text-brand-cyan text-sm font-semibold tracking-wider uppercase">Features</span>
          <h2 className="text-3xl md:text-4xl font-bold text-textPrimary mt-2 mb-4">Everything You Need to Ace Any Interview</h2>
          <p className="text-textSecondary max-w-2xl mx-auto">Six pillars that transform nervous candidates into confident closers.</p>
        </motion.div>

        {/* grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={cardVariants}>
              <GlassCard hover className="h-full p-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-textPrimary mb-2">{f.title}</h3>
                <p className="text-sm text-textSecondary leading-relaxed">{f.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
