"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Sparkles } from "lucide-react";
import Link from "next/link";
import NeonButton from "../ui/NeonButton";
import GhostButton from "../ui/GhostButton";
import StatusBadge from "../ui/StatusBadge";
import TypewriterText from "../ui/TypewriterText";
import AnimatedCounter from "../ui/AnimatedCounter";

/* ── particle canvas ──────────────────────────────────── */
function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    const COUNT = 50;

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.offsetWidth) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.offsetHeight) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 212, 255, 0.35)";
        ctx.fill();
      }
      // connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.12 * (1 - dist / 140)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      rafId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef]);
}

/* ── stat counters ───────────────────────────────────── */
const stats = [
  { value: 12000, suffix: "+", label: "Mock Interviews" },
  { value: 94, suffix: "%", label: "Offer Rate Uplift" },
  { value: 35, suffix: "+", label: "Company Modes" },
  { value: 4.9, suffix: "/5", label: "User Rating", decimals: 1 },
];

/* ── headline words ──────────────────────────────────── */
const headlineWords = ["AI-Powered", "Interview", "Coaching", "That", "Gets", "You", "Hired"];

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useParticleCanvas(canvasRef);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* background layers */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
      <div className="absolute inset-0 bg-gradient-to-b from-brand-cyan/[0.04] via-transparent to-brand-purple/[0.04] z-0" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* badge */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatusBadge variant="cyan" pulse className="inline-flex items-center gap-1.5 mb-6">
            <Sparkles className="w-3.5 h-3.5" /> AI Interview Copilot — Now in Beta
          </StatusBadge>
        </motion.div>

        {/* headline — word-by-word */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6">
          {headlineWords.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.09, ease: "easeOut" }}
              className={`inline-block mr-[0.3em] ${
                i < 2 ? "gradient-text" : "text-textPrimary"
              }`}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        {/* sub-headline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="text-lg md:text-xl text-textSecondary max-w-2xl mx-auto mb-8"
        >
          Real-time AI coaching that listens to your interview, generates perfect answers, and
          runs <span className="text-brand-cyan font-medium">100% undetectable</span> in the background.
        </motion.p>

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }} className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <Link href="/signup?next=/app">
            <NeonButton size="lg">
              Start Free Trial <ArrowRight className="w-4 h-4 ml-2 inline" />
            </NeonButton>
          </Link>
          <a href="#how-it-works">
            <GhostButton size="lg">
              <Shield className="w-4 h-4 mr-2 inline" /> See How It Works
            </GhostButton>
          </a>
        </motion.div>

        {/* Stat counters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
        >
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <span className="text-3xl font-bold gradient-text">
                <AnimatedCounter target={s.value} />{s.suffix}
              </span>
              <p className="text-xs text-textMuted mt-1 tracking-wide uppercase">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
