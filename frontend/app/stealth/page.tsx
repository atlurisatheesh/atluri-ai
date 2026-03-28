"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Keyboard,
  Lock,
  Monitor,
  Play,
  Radar,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Target,
  Timer,
  Volume2,
  XCircle,
  Zap,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { Modal } from "@/components/ui";
import PhantomOverlay from "@/components/stealth/PhantomOverlay";

const SIGNAL_PILLARS = [
  {
    title: "Acquisition",
    detail: "System audio and transcript capture with speaker intent extraction.",
    icon: Volume2,
  },
  {
    title: "Reasoning",
    detail: "Parallel answer generation across multiple model routes.",
    icon: BrainCircuit,
  },
  {
    title: "Stealth Transport",
    detail: "Overlay delivery with visibility hardening and threat response.",
    icon: Shield,
  },
  {
    title: "Execution",
    detail: "Live coaching cues for pacing, confidence, and precision.",
    icon: Zap,
  },
];

const CLOAK_MATRIX = [
  {
    signal: "Screen Share Visibility",
    state: "Suppressed",
    note: "Window affinity prevents overlay render in capture pipeline.",
  },
  {
    signal: "Window Enumeration",
    state: "Masked",
    note: "Task switching and simple list enumerators do not surface overlay.",
  },
  {
    signal: "Recorder Detection",
    state: "Watching",
    note: "Runtime checks evaluate known signatures and trigger response.",
  },
  {
    signal: "Input Interference",
    state: "Bypassed",
    note: "Click-through and keyboard-first controls avoid interaction friction.",
  },
];

const OPERATION_STEPS = [
  {
    step: "Step 1",
    title: "Question Lock",
    body: "Interviewer intent is parsed in real time and mapped to likely evaluation rubric.",
  },
  {
    step: "Step 2",
    title: "Answer Synthesis",
    body: "Multiple model paths run in parallel; best response is assembled and ranked.",
  },
  {
    step: "Step 3",
    title: "Delivery Coaching",
    body: "You receive concise prompts: what to emphasize, what to avoid, and what follows.",
  },
  {
    step: "Step 4",
    title: "Stealth Guard",
    body: "Threat telemetry continuously adjusts visibility posture and safety recommendations.",
  },
];

const THREAT_BOARD = [
  { name: "Active Recorder Scan", status: "Nominal", safe: true },
  { name: "Screen Enumeration Probe", status: "Blocked", safe: true },
  { name: "Focus Event Watch", status: "Neutralized", safe: true },
  { name: "Unexpected Capture Tool", status: "None", safe: true },
];

const DEMO_TRANSCRIPT = [
  {
    speaker: "interviewer",
    text: "Tell me about a time you solved a difficult scaling issue.",
    timestamp: "00:18",
    isQuestion: true,
  },
  {
    speaker: "candidate",
    text: "Our payment service had major queue contention during peak demand.",
    timestamp: "00:27",
  },
  {
    speaker: "interviewer",
    text: "What tradeoffs did you make in your architecture decision?",
    timestamp: "01:22",
    isQuestion: true,
  },
];

const DEMO_AI_RESPONSE = {
  answer:
    "Lead with the measurable outcome. Explain why you chose asynchronous decoupling, then quantify impact with latency and reliability metrics.",
  keyPoints: [
    "Reduced p99 latency from 780ms to 130ms",
    "Introduced queue partitioning with adaptive retry",
    "Maintained zero downtime migration",
  ],
  star: {
    situation: "Checkout queue spikes during seasonal traffic caused timeout failures.",
    task: "Stabilize throughput while preserving consistency guarantees.",
    action: "Implemented partition-aware async workers and idempotent handlers.",
    result: "Failure rate dropped 84% and throughput doubled under peak load.",
  },
  avoidSaying: ["It was straightforward", "The system fixed itself"],
  followUpPredictions: [
    "How did you validate correctness during migration?",
    "What did you monitor post-release?",
  ],
};

const DEMO_COACH = {
  pacing: "Strong start. Pause for one beat before stating metrics to add authority.",
  trapAlert: "If asked about tradeoffs, mention consistency vs throughput and why you chose eventual consistency for reads.",
  avoid: ["Avoid vague words like optimized", "Do not skip rollback strategy"],
  communicationAlert: "Use first-person ownership: I designed, I implemented, I validated.",
  gazeReminder: "Look at camera while delivering the result section.",
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.45, delay },
});

export default function StealthPage() {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [deepThinkDemo, setDeepThinkDemo] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      const response = await fetch("/api/desktop-installer");
      if (!response.ok) throw new Error("unavailable");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "PhantomVeil-Setup.exe";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setShowDownloadModal(true);
    } finally {
      setDownloading(false);
    }
  }, [downloading]);

  const startDemo = useCallback(() => {
    setDemoMode(true);
    setOverlayVisible(true);
    setIsListening(true);
  }, []);

  const stopDemo = useCallback(() => {
    setDemoMode(false);
    setOverlayVisible(false);
    setIsListening(false);
    setDeepThinkDemo(false);
  }, []);

  return (
    <DashboardLayout>
      <div className="relative overflow-hidden bg-canvas text-textPrimary">
        <div className="pointer-events-none absolute inset-0 opacity-65">
          <div className="absolute -top-20 left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-brand-cyan/20 blur-3xl" />
          <div className="absolute top-40 -left-24 h-80 w-80 rounded-full bg-brand-green/10 blur-3xl" />
          <div className="absolute -right-20 bottom-40 h-80 w-80 rounded-full bg-brand-purple/20 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:42px_42px]" />
        </div>

        <section className="relative px-6 pb-12 pt-12">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.95fr]">
            <motion.div {...fadeUp()}>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-brand-green">
                <Radar className="h-3.5 w-3.5" />
                Signal Cloak Console
              </p>
              <h1 className="max-w-3xl font-heading text-4xl font-bold leading-tight md:text-5xl">
                A Stealth Interface That Feels Like Mission Control, Not a Marketing Clone
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-textSecondary">
                PhantomVeil runs as a command center for high-stakes interviews: real-time answer intelligence, confidence coaching, and visibility hardening in one continuous stream.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-green via-brand-cyan to-brand-purple px-6 py-3 text-sm font-semibold text-white shadow-neon transition hover:scale-[1.02] disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {downloading ? "Preparing Installer..." : "Download Desktop Runtime"}
                </button>
                {!demoMode ? (
                  <button
                    onClick={startDemo}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm text-textSecondary transition hover:text-textPrimary"
                  >
                    <Play className="h-4 w-4 text-brand-cyan" />
                    Launch Live Overlay Demo
                  </button>
                ) : (
                  <button
                    onClick={stopDemo}
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-red/30 bg-brand-red/10 px-6 py-3 text-sm text-brand-red"
                  >
                    <XCircle className="h-4 w-4" />
                    Stop Demo
                  </button>
                )}
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                {["Desktop-first", "Realtime coaching", "Threat telemetry", "Keyboard mode"].map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-textMuted"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.aside {...fadeUp(0.05)} className="rounded-3xl border border-white/15 bg-black/45 p-5 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.16em] text-brand-cyan">Live Threat Board</p>
              <div className="mt-4 space-y-3">
                {THREAT_BOARD.map((item) => (
                  <div key={item.name} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-textPrimary">{item.name}</p>
                      {item.safe ? (
                        <CheckCircle2 className="h-4 w-4 text-brand-green" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-brand-red" />
                      )}
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-textMuted">{item.status}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-3">
                <p className="text-[11px] uppercase tracking-[0.15em] text-brand-cyan">Stealth Health</p>
                <p className="mt-1 text-lg font-semibold text-textPrimary">96 / 100</p>
                <p className="text-xs text-textSecondary">No active threats. Recorder watch running.</p>
              </div>
            </motion.aside>
          </div>
        </section>

        <section className="relative px-6 pb-14">
          <div className="mx-auto max-w-6xl">
            <motion.div {...fadeUp()} className="mb-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-brand-amber">Pipeline</p>
              <h2 className="text-2xl font-heading font-bold">How the Runtime Works in Live Interviews</h2>
            </motion.div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {OPERATION_STEPS.map((item, idx) => (
                <motion.div key={item.step} {...fadeUp(idx * 0.05)} className="rounded-2xl border border-white/12 bg-black/35 p-4">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-brand-cyan">{item.step}</p>
                  <h3 className="mt-1 text-sm font-semibold text-textPrimary">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-textSecondary">{item.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative bg-black/25 px-6 py-14">
          <div className="mx-auto max-w-6xl">
            <motion.div {...fadeUp()} className="mb-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-brand-green">Cloak Matrix</p>
              <h2 className="text-2xl font-heading font-bold">Visibility and Detection Channels</h2>
            </motion.div>
            <div className="grid gap-4 md:grid-cols-2">
              {CLOAK_MATRIX.map((item, idx) => (
                <motion.div key={item.signal} {...fadeUp(idx * 0.05)} className="rounded-2xl border border-white/12 bg-black/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-textPrimary">{item.signal}</p>
                    <span className="rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-brand-cyan">
                      {item.state}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-textSecondary">{item.note}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative px-6 py-14">
          <div className="mx-auto max-w-6xl">
            <motion.div {...fadeUp()} className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-brand-purple">Live Sandbox</p>
                <h2 className="text-2xl font-heading font-bold">Overlay Demo Controls</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-textMuted">
                <Timer className="h-4 w-4 text-brand-amber" />
                Session Clock: {demoMode ? "02:07" : "00:00"}
              </div>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {SIGNAL_PILLARS.map((pillar, idx) => {
                const Icon = pillar.icon;
                return (
                  <motion.div key={pillar.title} {...fadeUp(idx * 0.04)} className="rounded-2xl border border-white/12 bg-black/35 p-4">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-brand-cyan">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-textPrimary">{pillar.title}</h3>
                    <p className="mt-2 text-sm text-textSecondary">{pillar.detail}</p>
                  </motion.div>
                );
              })}
            </div>

            <motion.div {...fadeUp(0.2)} className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setOverlayVisible((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-textSecondary transition hover:text-textPrimary"
              >
                {overlayVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {overlayVisible ? "Hide Overlay" : "Show Overlay"}
              </button>
              <button
                type="button"
                onClick={() => setIsListening((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-textSecondary transition hover:text-textPrimary"
              >
                <Activity className="h-4 w-4 text-brand-green" />
                {isListening ? "Mic Listening" : "Mic Paused"}
              </button>
              <button
                type="button"
                onClick={() => setDeepThinkDemo((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-textSecondary transition hover:text-textPrimary"
              >
                <Sparkles className="h-4 w-4 text-brand-purple" />
                {deepThinkDemo ? "Deep Think On" : "Deep Think Off"}
              </button>
            </motion.div>
          </div>
        </section>

        <section className="relative border-t border-white/10 bg-black/30 px-6 py-14">
          <div className="mx-auto max-w-6xl rounded-3xl border border-white/15 bg-gradient-to-r from-brand-green/10 via-brand-cyan/10 to-brand-purple/10 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-brand-cyan">Desktop Runtime</p>
                <h2 className="mt-1 text-2xl font-heading font-bold">Deploy the Full Stealth Stack</h2>
                <p className="mt-2 max-w-2xl text-sm text-textSecondary">
                  Browser add-ons are constrained by browser policies. PhantomVeil runs as a desktop runtime designed for resilient visibility control and high-fidelity coaching.
                </p>
              </div>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:opacity-60"
              >
                {downloading ? "Preparing..." : "Download Desktop"}
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <PhantomOverlay
        visible={overlayVisible}
        onClose={() => setOverlayVisible(false)}
        onToggleVisibility={() => setOverlayVisible((v) => !v)}
        transcript={demoMode ? DEMO_TRANSCRIPT : []}
        aiResponse={demoMode ? DEMO_AI_RESPONSE : null}
        coach={demoMode ? DEMO_COACH : null}
        deepThink={deepThinkDemo}
        isListening={isListening}
        onToggleMic={() => setIsListening((v) => !v)}
        elapsedSeconds={demoMode ? 127 : 0}
        offerProbability={demoMode ? 81 : null}
        stealthHealth={
          demoMode
            ? { score: 96, threatLevel: "NONE" as const, activeThreats: [], recordingDetected: false, recordingTools: [] }
            : undefined
        }
      />

      <Modal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)} title="Desktop Runtime Availability">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-textMuted">
            The installer endpoint is not available yet in this environment. You can still run the live overlay sandbox and test the full interface behavior.
          </p>
          <div className="rounded-xl border border-brand-cyan/20 bg-brand-cyan/10 p-4 text-xs leading-relaxed text-textSecondary">
            Desktop runtime advantages include visibility hardening, recorder awareness, and stable low-latency delivery under live interview conditions.
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setShowDownloadModal(false);
                startDemo();
              }}
              className="rounded-lg bg-gradient-to-r from-brand-green via-brand-cyan to-brand-purple px-4 py-2 text-sm font-semibold text-white"
            >
              Open Live Sandbox
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
