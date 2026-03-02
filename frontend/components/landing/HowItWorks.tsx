"use client";

import { motion } from "framer-motion";
import { Mic, Brain, MessageSquareText } from "lucide-react";
import GlassCard from "../ui/GlassCard";

const steps = [
  {
    icon: Mic,
    number: "01",
    title: "Listen & Capture",
    description: "Our real-time audio engine picks up the interviewer's voice and transcribes every question with Whisper-level accuracy.",
  },
  {
    icon: Brain,
    number: "02",
    title: "AI Generates Answers",
    description: "GPT-4o instantly drafts a structured STAR-format response, calibrated to the company mode and role.",
  },
  {
    icon: MessageSquareText,
    number: "03",
    title: "You Deliver & Shine",
    description: "Answers appear silently on a stealth overlay. You glance, deliver confidently, and close the interview.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section-padding bg-transparent">
      <div className="max-w-5xl mx-auto px-6">
        {/* heading */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <span className="text-brand-purple text-sm font-semibold tracking-wider uppercase">How It Works</span>
          <h2 className="text-3xl md:text-4xl font-bold text-textPrimary mt-2 mb-4">Three Steps to Interview Mastery</h2>
          <p className="text-textSecondary max-w-xl mx-auto">From audio capture to perfect delivery — it all happens in seconds.</p>
        </motion.div>

        {/* steps with connecting line */}
        <div className="relative">
          {/* gradient connector line (desktop) */}
          <div className="hidden md:block absolute top-24 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-green opacity-30" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="relative flex flex-col items-center text-center"
              >
                {/* circle with number */}
                <div className="relative z-10 mb-6">
                  <div className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                    <step.icon className="w-8 h-8 text-brand-cyan" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-brand-cyan to-brand-purple text-white text-xs font-bold flex items-center justify-center">
                    {step.number}
                  </span>
                </div>

                <GlassCard className="p-5 w-full">
                  <h3 className="text-lg font-semibold text-textPrimary mb-2">{step.title}</h3>
                  <p className="text-sm text-textSecondary leading-relaxed">{step.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
