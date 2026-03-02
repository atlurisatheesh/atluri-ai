"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mic, MicOff, Monitor, Eye, EyeOff, Copy, Save,
  Settings, Play, Square, Volume2, Zap, Clock,
  CheckCircle, AlertTriangle,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { GlassCard, NeonButton, StatusBadge } from "@/components/ui";

/* ── Mock transcript data ──────────────────────────────── */
const TRANSCRIPT = [
  { speaker: "Interviewer", text: "Can you tell me about your experience with distributed systems?", time: "0:32", confidence: 0.97 },
  { speaker: "You", text: "Absolutely. In my last role at a fintech startup, I designed and built a microservices architecture that handled over 2 million transactions per day...", time: "0:45", confidence: 0.94 },
  { speaker: "Interviewer", text: "How did you handle data consistency across those microservices?", time: "1:12", confidence: 0.96 },
];

const AI_RESPONSE = {
  question: "How did you handle data consistency across microservices?",
  direct_answer: "We implemented the Saga pattern with event sourcing for distributed transactions, using Apache Kafka as the event backbone. Each service maintained its own database with eventual consistency guarantees.",
  key_points: [
    "Saga pattern for distributed transactions — compensating actions on failure",
    "Event sourcing via Kafka — complete audit trail and replay capability",
    "CQRS separation — optimized read/write models per service",
    "Idempotency keys — guaranteed exactly-once processing",
  ],
  star_example: "When our payment service needed to coordinate with inventory and notification services, I implemented a choreography-based saga that reduced failed transactions from 2.3% to 0.04%, saving $180K/month in manual reconciliation.",
  avoid: ["Don't say 'two-phase commit' — it's an anti-pattern in microservices", "Avoid mentioning eventual consistency without explaining the tradeoffs"],
};

export default function CopilotPage() {
  const [isActive, setIsActive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [stealthOn, setStealthOn] = useState(true);
  const [responseMode, setResponseMode] = useState<"fast" | "balanced" | "thorough">("balanced");

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-textPrimary">NeuralWhisper™ — Live AI Copilot</h1>
              <p className="text-xs text-textMuted">Real-time interview assistance powered by GPT-4o</p>
            </div>
          </div>
          <StatusBadge variant={isActive ? "green" : "amber"}>
            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${isActive ? "bg-brand-green animate-pulse" : "bg-textMuted"}`} />
            {isActive ? "Session Active" : "Ready"}
          </StatusBadge>
        </div>

        {/* ── Controls Bar ── */}
        <GlassCard className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <NeonButton onClick={() => setIsActive(!isActive)} className={isActive ? "!bg-red-500/20 !border-red-500/40 !text-red-400" : ""}>
              {isActive ? <><Square className="w-4 h-4 mr-1.5" /> Stop Session</> : <><Play className="w-4 h-4 mr-1.5" /> Start Session</>}
            </NeonButton>

            <button onClick={() => setMicOn(!micOn)} className={`p-2.5 rounded-lg transition ${micOn ? "bg-brand-green/15 text-brand-green" : "bg-red-500/15 text-red-400"}`}>
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button className="p-2.5 rounded-lg bg-white/5 text-textSecondary hover:bg-white/10 transition">
              <Monitor className="w-4 h-4" />
            </button>
            <button onClick={() => setStealthOn(!stealthOn)} className={`p-2.5 rounded-lg transition ${stealthOn ? "bg-brand-purple/15 text-brand-purple" : "bg-white/5 text-textMuted"}`}>
              {stealthOn ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-1 px-2">
              <Volume2 className="w-4 h-4 text-textMuted" />
              <input type="range" min="0" max="100" defaultValue="75" className="w-20 accent-brand-cyan" />
            </div>

            {/* Response mode selector */}
            <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5 ml-auto">
              {(["fast", "balanced", "thorough"] as const).map((m) => (
                <button key={m} onClick={() => setResponseMode(m)} className={`px-3 py-1.5 text-xs rounded-md transition capitalize ${responseMode === m ? "bg-brand-cyan/20 text-brand-cyan" : "text-textMuted hover:text-textSecondary"}`}>
                  {m}
                </button>
              ))}
            </div>

            <button className="p-2.5 rounded-lg bg-white/5 text-textSecondary hover:bg-white/10 transition">
              <Copy className="w-4 h-4" />
            </button>
            <button className="p-2.5 rounded-lg bg-white/5 text-textSecondary hover:bg-white/10 transition">
              <Save className="w-4 h-4" />
            </button>
          </div>
        </GlassCard>

        {/* ── Context Bar ── */}
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-green/10 text-brand-green"><CheckCircle className="w-3 h-3" /> Resume</span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-green/10 text-brand-green"><CheckCircle className="w-3 h-3" /> JD Loaded</span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-green/10 text-brand-green"><CheckCircle className="w-3 h-3" /> Company Research</span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 text-textMuted">Model: GPT-4o</span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 text-textMuted">Persona: Senior FAANG Eng</span>
        </div>

        {/* ── Split View: Transcript | AI Response ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left — Transcript */}
          <GlassCard className="p-5 min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-textPrimary">Live Transcript</h2>
              <span className="text-xs text-textMuted flex items-center gap-1"><Clock className="w-3 h-3" /> 1:47</span>
            </div>
            <div className="space-y-4">
              {TRANSCRIPT.map((seg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${seg.speaker === "You" ? "text-brand-cyan" : "text-brand-purple"}`}>{seg.speaker}</span>
                    <span className="text-[10px] text-textMuted">{seg.time}</span>
                    <span className="text-[10px] text-textMuted ml-auto">{Math.round(seg.confidence * 100)}%</span>
                  </div>
                  <p className="text-sm text-textSecondary leading-relaxed">{seg.text}</p>
                </motion.div>
              ))}
              {isActive && (
                <div className="flex items-center gap-2 text-brand-cyan text-xs animate-pulse">
                  <div className="flex gap-1">{[1,2,3].map(i => <div key={i} className="w-1 h-3 bg-brand-cyan/60 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
                  Listening...
                </div>
              )}
            </div>
          </GlassCard>

          {/* Right — AI Response */}
          <GlassCard className="p-5 min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-textPrimary">AI Response</h2>
              <StatusBadge variant="cyan">Auto-generated</StatusBadge>
            </div>

            {/* Detected question */}
            <div className="mb-4 p-3 rounded-lg bg-brand-purple/5 border border-brand-purple/10">
              <p className="text-xs text-brand-purple font-medium mb-1">Detected Question:</p>
              <p className="text-sm text-textPrimary">{AI_RESPONSE.question}</p>
            </div>

            {/* Direct answer */}
            <div className="mb-4">
              <p className="text-xs text-brand-cyan font-semibold mb-1.5">DIRECT ANSWER</p>
              <p className="text-sm text-textSecondary leading-relaxed">{AI_RESPONSE.direct_answer}</p>
            </div>

            {/* Key points */}
            <div className="mb-4">
              <p className="text-xs text-brand-green font-semibold mb-1.5">KEY POINTS</p>
              <ul className="space-y-1.5">
                {AI_RESPONSE.key_points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-textSecondary">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-green flex-shrink-0 mt-0.5" />
                    {pt}
                  </li>
                ))}
              </ul>
            </div>

            {/* STAR example */}
            <div className="mb-4">
              <p className="text-xs text-brand-amber font-semibold mb-1.5">STAR EXAMPLE</p>
              <p className="text-sm text-textSecondary leading-relaxed">{AI_RESPONSE.star_example}</p>
            </div>

            {/* Avoid saying */}
            <div className="mb-4">
              <p className="text-xs text-brand-red font-semibold mb-1.5">AVOID SAYING</p>
              <ul className="space-y-1">
                {AI_RESPONSE.avoid.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-400/80">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {a}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.06]">
              {["Copy", "Regenerate", "Shorter", "More Technical"].map((label) => (
                <button key={label} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-textSecondary hover:bg-white/10 hover:text-textPrimary transition">{label}</button>
              ))}
              <div className="ml-auto flex gap-1">
                <button className="p-1.5 rounded-lg hover:bg-brand-green/10 text-textMuted hover:text-brand-green transition">👍</button>
                <button className="p-1.5 rounded-lg hover:bg-red-500/10 text-textMuted hover:text-red-400 transition">👎</button>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
