"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, Building2, Target, Zap, ChevronRight, ChevronLeft,
  Shield, BarChart3, ArrowRight, Sparkles, Search, X,
} from "lucide-react";
import { GlassCard, NeonButton, GhostButton, ProgressRing, StatusBadge } from "../ui";
import { scenarioService, type ScenarioItem, type ScenarioCategory } from "../../lib/services";

type WizardConfig = {
  companyMode: string;
  difficulty: string;
  questionCount: number;
  focusArea: string;
  enableStealth: boolean;
  scenario: string | null;
};

const companies = [
  { id: "general", label: "General", icon: "🎯", desc: "Broad interview prep" },
  { id: "amazon", label: "Amazon", icon: "📦", desc: "Leadership Principles" },
  { id: "google", label: "Google", icon: "🔍", desc: "Structured thinking" },
  { id: "meta", label: "Meta", icon: "👥", desc: "Impact & ownership" },
  { id: "microsoft", label: "Microsoft", icon: "💻", desc: "Growth mindset" },
  { id: "apple", label: "Apple", icon: "🍎", desc: "Innovation & craft" },
  { id: "stripe", label: "Stripe", icon: "💳", desc: "Technical depth" },
  { id: "netflix", label: "Netflix", icon: "🎬", desc: "Culture & freedom" },
];

const difficulties = [
  { id: "easy", label: "Warm-Up", desc: "Foundational questions, relaxed pace", color: "text-brand-green" },
  { id: "medium", label: "Standard", desc: "Typical interview difficulty", color: "text-brand-amber" },
  { id: "hard", label: "Pressure", desc: "Challenging, follow-up heavy", color: "text-brand-orange" },
  { id: "expert", label: "Expert", desc: "Bar-raiser level intensity", color: "text-brand-red" },
];

const focusAreas = [
  { id: "behavioral", label: "Behavioral" },
  { id: "system-design", label: "System Design" },
  { id: "coding", label: "Technical / Coding" },
  { id: "leadership", label: "Leadership" },
  { id: "product", label: "Product Sense" },
  { id: "mixed", label: "Mixed (All Types)" },
];

const STEPS = ["Company", "Scenario", "Difficulty", "Focus", "Ready"];

export default function InterviewWizard({ onStart }: { onStart: (config: WizardConfig) => void }) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<WizardConfig>({
    companyMode: "general",
    difficulty: "medium",
    questionCount: 5,
    focusArea: "mixed",
    enableStealth: false,
    scenario: null,
  });

  // Scenario data
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [categories, setCategories] = useState<ScenarioCategory[]>([]);
  const [scenarioSearch, setScenarioSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [scenariosLoading, setScenariosLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setScenariosLoading(true);
    scenarioService.list()
      .then((data) => {
        if (!cancelled) {
          setScenarios(data.items || []);
          setCategories(data.categories || []);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setScenariosLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredScenarios = useMemo(() => {
    let items = scenarios;
    if (activeCategory) {
      items = items.filter((s) => s.category === activeCategory);
    }
    if (scenarioSearch.trim()) {
      const q = scenarioSearch.toLowerCase();
      items = items.filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return items;
  }, [scenarios, activeCategory, scenarioSearch]);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const selectedCompany = companies.find((c) => c.id === config.companyMode);
  const selectedDifficulty = difficulties.find((d) => d.id === config.difficulty);
  const selectedScenario = scenarios.find((s) => s.id === config.scenario);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i <= step
                  ? "bg-gradient-to-br from-brand-cyan to-brand-purple text-white"
                  : "bg-white/[0.04] text-textMuted border border-white/[0.08]"
              }`}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 ${i < step ? "bg-brand-cyan" : "bg-white/[0.08]"} transition-all`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          {/* Step 0: Company */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold text-textPrimary text-center mb-2">Choose Company Mode</h2>
              <p className="text-sm text-textSecondary text-center mb-6">Each mode mimics the company's real interview style.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {companies.map((c) => (
                  <GlassCard
                    key={c.id}
                    hover
                    onClick={() => setConfig({ ...config, companyMode: c.id })}
                    className={`p-4 text-center cursor-pointer transition-all ${
                      config.companyMode === c.id ? "border-brand-cyan/40 bg-brand-cyan/5" : ""
                    }`}
                  >
                    <span className="text-2xl block mb-2">{c.icon}</span>
                    <p className="text-sm font-semibold text-textPrimary">{c.label}</p>
                    <p className="text-[10px] text-textMuted mt-0.5">{c.desc}</p>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Scenario */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-textPrimary text-center mb-2">Interview Scenario</h2>
              <p className="text-sm text-textSecondary text-center mb-4">
                Choose a role-specific scenario with curated questions and evaluation criteria.
              </p>

              {/* Search bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                <input
                  type="text"
                  placeholder="Search scenarios (e.g. backend, system design, negotiation)..."
                  value={scenarioSearch}
                  onChange={(e) => setScenarioSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-brand-cyan/40 transition"
                />
                {scenarioSearch && (
                  <button
                    onClick={() => setScenarioSearch("")}
                    title="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textPrimary cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                    !activeCategory
                      ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30"
                      : "bg-white/[0.04] text-textMuted border border-white/[0.06] hover:text-textPrimary"
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                      activeCategory === cat.id
                        ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30"
                        : "bg-white/[0.04] text-textMuted border border-white/[0.06] hover:text-textPrimary"
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>

              {/* "None" option */}
              <GlassCard
                hover
                onClick={() => setConfig({ ...config, scenario: null })}
                className={`p-3 mb-3 cursor-pointer transition-all ${
                  config.scenario === null ? "border-brand-cyan/40 bg-brand-cyan/5" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🎯</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-textPrimary">No Scenario (Free-form)</p>
                    <p className="text-xs text-textMuted">Standard interview without scenario constraints</p>
                  </div>
                  {config.scenario === null && <StatusBadge variant="cyan">Selected</StatusBadge>}
                </div>
              </GlassCard>

              {/* Scenario list */}
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {scenariosLoading && (
                  <p className="text-center text-sm text-textMuted py-4">Loading scenarios...</p>
                )}
                {!scenariosLoading && filteredScenarios.length === 0 && (
                  <p className="text-center text-sm text-textMuted py-4">No matching scenarios found.</p>
                )}
                {filteredScenarios.map((s) => (
                  <GlassCard
                    key={s.id}
                    hover
                    onClick={() => setConfig({ ...config, scenario: s.id })}
                    className={`p-3 cursor-pointer transition-all ${
                      config.scenario === s.id ? "border-brand-cyan/40 bg-brand-cyan/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-textPrimary">{s.label}</p>
                          {s.difficulty_modifier > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-orange/15 text-brand-orange font-bold">HARD</span>
                          )}
                          {s.difficulty_modifier < 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-green/15 text-brand-green font-bold">EASY</span>
                          )}
                        </div>
                        <p className="text-xs text-textMuted leading-relaxed line-clamp-2">{s.description}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {s.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-textMuted">{tag}</span>
                          ))}
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-purple/10 text-brand-purple">
                            {s.question_count} questions
                          </span>
                        </div>
                      </div>
                      {config.scenario === s.id && <StatusBadge variant="cyan">Selected</StatusBadge>}
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Difficulty */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-textPrimary text-center mb-2">Set Difficulty</h2>
              <p className="text-sm text-textSecondary text-center mb-6">Choose the intensity of your practice session.</p>
              <div className="space-y-3">
                {difficulties.map((d) => (
                  <GlassCard
                    key={d.id}
                    hover
                    onClick={() => setConfig({ ...config, difficulty: d.id })}
                    className={`p-4 flex items-center gap-4 cursor-pointer transition-all ${
                      config.difficulty === d.id ? "border-brand-cyan/40 bg-brand-cyan/5" : ""
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center ${d.color}`}>
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-textPrimary">{d.label}</p>
                      <p className="text-xs text-textMuted">{d.desc}</p>
                    </div>
                    {config.difficulty === d.id && <StatusBadge variant="cyan">Selected</StatusBadge>}
                  </GlassCard>
                ))}
              </div>

              {/* Question count */}
              <div className="mt-6">
                <p className="text-sm text-textSecondary mb-3">Number of Questions</p>
                <div className="flex gap-2">
                  {[3, 5, 7, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setConfig({ ...config, questionCount: n })}
                      className={`px-4 py-2 rounded-lg text-sm transition cursor-pointer ${
                        config.questionCount === n
                          ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30"
                          : "bg-white/[0.04] text-textMuted border border-white/[0.06] hover:text-textPrimary"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Focus area */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-textPrimary text-center mb-2">Focus Area</h2>
              <p className="text-sm text-textSecondary text-center mb-6">What type of questions do you want to practice?</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {focusAreas.map((f) => (
                  <GlassCard
                    key={f.id}
                    hover
                    onClick={() => setConfig({ ...config, focusArea: f.id })}
                    className={`p-4 text-center cursor-pointer transition-all ${
                      config.focusArea === f.id ? "border-brand-cyan/40 bg-brand-cyan/5" : ""
                    }`}
                  >
                    <p className="text-sm font-semibold text-textPrimary">{f.label}</p>
                  </GlassCard>
                ))}
              </div>

              {/* Stealth toggle */}
              <div className="mt-6">
                <GlassCard
                  hover
                  onClick={() => setConfig({ ...config, enableStealth: !config.enableStealth })}
                  className={`p-4 flex items-center gap-4 cursor-pointer ${
                    config.enableStealth ? "border-brand-green/40 bg-brand-green/5" : ""
                  }`}
                >
                  <Shield className={`w-6 h-6 ${config.enableStealth ? "text-brand-green" : "text-textMuted"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-textPrimary">Enable Stealth Mode</p>
                    <p className="text-xs text-textMuted">Overlay answers invisibly during real interviews</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full transition-colors ${config.enableStealth ? "bg-brand-green" : "bg-white/[0.1]"}`}>
                    <motion.div
                      className="w-5 h-5 rounded-full bg-white shadow mt-0.5 ml-0.5"
                      animate={{ x: config.enableStealth ? 20 : 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </GlassCard>
              </div>
            </div>
          )}

          {/* Step 4: Summary + Start */}
          {step === 4 && (
            <div className="text-center">
              <Sparkles className="w-10 h-10 text-brand-cyan mx-auto mb-4" />
              <h2 className="text-xl font-bold text-textPrimary mb-2">You're Ready!</h2>
              <p className="text-sm text-textSecondary mb-8">Review your session setup and begin.</p>

              <GlassCard className="p-6 max-w-md mx-auto text-left space-y-3 mb-8">
                <div className="flex justify-between">
                  <span className="text-sm text-textMuted">Company</span>
                  <span className="text-sm text-textPrimary font-medium">{selectedCompany?.icon} {selectedCompany?.label}</span>
                </div>
                <div className="h-px bg-white/[0.04]" />
                <div className="flex justify-between">
                  <span className="text-sm text-textMuted">Scenario</span>
                  <span className="text-sm text-textPrimary font-medium">{selectedScenario?.label || "Free-form"}</span>
                </div>
                <div className="h-px bg-white/[0.04]" />
                <div className="flex justify-between">
                  <span className="text-sm text-textMuted">Difficulty</span>
                  <span className={`text-sm font-medium ${selectedDifficulty?.color}`}>{selectedDifficulty?.label}</span>
                </div>
                <div className="h-px bg-white/[0.04]" />
                <div className="flex justify-between">
                  <span className="text-sm text-textMuted">Questions</span>
                  <span className="text-sm text-textPrimary font-medium">{config.questionCount}</span>
                </div>
                <div className="h-px bg-white/[0.04]" />
                <div className="flex justify-between">
                  <span className="text-sm text-textMuted">Focus</span>
                  <span className="text-sm text-textPrimary font-medium capitalize">{config.focusArea}</span>
                </div>
                {config.enableStealth && (
                  <>
                    <div className="h-px bg-white/[0.04]" />
                    <div className="flex justify-between">
                      <span className="text-sm text-textMuted">Stealth</span>
                      <StatusBadge variant="green" pulse>Active</StatusBadge>
                    </div>
                  </>
                )}
              </GlassCard>

              <NeonButton size="lg" onClick={() => onStart(config)}>
                <Mic className="w-5 h-5 mr-2" /> Start Interview <ArrowRight className="w-4 h-4 ml-2" />
              </NeonButton>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Nav buttons */}
      {step < STEPS.length - 1 && (
        <div className="flex justify-between mt-8">
          <GhostButton size="sm" onClick={prev}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </GhostButton>
          <NeonButton size="sm" onClick={next}>
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </NeonButton>
        </div>
      )}
      {step === STEPS.length - 1 && step > 0 && (
        <div className="flex justify-center mt-4">
          <GhostButton size="sm" onClick={prev}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to edit
          </GhostButton>
        </div>
      )}
    </div>
  );
}
