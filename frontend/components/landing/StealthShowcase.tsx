"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, MonitorSmartphone, Shield, Sparkles } from "lucide-react";
import GlassCard from "../ui/GlassCard";
import NeonButton from "../ui/NeonButton";

export default function StealthShowcase() {
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="section-padding bg-transparent">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <span className="text-brand-green text-sm font-semibold tracking-wider uppercase">Stealth Technology</span>
          <h2 className="text-3xl md:text-4xl font-bold text-textPrimary mt-2 mb-4">Invisible to Screen Share. Invisible to Proctors.</h2>
          <p className="text-textSecondary max-w-2xl mx-auto">Our PhantomVeil™ rendering engine draws answers on a hardware-accelerated overlay that is <span className="text-brand-green font-medium">completely invisible</span> to Zoom, Teams, Meet, and all proctoring software.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* mock interview window */}
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <GlassCard className="p-0 overflow-hidden">
              {/* title bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="text-xs text-textMuted ml-2 flex items-center gap-1"><MonitorSmartphone className="w-3 h-3" /> Zoom Meeting — Your Interview</span>
              </div>
              {/* content area */}
              <div className="relative p-8 min-h-[260px] flex items-center justify-center">
                <div className="text-center">
                  <p className="text-textSecondary text-sm mb-3">Interviewer asks:</p>
                  <p className="text-textPrimary font-medium text-lg mb-6">"Tell me about a time you led a cross-functional initiative."</p>
                  {/* stealth answer overlay */}
                  <motion.div
                    initial={false}
                    animate={{ opacity: revealed ? 1 : 0 }}
                    transition={{ duration: 0.4 }}
                    className="glass-card p-4 rounded-xl text-left text-sm text-brand-cyan/90 leading-relaxed pointer-events-none"
                  >
                    <p className="font-medium text-brand-cyan mb-1">✦ AI-Generated Answer:</p>
                    <p>At my previous role I spearheaded a cross-functional team of 8 spanning engineering, design, and product. We shipped a payment refactor that reduced failed transactions by 37% in Q3…</p>
                  </motion.div>
                </div>
                {/* pulsing glow */}
                {revealed && (
                  <motion.div className="absolute inset-0 rounded-xl border border-brand-green/30 pointer-events-none" animate={{ boxShadow: ["0 0 15px rgba(0,255,136,0.15)", "0 0 30px rgba(0,255,136,0.25)", "0 0 15px rgba(0,255,136,0.15)"] }} transition={{ repeat: Infinity, duration: 2 }} />
                )}
              </div>
            </GlassCard>
            <div className="flex justify-center mt-4">
              <NeonButton variant="secondary" size="sm" onClick={() => setRevealed(!revealed)}>
                {revealed ? <><EyeOff className="w-4 h-4 mr-2" /> Hide Overlay</> : <><Eye className="w-4 h-4 mr-2" /> Reveal Stealth Overlay</>}
              </NeonButton>
            </div>
          </motion.div>

          {/* feature bullets */}
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }} className="space-y-5">
            {[
              { icon: Shield, title: "Undetectable by Proctoring Tools", desc: "Not captured by getDisplayMedia, OBS, or any screen-recording API. Verified against 12+ proctoring engines." },
              { icon: Sparkles, title: "Hardware-Accelerated Overlay", desc: "DirectComposition (Windows) and CALayer (macOS) rendering ensures zero flicker and sub-1ms draw latency." },
              { icon: Eye, title: "Auto-Dimming Smart Positioning", desc: "Overlay intelligently positions near your webcam feed and dims to near-invisible when you're not looking." },
            ].map((item) => (
              <GlassCard key={item.title} hover className="flex gap-4 p-4 items-start">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex-shrink-0 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-brand-green" />
                </div>
                <div>
                  <h4 className="text-textPrimary font-semibold mb-1">{item.title}</h4>
                  <p className="text-sm text-textSecondary leading-relaxed">{item.desc}</p>
                </div>
              </GlassCard>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
