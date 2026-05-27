"use client";

import { motion } from "framer-motion";
import { Sparkles, Code2, Brain, Database, LayoutTemplate, BarChart3 } from "lucide-react";
import GlassCard from "../ui/GlassCard";

const features = [
  {
    title: "Signal Copilot",
    description: "Dual-model routing with intent-aware architecture to ace any technical interview.",
    icon: <Brain className="w-6 h-6 text-brand-purple" />,
    badge: "Undetectable",
    colSpan: "col-span-1 md:col-span-2",
    glow: "shadow-neon-purple",
    bg: "bg-gradient-to-br from-brand-purple/10 to-transparent",
    mockup: (
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex justify-between items-center bg-white/[0.03] p-3 rounded-lg border border-white/[0.05]">
          <span className="text-xs font-semibold text-textSecondary">Company: Google</span>
          <span className="text-xs text-brand-purple bg-brand-purple/20 px-2 py-0.5 rounded-full">Active</span>
        </div>
        <div className="bg-black/40 rounded-lg p-4 border border-white/[0.05]">
          <div className="flex gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-white/[0.1] text-textMuted">Dual-Model</span>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-brand-cyan/20 text-brand-cyan">GPT-4o</span>
          </div>
          <div className="h-2 w-3/4 bg-white/[0.1] rounded mb-2"></div>
          <div className="h-2 w-1/2 bg-white/[0.1] rounded"></div>
        </div>
      </div>
    )
  },
  {
    title: "CodeForge™",
    description: "AI Coding Lab with real-time complexity analysis and approach trees.",
    icon: <Code2 className="w-6 h-6 text-brand-cyan" />,
    badge: "Interactive",
    colSpan: "col-span-1 md:col-span-1",
    glow: "shadow-neon",
    bg: "bg-gradient-to-bl from-brand-cyan/10 to-transparent",
    mockup: (
      <div className="mt-6 h-full border border-brand-cyan/20 bg-[#0d0d12] rounded-lg p-4 relative overflow-hidden">
        <div className="text-[10px] text-brand-cyan font-mono mb-2">def solve(s: str):</div>
        <div className="h-1.5 w-full bg-white/[0.1] rounded mb-1.5"></div>
        <div className="h-1.5 w-5/6 bg-white/[0.1] rounded mb-1.5 ml-4"></div>
        <div className="h-1.5 w-4/6 bg-white/[0.1] rounded ml-4"></div>
        <div className="absolute bottom-4 right-4 bg-brand-green/20 text-brand-green text-[10px] px-2 py-1 rounded font-bold">O(n) Time</div>
      </div>
    )
  },
  {
    title: "DocuMind™ RAG",
    description: "Upload resumes, JDs, and study notes for instant context integration.",
    icon: <Database className="w-6 h-6 text-brand-amber" />,
    badge: "Knowledge Base",
    colSpan: "col-span-1 md:col-span-1",
    glow: "hover:shadow-[0_0_30px_rgba(255,184,0,0.15)]",
    bg: "bg-gradient-to-br from-brand-amber/10 to-transparent",
    mockup: (
      <div className="mt-6 flex flex-col gap-2">
         {[1, 2, 3].map((i) => (
           <div key={i} className="flex items-center gap-3 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.05]">
             <div className="w-6 h-8 bg-brand-amber/20 rounded flex items-center justify-center">
               <span className="text-[8px] text-brand-amber font-bold">PDF</span>
             </div>
             <div className="flex-1">
               <div className="h-1.5 w-20 bg-white/[0.2] rounded mb-1"></div>
               <div className="h-1 w-12 bg-white/[0.1] rounded"></div>
             </div>
             <div className="w-2 h-2 rounded-full bg-brand-green"></div>
           </div>
         ))}
      </div>
    )
  },
  {
    title: "Question Bank",
    description: "Curated technical and behavioral questions categorized by company.",
    icon: <LayoutTemplate className="w-6 h-6 text-brand-orange" />,
    badge: null,
    colSpan: "col-span-1 md:col-span-1",
    glow: "hover:shadow-[0_0_30px_rgba(255,107,53,0.15)]",
    bg: "bg-gradient-to-t from-brand-orange/5 to-transparent",
    mockup: (
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-white/[0.05] rounded-full text-[10px] text-white border border-white/[0.1]">Arrays</span>
          <span className="px-3 py-1 bg-white/[0.05] rounded-full text-[10px] text-white border border-white/[0.1]">Trees</span>
        </div>
        <div className="bg-white/[0.02] p-3 rounded-lg border border-white/[0.05]">
          <div className="flex justify-between items-start mb-2">
            <div className="h-2 w-32 bg-white/[0.2] rounded"></div>
            <span className="text-[10px] font-bold text-brand-amber bg-brand-amber/20 px-2 py-0.5 rounded">Medium</span>
          </div>
          <div className="flex gap-2 mt-3">
             <span className="text-[9px] text-textMuted uppercase flex items-center gap-1"><Database className="w-3 h-3"/> Meta</span>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Analytics Dashboard",
    description: "Track your progress, monitor pressure response, and master your skills.",
    icon: <BarChart3 className="w-6 h-6 text-brand-green" />,
    badge: "Progress tracking",
    colSpan: "col-span-1 md:col-span-1",
    glow: "hover:shadow-[0_0_30px_rgba(0,255,136,0.15)]",
    bg: "bg-gradient-to-b from-brand-green/10 to-transparent",
    mockup: (
      <div className="mt-6 flex gap-4 h-full items-end">
        {[40, 65, 45, 80, 95].map((height, i) => (
          <div key={i} className="w-full bg-brand-green/20 rounded-t-sm relative group overflow-hidden" style={{ height: `${height}%` }}>
            <div className="absolute bottom-0 w-full bg-brand-green opacity-50" style={{ height: '100%' }}></div>
          </div>
        ))}
      </div>
    )
  }
];

export default function AppShowcase() {
  return (
    <section className="section-padding bg-canvas relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-cyan/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          className="text-center mb-16"
        >
          <span className="text-brand-cyan flex items-center justify-center gap-2 text-sm font-semibold tracking-wider uppercase mb-3">
            <Sparkles className="w-4 h-4" /> The Complete Suite
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-textPrimary tracking-tight">
            Everything you need to <span className="gradient-text">dominate.</span>
          </h2>
          <p className="text-textSecondary mt-4 max-w-2xl mx-auto text-lg">
            A cohesive, highly-tuned ecosystem of tools built to give you an unfair advantage in every technical and behavioral interview.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`${feature.colSpan}`}
            >
              <GlassCard 
                className={`h-full flex flex-col p-6 overflow-hidden transition-all duration-300 ${feature.glow} ${feature.bg} border-white/[0.05] hover:border-white/[0.1]`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                    {feature.icon}
                  </div>
                  {feature.badge && (
                    <span className="px-3 py-1 bg-white/[0.05] border border-white/[0.1] rounded-full text-xs font-semibold text-textPrimary">
                      {feature.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-textSecondary text-sm flex-1">{feature.description}</p>
                
                {feature.mockup}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
