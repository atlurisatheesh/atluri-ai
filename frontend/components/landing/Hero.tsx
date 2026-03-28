"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Shield, Radio, Activity, Cpu, Terminal, Lock, Zap, ChevronRight } from "lucide-react";
import Link from "next/link";
import NeonButton from "../ui/NeonButton";
import GhostButton from "../ui/GhostButton";
import AnimatedCounter from "../ui/AnimatedCounter";

/* ── grid + scan-line canvas ──────────────────────────── */
function useGridCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let rafId: number;
    let scanY = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // grid lines
      ctx.strokeStyle = "rgba(0, 212, 255, 0.04)";
      ctx.lineWidth = 1;
      const step = 48;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // scan line
      const grad = ctx.createLinearGradient(0, scanY - 60, 0, scanY + 20);
      grad.addColorStop(0, "rgba(0,212,255,0)");
      grad.addColorStop(0.7, "rgba(0,212,255,0.06)");
      grad.addColorStop(1, "rgba(0,212,255,0.12)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 60, w, 80);
      scanY = (scanY + 0.6) % h;

      rafId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("resize", resize); };
  }, [canvasRef]);
}

/* ── live telemetry ticker ───────────────────────────── */
const TELEMETRY_LINES = [
  { label: "AUDIO_CAPTURE", value: "44.1 kHz · Whisper v3", color: "text-brand-green" },
  { label: "AI_ENGINE", value: "GPT-4o · 320ms avg", color: "text-brand-cyan" },
  { label: "STEALTH_CLOAK", value: "ACTIVE · 0 leaks", color: "text-brand-green" },
  { label: "SESSION_MODE", value: "FAANG · SWE L5", color: "text-brand-purple" },
  { label: "CONFIDENCE", value: "94% offer probability", color: "text-brand-amber" },
  { label: "THREAT_SCAN", value: "CLEAR · 12 engines", color: "text-brand-green" },
];

/* ── mock live transcript ────────────────────────────── */
const DEMO_LINES = [
  { speaker: "interviewer", text: "Walk me through a time you improved system reliability." },
  { speaker: "ai", text: "Led P0 incident response reducing MTTR by 68% — migrated 4 microservices to circuit-breaker pattern, zero regressions in 90 days." },
  { speaker: "interviewer", text: "How did the team respond to the change?" },
  { speaker: "ai", text: "Ran async design reviews + built runbooks; adoption hit 100% in 2 sprints." },
];

/* ── stats ───────────────────────────────────────────── */
const stats = [
  { value: 12000, suffix: "+", label: "Sessions Run" },
  { value: 94, suffix: "%", label: "Offer Uplift" },
  { value: 35, suffix: "+", label: "Company Modes" },
  { value: 320, suffix: "ms", label: "AI Latency" },
];

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useGridCanvas(canvasRef);
  const [demoIdx, setDemoIdx] = useState(0);
  const [telemetryIdx, setTelemetryIdx] = useState(0);

  // cycle demo transcript lines
  useEffect(() => {
    const t = setInterval(() => setDemoIdx((i) => (i + 1) % DEMO_LINES.length), 3200);
    return () => clearInterval(t);
  }, []);

  // cycle telemetry row highlight
  useEffect(() => {
    const t = setInterval(() => setTelemetryIdx((i) => (i + 1) % TELEMETRY_LINES.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
      {/* bg */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
      <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/[0.03] via-transparent to-brand-purple/[0.05] z-0" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-brand-purple/[0.04] blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── LEFT: Copy ── */}
          <div>
            {/* eyebrow kicker */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-green/30 bg-brand-green/5 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                <span className="text-[11px] text-brand-green font-bold tracking-[0.18em] uppercase">Signal Active · Beta</span>
              </div>
            </motion.div>

            {/* headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, ease: "easeOut" }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] mb-6 tracking-tight"
            >
              <span className="text-textPrimary">Interview</span>{" "}
              <span className="text-textPrimary">Intelligence</span>{" "}
              <span className="block mt-1">
                <span className="bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-green bg-clip-text text-transparent">Operator-Grade</span>
              </span>
            </motion.h1>

            {/* sub */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-textSecondary leading-relaxed max-w-lg mb-8"
            >
              Real-time AI answers, live coaching, and{" "}
              <span className="text-brand-cyan font-medium">100% undetectable</span>{" "}
              stealth overlay — engineered for candidates who operate at signal level.
            </motion.p>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="flex flex-wrap gap-3 mb-10">
              <Link href="/signup?next=/app">
                <NeonButton size="lg">
                  Deploy Now <ArrowRight className="w-4 h-4 ml-2 inline" />
                </NeonButton>
              </Link>
              <Link href="/stealth">
                <GhostButton size="lg">
                  <Shield className="w-4 h-4 mr-2 inline" /> View Stealth Mode
                </GhostButton>
              </Link>
            </motion.div>

            {/* stat row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75 }}
              className="grid grid-cols-4 gap-4 pt-6 border-t border-white/[0.06]"
            >
              {stats.map((s) => (
                <div key={s.label}>
                  <span className="text-2xl font-bold bg-gradient-to-r from-brand-cyan to-brand-green bg-clip-text text-transparent font-heading">
                    <AnimatedCounter target={s.value} />{s.suffix}
                  </span>
                  <p className="text-[10px] text-textMuted mt-0.5 tracking-wider uppercase">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── RIGHT: Live Command HUD ── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
            className="relative"
          >
            {/* outer panel */}
            <div className="rounded-2xl border border-white/[0.08] bg-black/60 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">

              {/* panel header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                  <span className="text-[10px] font-bold tracking-[0.2em] text-brand-cyan uppercase">PhantomVeil™ · Live Session</span>
                </div>
                <div className="flex items-center gap-3 text-[9px] text-textMuted">
                  <span className="flex items-center gap-1"><Radio className="w-2.5 h-2.5 text-brand-red animate-pulse" /> REC</span>
                  <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5 text-brand-green" /> CLOAKED</span>
                  <span className="flex items-center gap-1"><Cpu className="w-2.5 h-2.5" /> 4%</span>
                </div>
              </div>

              {/* telemetry rows */}
              <div className="px-4 py-3 border-b border-white/[0.04] space-y-1.5">
                {TELEMETRY_LINES.map((row, i) => (
                  <div key={row.label} className={`flex items-center justify-between transition-all duration-500 ${i === telemetryIdx ? "opacity-100" : "opacity-40"}`}>
                    <span className="text-[9px] text-textMuted font-mono tracking-wider">{row.label}</span>
                    <span className={`text-[9px] font-mono font-medium ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* live transcript window */}
              <div className="p-4 min-h-[160px] relative">
                <div className="flex items-center gap-1.5 mb-3">
                  <Terminal className="w-3 h-3 text-textMuted" />
                  <span className="text-[9px] text-textMuted uppercase tracking-wider">Live Transcript</span>
                  <span className="ml-auto text-[9px] text-brand-green font-mono">● LIVE</span>
                </div>
                <div className="space-y-2">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={demoIdx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-2"
                    >
                      {DEMO_LINES.slice(0, demoIdx + 1).slice(-3).map((line, i) => (
                        <div
                          key={i}
                          className={`flex gap-2 p-2 rounded-lg text-xs ${
                            line.speaker === "interviewer"
                              ? "bg-brand-amber/5 border border-brand-amber/10"
                              : "bg-brand-purple/5 border border-brand-purple/10"
                          }`}
                        >
                          <span className={`font-bold shrink-0 text-[10px] ${line.speaker === "interviewer" ? "text-brand-amber" : "text-brand-purple"}`}>
                            {line.speaker === "interviewer" ? "INT" : "AI"}
                          </span>
                          <span className="text-textSecondary leading-relaxed">{line.text}</span>
                        </div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>
                {/* streaming cursor */}
                <div className="mt-2 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-brand-purple animate-pulse" />
                  <span className="text-[10px] text-brand-purple">Generating response</span>
                  <span className="inline-block w-0.5 h-3 bg-brand-purple ml-0.5 animate-pulse" />
                </div>
              </div>

              {/* confidence bar */}
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] text-textMuted uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" /> Offer Probability
                  </span>
                  <span className="text-[10px] text-brand-green font-bold">94%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "94%" }}
                    transition={{ delay: 1, duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-green"
                  />
                </div>
              </div>
            </div>

            {/* floating label tags */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.1 }}
              className="absolute -right-4 top-12 hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-brand-green/30 bg-black/80 backdrop-blur-sm"
            >
              <Lock className="w-3 h-3 text-brand-green" />
              <span className="text-[9px] text-brand-green font-bold">Undetectable</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.3 }}
              className="absolute -left-4 bottom-12 hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-brand-cyan/30 bg-black/80 backdrop-blur-sm"
            >
              <ChevronRight className="w-3 h-3 text-brand-cyan" />
              <span className="text-[9px] text-brand-cyan font-bold">320ms response</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
