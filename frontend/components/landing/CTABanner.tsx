"use client";

import { motion } from "framer-motion";
import { ArrowRight, Terminal, Shield, Zap, Radio } from "lucide-react";
import Link from "next/link";
import NeonButton from "../ui/NeonButton";
import GhostButton from "../ui/GhostButton";

const LAUNCH_STEPS = [
  { code: "01", label: "Create account", done: true },
  { code: "02", label: "Select company mode", done: true },
  { code: "03", label: "Arm PhantomVeil™", done: false },
  { code: "04", label: "Deploy to interview", done: false },
];

export default function CTABanner() {
  return (
    <section className="section-padding">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.08]">
            {/* grid bg */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.035)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/10 via-brand-purple/8 to-brand-green/6" />
            <div className="absolute inset-0 bg-black/50" />

            <div className="relative z-10 py-14 px-8 lg:px-14">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

                {/* left */}
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-green/30 bg-brand-green/5 mb-5">
                    <Radio className="w-3 h-3 text-brand-green animate-pulse" />
                    <span className="text-[10px] text-brand-green font-bold tracking-[0.18em] uppercase">Mission Ready</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-textPrimary mb-4 leading-tight">
                    Your Next Interview.<br />
                    <span className="bg-gradient-to-r from-brand-cyan to-brand-green bg-clip-text text-transparent">Operator Mode On.</span>
                  </h2>
                  <p className="text-textSecondary leading-relaxed mb-7 max-w-md">
                    Join thousands of candidates running signal-level execution in their interviews. Free to deploy — no credit card required.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/signup?next=/app">
                      <NeonButton size="lg">
                        Deploy Now <ArrowRight className="w-4 h-4 ml-2 inline" />
                      </NeonButton>
                    </Link>
                    <Link href="/stealth">
                      <GhostButton size="lg">
                        <Shield className="w-4 h-4 mr-2 inline" /> Stealth Mode
                      </GhostButton>
                    </Link>
                  </div>
                </div>

                {/* right: launch sequence */}
                <div className="rounded-xl border border-white/[0.07] bg-black/40 backdrop-blur-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                    <Terminal className="w-3.5 h-3.5 text-textMuted" />
                    <span className="text-[10px] text-textMuted uppercase tracking-wider">Launch Sequence</span>
                    <span className="ml-auto text-[9px] text-brand-green font-mono">● READY</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {LAUNCH_STEPS.map((step) => (
                      <div key={step.code} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${step.done ? "border-brand-green/40 bg-brand-green/10" : "border-white/[0.12] bg-white/[0.03]"}`}>
                          {step.done ? (
                            <Zap className="w-3 h-3 text-brand-green" />
                          ) : (
                            <span className="text-[9px] text-textMuted font-mono">{step.code}</span>
                          )}
                        </div>
                        <span className={`text-sm ${step.done ? "text-textPrimary" : "text-textMuted"}`}>{step.label}</span>
                        {!step.done && (
                          <span className="ml-auto text-[9px] text-brand-amber font-mono uppercase">Pending</span>
                        )}
                        {step.done && (
                          <span className="ml-auto text-[9px] text-brand-green font-mono uppercase">Done</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="px-4 pb-4">
                    <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: "50%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                        className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-green"
                      />
                    </div>
                    <p className="text-[9px] text-textMuted mt-1.5">2 of 4 steps — complete setup to go live</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
