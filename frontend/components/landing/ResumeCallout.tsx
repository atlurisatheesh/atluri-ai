"use client";

import { motion } from "framer-motion";
import { FileText, ArrowRight, CheckCircle, TrendingUp, Sparkles } from "lucide-react";
import Link from "next/link";

const STATS = [
  { value: "94%", label: "Average ATS score after optimization" },
  { value: "3x", label: "More interview callbacks" },
  { value: "< 30s", label: "AI bullet rewrite time" },
];

export default function ResumeCallout() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-brand-green/[0.03] via-transparent to-brand-cyan/[0.03]" />
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left — text */}
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <span className="text-xs font-mono text-brand-green tracking-widest uppercase">ProfileCraft™</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-3">Your resume isn&rsquo;t getting past the bots.</h2>
            <p className="text-textSecondary mt-4 leading-relaxed">75% of resumes are rejected by ATS before a human sees them. Our AI analyzes your resume against real ATS algorithms, rewrites weak bullets with action verbs and metrics, and matches keywords to your target JD.</p>

            <div className="flex gap-8 mt-8">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-brand-green">{s.value}</p>
                  <p className="text-xs text-textMuted mt-1 max-w-[140px]">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-2.5">
              {[
                "Instant ATS compatibility scoring",
                "AI-powered bullet enhancements with metrics",
                "JD keyword gap analysis",
                "8+ professional templates",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-brand-green flex-shrink-0" />
                  <span className="text-sm text-textSecondary">{item}</span>
                </div>
              ))}
            </div>

            <Link href="/resume" className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-xl bg-brand-green/20 text-brand-green font-medium text-sm hover:bg-brand-green/30 transition">
              <Sparkles className="w-4 h-4" /> Analyze My Resume <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Right — visual */}
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="relative">
              {/* Before/After mock */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-brand-red/5 border border-brand-red/10 p-5">
                  <p className="text-xs font-semibold text-brand-red mb-3">Before</p>
                  <div className="space-y-2">
                    <div className="p-2 rounded bg-white/[0.02]"><p className="text-xs text-textMuted">&ldquo;Worked on the backend team&rdquo;</p></div>
                    <div className="p-2 rounded bg-white/[0.02]"><p className="text-xs text-textMuted">&ldquo;Helped with testing&rdquo;</p></div>
                    <div className="p-2 rounded bg-white/[0.02]"><p className="text-xs text-textMuted">&ldquo;Used Python for projects&rdquo;</p></div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded bg-white/5 overflow-hidden"><div className="h-full w-[45%] bg-brand-red rounded" /></div>
                    <span className="text-xs text-brand-red font-bold">45%</span>
                  </div>
                </div>

                <div className="rounded-xl bg-brand-green/5 border border-brand-green/10 p-5">
                  <p className="text-xs font-semibold text-brand-green mb-3">After AI Enhancement</p>
                  <div className="space-y-2">
                    <div className="p-2 rounded bg-white/[0.02]"><p className="text-xs text-textSecondary">&ldquo;Architected 12 microservices handling 50K req/s&rdquo;</p></div>
                    <div className="p-2 rounded bg-white/[0.02]"><p className="text-xs text-textSecondary">&ldquo;Established CI/CD with 95% coverage&rdquo;</p></div>
                    <div className="p-2 rounded bg-white/[0.02]"><p className="text-xs text-textSecondary">&ldquo;Engineered ML pipeline, 82% → 94% accuracy&rdquo;</p></div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded bg-white/5 overflow-hidden"><div className="h-full w-[94%] bg-brand-green rounded" /></div>
                    <span className="text-xs text-brand-green font-bold">94%</span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-canvas border border-white/10 flex items-center justify-center z-10">
                <TrendingUp className="w-4 h-4 text-brand-green" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
