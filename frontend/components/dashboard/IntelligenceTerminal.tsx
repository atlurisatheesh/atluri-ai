"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu, Zap, ChevronDown, Clock, Info, Brain, Play, Layers,
  Building2, Briefcase, Target, List, AlertCircle,
} from "lucide-react";
import { GlassCard, NeonButton, StatusBadge, Tabs } from "../ui";

// ─── Model Catalog ───────────────────────────────────────────
export interface ModelTier {
  tier: "speed" | "balanced" | "reasoning";
  tierLabel: string;
  tierColor: string;
}

export interface ModelOption {
  id: string;
  label: string;
  provider: string;
  ttft: string;          // Expected time-to-first-token label
  tier: ModelTier["tier"];
  paid?: boolean;
  badge?: string;
}

const MODELS: ModelOption[] = [
  // Speed tier
  { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "OpenAI", ttft: "~180ms", tier: "speed" },
  { id: "grok-4.1-fast", label: "Grok 4.1 Fast", provider: "xAI", ttft: "~200ms", tier: "speed", badge: "Fastest" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google", ttft: "~220ms", tier: "speed" },
  // Balanced tier
  { id: "gpt-4.1", label: "GPT-4.1", provider: "OpenAI", ttft: "~400ms", tier: "balanced" },
  { id: "gpt-5-mini", label: "GPT-5 Mini", provider: "OpenAI", ttft: "~350ms", tier: "balanced", paid: true },
  { id: "kimi-k2-turbo", label: "Kimi K2 Turbo", provider: "Moonshot", ttft: "~380ms", tier: "balanced", paid: true },
  { id: "claude-4.5-haiku", label: "Claude 4.5 Haiku", provider: "Anthropic", ttft: "~300ms", tier: "balanced", paid: true },
  // Reasoning tier
  { id: "grok-4", label: "Grok 4", provider: "xAI", ttft: "~600ms", tier: "reasoning", paid: true },
  { id: "claude-4.5-sonnet", label: "Claude 4.5 Sonnet", provider: "Anthropic", ttft: "~700ms", tier: "reasoning", paid: true, badge: "Best Quality" },
  { id: "gemini-3-pro", label: "Gemini 3 Pro", provider: "Google", ttft: "~650ms", tier: "reasoning", paid: true },
  { id: "gpt-5", label: "GPT-5", provider: "OpenAI", ttft: "~750ms", tier: "reasoning", paid: true },
];

const TIER_META: Record<ModelTier["tier"], ModelTier> = {
  speed:     { tier: "speed",     tierLabel: "Speed",     tierColor: "text-brand-green" },
  balanced:  { tier: "balanced",  tierLabel: "Balanced",  tierColor: "text-brand-cyan" },
  reasoning: { tier: "reasoning", tierLabel: "Reasoning", tierColor: "text-brand-purple" },
};

// ─── Session Config Shape ────────────────────────────────────
export interface SessionConfig {
  company: string;
  position: string;
  objective: string;
  interviewProcedures: string;
  priorityQuestions: string;
  imageAnalysisContext: string;
  selectedModel: string;
  mode: "live" | "mock" | "coding";
}

const DEFAULT_CONFIG: SessionConfig = {
  company: "",
  position: "",
  objective: "Land the offer by demonstrating technical depth and cultural alignment.",
  interviewProcedures: "Step 1: Intro & resume walkthrough\nStep 2: Technical deep-dive\nStep 3: Behavioral (STAR format)\nStep 4: System design",
  priorityQuestions: "",
  imageAnalysisContext: "Prioritize identifying the problem statement on screen. Ignore IDE chrome and focus on algorithm description.",
  selectedModel: "grok-4.1-fast",
  mode: "live",
};

// ─── Company Intelligence Auto-Fill ─────────────────────────
const COMPANY_INTEL: Record<string, Partial<SessionConfig>> = {
  amazon: {
    interviewProcedures: "Step 1: Resume walkthrough (LP alignment)\nStep 2: Behavioral × 4 (LP stories)\nStep 3: System design or coding\nStep 4: Bar-raiser round",
    priorityQuestions: "Tell me about a time you dived deep.\nDescribe a situation where you had to work backwards from the customer.\nTell me about a time you disagree and committed.",
    imageAnalysisContext: "Focus on detecting Amazon Leadership Principles referenced in questions. Flag any LP keywords shown on screen.",
  },
  google: {
    interviewProcedures: "Step 1: Phone screen (coding)\nStep 2: Onsite × 5 (2 coding, 1 system design, 1 behavioral, 1 googleyness)\nStep 3: Committee review",
    priorityQuestions: "Design a distributed rate limiter.\nHow would you improve Google Search?\nTell me about a time you influenced without authority.",
  },
  meta: {
    interviewProcedures: "Step 1: Recruiter screen\nStep 2: Technical phone screen (LC coding)\nStep 3: Onsite × 4 (2 coding, 1 system design, 1 behavioral)\nStep 4: Hiring committee",
    priorityQuestions: "Design Facebook's News Feed.\nTell me about a data-driven decision you made.\nHow do you prioritize features?",
  },
  microsoft: {
    interviewProcedures: "Step 1: Recruiter + HM screen\nStep 2: Onsite × 4 (coding, design, behavioral, as-appropriate)\nStep 3: Partner interview (final decision)",
    priorityQuestions: "How would you design Outlook at scale?\nDescribe a time you faced ambiguity and drove clarity.\nHow do you think about growth vs. impact?",
  },
};

function applyCompanyIntel(company: string, current: SessionConfig): Partial<SessionConfig> {
  const key = company.toLowerCase().trim();
  return COMPANY_INTEL[key] ?? {};
}

// ─── Model Selector Component ────────────────────────────────
function ModelSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = MODELS.find((m) => m.id === value) ?? MODELS[0];
  const grouped = (["speed", "balanced", "reasoning"] as const).map((tier) => ({
    tier,
    models: MODELS.filter((m) => m.tier === tier),
  }));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-brand-cyan/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <Cpu className="w-4 h-4 text-brand-cyan flex-shrink-0" />
          <div className="text-left">
            <p className="text-sm font-semibold text-textPrimary">{selected.label}</p>
            <p className="text-xs text-textMuted">{selected.provider} · TTFT {selected.ttft}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selected.badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30">
              {selected.badge}
            </span>
          )}
          <span className={`text-xs font-semibold ${TIER_META[selected.tier].tierColor}`}>
            {TIER_META[selected.tier].tierLabel}
          </span>
          <ChevronDown className={`w-4 h-4 text-textMuted transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute z-50 top-full mt-2 left-0 right-0 rounded-xl bg-[#12121F] border border-white/[0.1] shadow-2xl overflow-hidden"
          >
            {grouped.map(({ tier, models }) => (
              <div key={tier}>
                <div className="px-4 py-2 border-b border-white/[0.06]">
                  <p className={`text-[11px] font-bold uppercase tracking-widest ${TIER_META[tier].tierColor}`}>
                    {TIER_META[tier].tierLabel}
                  </p>
                </div>
                {models.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { onChange(m.id); setOpen(false); }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors cursor-pointer ${m.id === value ? "bg-brand-cyan/10" : ""}`}
                  >
                    <div className="text-left">
                      <p className="text-sm text-textPrimary">{m.label}</p>
                      <p className="text-xs text-textMuted">{m.provider}</p>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <div className="flex items-center gap-1 text-textMuted text-xs">
                        <Clock className="w-3 h-3" />
                        {m.ttft}
                      </div>
                      {m.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30">
                          {m.badge}
                        </span>
                      )}
                      {m.paid && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-purple/20 text-brand-purple">Pro</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Mode Pill ───────────────────────────────────────────────
function ModePill({ mode, label, icon, active, onClick }: {
  mode: SessionConfig["mode"]; label: string; icon: React.ReactNode;
  active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
        active
          ? "bg-brand-cyan/15 border-brand-cyan/50 text-brand-cyan shadow-[0_0_16px_rgba(0,212,255,0.15)]"
          : "bg-white/[0.03] border-white/[0.08] text-textMuted hover:text-textPrimary hover:border-white/[0.15]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Field Component ─────────────────────────────────────────
function Field({ label, icon, hint, children }: {
  label: string; icon: React.ReactNode; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-textMuted">{icon}</span>
        <label className="text-xs font-semibold text-textSecondary uppercase tracking-wider">{label}</label>
        {hint && (
          <span className="relative group cursor-default ml-auto">
            <Info className="w-3.5 h-3.5 text-textMuted" />
            <span className="absolute right-0 bottom-full mb-1.5 w-52 text-xs bg-[#1A1A2E] border border-white/10 rounded-lg px-3 py-2 text-textSecondary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
              {hint}
            </span>
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder:text-textMuted outline-none focus:border-brand-cyan/50 focus:bg-white/[0.06] transition-colors";
const textareaCls = `${inputCls} resize-none min-h-[90px] leading-relaxed`;

// ─── Main Component ──────────────────────────────────────────
export interface IntelligenceTerminalProps {
  onLaunch?: (config: SessionConfig) => void;
  className?: string;
}

export default function IntelligenceTerminal({ onLaunch, className = "" }: IntelligenceTerminalProps) {
  const [config, setConfig] = useState<SessionConfig>(DEFAULT_CONFIG);
  const [companyIntelApplied, setCompanyIntelApplied] = useState<string | null>(null);

  const set = useCallback(<K extends keyof SessionConfig>(key: K, val: SessionConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: val }));
  }, []);

  const handleCompanyBlur = () => {
    const intel = applyCompanyIntel(config.company, config);
    if (Object.keys(intel).length > 0 && config.company.trim().toLowerCase() !== companyIntelApplied) {
      setConfig((c) => ({ ...c, ...intel }));
      setCompanyIntelApplied(config.company.trim().toLowerCase());
    }
  };

  const handleLaunch = () => {
    onLaunch?.(config);
  };

  const modeIcons = {
    live: <Zap className="w-4 h-4" />,
    mock: <Brain className="w-4 h-4" />,
    coding: <Layers className="w-4 h-4" />,
  };

  const tabs = [
    {
      label: "Mission Brief",
      icon: <Target className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Company" icon={<Building2 className="w-3.5 h-3.5" />}
              hint="Auto-fills interview procedures for Amazon, Google, Meta, Microsoft.">
              <input
                className={inputCls}
                placeholder="e.g. Amazon, Google, Meta…"
                value={config.company}
                onChange={(e) => set("company", e.target.value)}
                onBlur={handleCompanyBlur}
              />
              <AnimatePresence>
                {companyIntelApplied && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="text-[11px] text-brand-cyan mt-1 flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3" /> Intelligence Pack auto-loaded for {companyIntelApplied}
                  </motion.p>
                )}
              </AnimatePresence>
            </Field>
            <Field label="Position / Role" icon={<Briefcase className="w-3.5 h-3.5" />}>
              <input
                className={inputCls}
                placeholder="e.g. Senior Software Engineer"
                value={config.position}
                onChange={(e) => set("position", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Objective" icon={<Target className="w-3.5 h-3.5" />}
            hint="This shapes the AI's coaching goal — what you want to achieve.">
            <input
              className={inputCls}
              placeholder="What is your primary goal for this interview?"
              value={config.objective}
              onChange={(e) => set("objective", e.target.value)}
            />
          </Field>

          <Field label="Interview Procedures" icon={<List className="w-3.5 h-3.5" />}
            hint="Structure the interview flow so the AI knows what stage you are in.">
            <textarea
              className={textareaCls}
              placeholder={"Step 1: Resume walkthrough\nStep 2: Technical coding\nStep 3: Behavioral…"}
              value={config.interviewProcedures}
              onChange={(e) => set("interviewProcedures", e.target.value)}
            />
          </Field>
        </div>
      ),
    },
    {
      label: "Priority Intel",
      icon: <AlertCircle className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <Field label="Priority Questions" icon={<List className="w-3.5 h-3.5" />}
            hint="Pre-load questions the AI should watch for and auto-route.">
            <textarea
              className={textareaCls}
              placeholder={"Tell me about a time you led under pressure.\nDesign a distributed cache.\n…"}
              value={config.priorityQuestions}
              onChange={(e) => set("priorityQuestions", e.target.value)}
            />
          </Field>

          <Field label="Image Analysis Context" icon={<Brain className="w-3.5 h-3.5" />}
            hint="Guides GPT-4o Vision on what to focus on during screen captures.">
            <textarea
              className={textareaCls}
              placeholder="Prioritize identifying the LeetCode problem statement. Ignore IDE chrome and focus on algorithm description…"
              value={config.imageAnalysisContext}
              onChange={(e) => set("imageAnalysisContext", e.target.value)}
            />
          </Field>
        </div>
      ),
    },
    {
      label: "Model",
      icon: <Cpu className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <p className="text-xs text-textMuted mb-2">
            Select the AI model for real-time response generation. Speed models minimize latency; Reasoning models maximize answer quality.
          </p>
          <ModelSelector value={config.selectedModel} onChange={(id) => set("selectedModel", id)} />

          <div className="grid grid-cols-3 gap-3 mt-2">
            {(["speed", "balanced", "reasoning"] as const).map((tier) => {
              const meta = TIER_META[tier];
              const count = MODELS.filter((m) => m.tier === tier).length;
              return (
                <div key={tier} className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 text-center">
                  <p className={`text-xs font-bold ${meta.tierColor}`}>{meta.tierLabel}</p>
                  <p className="text-[11px] text-textMuted mt-0.5">{count} models</p>
                </div>
              );
            })}
          </div>
        </div>
      ),
    },
  ];

  return (
    <GlassCard glow className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-cyan/20 to-brand-purple/20 border border-brand-cyan/30 flex items-center justify-center">
            <Brain className="w-5 h-5 text-brand-cyan" />
          </div>
          <div>
            <h2 className="text-base font-bold text-textPrimary">Intelligence Terminal</h2>
            <p className="text-xs text-textMuted">Mission briefing & model selection</p>
          </div>
        </div>
        <StatusBadge variant="cyan" pulse>ARMED</StatusBadge>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-2 mb-6">
        {(["live", "mock", "coding"] as const).map((m) => (
          <ModePill
            key={m} mode={m}
            label={m.charAt(0).toUpperCase() + m.slice(1)}
            icon={modeIcons[m]}
            active={config.mode === m}
            onClick={() => set("mode", m)}
          />
        ))}
      </div>

      {/* Config Tabs */}
      <Tabs tabs={tabs} className="mb-6" />

      {/* Launch */}
      <NeonButton variant="primary" size="lg" onClick={handleLaunch} className="w-full flex items-center justify-center gap-2">
        <Play className="w-5 h-5" />
        Launch {config.mode === "live" ? "Live Session" : config.mode === "mock" ? "Mock Interview" : "Coding Lab"}
      </NeonButton>
    </GlassCard>
  );
}
