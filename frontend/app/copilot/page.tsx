"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Eye, EyeOff, Copy, Settings, Play, Square,
  Volume2, Zap, Clock, CheckCircle, AlertTriangle, Briefcase,
  UserCircle, FileText, Upload, Sparkles, BrainCircuit, Activity,
  TrendingUp, Shield, MessageSquare, Layers, BookOpen, Plus,
  Trash2, BarChart3, Target, Award, ArrowUpRight, Radio, Terminal,
  ChevronRight, Lock, Cpu, Radar, XCircle, Flame, RefreshCw,
  ChevronDown, ChevronUp, WifiOff, Wifi, Star, Crosshair,
  Building2, Gauge, TriangleAlert, Info, Hash, Wand2, Bot,
  Bookmark, Lightbulb, Download, Dumbbell, ListOrdered,
  Camera, Image, Loader2,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { GlassCard, NeonButton, StatusBadge, Modal } from "@/components/ui";

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type Stage = "config" | "live" | "report";
type QuestionType = "behavioral" | "technical" | "trap" | "culture" | "negotiation" | "unknown";
type ModelRoute = "gpt5" | "gpt41" | "claude45" | "gemini3" | "gemini25flash" | "grok4" | "deepseek";

interface ModelResult {
  route: ModelRoute;
  label: string;
  answer: string;
  confidence: number;
  latencyMs: number;
  color: string;
}

interface LiveTranscriptLine {
  speaker: "interviewer" | "you";
  text: string;
  time: string;
  type: QuestionType;
  fillerCount?: number;
}

interface QA { question: string; answer: string }

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const QUESTION_TYPE_META: Record<QuestionType, { label: string; color: string; bg: string; border: string; desc: string }> = {
  behavioral:  { label: "BEHAVIORAL",  color: "text-brand-purple", bg: "bg-brand-purple/10", border: "border-brand-purple/25", desc: "Pattern-matched to STAR opportunities" },
  technical:   { label: "TECHNICAL",   color: "text-brand-cyan",   bg: "bg-brand-cyan/10",   border: "border-brand-cyan/25",   desc: "Deep-reasoning path activated" },
  trap:        { label: "TRAP",        color: "text-brand-red",    bg: "bg-brand-red/10",    border: "border-brand-red/25",    desc: "Deflection strategy queued" },
  culture:     { label: "CULTURE FIT", color: "text-brand-amber",  bg: "bg-brand-amber/10",  border: "border-brand-amber/25",  desc: "Values alignment module on" },
  negotiation: { label: "NEGOTIATION", color: "text-brand-green",  bg: "bg-brand-green/10",  border: "border-brand-green/25",  desc: "Leverage coaching active" },
  unknown:     { label: "DETECTING…",  color: "text-textMuted",    bg: "bg-white/[0.03]",    border: "border-white/[0.08]",    desc: "Intent classifier processing" },
};

const MODEL_META: Record<ModelRoute, { label: string; color: string; icon: string }> = {
  gpt5:          { label: "GPT-5",            color: "text-brand-cyan",   icon: "⬡" },
  gpt41:         { label: "GPT-4.1",          color: "text-brand-cyan",   icon: "⬢" },
  claude45:      { label: "Claude 4.5",       color: "text-brand-purple", icon: "◆" },
  gemini3:       { label: "Gemini 3 Pro",     color: "text-brand-amber",  icon: "◈" },
  gemini25flash: { label: "Gemini 2.5 Flash", color: "text-brand-amber",  icon: "◇" },
  grok4:         { label: "Grok 4",           color: "text-brand-red",    icon: "✦" },
  deepseek:      { label: "DeepSeek",         color: "text-brand-green",  icon: "◎" },
};

const COMPANY_INTEL: Record<string, { focus: string[]; redFlags: string[]; rubric: string }> = {
  "Google": {
    focus: ["Scalability first", "Data structure awareness", "System design breadth"],
    redFlags: ["Vague scaling claims", "Missing Big-O analysis", "Skipping edge cases"],
    rubric: "Googleyness: autonomy, helpfulness, humility",
  },
  "Meta": {
    focus: ["Move fast culture", "Cross-functional impact", "Data-driven decisions"],
    redFlags: ["No metric usage", "Single-team scope answers", "Slow iteration mindset"],
    rubric: "Impact at scale: execution speed + reach",
  },
  "Amazon": {
    focus: ["Leadership Principles depth", "Customer obsession", "Ownership language"],
    redFlags: ["Team credit sharing", "Missing LP references", "No ownership framing"],
    rubric: "Leadership Principle alignment in every answer",
  },
  "Stripe": {
    focus: ["Developer empathy", "Precision in language", "API design thinking"],
    redFlags: ["Vague technical claims", "Weak tradeoff reasoning", "No user empathy"],
    rubric: "Engineering excellence + thoughtful tradeoffs",
  },
};

const DEMO_TRANSCRIPT: LiveTranscriptLine[] = [
  { speaker: "interviewer", text: "Tell me about a time you led a difficult technical initiative under pressure.", time: "0:32", type: "behavioral" },
  { speaker: "you", text: "At my last company we had a critical payment outage at 3am on Black Friday. I assembled a cross-functional bridge in under 8 minutes.", time: "0:47", type: "behavioral", fillerCount: 0 },
  { speaker: "interviewer", text: "How did you handle disagreement with engineering leadership on the solution approach?", time: "1:18", type: "trap" },
  { speaker: "you", text: "I documented both approaches with projected outcomes and let the data decide. Leadership adapted.", time: "1:31", type: "trap", fillerCount: 1 },
  { speaker: "interviewer", text: "Walk me through your distributed systems design for a global payment processor.", time: "2:05", type: "technical" },
];

const DEMO_MODEL_RESULTS: ModelResult[] = [
  {
    route: "gpt5",
    label: "GPT-5",
    answer: "Lead with the measurable outcome first: 84% failure rate reduction. Then explain the architecture shift from synchronous saga to event-driven choreography with Kafka. Quantify: p99 latency dropped from 780ms to 130ms, throughput doubled to 50K TPS.",
    confidence: 97,
    latencyMs: 285,
    color: "brand-cyan",
  },
  {
    route: "claude45",
    label: "Claude 4.5",
    answer: "Start with context: 'I architected a geo-distributed payment system handling 50K TPS.' Then describe your partition-aware Kafka topology, idempotent consumer design, and the tradeoff you made between consistency and availability using saga compensation.",
    confidence: 95,
    latencyMs: 264,
    color: "brand-purple",
  },
];

const DEMO_COACH = {
  pacing: "Strong command. Pause 1.5s before the result metric — builds anticipation.",
  trapAlert: "They are testing blame attribution. Never say 'the team failed'. Say 'we identified a gap and I drove the fix'.",
  fillerWords: { um: 2, so: 4, like: 1, total: 7, trend: "down" as const },
  energyScore: 82,
  gazeScore: 78,
  bodyLanguage: "Looking slightly down at notes. Maintain camera level for authority signals.",
  competitorScore: { google: 88, meta: 91, amazon: 85, stripe: 79 },
};

const DEMO_SPEECH_ANALYTICS = {
  structure: 88,
  clarity: 82,
  confidence: 91,
  impact: 76,
  pacing: 85,
  engagement: 79,
};

const OFFER_HISTORY = [0, 52, 61, 68, 74, 78, 83, 87, 89, 91];

const DEMO_STAR_BREAKDOWN = {
  situation: { text: "Critical payment outage at 3am on Black Friday", score: 95, pct: 15 },
  task: { text: "Assemble cross-functional bridge and restore payments", score: 92, pct: 20 },
  action: { text: "Documented approaches with projected outcomes, let data decide", score: 97, pct: 40 },
  result: { text: "84% failure rate reduction, p99 latency 780ms → 130ms", score: 98, pct: 25 },
};

const DEMO_FOLLOW_UPS: { question: string; probability: number; type: QuestionType }[] = [
  { question: "How did you measure the success of this initiative?", probability: 87, type: "technical" },
  { question: "What would you do differently looking back?", probability: 72, type: "behavioral" },
  { question: "How did other teams respond to your leadership?", probability: 58, type: "culture" },
];

const DEMO_POWER_WORDS: { word: string; count: number; impact: "high" | "medium" | "low" }[] = [
  { word: "led", count: 3, impact: "high" },
  { word: "reduced", count: 2, impact: "high" },
  { word: "quantified", count: 1, impact: "high" },
  { word: "collaborated", count: 2, impact: "medium" },
  { word: "optimized", count: 1, impact: "medium" },
  { word: "managed", count: 3, impact: "low" },
];

const DEMO_RUBRIC_LIVE: { criterion: string; score: number }[] = [
  { criterion: "Technical Depth", score: 91 },
  { criterion: "Leadership Signal", score: 88 },
  { criterion: "Metric Usage", score: 95 },
  { criterion: "Company Values", score: 82 },
  { criterion: "Communication", score: 87 },
];

const DEMO_DETAILED_QA = [
  {
    question: "Tell me about leading a difficult technical initiative under pressure.",
    yourAnswer: "At my last company we had a critical payment outage at 3am on Black Friday. I assembled a cross-functional bridge in under 8 minutes, documented both approaches with projected outcomes, and the data-driven solution I championed reduced failures by 84%.",
    score: 94, type: "behavioral" as QuestionType, duration: "1:47", idealDuration: "2:00",
    strengths: ["Strong metric usage (84%)", "Clear STAR structure", "Ownership language ('I assembled')"],
    improvements: ["Add team size for scale signal", "Mention revenue impact in dollar terms"],
    aiSuggestion: "Open with the result: 'I reduced payment failures by 84% during a Black Friday outage by assembling a cross-functional response in under 8 minutes.' Then walk through S→T→A→R.",
    star: { s: 95, t: 92, a: 97, r: 98 },
  },
  {
    question: "How did you handle disagreement with engineering leadership?",
    yourAnswer: "I documented both approaches with projected outcomes and let the data decide. Leadership adapted their initial position once the risk analysis was clear.",
    score: 89, type: "trap" as QuestionType, duration: "1:12", idealDuration: "1:30",
    strengths: ["Avoided blame language", "Data-driven framing", "Showed respect for leadership"],
    improvements: ["Add specific data points you used", "Describe the outcome metric"],
    aiSuggestion: "Add a concrete result: 'I created a risk matrix comparing both approaches across 5 dimensions. The data showed a 3x latency improvement, and leadership pivoted within the hour.'",
    star: { s: 88, t: 85, a: 92, r: 84 },
  },
  {
    question: "Walk me through your distributed systems design for a global payment processor.",
    yourAnswer: "I architected a geo-distributed payment system handling 50K TPS using event-driven choreography with Kafka. Key decisions: partition-aware topology, idempotent consumers, and saga compensation.",
    score: 96, type: "technical" as QuestionType, duration: "2:34", idealDuration: "2:30",
    strengths: ["Excellent technical depth", "Clear architecture vocabulary", "Mentioned trade-offs"],
    improvements: ["Slightly over time — trim the Kafka partition detail", "Add latency SLA commitment"],
    aiSuggestion: "Perfect answer. Minor tweak: lead with the scale number ('50K TPS globally') and cut 15s from the partition detail to hit 2:30.",
    star: { s: 96, t: 94, a: 98, r: 95 },
  },
  {
    question: "What is your greatest weakness?",
    yourAnswer: "I tend to over-prepare, which I've channeled into creating documentation systems that my last three teams adopted company-wide.",
    score: 82, type: "behavioral" as QuestionType, duration: "0:58", idealDuration: "1:30",
    strengths: ["Reframed weakness as strength", "Provided evidence"],
    improvements: ["Too brief — expand with a specific example", "Show active improvement steps"],
    aiSuggestion: "Make it authentic: 'I used to over-prepare to the point of analysis paralysis. I now set a decision deadline — 48h max — and I've shipped 3 major features faster since then.'",
    star: { s: 78, t: 80, a: 85, r: 82 },
  },
];

const DEMO_PRACTICE_DRILLS = [
  { area: "Pause Before Metrics", type: "Delivery", difficulty: "Easy" as const, mins: 5, desc: "Practice counting to 2 silently before stating any number or percentage" },
  { area: "Trade-off Articulation", type: "Technical", difficulty: "Medium" as const, mins: 15, desc: "Record yourself explaining 3 architecture decisions, each with explicit pros/cons" },
  { area: "Filler Elimination", type: "Communication", difficulty: "Hard" as const, mins: 20, desc: "Give a 2-min answer on any topic with zero filler words — record and review" },
  { area: "Weakness Depth", type: "Behavioral", difficulty: "Medium" as const, mins: 10, desc: "Rewrite your weakness answer with a specific story and measurable improvement" },
  { area: "Time Calibration", type: "Delivery", difficulty: "Medium" as const, mins: 15, desc: "Practice answering 3 questions within exactly 90–120s each using a timer" },
];

const DEMO_SESSION_TIMELINE = [
  { time: "0:00", event: "Session started", type: "system" },
  { time: "0:32", event: "Q1: Behavioral — difficult initiative", type: "question" },
  { time: "0:47", event: "Strong answer — 94/100", type: "highlight" },
  { time: "1:18", event: "Q2: Trap — leadership disagreement", type: "warning" },
  { time: "1:31", event: "Deflection successful — 89/100", type: "highlight" },
  { time: "2:05", event: "Q3: Technical — distributed systems", type: "question" },
  { time: "2:34", event: "Deep-dive — 96/100", type: "highlight" },
  { time: "3:12", event: "Q4: Behavioral — weakness", type: "question" },
  { time: "3:58", event: "Answer too brief — 82/100", type: "warning" },
  { time: "4:30", event: "Session ended", type: "system" },
];

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function OfferMeter({ value }: { value: number }) {
  const color = value >= 80 ? "from-brand-green to-brand-cyan" : value >= 60 ? "from-brand-amber to-brand-green" : "from-brand-red to-brand-amber";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-textMuted uppercase tracking-wider flex items-center gap-1">
          <Gauge className="w-3 h-3" /> Offer Probability
        </span>
        <span className={`text-lg font-bold ${value >= 80 ? "text-brand-green" : value >= 60 ? "text-brand-amber" : "text-brand-red"}`}>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-textMuted">
        <span>Weak</span><span>Strong</span><span>Lock</span>
      </div>
    </div>
  );
}

function FillerWordBadge({ count, word }: { count: number; word: string }) {
  const level = count >= 5 ? "brand-red" : count >= 3 ? "brand-amber" : "brand-green";
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-${level}/10 border border-${level}/20`}>
      <span className={`text-[10px] font-mono font-bold text-${level}`}>"{word}"</span>
      <span className={`text-[10px] font-bold text-${level}`}>×{count}</span>
    </div>
  );
}

function QuestionTypeBadge({ type }: { type: QuestionType }) {
  const meta = QUESTION_TYPE_META[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${meta.color} ${meta.bg} border ${meta.border}`}>
      <Crosshair className="w-2.5 h-2.5" /> {meta.label}
    </span>
  );
}

function OfferSparkline({ history }: { history: number[] }) {
  const max = 100, w = 120, h = 32;
  const pts = history.map((v, i) => `${(i / (history.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline points={pts} fill="none" stroke="url(#sg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#FF4466" />
          <stop offset="60%" stopColor="#FFB800" />
          <stop offset="100%" stopColor="#00FF88" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function StarBreakdownPanel({ data }: { data: typeof DEMO_STAR_BREAKDOWN }) {
  const segments = [
    { key: "situation" as const, label: "S", full: "Situation", color: "brand-cyan" },
    { key: "task" as const, label: "T", full: "Task", color: "brand-purple" },
    { key: "action" as const, label: "A", full: "Action", color: "brand-amber" },
    { key: "result" as const, label: "R", full: "Result", color: "brand-green" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        {segments.map(s => (
          <motion.div key={s.key} className={`bg-${s.color}/70 rounded-full`}
            initial={{ width: 0 }} animate={{ width: `${data[s.key].pct}%` }} transition={{ duration: 0.6, delay: 0.1 }} />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {segments.map(s => (
          <div key={s.key} className={`p-2 rounded-lg border border-${s.color}/15 bg-${s.color}/5`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] font-bold text-${s.color}`}>{s.full}</span>
              <span className={`text-[10px] font-bold text-${s.color}`}>{data[s.key].score}</span>
            </div>
            <p className="text-[9px] text-textMuted leading-tight line-clamp-2">{data[s.key].text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnswerTimer({ seconds, ideal }: { seconds: number; ideal: number }) {
  const pct = Math.min((seconds / ideal) * 100, 100);
  const over = seconds > ideal;
  const color = over ? "brand-red" : pct > 80 ? "brand-amber" : "brand-green";
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return (
    <div className="flex items-center gap-3">
      <Clock className={`w-3.5 h-3.5 text-${color} shrink-0`} />
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div className={`h-full rounded-full bg-${color}`} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
      </div>
      <span className={`text-[10px] font-mono font-bold text-${color} shrink-0`}>
        {fmt(seconds)} / {fmt(ideal)}
      </span>
      {over && <span className="text-[9px] text-brand-red font-bold animate-pulse shrink-0">OVER TIME</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function CopilotPage() {
  const [stage, setStage] = useState<Stage>("config");

  // ── Config State ──
  const [scenario, setScenario] = useState("Interview");
  const [company, setCompany] = useState("Google");
  const [role, setRole] = useState("");
  const [objective, setObjective] = useState("Behavioral Interview");
  const [tone, setTone] = useState("Professional");
  const [framework, setFramework] = useState("STAR");
  const [primaryModel, setPrimaryModel] = useState<ModelRoute>("gpt5");
  const [dualModel, setDualModel] = useState(true);
  const [panicKey, setPanicKey] = useState("Ctrl+Shift+P");
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [jdUploaded, setJdUploaded] = useState(false);
  const [knowledgeUploaded, setKnowledgeUploaded] = useState(false);
  const [qaEntries, setQaEntries] = useState<QA[]>([{ question: "", answer: "" }]);
  const [instructions, setInstructions] = useState(
    `Act as an elite Executive Interview Coach for [Company]. Mirror the resume, elevate answers with the STAR framework.\n\n1. Every answer must include a quantifiable metric.\n2. Infuse the company's core values into every response.\n3. Maintain a 'Confident, Visionary, yet Humble' tone.\n4. Predict the follow-up question and pre-position for it.`
  );
  const [stealthOn, setStealthOn] = useState(true);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [screenshotUploaded, setScreenshotUploaded] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [imageContext, setImageContext] = useState("");
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const liveScreenshotInputRef = useRef<HTMLInputElement>(null);

  // ── Live State ──
  const [micOn, setMicOn] = useState(true);
  const [deepThink, setDeepThink] = useState(false);
  const [offerProbability, setOfferProbability] = useState(74);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState<QuestionType>("technical");
  const [selectedModel, setSelectedModel] = useState<ModelRoute>("gpt5");
  const [panicMode, setPanicMode] = useState(false);
  const [showCoachPanel, setShowCoachPanel] = useState(true);
  const [showCompetitorIntel, setShowCompetitorIntel] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGenSeconds, setAiGenSeconds] = useState(0);
  const aiGenTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Report State ──
  const [activeReportTab, setActiveReportTab] = useState<"overview" | "transcript" | "coaching" | "intel" | "drills" | "timeline">("overview");
  const [answerSeconds, setAnswerSeconds] = useState(67);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [expandedQA, setExpandedQA] = useState<number | null>(null);

  const addQA = () => setQaEntries(p => [...p, { question: "", answer: "" }]);
  const updateQA = (i: number, f: keyof QA, v: string) =>
    setQaEntries(p => p.map((e, idx) => idx === i ? { ...e, [f]: v } : e));
  const removeQA = (i: number) => setQaEntries(p => p.filter((_, idx) => idx !== i));

  const formatTimer = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const startSession = () => {
    if (stealthOn) { setShowDownloadModal(true); return; }
    launchLive();
  };

  const launchLive = () => {
    setStage("live");
    setSessionSeconds(0);
    sessionTimer.current = setInterval(() => setSessionSeconds(s => s + 1), 1000);
  };

  const endSession = () => {
    if (sessionTimer.current) clearInterval(sessionTimer.current);
    setStage("report");
  };

  useEffect(() => () => { if (sessionTimer.current) clearInterval(sessionTimer.current); }, []);

  // Keyboard panic shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P" && stage === "live") {
        e.preventDefault();
        setPanicMode(v => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stage]);

  const copyAnswer = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1600);
  }, []);

  const handleScreenshot = useCallback((e: React.ChangeEvent<HTMLInputElement>, isLive = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setScreenshotPreview(url);
    setScreenshotUploaded(true);
    if (isLive) {
      // Simulate AI generating an answer from the screenshot
      setAiGenerating(true);
      setAiGenSeconds(0);
      if (aiGenTimer.current) clearInterval(aiGenTimer.current);
      aiGenTimer.current = setInterval(() => setAiGenSeconds(s => s + 1), 1000);
      setTimeout(() => {
        setAiGenerating(false);
        if (aiGenTimer.current) clearInterval(aiGenTimer.current);
        setAiGenSeconds(0);
      }, 32000); // ~32s realistic generation time
    }
  }, []);

  const triggerScreenshotUpload = useCallback((isLive = false) => {
    if (isLive) {
      liveScreenshotInputRef.current?.click();
    } else {
      screenshotInputRef.current?.click();
    }
  }, []);

  const companyIntel = COMPANY_INTEL[company] || null;

  // ─────────────────────────────────────── PANIC MODE ─────────────────────────
  if (panicMode) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-textPrimary">Browser History</h1>
            <button onClick={() => setPanicMode(false)} className="text-xs text-textMuted hover:text-textPrimary px-3 py-1.5 rounded border border-white/10 bg-white/5">
              Restore Session (Ctrl+Shift+P)
            </button>
          </div>
          <div className="space-y-2 opacity-50">
            {["LinkedIn — Jobs","Google — Software Engineer roles","Your Email — Inbox","GitHub — Repositories","MDN Web Docs — Array.prototype"].map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] text-sm text-textSecondary">
                <div className="w-4 h-4 rounded bg-white/10" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-8xl mx-auto">

        {/* ── PAGE HEADER ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center shadow-[0_0_16px_rgba(0,212,255,0.25)]">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-textPrimary tracking-tight">Signal Copilot</h1>
              <p className="text-xs text-textMuted">Dual-model · Intent-aware · Undetectable</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {stage === "live" && (
              <>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand-green/30 bg-brand-green/8 text-[11px] font-bold text-brand-green">
                  <Radio className="w-3 h-3 animate-pulse" /> LIVE · {formatTimer(sessionSeconds)}
                </span>
                <button
                  onClick={() => setPanicMode(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand-red/30 bg-brand-red/8 text-[11px] font-bold text-brand-red hover:bg-brand-red/15 transition"
                  title="Panic hide — Ctrl+Shift+P"
                >
                  <XCircle className="w-3 h-3" /> PANIC
                </button>
              </>
            )}
            <StatusBadge variant={stage === "live" ? "green" : stage === "config" ? "amber" : "purple"}>
              {stage === "live" ? "Session Active" : stage === "config" ? "Ready to Configure" : "Session Complete"}
            </StatusBadge>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ═══════════════════════════════════════════════════════════
              STAGE 1: CONFIGURATION
          ═══════════════════════════════════════════════════════════ */}
          {stage === "config" && (
            <motion.div key="config" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

              <div className="grid lg:grid-cols-3 gap-5">

                {/* ── 1. Scenario & Target ── */}
                <GlassCard className="p-5 lg:col-span-2 space-y-5">
                  <h2 className="text-sm font-semibold text-textPrimary flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-brand-cyan" /> Session Target
                  </h2>

                  {/* Scenario chips */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {[
                      { label: "Interview", icon: UserCircle },
                      { label: "Assessment", icon: Target },
                      { label: "Negotiation", icon: BarChart3 },
                      { label: "Phone Screen", icon: Radio },
                    ].map(({ label, icon: Icon }) => (
                      <button key={label} onClick={() => setScenario(label)}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-1.5 ${scenario === label ? "bg-brand-cyan/15 border-brand-cyan/40 text-brand-cyan shadow-[0_0_12px_rgba(0,212,255,0.12)]" : "bg-white/[0.02] border-white/[0.06] text-textMuted hover:border-white/[0.12]"}`}
                      >
                        <Icon className="w-4 h-4" />{label}
                      </button>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-textMuted uppercase tracking-wider">Company</label>
                      <input
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-brand-cyan transition"
                        placeholder="e.g. Google, Stripe, Amazon"
                        value={company} onChange={e => setCompany(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-textMuted uppercase tracking-wider">Target Role</label>
                      <input
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-brand-cyan transition"
                        placeholder="e.g. Senior Staff Engineer, L6"
                        value={role} onChange={e => setRole(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Company Intel preview */}
                  {companyIntel && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-brand-amber/20 bg-brand-amber/5 p-3 space-y-2">
                      <p className="text-[10px] text-brand-amber font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3 h-3" /> {company} Intelligence Loaded
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-textMuted mb-1">Evaluation Focus</p>
                          <ul className="space-y-0.5">{companyIntel.focus.map((f, i) => <li key={i} className="text-textSecondary flex gap-1.5"><ChevronRight className="w-3 h-3 text-brand-amber shrink-0 mt-0.5" />{f}</li>)}</ul>
                        </div>
                        <div>
                          <p className="text-textMuted mb-1">Red Flags</p>
                          <ul className="space-y-0.5">{companyIntel.redFlags.map((f, i) => <li key={i} className="text-brand-red/80 flex gap-1.5"><TriangleAlert className="w-3 h-3 shrink-0 mt-0.5" />{f}</li>)}</ul>
                        </div>
                      </div>
                      <p className="text-[10px] text-textMuted border-t border-white/[0.06] pt-2"><span className="text-brand-amber">Rubric:</span> {companyIntel.rubric}</p>
                    </motion.div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-textMuted uppercase tracking-wider">Interview Type</label>
                    <select title="Interview type" aria-label="Interview type" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-brand-cyan transition appearance-none"
                      value={objective} onChange={e => setObjective(e.target.value)}>
                      <option className="bg-canvas">Behavioral Interview</option>
                      <option className="bg-canvas">Technical System Design</option>
                      <option className="bg-canvas">Live Coding / Assessment</option>
                      <option className="bg-canvas">Salary Negotiation</option>
                      <option className="bg-canvas">Executive Client Pitch</option>
                      <option className="bg-canvas">Product Sense / PM Loop</option>
                    </select>
                  </div>

                  {/* Document uploads */}
                  <div className="grid md:grid-cols-4 gap-3">
                    {[
                      { label: "Resume", sub: "PDF, DOCX", icon: Upload, state: resumeUploaded, toggle: () => setResumeUploaded(v => !v), color: "brand-green" },
                      { label: "Job Description", sub: "Paste text or upload", icon: FileText, state: jdUploaded, toggle: () => setJdUploaded(v => !v), color: "brand-cyan" },
                      { label: "Knowledge Bank", sub: "Research, prep notes", icon: BookOpen, state: knowledgeUploaded, toggle: () => setKnowledgeUploaded(v => !v), color: "brand-amber" },
                    ].map(({ label, sub, icon: Icon, state, toggle, color }) => (
                      <div key={label}
                        onClick={toggle}
                        className={`border border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${state ? `border-${color}/40 bg-${color}/8` : "border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02]"}`}
                      >
                        {state ? <CheckCircle className={`w-5 h-5 text-${color} mb-2`} /> : <Icon className="w-5 h-5 text-textMuted mb-2" />}
                        <span className="text-sm font-medium text-textPrimary">{state ? `${label} ✓` : label}</span>
                        <span className="text-[10px] text-textMuted mt-1">{sub}</span>
                      </div>
                    ))}
                    {/* Screenshot / Image upload */}
                    <div
                      onClick={() => triggerScreenshotUpload(false)}
                      className={`border border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${screenshotUploaded ? "border-brand-purple/40 bg-brand-purple/8" : "border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02]"}`}
                    >
                      {screenshotUploaded ? <CheckCircle className="w-5 h-5 text-brand-purple mb-2" /> : <Camera className="w-5 h-5 text-textMuted mb-2" />}
                      <span className="text-sm font-medium text-textPrimary">{screenshotUploaded ? "Screenshot ✓" : "Screenshot"}</span>
                      <span className="text-[10px] text-textMuted mt-1">Paste or upload image</span>
                      {screenshotPreview && (
                        <div className="mt-2 w-full h-16 rounded-lg overflow-hidden border border-brand-purple/20">
                          <img src={screenshotPreview} alt="Screenshot preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    <input ref={screenshotInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleScreenshot(e)} aria-label="Upload screenshot" />
                  </div>

                  {/* Image Analysis Context */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                      <Image className="w-3 h-3" /> Image / Visual Context
                      <span className="ml-auto text-[10px] text-textMuted font-mono">{imageContext.length}/1000</span>
                    </label>
                    <textarea
                      title="Image analysis context"
                      placeholder='Describe any visual context for the AI — e.g. "Prioritize system design diagrams" or "Focus on the code, not the UI"'
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-textPrimary focus:outline-none focus:border-brand-purple transition resize-none"
                      rows={2}
                      maxLength={1000}
                      value={imageContext}
                      onChange={e => setImageContext(e.target.value)}
                    />
                    <p className="text-[10px] text-textMuted">Helps the AI interpret screenshots, screen shares, and diagrams during your session.</p>
                  </div>
                </GlassCard>

                {/* ── 2. AI Engine Settings ── */}
                <GlassCard className="p-5 space-y-5">
                  <h2 className="text-sm font-semibold text-textPrimary flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-brand-purple" /> AI Engine
                  </h2>

                  {/* Dual-model toggle */}
                  <div className="p-3 rounded-xl border border-brand-purple/25 bg-brand-purple/8 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-textPrimary">Dual-Model Routing</p>
                        <p className="text-[10px] text-textMuted mt-0.5">Run 2 models in parallel, pick best answer</p>
                      </div>
                      <div className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${dualModel ? "bg-brand-purple" : "bg-white/10"}`}
                        onClick={() => setDualModel(v => !v)}>
                        <motion.div className="w-4 h-4 rounded-full bg-white" animate={{ x: dualModel ? 20 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5">
                      {(Object.entries(MODEL_META) as [ModelRoute, typeof MODEL_META[ModelRoute]][]).map(([k, m]) => (
                        <button key={k} onClick={() => setPrimaryModel(k)}
                          className={`py-1.5 text-[10px] rounded-lg border font-bold transition ${primaryModel === k ? `border-brand-purple/50 bg-brand-purple/20 ${m.color}` : "border-white/[0.06] text-textMuted hover:bg-white/[0.04]"}`}>
                          {m.icon} {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-textMuted uppercase tracking-wider">Delivery Tone</label>
                    <select title="Delivery tone" aria-label="Delivery tone" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-brand-purple transition"
                      value={tone} onChange={e => setTone(e.target.value)}>
                      <option className="bg-canvas">Professional</option>
                      <option className="bg-canvas">Conversational</option>
                      <option className="bg-canvas">Serious & Direct</option>
                      <option className="bg-canvas">Visionary</option>
                      <option className="bg-canvas">Executive</option>
                    </select>
                  </div>

                  {/* Framework */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-textMuted uppercase tracking-wider">Answer Framework</label>
                    <select title="Answer framework" aria-label="Answer framework" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-textPrimary focus:outline-none focus:border-brand-purple transition"
                      value={framework} onChange={e => setFramework(e.target.value)}>
                      <option className="bg-canvas">STAR</option>
                      <option className="bg-canvas">SOAR</option>
                      <option className="bg-canvas">PAR</option>
                      <option className="bg-canvas">SPQA (Sales-style)</option>
                      <option className="bg-canvas">Freeform</option>
                    </select>
                  </div>

                  {/* Stealth toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-brand-green/8 border border-brand-green/25">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-brand-green" />
                      <div>
                        <p className="text-sm font-medium text-textPrimary">Stealth Mode</p>
                        <p className="text-[10px] text-textMuted">Invisible to screen share</p>
                      </div>
                    </div>
                    <div className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${stealthOn ? "bg-brand-green" : "bg-white/10"}`}
                      onClick={() => setStealthOn(v => !v)}>
                      <motion.div className="w-4 h-4 rounded-full bg-white" animate={{ x: stealthOn ? 20 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                    </div>
                  </div>

                  {/* Panic key config */}
                  <div className="p-3 rounded-xl bg-brand-red/8 border border-brand-red/20 space-y-1.5">
                    <p className="text-[10px] text-brand-red font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <XCircle className="w-3 h-3" /> Panic Hide Key
                    </p>
                    <p className="text-[11px] text-textMuted">Instantly hides copilot and shows fake browser tab.</p>
                    <kbd className="text-[11px] text-brand-red font-mono px-2 py-0.5 rounded border border-brand-red/30 bg-brand-red/10">{panicKey}</kbd>
                  </div>
                </GlassCard>

                {/* ── 3. Q&A Training ── */}
                <GlassCard className="p-5 lg:col-span-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-textPrimary flex items-center gap-2">
                      <Target className="w-4 h-4 text-brand-green" /> Q&A Voice Training
                    </h2>
                    <span className="text-[10px] text-textMuted bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-full">Teaches AI your voice + story</span>
                  </div>
                  <p className="text-xs text-textMuted">Add questions you expect. The AI will mirror your preferred phrasing, metrics, and story structure in every live response.</p>
                  <div className="space-y-3">
                    {qaEntries.map((entry, idx) => (
                      <div key={idx} className="grid md:grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <div className="space-y-1">
                          <label className="text-[10px] text-textMuted uppercase tracking-wider">Expected Question</label>
                          <input className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-textPrimary focus:outline-none focus:border-brand-green transition"
                            placeholder="e.g. Tell me about your greatest weakness"
                            value={entry.question} onChange={e => updateQA(idx, "question", e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-textMuted uppercase tracking-wider">Preferred Answer</label>
                          <div className="flex gap-2">
                            <input className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-textPrimary focus:outline-none focus:border-brand-green transition"
                              placeholder="e.g. I tend to over-prepare, which I've channeled into..."
                              value={entry.answer} onChange={e => updateQA(idx, "answer", e.target.value)} />
                            {qaEntries.length > 1 && (
                              <button onClick={() => removeQA(idx)} title="Remove Q&A pair" aria-label="Remove Q&A pair" className="p-2 rounded-lg text-textMuted hover:text-brand-red hover:bg-brand-red/10 transition">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={addQA} className="flex items-center gap-2 text-xs text-brand-green hover:text-brand-green/80 transition">
                    <Plus className="w-3.5 h-3.5" /> Add Q&A pair
                  </button>
                </GlassCard>

                {/* ── 4. Advanced Prompt ── */}
                <GlassCard className="p-5 lg:col-span-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-textPrimary flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-brand-amber" /> Advanced Prompt Engineering
                    </h2>
                    <span className="text-[10px] bg-brand-amber/20 text-brand-amber px-2 py-0.5 rounded-full font-semibold">Secret Sauce</span>
                  </div>
                  <p className="text-xs text-textMuted">This system prompt defines your AI persona. The more specific you are about your story, values, and target company, the higher your offer probability.</p>
                  <textarea
                    title="Session instructions"
                    placeholder="Describe your background, target role, and key stories to use. The more specific, the higher your offer probability."
                    className="w-full h-32 bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3 text-xs text-textSecondary font-code leading-relaxed focus:outline-none focus:border-brand-amber transition custom-scrollbar resize-none"
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                  />
                  <div className="flex items-center justify-between border-t border-white/[0.05] pt-4">
                    <div className="flex items-center gap-3 text-xs text-textMuted">
                      {resumeUploaded && <span className="flex items-center gap-1 text-brand-green"><CheckCircle className="w-3 h-3" /> Resume</span>}
                      {jdUploaded && <span className="flex items-center gap-1 text-brand-green"><CheckCircle className="w-3 h-3" /> JD</span>}
                      {knowledgeUploaded && <span className="flex items-center gap-1 text-brand-green"><CheckCircle className="w-3 h-3" /> Knowledge</span>}
                      {dualModel && <span className="flex items-center gap-1 text-brand-purple"><Layers className="w-3 h-3" /> Dual model on</span>}
                    </div>
                    <NeonButton size="lg" onClick={startSession}>
                      <Zap className="w-4 h-4 mr-2" /> Initialize Copilot
                    </NeonButton>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}



          {/* ===========================================================
              STAGE 2: LIVE SESSION
          =========================================================== */}
          {stage === "live" && (
            <motion.div key="live" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

              {/* â”€â”€ Context bar â”€â”€ */}
              <div className="flex flex-wrap gap-2 text-[11px] items-center p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-cyan/10 text-brand-cyan font-medium"><Cpu className="w-3 h-3" /> {MODEL_META[primaryModel].label}{dualModel ? " + dual" : ""}</span>
                {company && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-amber/10 text-brand-amber font-medium"><Building2 className="w-3 h-3" /> {company}</span>}
                {resumeUploaded && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-green/10 text-brand-green font-medium"><FileText className="w-3 h-3" /> Resume</span>}
                {jdUploaded && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-green/10 text-brand-green font-medium"><Briefcase className="w-3 h-3" /> JD</span>}
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-textMuted"><Shield className="w-3 h-3 text-brand-green" />{stealthOn ? "Cloaked" : "Visible"}</span>
                <span className="ml-auto flex items-center gap-1.5 font-mono text-brand-green"><Clock className="w-3 h-3" /> {formatTimer(sessionSeconds)}</span>
              </div>

              {/* â”€â”€ Controls bar â”€â”€ */}
              <GlassCard className="p-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <NeonButton onClick={endSession} className="!bg-brand-red/15 !border-brand-red/40 !text-brand-red">
                    <Square className="w-3.5 h-3.5 mr-1.5" /> End Session
                  </NeonButton>
                  <div className="h-5 w-px bg-white/[0.1]" />
                  <button onClick={() => setMicOn(v => !v)} className={`p-2 rounded-lg transition border text-xs ${micOn ? "bg-brand-green/15 text-brand-green border-brand-green/30" : "bg-brand-red/15 text-brand-red border-brand-red/30"}`}>
                    {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setDeepThink(v => !v)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition ${deepThink ? "bg-brand-purple/20 text-brand-purple border-brand-purple/40" : "bg-white/5 text-textMuted border-white/10"}`}>
                    <Layers className="w-3.5 h-3.5" /> Deep Think {deepThink ? "ON" : "OFF"}
                  </button>
                  <button onClick={() => setBookmarks(b => [...b, formatTimer(sessionSeconds)])} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-brand-amber/25 bg-brand-amber/8 text-brand-amber text-xs transition hover:bg-brand-amber/15" title="Bookmark this moment" aria-label="Add bookmark">
                    <Bookmark className="w-3.5 h-3.5" /> Bookmark
                  </button>
                  <button onClick={() => triggerScreenshotUpload(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-brand-purple/25 bg-brand-purple/8 text-brand-purple text-xs transition hover:bg-brand-purple/15" title="Upload screenshot of question" aria-label="Upload screenshot">
                    <Camera className="w-3.5 h-3.5" /> Screenshot
                  </button>
                  <input ref={liveScreenshotInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleScreenshot(e, true)} aria-label="Upload live screenshot" />
                  {bookmarks.length > 0 && (
                    <span className="text-[10px] text-brand-amber font-mono">{bookmarks.length} saved</span>
                  )}
                  <div className="flex items-center gap-1.5 ml-1">
                    <span className="text-[10px] text-textMuted">Q-Type:</span>
                    {(["behavioral", "technical", "trap", "culture"] as QuestionType[]).map(t => (
                      <button key={t} onClick={() => setActiveQuestion(t)}
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition ${activeQuestion === t ? `${QUESTION_TYPE_META[t].bg} ${QUESTION_TYPE_META[t].color} ${QUESTION_TYPE_META[t].border}` : "bg-white/[0.03] text-textMuted border-white/[0.06]"}`}>
                        {QUESTION_TYPE_META[t].label}
                      </button>
                    ))}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-textMuted" />
                    <input type="range" min="0" max="100" defaultValue="75" title="Volume" aria-label="Volume" className="w-20 accent-brand-cyan h-1" />
                  </div>
                </div>
              </GlassCard>

              {/* â”€â”€ Answer Timer â”€â”€ */}
              <div className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <AnswerTimer seconds={answerSeconds} ideal={120} />
              </div>

              {/* â”€â”€ Main live grid â€” 3-column: Transcript | AI Answers | Intelligence â”€â”€ */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

                {/* â”€â”€ Left column: Transcript + Offer â”€â”€ */}
                <div className="xl:col-span-3 space-y-4">
                  <GlassCard className={`p-4 flex flex-col ${transcriptExpanded ? "min-h-[600px]" : "min-h-[360px]"}`}>
                    <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.05]">
                      <h2 className="text-sm font-semibold text-textPrimary flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-brand-cyan animate-pulse" /> Live Transcript
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-brand-green font-mono">â— {micOn ? "LISTENING" : "PAUSED"}</span>
                        <button onClick={() => setTranscriptExpanded(v => !v)} className="text-textMuted hover:text-textPrimary transition" title="Toggle transcript size" aria-label="Toggle transcript size">
                          {transcriptExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                      {DEMO_TRANSCRIPT.map((line, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                          className={`p-2.5 rounded-xl border text-xs ${line.type === "trap" ? "bg-brand-red/5 border-brand-red/15" : line.speaker === "interviewer" ? "bg-brand-amber/5 border-brand-amber/15" : "bg-white/[0.02] border-white/[0.04]"}`}
                        >
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-bold ${line.speaker === "interviewer" ? "text-brand-amber" : "text-brand-purple"}`}>
                              {line.speaker === "interviewer" ? "Interviewer" : "You"}
                            </span>
                            <span className="text-[9px] text-textMuted font-mono">{line.time}</span>
                            <QuestionTypeBadge type={line.type} />
                            {line.fillerCount !== undefined && line.fillerCount > 0 && (
                              <span className="text-[9px] text-brand-amber ml-auto">{line.fillerCount} filler</span>
                            )}
                          </div>
                          <p className="text-textSecondary leading-relaxed">{line.text}</p>
                        </motion.div>
                      ))}
                      {/* typing indicator */}
                      <div className="flex items-center gap-2 px-2.5 py-2 text-[11px] text-brand-cyan">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-brand-cyan/60 rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-brand-cyan/60 rounded-full animate-bounce [animation-delay:150ms]" />
                          <div className="w-1.5 h-1.5 bg-brand-cyan/60 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                        Transcribing...
                      </div>
                    </div>
                  </GlassCard>

                  {/* Offer probability + sparkline */}
                  <GlassCard className="p-4 space-y-3">
                    <OfferMeter value={offerProbability} />
                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
                      <span className="text-[10px] text-textMuted">Trend (last 10 answers)</span>
                      <OfferSparkline history={OFFER_HISTORY} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setOfferProbability(p => Math.min(99, p + 4))} className="flex-1 text-[10px] py-1.5 rounded-lg border border-brand-green/25 text-brand-green hover:bg-brand-green/8 transition">+ Strong Answer</button>
                      <button onClick={() => setOfferProbability(p => Math.max(10, p - 5))} className="flex-1 text-[10px] py-1.5 rounded-lg border border-brand-red/25 text-brand-red hover:bg-brand-red/8 transition">âˆ’ Weak Answer</button>
                    </div>
                  </GlassCard>
                </div>

                {/* â”€â”€ Center column: AI Answers + STAR Breakdown â”€â”€ */}
                <div className="xl:col-span-6 space-y-4">

                  {/* Question type banner */}
                  <AnimatePresence mode="wait">
                    <motion.div key={activeQuestion} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`px-4 py-2.5 rounded-xl border flex items-center justify-between ${QUESTION_TYPE_META[activeQuestion].bg} ${QUESTION_TYPE_META[activeQuestion].border}`}
                    >
                      <div className="flex items-center gap-2">
                        <Crosshair className={`w-4 h-4 ${QUESTION_TYPE_META[activeQuestion].color}`} />
                        <span className={`text-sm font-bold ${QUESTION_TYPE_META[activeQuestion].color}`}>{QUESTION_TYPE_META[activeQuestion].label}</span>
                        <span className="text-xs text-textMuted hidden md:inline">Â· {QUESTION_TYPE_META[activeQuestion].desc}</span>
                      </div>
                      {deepThink && (
                        <span className="flex items-center gap-1.5 text-[10px] text-brand-purple font-bold animate-pulse">
                          <Layers className="w-3 h-3" /> Deep Reasoning Active
                        </span>
                      )}
                    </motion.div>
                  </AnimatePresence>

                                    {/* AI Generation Timer */}
                  {aiGenerating && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-brand-cyan animate-spin" />
                          <span className="text-sm font-semibold text-brand-cyan">Generating Answer...</span>
                        </div>
                        <span className="text-[11px] font-mono text-brand-cyan">{aiGenSeconds}s / ~35s</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-purple"
                          initial={{ width: "0%" }}
                          animate={{ width: `${Math.min((aiGenSeconds / 35) * 100, 98)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-textMuted">
                        <span className={aiGenSeconds >= 5 ? "text-brand-green" : ""}>Transcribing question</span>
                        <span className={aiGenSeconds >= 12 ? "text-brand-green" : ""}>{dualModel ? "Routing to 2 models" : "Processing"}</span>
                        <span className={aiGenSeconds >= 20 ? "text-brand-green" : ""}>Structuring STAR</span>
                        <span className={aiGenSeconds >= 30 ? "text-brand-green" : ""}>Optimizing delivery</span>
                      </div>
                      {screenshotPreview && (
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-brand-purple/5 border border-brand-purple/15">
                          <Image className="w-3.5 h-3.5 text-brand-purple shrink-0" />
                          <span className="text-[10px] text-brand-purple font-medium">Analyzing screenshot content...</span>
                          <div className="w-8 h-8 rounded overflow-hidden border border-brand-purple/20 shrink-0 ml-auto">
                            <img src={screenshotPreview} alt="" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

{/* â”€â”€ Dual-Model AI Answers â”€â”€ */}
                  <div className={`grid gap-3 ${dualModel ? "md:grid-cols-2" : "grid-cols-1"}`}>
                    {(dualModel ? DEMO_MODEL_RESULTS : [DEMO_MODEL_RESULTS[0]]).map((result, idx) => (
                      <div key={result.route}
                        className={`rounded-xl border p-4 space-y-3 cursor-pointer transition-all ${selectedModel === result.route ? `border-${result.color}/40 bg-${result.color}/8 shadow-[0_0_20px_rgba(0,0,0,0.3)]` : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14]"}`}
                        onClick={() => setSelectedModel(result.route)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold ${MODEL_META[result.route].color} px-2 py-0.5 rounded-full border border-current/30 bg-current/10`}>
                              {MODEL_META[result.route].icon} {result.label}
                            </span>
                            {selectedModel === result.route && <span className="text-[9px] text-brand-green font-bold">âœ“ SELECTED</span>}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-textMuted">
                            <span className={`font-bold ${result.confidence >= 90 ? "text-brand-green" : "text-brand-amber"}`}>{result.confidence}%</span>
                            <span className="font-mono">{result.latencyMs}ms</span>
                          </div>
                        </div>
                        {/* Confidence bar */}
                        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <motion.div className={`h-full rounded-full bg-${result.color}/70`} animate={{ width: `${result.confidence}%` }} transition={{ duration: 0.6 }} />
                        </div>
                        <p className="text-sm text-textSecondary leading-relaxed">{result.answer}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <button onClick={e => { e.stopPropagation(); copyAnswer(result.answer, idx); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-textMuted hover:text-textPrimary transition text-[11px]">
                            {copiedIdx === idx ? <CheckCircle className="w-3 h-3 text-brand-green" /> : <Copy className="w-3 h-3" />}
                            {copiedIdx === idx ? "Copied!" : "Copy Answer"}
                          </button>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-textMuted hover:text-textPrimary transition text-[11px]">
                            <RefreshCw className="w-3 h-3" /> Regenerate
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* â”€â”€ STAR Structure Breakdown â”€â”€ */}
                  <GlassCard className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-brand-green" /> STAR Structure Analysis
                      </h3>
                      <span className="text-[10px] text-brand-green font-bold">97 / 100</span>
                    </div>
                    <StarBreakdownPanel data={DEMO_STAR_BREAKDOWN} />
                  </GlassCard>

                  {/* â”€â”€ AI Coach â”€â”€ */}
                  <GlassCard className="p-4 border-brand-cyan/15">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-1.5">
                        <UserCircle className="w-4 h-4 text-brand-cyan" /> Aria <span className="text-[10px] text-textMuted font-normal">AI Coach</span>
                      </h3>
                      <button onClick={() => setShowCoachPanel(v => !v)} className="text-textMuted hover:text-textPrimary transition" title="Toggle Aria coach panel" aria-label="Toggle Aria coach panel">
                        {showCoachPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                    <AnimatePresence>
                      {showCoachPanel && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3">
                          <div className="grid md:grid-cols-3 gap-3">
                            {/* Pacing */}
                            <div className="p-3 rounded-xl bg-brand-amber/5 border border-brand-amber/15 space-y-1">
                              <p className="text-[9px] text-brand-amber font-bold uppercase tracking-wider flex items-center gap-1"><Activity className="w-3 h-3" /> Delivery</p>
                              <p className="text-xs text-textSecondary leading-relaxed">{DEMO_COACH.pacing}</p>
                            </div>
                            {/* Trap alert */}
                            <div className="p-3 rounded-xl bg-brand-red/5 border border-brand-red/15 space-y-1">
                              <p className="text-[9px] text-brand-red font-bold uppercase tracking-wider flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Strategic Pivot</p>
                              <p className="text-xs text-textSecondary leading-relaxed">{DEMO_COACH.trapAlert}</p>
                            </div>
                            {/* Body language */}
                            <div className="p-3 rounded-xl bg-brand-purple/5 border border-brand-purple/15 space-y-1">
                              <p className="text-[9px] text-brand-purple font-bold uppercase tracking-wider flex items-center gap-1"><Eye className="w-3 h-3" /> Body Language</p>
                              <p className="text-xs text-textSecondary leading-relaxed">{DEMO_COACH.bodyLanguage}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </div>

                {/* â”€â”€ Right column: Intelligence Sidebar â”€â”€ */}
                <div className="xl:col-span-3 space-y-4">

                  {/* Speech Analytics */}
                  <GlassCard className="p-4 space-y-3">
                    <h3 className="text-[11px] text-textMuted uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <BarChart3 className="w-3 h-3 text-brand-green" /> Speech Analytics
                    </h3>
                    <div className="space-y-2">
                      {([
                        { label: "Structure", key: "structure" as const, color: "brand-cyan" },
                        { label: "Clarity", key: "clarity" as const, color: "brand-purple" },
                        { label: "Confidence", key: "confidence" as const, color: "brand-green" },
                        { label: "Impact", key: "impact" as const, color: "brand-amber" },
                        { label: "Pacing", key: "pacing" as const, color: "brand-cyan" },
                        { label: "Engagement", key: "engagement" as const, color: "brand-purple" },
                      ] as const).map(m => {
                        const val = DEMO_SPEECH_ANALYTICS[m.key];
                        const barColor = val >= 80 ? "bg-brand-green" : val >= 50 ? "bg-brand-amber" : "bg-brand-red";
                        return (
                          <div key={m.key} className="space-y-0.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-textMuted">{m.label}</span>
                              <span className={`font-bold ${val >= 80 ? "text-brand-green" : val >= 50 ? "text-brand-amber" : "text-brand-red"}`}>{val}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                              <motion.div className={`h-full rounded-full ${barColor}`} animate={{ width: `${val}%` }} transition={{ duration: 0.6 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/[0.05]">
                      <span className="text-textMuted">Overall</span>
                      <span className="text-brand-green font-bold">
                        {Math.round(Object.values(DEMO_SPEECH_ANALYTICS).reduce((a, b) => a + b, 0) / 6)}%
                      </span>
                    </div>
                  </GlassCard>

                  {/* Follow-Up Predictor */}
                  <GlassCard className="p-4 space-y-3">
                    <h3 className="text-[11px] text-textMuted uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <Lightbulb className="w-3 h-3 text-brand-amber" /> Predicted Follow-Ups
                    </h3>
                    <div className="space-y-2">
                      {DEMO_FOLLOW_UPS.map((f, i) => (
                        <div key={i} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1">
                          <div className="flex items-center justify-between">
                            <QuestionTypeBadge type={f.type} />
                            <span className={`text-[10px] font-bold ${f.probability >= 80 ? "text-brand-red" : f.probability >= 60 ? "text-brand-amber" : "text-textMuted"}`}>
                              {f.probability}% likely
                            </span>
                          </div>
                          <p className="text-[11px] text-textSecondary leading-snug">{f.question}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Power Word Tracker */}
                  <GlassCard className="p-4 space-y-3">
                    <h3 className="text-[11px] text-textMuted uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-brand-purple" /> Power Words
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {DEMO_POWER_WORDS.map(pw => (
                        <span key={pw.word} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${pw.impact === "high" ? "bg-brand-green/10 text-brand-green border-brand-green/20" : pw.impact === "medium" ? "bg-brand-amber/10 text-brand-amber border-brand-amber/20" : "bg-white/5 text-textMuted border-white/[0.08]"}`}>
                          {pw.word} <span className="text-[9px] opacity-70">Ã—{pw.count}</span>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-textMuted">{DEMO_POWER_WORDS.filter(p => p.impact === "high").length} high-impact</span>
                      <span className="text-brand-green font-bold">Strong vocabulary</span>
                    </div>
                  </GlassCard>

                  {/* Filler Word Counter */}
                  <GlassCard className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] text-textMuted uppercase tracking-wider font-semibold flex items-center gap-1.5">
                        <Hash className="w-3 h-3" /> Filler Words
                      </h3>
                      <span className={`text-[10px] font-bold ${DEMO_COACH.fillerWords.total >= 7 ? "text-brand-red" : DEMO_COACH.fillerWords.total >= 4 ? "text-brand-amber" : "text-brand-green"}`}>
                        {DEMO_COACH.fillerWords.trend === "down" ? "â†“ Improving" : "â†‘ Watch out"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <FillerWordBadge word="um" count={DEMO_COACH.fillerWords.um} />
                      <FillerWordBadge word="so" count={DEMO_COACH.fillerWords.so} />
                      <FillerWordBadge word="like" count={DEMO_COACH.fillerWords.like} />
                    </div>
                    <span className="text-[10px] text-textMuted">{DEMO_COACH.fillerWords.total} total this session</span>
                  </GlassCard>

                  {/* Live Rubric Alignment */}
                  <GlassCard className="p-4 space-y-3">
                    <h3 className="text-[11px] text-textMuted uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <Radar className="w-3 h-3 text-brand-cyan" /> Rubric Alignment
                    </h3>
                    <div className="space-y-2">
                      {DEMO_RUBRIC_LIVE.map(r => (
                        <div key={r.criterion} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-textMuted">{r.criterion}</span>
                            <span className={`font-bold ${r.score >= 90 ? "text-brand-green" : r.score >= 80 ? "text-brand-amber" : "text-brand-red"}`}>{r.score}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <motion.div className={`h-full rounded-full ${r.score >= 90 ? "bg-brand-green" : r.score >= 80 ? "bg-brand-amber" : "bg-brand-red"}`} animate={{ width: `${r.score}%` }} transition={{ duration: 0.6 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Body Language Scores */}
                  <GlassCard className="p-4 space-y-2">
                    <h3 className="text-[11px] text-textMuted uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <Eye className="w-3 h-3 text-brand-purple" /> Presence
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Energy", score: DEMO_COACH.energyScore, color: "brand-cyan" },
                        { label: "Gaze", score: DEMO_COACH.gazeScore, color: "brand-purple" },
                      ].map(d => (
                        <div key={d.label} className={`p-2 rounded-lg border border-${d.color}/15 bg-${d.color}/5 text-center`}>
                          <p className={`text-lg font-bold text-${d.color}`}>{d.score}</p>
                          <p className="text-[9px] text-textMuted">{d.label}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  {/* Competitor Scoring */}
                  <GlassCard className="p-4 space-y-2">
                    <button onClick={() => setShowCompetitorIntel(v => !v)} className="flex items-center justify-between w-full" title="Toggle company scores" aria-label="Toggle company scores">
                      <h3 className="text-[11px] text-brand-amber uppercase tracking-wider font-semibold flex items-center gap-1.5">
                        <Building2 className="w-3 h-3" /> Company Scores
                      </h3>
                      {showCompetitorIntel ? <ChevronUp className="w-3 h-3 text-textMuted" /> : <ChevronDown className="w-3 h-3 text-textMuted" />}
                    </button>
                    <AnimatePresence>
                      {showCompetitorIntel && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden grid grid-cols-2 gap-1.5 pt-1">
                          {Object.entries(DEMO_COACH.competitorScore).map(([co, score]) => (
                            <div key={co} className="text-center p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                              <p className={`text-sm font-bold ${score >= 90 ? "text-brand-green" : score >= 80 ? "text-brand-amber" : "text-brand-red"}`}>{score}</p>
                              <p className="text-[9px] text-textMuted capitalize">{co}</p>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===========================================================
              STAGE 3: POST-SESSION REPORT
          =========================================================== */}
          {stage === "report" && (
            <motion.div key="report" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">

              {/* Report header */}
              <GlassCard className="p-6">
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-green/30 bg-brand-green/8">
                      <CheckCircle className="w-3.5 h-3.5 text-brand-green" />
                      <span className="text-[11px] text-brand-green font-bold tracking-wider uppercase">Session Complete</span>
                    </div>
                    <h2 className="text-2xl font-bold text-textPrimary">Performance Report</h2>
                    <p className="text-sm text-textMuted">{company} Â· {objective} Â· {formatTimer(sessionSeconds)} session</p>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-brand-green">92</p>
                        <p className="text-[10px] text-textMuted">Overall Score</p>
                      </div>
                      <div className="flex-1">
                        <OfferSparkline history={[...OFFER_HISTORY, 91]} />
                        <p className="text-[10px] text-textMuted mt-1">Offer probability trend</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Overall", v: 92, c: "brand-cyan" },
                      { label: "Communication", v: 88, c: "brand-purple" },
                      { label: "STAR Quality", v: 95, c: "brand-green" },
                      { label: "Confidence", v: 85, c: "brand-amber" },
                      { label: "Technical", v: 91, c: "brand-cyan" },
                      { label: "Time Mgmt", v: 78, c: "brand-red" },
                    ].map(d => (
                      <div key={d.label} className={`p-3 rounded-xl border border-${d.c}/20 bg-${d.c}/8 text-center`}>
                        <p className={`text-xl font-bold text-${d.c}`}>{d.v}</p>
                        <p className="text-[10px] text-textMuted mt-0.5">{d.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {/* Report tabs â€” 6 tabs */}
              <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06]">
                {(["overview", "transcript", "coaching", "intel", "drills", "timeline"] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveReportTab(tab)}
                    className={`px-4 py-2.5 text-sm font-medium transition capitalize whitespace-nowrap ${activeReportTab === tab ? "text-brand-cyan border-b-2 border-brand-cyan" : "text-textMuted hover:text-textPrimary"}`}>
                    {tab === "intel" ? "Company Intel" : tab === "drills" ? "Practice Drills" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* â”€â”€ OVERVIEW TAB â”€â”€ */}
                {activeReportTab === "overview" && (
                  <motion.div key="ov" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-2 gap-4">
                    <GlassCard className="p-5 space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2 text-textPrimary"><Award className="w-4 h-4 text-brand-green" /> Key Strengths</h3>
                      <ul className="space-y-2">
                        {["Strong use of quantifiable metrics in every answer", "Clear STAR framework structure throughout", "Confident tone, well-calibrated pacing", "Excellent culture-fit with company values", "Zero blame language â€” full ownership framing"].map((s, i) => (
                          <li key={i} className="text-sm text-textSecondary flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-brand-green shrink-0 mt-0.5" />{s}</li>
                        ))}
                      </ul>
                    </GlassCard>
                    <GlassCard className="p-5 space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2 text-textPrimary"><ArrowUpRight className="w-4 h-4 text-brand-amber" /> Areas to Improve</h3>
                      <ul className="space-y-2">
                        {["Pause before technical deep-dives (avg gap 1.2s)", "Mention trade-offs in architecture answers", "Reduce filler words: 'so' appeared 4 times", "Q4 was too brief â€” expand weakness answers", "Maintain camera level for authority signals"].map((s, i) => (
                          <li key={i} className="text-sm text-textSecondary flex items-start gap-2"><AlertTriangle className="w-3.5 h-3.5 text-brand-amber shrink-0 mt-0.5" />{s}</li>
                        ))}
                      </ul>
                    </GlassCard>
                    <GlassCard className="p-5 lg:col-span-2 space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2 text-textPrimary"><Hash className="w-4 h-4 text-brand-purple" /> Filler Word Analysis</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {[{ word: "um", count: 2 }, { word: "so", count: 4 }, { word: "like", count: 1 }].map(({ word, count }) => (
                          <div key={word} className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                            <p className={`text-2xl font-bold ${count >= 4 ? "text-brand-red" : count >= 2 ? "text-brand-amber" : "text-brand-green"}`}>{count}</p>
                            <p className="text-xs text-textMuted mt-1">&quot;{word}&quot;</p>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                    <GlassCard className="p-5 lg:col-span-2 space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2 text-textPrimary"><Target className="w-4 h-4 text-brand-cyan" /> STAR Quality Per Question</h3>
                      <div className="grid md:grid-cols-4 gap-3">
                        {DEMO_DETAILED_QA.map((q, i) => (
                          <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-textMuted font-mono">Q{i + 1}</span>
                              <span className={`text-sm font-bold ${q.score >= 90 ? "text-brand-green" : q.score >= 80 ? "text-brand-amber" : "text-brand-red"}`}>{q.score}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                              {(["s", "t", "a", "r"] as const).map(k => {
                                const colors = { s: "brand-cyan", t: "brand-purple", a: "brand-amber", r: "brand-green" };
                                return (
                                  <div key={k} className="text-center">
                                    <p className={`text-[10px] font-bold text-${colors[k]}`}>{q.star[k]}</p>
                                    <p className="text-[8px] text-textMuted uppercase">{k}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </motion.div>
                )}

                {/* â”€â”€ DETAILED TRANSCRIPT TAB â”€â”€ */}
                {activeReportTab === "transcript" && (
                  <motion.div key="tr" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    {DEMO_DETAILED_QA.map((item, i) => (
                      <GlassCard key={i} className="p-0 overflow-hidden" hover={false}>
                        <button onClick={() => setExpandedQA(expandedQA === i ? null : i)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className={`text-sm font-bold shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${item.score >= 90 ? "bg-brand-green/15 text-brand-green" : item.score >= 80 ? "bg-brand-amber/15 text-brand-amber" : "bg-brand-red/15 text-brand-red"}`}>
                              {item.score}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm text-textPrimary font-medium truncate">Q{i + 1}: {item.question}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <QuestionTypeBadge type={item.type} />
                                <span className="text-[10px] text-textMuted font-mono">{item.duration} / {item.idealDuration}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-textMuted transition-transform shrink-0 ml-2 ${expandedQA === i ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {expandedQA === i && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06]">
                                {/* Your answer */}
                                <div className="pt-3 space-y-1">
                                  <p className="text-[10px] text-textMuted uppercase tracking-wider font-semibold">Your Answer</p>
                                  <p className="text-sm text-textSecondary leading-relaxed">{item.yourAnswer}</p>
                                </div>
                                {/* STAR scores */}
                                <div className="grid grid-cols-4 gap-2">
                                  {(["s", "t", "a", "r"] as const).map(k => {
                                    const labels = { s: "Situation", t: "Task", a: "Action", r: "Result" };
                                    const colors = { s: "brand-cyan", t: "brand-purple", a: "brand-amber", r: "brand-green" };
                                    return (
                                      <div key={k} className={`p-2 rounded-lg border border-${colors[k]}/15 bg-${colors[k]}/5 text-center`}>
                                        <p className={`text-sm font-bold text-${colors[k]}`}>{item.star[k]}</p>
                                        <p className="text-[9px] text-textMuted">{labels[k]}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                                {/* Strengths + Improvements */}
                                <div className="grid md:grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-brand-green uppercase tracking-wider font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Strengths</p>
                                    <ul className="space-y-1">
                                      {item.strengths.map((s, si) => <li key={si} className="text-xs text-textSecondary flex gap-1.5"><ChevronRight className="w-3 h-3 text-brand-green shrink-0 mt-0.5" />{s}</li>)}
                                    </ul>
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-brand-amber uppercase tracking-wider font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Improve</p>
                                    <ul className="space-y-1">
                                      {item.improvements.map((s, si) => <li key={si} className="text-xs text-textSecondary flex gap-1.5"><ChevronRight className="w-3 h-3 text-brand-amber shrink-0 mt-0.5" />{s}</li>)}
                                    </ul>
                                  </div>
                                </div>
                                {/* AI Suggestion */}
                                <div className="p-3 rounded-xl bg-brand-cyan/5 border border-brand-cyan/15">
                                  <p className="text-[10px] text-brand-cyan uppercase tracking-wider font-semibold flex items-center gap-1 mb-1"><Lightbulb className="w-3 h-3" /> AI-Improved Answer</p>
                                  <p className="text-xs text-textSecondary leading-relaxed italic">{item.aiSuggestion}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </GlassCard>
                    ))}
                  </motion.div>
                )}

                {/* â”€â”€ COACHING TAB â”€â”€ */}
                {activeReportTab === "coaching" && (
                  <motion.div key="co" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-2 gap-4">
                    <GlassCard className="p-5 space-y-3">
                      <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-2"><Activity className="w-4 h-4 text-brand-amber" /> Delivery Analysis</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {[{ label: "Energy", v: DEMO_COACH.energyScore, c: "brand-cyan" }, { label: "Eye Contact", v: DEMO_COACH.gazeScore, c: "brand-purple" }, { label: "Pacing", v: 87, c: "brand-green" }, { label: "Filler-Free", v: 76, c: "brand-amber" }].map(d => (
                          <div key={d.label} className={`p-3 rounded-xl border border-${d.c}/20 bg-${d.c}/8 text-center`}>
                            <p className={`text-xl font-bold text-${d.c}`}>{d.v}</p>
                            <p className="text-[10px] text-textMuted mt-0.5">{d.label}</p>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                    <GlassCard className="p-5 space-y-3">
                      <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-2"><Bot className="w-4 h-4 text-brand-cyan" /> Aria&apos;s Coach Notes</h3>
                      <ul className="space-y-2">
                        {["Pause before stating metrics â€” builds anticipation", "Maintain first-person ownership language throughout", "Lead with the result, then explain the method", "Look at camera during the Result section", "Vary sentence length for natural rhythm"].map((n, i) => (
                          <li key={i} className="text-sm text-textSecondary flex gap-2"><ChevronRight className="w-3.5 h-3.5 text-brand-cyan shrink-0 mt-0.5" />{n}</li>
                        ))}
                      </ul>
                    </GlassCard>
                    <GlassCard className="p-5 lg:col-span-2 space-y-3">
                      <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand-green" /> Power Word Usage</h3>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {DEMO_POWER_WORDS.map(pw => (
                          <div key={pw.word} className={`p-2.5 rounded-xl border text-center ${pw.impact === "high" ? "border-brand-green/20 bg-brand-green/5" : pw.impact === "medium" ? "border-brand-amber/20 bg-brand-amber/5" : "border-white/[0.06] bg-white/[0.02]"}`}>
                            <p className={`text-sm font-bold ${pw.impact === "high" ? "text-brand-green" : pw.impact === "medium" ? "text-brand-amber" : "text-textMuted"}`}>Ã—{pw.count}</p>
                            <p className="text-[10px] text-textMuted mt-0.5">&quot;{pw.word}&quot;</p>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </motion.div>
                )}

                {/* â”€â”€ INTEL TAB â”€â”€ */}
                {activeReportTab === "intel" && companyIntel && (
                  <motion.div key="in" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-2 gap-4">
                    <GlassCard className="p-5 space-y-3">
                      <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-2"><Building2 className="w-4 h-4 text-brand-amber" /> {company} Scoring Breakdown</h3>
                      {Object.entries(DEMO_COACH.competitorScore).map(([co, score]) => (
                        <div key={co} className="flex items-center gap-3">
                          <span className="text-xs text-textMuted w-16 capitalize">{co}</span>
                          <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                            <motion.div className={`h-full rounded-full ${score >= 90 ? "bg-brand-green" : score >= 80 ? "bg-brand-amber" : "bg-brand-red"}`} animate={{ width: `${score}%` }} transition={{ duration: 0.6 }} />
                          </div>
                          <span className={`text-xs font-bold w-8 text-right ${score >= 90 ? "text-brand-green" : score >= 80 ? "text-brand-amber" : "text-brand-red"}`}>{score}</span>
                        </div>
                      ))}
                    </GlassCard>
                    <GlassCard className="p-5 space-y-3">
                      <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-2"><Radar className="w-4 h-4 text-brand-cyan" /> Red Flags Avoided</h3>
                      <ul className="space-y-2">
                        {companyIntel.redFlags.map((f, i) => (
                          <li key={i} className="text-sm text-textSecondary flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-brand-green shrink-0 mt-0.5" />Avoided: {f}</li>
                        ))}
                      </ul>
                      <div className="pt-2 border-t border-white/[0.05]">
                        <p className="text-[10px] text-textMuted">Rubric alignment</p>
                        <p className="text-sm text-textSecondary mt-1">{companyIntel.rubric}</p>
                      </div>
                    </GlassCard>
                    <GlassCard className="p-5 lg:col-span-2 space-y-3">
                      <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-2"><Target className="w-4 h-4 text-brand-purple" /> Rubric Score Breakdown</h3>
                      <div className="space-y-2">
                        {DEMO_RUBRIC_LIVE.map(r => (
                          <div key={r.criterion} className="flex items-center gap-3">
                            <span className="text-xs text-textMuted w-32">{r.criterion}</span>
                            <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                              <motion.div className={`h-full rounded-full ${r.score >= 90 ? "bg-brand-green" : r.score >= 80 ? "bg-brand-amber" : "bg-brand-red"}`} animate={{ width: `${r.score}%` }} transition={{ duration: 0.6 }} />
                            </div>
                            <span className={`text-xs font-bold w-8 text-right ${r.score >= 90 ? "text-brand-green" : r.score >= 80 ? "text-brand-amber" : "text-brand-red"}`}>{r.score}</span>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </motion.div>
                )}

                {/* â”€â”€ PRACTICE DRILLS TAB â”€â”€ */}
                {activeReportTab === "drills" && (
                  <motion.div key="dr" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <GlassCard className="p-5 space-y-2">
                      <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-2"><Dumbbell className="w-4 h-4 text-brand-purple" /> Personalized Practice Plan</h3>
                      <p className="text-xs text-textMuted">Auto-generated from your weakest areas. Complete these before your next session to maximize improvement.</p>
                    </GlassCard>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {DEMO_PRACTICE_DRILLS.map((drill, i) => (
                        <GlassCard key={i} className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${drill.difficulty === "Easy" ? "bg-brand-green/10 text-brand-green border-brand-green/20" : drill.difficulty === "Medium" ? "bg-brand-amber/10 text-brand-amber border-brand-amber/20" : "bg-brand-red/10 text-brand-red border-brand-red/20"}`}>
                              {drill.difficulty}
                            </span>
                            <span className="text-[10px] text-textMuted font-mono">{drill.mins} min</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-textPrimary">{drill.area}</p>
                            <span className="text-[10px] text-textMuted">{drill.type}</span>
                          </div>
                          <p className="text-xs text-textSecondary leading-relaxed">{drill.desc}</p>
                          <button className="w-full py-2 rounded-lg border border-brand-cyan/25 text-brand-cyan text-xs font-medium hover:bg-brand-cyan/8 transition">
                            Start Drill
                          </button>
                        </GlassCard>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* â”€â”€ TIMELINE TAB â”€â”€ */}
                {activeReportTab === "timeline" && (
                  <motion.div key="tl" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <GlassCard className="p-5 space-y-1">
                      <h3 className="text-sm font-semibold text-textPrimary flex items-center gap-2 mb-4"><ListOrdered className="w-4 h-4 text-brand-cyan" /> Session Timeline</h3>
                      <div className="relative pl-6 space-y-0">
                        {DEMO_SESSION_TIMELINE.map((ev, i) => {
                          const isLast = i === DEMO_SESSION_TIMELINE.length - 1;
                          return (
                            <div key={i} className="relative pb-4">
                              {!isLast && <div className="absolute left-[-18px] top-3 w-px h-full bg-white/[0.08]" />}
                              <div className={`absolute left-[-21px] top-1.5 w-2 h-2 rounded-full border-2 ${ev.type === "highlight" ? "bg-brand-green border-brand-green" : ev.type === "warning" ? "bg-brand-amber border-brand-amber" : ev.type === "question" ? "bg-brand-cyan border-brand-cyan" : "bg-white/20 border-white/30"}`} />
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-textMuted font-mono w-10 shrink-0">{ev.time}</span>
                                <span className={`text-sm ${ev.type === "highlight" ? "text-brand-green" : ev.type === "warning" ? "text-brand-amber" : ev.type === "question" ? "text-brand-cyan" : "text-textMuted"}`}>{ev.event}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {bookmarks.length > 0 && (
                        <div className="pt-4 mt-4 border-t border-white/[0.06]">
                          <p className="text-[10px] text-brand-amber uppercase tracking-wider font-semibold flex items-center gap-1.5 mb-2"><Bookmark className="w-3 h-3" /> Your Bookmarks</p>
                          <div className="flex flex-wrap gap-2">
                            {bookmarks.map((b, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-lg bg-brand-amber/10 border border-brand-amber/20 text-[11px] text-brand-amber font-mono">{b}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button onClick={() => setStage("config")} className="px-5 py-2.5 rounded-lg border border-white/[0.1] text-sm text-textPrimary hover:bg-white/[0.05] transition">
                  New Session
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/[0.1] text-sm text-textMuted hover:bg-white/[0.05] transition">
                  <Download className="w-4 h-4" /> Export PDF
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/[0.1] text-sm text-textMuted hover:bg-white/[0.05] transition">
                  <Copy className="w-4 h-4" /> Copy Markdown
                </button>
                <NeonButton>
                  <ArrowUpRight className="w-4 h-4 mr-1.5" /> Share Report
                </NeonButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Download Desktop Modal */}
      <Modal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)} title="Desktop Runtime Required">
        <div className="space-y-4">
          <p className="text-sm text-textSecondary leading-relaxed">
            You have Stealth Mode enabled. The native desktop runtime is required to prevent detection by Zoom, Teams, and proctoring software.
          </p>
          <div className="rounded-xl border border-brand-green/20 bg-brand-green/8 p-4 space-y-2">
            <p className="text-[11px] text-brand-green font-bold uppercase tracking-wider">What the desktop runtime adds:</p>
            <ul className="space-y-1">
              {["Direct Composition rendering — invisible to getDisplayMedia","Recorder signature scanning at 2Hz","Panic hide with fake browser tab","Sub-50ms overlay latency"].map((f,i) => (
                <li key={i} className="text-xs text-textSecondary flex gap-2"><Shield className="w-3 h-3 text-brand-green shrink-0 mt-0.5" />{f}</li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowDownloadModal(false); launchLive(); }}
              className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-textMuted hover:text-textPrimary transition">
              Continue in Browser
            </button>
            <a href="https://github.com/atlurisatheesh/atluri-ai/releases/download/atluri-ai/AtluriIn-AI-0.3.1-Setup.exe"
              target="_blank" rel="noopener noreferrer"
              className="rounded-lg bg-gradient-to-r from-brand-cyan to-brand-purple px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 flex items-center gap-2">
              <Lock className="w-4 h-4" /> Download for Windows
            </a>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
