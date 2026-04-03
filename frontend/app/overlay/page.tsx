"use client";

/**
 * /overlay — The ONLY window for the Electron desktop app.
 *
 * LockedIn AI-style setup panel with:
 *  - Hamburger side navigation (Interview, Meeting, History, etc.)
 *  - Live / Mock / Coding mode tabs
 *  - Numbered accordion sections (Interview Setup, Documents, Advanced)
 *  - Settings gear panel (Response Length, Languages, Process Time, Threshold)
 *  - Preset / recent session bar
 *  - START button → switches to live PhantomOverlay HUD
 */

import { useEffect, useCallback, useState, useRef } from "react";
import {
    Play, Settings, ChevronDown, ChevronRight, Zap, X, Minus,
    Menu, Bookmark, BookmarkPlus, HelpCircle, Eye, EyeOff,
    Clock, FileText, Briefcase, Code2, MessageSquare, Users,
    History, ExternalLink, Upload, AlertTriangle, Mic,
} from "lucide-react";
import PhantomOverlay from "@/components/stealth/PhantomOverlay";
import { usePhantomOverlay } from "@/lib/hooks/usePhantomOverlay";

// ── Bridge helper ──
function getBridge(): any {
    if (typeof window !== "undefined" && "atluriinDesktop" in window) {
        return (window as any).atluriinDesktop;
    }
    return null;
}

function generateRoomId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

const PRODUCTION_BACKEND_ORIGIN = "https://atluri-ai.vercel.app";
const PRODUCTION_WS_BACKEND = "https://atluriin-backend-production-5f8d.up.railway.app";

function normalizeBackendUrl(url: string): string {
    return String(url || "").trim().replace(/\/+$/g, "");
}

function isLocalBackend(url: string): boolean {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizeBackendUrl(url));
}

function getDefaultBackendUrl(): string {
    const envUrl = normalizeBackendUrl(process.env.NEXT_PUBLIC_API_URL || "");
    if (envUrl) return envUrl;
    if (typeof window !== "undefined" && window.location?.origin) {
        return normalizeBackendUrl(window.location.origin);
    }
    return PRODUCTION_BACKEND_ORIGIN;
}

// ── Toggle button group (used for Response Length, Process Time, etc.) ──
function ToggleGroup({ options, value, onChange }: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="flex gap-1">
            {options.map((o) => (
                <button
                    key={o.value}
                    onClick={() => onChange(o.value)}
                    className={`flex-1 py-1.5 rounded-full text-[10px] font-medium transition border ${
                        value === o.value
                            ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                            : "bg-white/[0.03] border-white/[0.06] text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

// ── Accordion section (numbered) ──
function AccordionSection({ num, title, subtitle, open, onToggle, children }: {
    num: number; title: string; subtitle: string;
    open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
    return (
        <div className="space-y-0">
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-3 py-3 px-1 text-left hover:bg-white/[0.02] transition rounded-lg"
            >
                <span className="w-7 h-7 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-[11px] font-bold text-cyan-400 shrink-0">
                    {num}
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white leading-tight">{title}</p>
                    <p className="text-[10px] text-zinc-500 leading-tight">{subtitle}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform shrink-0 ${open ? "" : "-rotate-90"}`} />
            </button>
            {open && (
                <div className="pl-10 pr-1 pb-3 space-y-2.5 animate-in slide-in-from-top-1 duration-150">
                    {children}
                </div>
            )}
        </div>
    );
}

// ── Settings Panel (overlay modal like LockedIn AI) ──
function SettingsPanel({ onClose, settings, onUpdate }: {
    onClose: () => void;
    settings: {
        responseLength: string; interviewLang: string;
        aiResponseLang: string; processTime: string; threshold: number;
    };
    onUpdate: (s: any) => void;
}) {
    return (
        <div className="absolute inset-0 z-50 bg-[#0c0c14]/98 backdrop-blur-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <span className="text-[12px] font-bold text-white">Settings</span>
                <button onClick={onClose} title="Close settings" className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition text-zinc-400 hover:text-white">
                    <X className="w-4 h-4" />
                </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {/* Response Length */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3 text-zinc-500" />
                        <span className="text-[11px] text-zinc-300 font-medium">RESPONSE LENGTH</span>
                        <HelpCircle className="w-3 h-3 text-zinc-600 cursor-help" />
                    </div>
                    <ToggleGroup
                        options={[
                            { label: "Default", value: "default" },
                            { label: "Concise", value: "concise" },
                            { label: "Detailed", value: "detailed" },
                        ]}
                        value={settings.responseLength}
                        onChange={(v) => onUpdate({ ...settings, responseLength: v })}
                    />
                </div>

                {/* Interview Language */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px]">🌐</span>
                        <span className="text-[11px] text-zinc-300 font-medium">INTERVIEW LANGUAGE</span>
                        <HelpCircle className="w-3 h-3 text-zinc-600 cursor-help" />
                    </div>
                    <select
                        title="Interview language"
                        value={settings.interviewLang}
                        onChange={(e) => onUpdate({ ...settings, interviewLang: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-cyan-500/40 transition appearance-none"
                    >
                        <option value="English" className="bg-zinc-900">English</option>
                        <option value="Spanish" className="bg-zinc-900">Spanish</option>
                        <option value="French" className="bg-zinc-900">French</option>
                        <option value="German" className="bg-zinc-900">German</option>
                        <option value="Hindi" className="bg-zinc-900">Hindi</option>
                        <option value="Telugu" className="bg-zinc-900">Telugu</option>
                        <option value="Chinese" className="bg-zinc-900">Chinese</option>
                        <option value="Japanese" className="bg-zinc-900">Japanese</option>
                        <option value="Korean" className="bg-zinc-900">Korean</option>
                        <option value="Portuguese" className="bg-zinc-900">Portuguese</option>
                    </select>
                </div>

                {/* AI Response Language */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px]">🤖</span>
                        <span className="text-[11px] text-zinc-300 font-medium">AI RESPONSE LANGUAGE</span>
                        <HelpCircle className="w-3 h-3 text-zinc-600 cursor-help" />
                    </div>
                    <select
                        title="AI response language"
                        value={settings.aiResponseLang}
                        onChange={(e) => onUpdate({ ...settings, aiResponseLang: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-cyan-500/40 transition appearance-none"
                    >
                        <option value="Auto" className="bg-zinc-900">Auto</option>
                        <option value="English" className="bg-zinc-900">English</option>
                        <option value="Spanish" className="bg-zinc-900">Spanish</option>
                        <option value="French" className="bg-zinc-900">French</option>
                        <option value="Hindi" className="bg-zinc-900">Hindi</option>
                        <option value="Telugu" className="bg-zinc-900">Telugu</option>
                        <option value="Chinese" className="bg-zinc-900">Chinese</option>
                        <option value="Japanese" className="bg-zinc-900">Japanese</option>
                    </select>
                </div>

                {/* Process Time */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span className="text-[11px] text-zinc-300 font-medium">PROCESS TIME</span>
                        <HelpCircle className="w-3 h-3 text-zinc-600 cursor-help" />
                    </div>
                    <ToggleGroup
                        options={[
                            { label: "Fast", value: "fast" },
                            { label: "Medium", value: "medium" },
                            { label: "Quality", value: "quality" },
                        ]}
                        value={settings.processTime}
                        onChange={(v) => onUpdate({ ...settings, processTime: v })}
                    />
                </div>

                {/* Threshold (mic sensitivity) */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                        <Mic className="w-3 h-3 text-zinc-500" />
                        <span className="text-[11px] text-zinc-300 font-medium">Threshold</span>
                        <HelpCircle className="w-3 h-3 text-zinc-600 cursor-help" />
                        <span className="ml-auto text-[11px] text-zinc-400 font-mono">{settings.threshold.toFixed(2)}</span>
                    </div>
                    <input
                        title="Mic threshold"
                        type="range"
                        min="0" max="1" step="0.01"
                        value={settings.threshold}
                        onChange={(e) => onUpdate({ ...settings, threshold: parseFloat(e.target.value) })}
                        className="w-full h-1.5 rounded-full appearance-none bg-gradient-to-r from-red-500 via-red-400 to-cyan-400 cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-300 [&::-webkit-slider-thumb]:border-2
                            [&::-webkit-slider-thumb]:border-cyan-500 [&::-webkit-slider-thumb]:shadow-lg"
                    />
                </div>
            </div>
            {/* Save */}
            <div className="px-4 pb-4 pt-2">
                <button
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] transition"
                >
                    Save
                </button>
            </div>
        </div>
    );
}

// ── Side Navigation (hamburger slide-out) ──
function SideNav({ onClose, sessionMode, onSessionMode }: {
    onClose: () => void;
    sessionMode: string;
    onSessionMode: (m: string) => void;
}) {
    const navItems = [
        { id: "interview", label: "Interview", icon: MessageSquare, active: true },
        { id: "meeting", label: "Professional Meeting", icon: Briefcase },
        { id: "assessment", label: "Online Assessment", icon: FileText },
    ];
    const extItems = [
        { label: "Resume / ARIA", icon: FileText, path: "/resume" },
        { label: "Coding Lab", icon: Code2, path: "/coding" },
        { label: "Mock Interviews", icon: Users, path: "/mock" },
        { label: "Copilot Mode", icon: Zap, path: "/copilot" },
        { label: "Salary Negotiation", icon: Briefcase, path: "/negotiation" },
        { label: "Question Bank", icon: HelpCircle, path: "/questions" },
        { label: "LinkedIn Optimizer", icon: ExternalLink, path: "/linkedin-optimizer" },
        { label: "JD Analyzer", icon: FileText, path: "/jd-analyzer" },
        { label: "Analytics", icon: Clock, path: "/analytics" },
    ];
    return (
        <div className="absolute inset-0 z-50 flex">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            {/* Panel */}
            <div className="relative z-10 w-[280px] h-full bg-[#0d0d18]/98 backdrop-blur-xl border-r border-white/[0.06] flex flex-col animate-in slide-in-from-left duration-200">
                {/* User info */}
                <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-[12px] font-bold text-white">
                            A
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                                👑 PRO
                            </span>
                            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> ∞
                            </span>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto px-3 py-3">
                    <p className="text-[9px] text-zinc-600 font-medium uppercase tracking-wider px-2 mb-2">Navigation</p>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => { onSessionMode(item.id); onClose(); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition mb-0.5 ${
                                item.active
                                    ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
                                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-300"
                            }`}
                        >
                            <item.icon className="w-3.5 h-3.5" />
                            {item.label}
                            <ChevronRight className="w-3 h-3 ml-auto text-zinc-600" />
                        </button>
                    ))}

                    <div className="my-2 border-t border-white/[0.04]" />

                    {extItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => {
                                const bridge = getBridge();
                                const base = typeof window !== "undefined" ? window.location.origin : "http://localhost:3001";
                                const url = `${base}${(item as any).path}`;
                                if (bridge?.openUrl) { bridge.openUrl(url); }
                                else { window.open(url, "_blank"); }
                                onClose();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-300 transition mb-0.5"
                        >
                            <item.icon className="w-3.5 h-3.5" />
                            {item.label}
                            <ExternalLink className="w-2.5 h-2.5 ml-auto text-zinc-600" />
                        </button>
                    ))}

                    <div className="my-2 border-t border-white/[0.04]" />

                    <p className="text-[9px] text-zinc-600 font-medium uppercase tracking-wider px-2 mb-2">History</p>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-300 transition">
                        <History className="w-3.5 h-3.5" />
                        Session History
                        <ChevronRight className="w-3 h-3 ml-auto text-zinc-600" />
                    </button>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-white/[0.06] flex items-center gap-2 text-[9px] text-zinc-600">
                    v0.3.0
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// SETUP PANEL — LockedIn AI-style design
// ═══════════════════════════════════════════════════════════
function SetupPanel({ onStart }: { onStart: () => void }) {
    // ── Form state ──
    const [resume, setResume] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [company, setCompany] = useState("");
    const [position, setPosition] = useState("");
    const [interviewType, setInterviewType] = useState("behavioral");
    const [model, setModel] = useState("gpt4o");
    const [backendUrl, setBackendUrl] = useState(getDefaultBackendUrl);
    const [imageContext, setImageContext] = useState("");
    const [procedures, setProcedures] = useState("");
    const [priorityQuestions, setPriorityQuestions] = useState("");
    const [companyIntelLoaded, setCompanyIntelLoaded] = useState("");

    // ── UI state ──
    const [sessionMode, setSessionMode] = useState<"live" | "mock" | "coding">("live");
    const [openSection, setOpenSection] = useState<number | null>(1);
    const [showSettings, setShowSettings] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Settings state ──
    const [settingsData, setSettingsData] = useState({
        responseLength: "concise",
        interviewLang: "English",
        aiResponseLang: "Auto",
        processTime: "medium",
        threshold: 0.33,
    });

    // Map processTime → intensity
    const intensityMap: Record<string, number> = { fast: 1, medium: 2, quality: 3 };

    // ── Company Intelligence Packs ──
    const COMPANY_INTEL: Record<string, { procedures: string; priorities: string }> = {
        amazon: {
            procedures: "Step 1: Intro & LP overview (5 min)\nStep 2: Leadership Principles deep-dive (25 min)\nStep 3: Technical problem-solving (20 min)\nStep 4: System design (optional, 25 min)\nStep 5: Questions for interviewer (5 min)",
            priorities: "- Tell me about a time you disagreed with a team member\n- Describe a situation where you had to make a decision with incomplete data\n- How do you prioritize when everything is urgent?\n- Give an example of Customer Obsession\n- Tell me about a time you failed",
        },
        google: {
            procedures: "Step 1: Intro & Googleyness check (10 min)\nStep 2: Coding interview (45 min)\nStep 3: System design (45 min)\nStep 4: Behavioral / Leadership (30 min)",
            priorities: "- Design a system that handles X QPS\n- Implement an algorithm for...\n- How do you handle ambiguity?\n- Tell me about a complex project you led\n- How do you approach optimization?",
        },
        meta: {
            procedures: "Step 1: Behavioral screen (15 min)\nStep 2: Coding round 1 (45 min)\nStep 3: Coding round 2 (45 min)\nStep 4: System design (45 min)\nStep 5: Hiring committee review",
            priorities: "- Move fast and break things — give an example\n- How do you build products at scale?\n- Implement a data structure for...\n- Design Facebook/Instagram feature X\n- What's your biggest impact?",
        },
        microsoft: {
            procedures: "Step 1: Recruiter phone screen (30 min)\nStep 2: Technical phone screen (60 min)\nStep 3: On-site loop — 4-5 interviews\nStep 4: As-appropriate (final decision maker)",
            priorities: "- Why Microsoft?\n- Design a distributed cache\n- Implement LRU cache\n- Tell me about a growth mindset moment\n- How do you handle cross-team collaboration?",
        },
        apple: {
            procedures: "Step 1: Recruiter call (30 min)\nStep 2: Technical phone screen (60 min)\nStep 3: On-site: 5-6 back-to-back interviews\nStep 4: Hiring committee + VP approval",
            priorities: "- Why Apple?\n- Describe attention to detail in your work\n- Design a feature for iOS\n- How do you handle secrecy/confidentiality?\n- Tell me about a product you're proud of",
        },
    };

    const handleCompanyBlur = useCallback(() => {
        const key = company.trim().toLowerCase();
        const intel = COMPANY_INTEL[key];
        if (intel && companyIntelLoaded !== key) {
            if (!procedures) setProcedures(intel.procedures);
            if (!priorityQuestions) setPriorityQuestions(intel.priorities);
            setCompanyIntelLoaded(key);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [company, companyIntelLoaded, procedures, priorityQuestions]);

    // ── Stealth Eye Toggle (3-state: off → dim → hidden → off) ──
    const [stealthEye, setStealthEye] = useState<"off" | "dim" | "hidden">("off");
    const cycleStealthEye = useCallback(async () => {
        const bridge = getBridge();
        if (stealthEye === "off") {
            setStealthEye("dim");
            await bridge?.setOverlayStealth?.(true, 0.6);
        } else if (stealthEye === "dim") {
            setStealthEye("hidden");
            await bridge?.setOverlayStealth?.(true, 0.3);
        } else {
            setStealthEye("off");
            await bridge?.setOverlayStealth?.(false, 1.0);
        }
    }, [stealthEye]);

    // ── Stealth Score ──
    const [stealthScore, setStealthScore] = useState(0);
    const [stealthLayers, setStealthLayers] = useState<{ name: string; active: boolean }[]>([]);
    const [threatLevel, setThreatLevel] = useState("SCANNING");

    useEffect(() => {
        let cancelled = false;
        const poll = async () => {
            try {
                const b = getBridge();
                let health: any = null;
                if (b?.getStealthHealth) {
                    health = await b.getStealthHealth();
                } else {
                    const res = await fetch(`${backendUrl}/api/stealth/health`, { signal: AbortSignal.timeout(3000) }).catch(() => null);
                    if (res?.ok) health = await res.json();
                }
                if (health && !cancelled) {
                    setStealthScore(health.score ?? health.stealth_score ?? 97);
                    setThreatLevel(health.threat_level ?? "CLEAN");
                    const layers = health.layers ?? health.protections ?? [];
                    if (Array.isArray(layers)) setStealthLayers(layers);
                }
            } catch {}
        };
        poll();
        const iv = setInterval(poll, 8000);
        return () => { cancelled = true; clearInterval(iv); };
    }, [backendUrl]);

    // Load saved settings
    useEffect(() => {
        const b = getBridge();
        if (!b) { setLoading(false); return; }
        (async () => {
            try {
                const [r, jd, all] = await Promise.all([
                    b.getResume?.() || "",
                    b.getJobDescription?.() || "",
                    b.getAllSettings?.() || {},
                ]);
                if (r) setResume(r);
                if (jd) setJobDescription(jd);
                if (all?.sessionSetup) {
                    const s = all.sessionSetup;
                    if (s.company) setCompany(s.company);
                    if (s.position) setPosition(s.position);
                    if (s.model) setModel(s.model);
                    if (s.interviewType) setInterviewType(s.interviewType);
                    if (s.backendUrl) {
                        const savedBackendUrl = normalizeBackendUrl(s.backendUrl);
                        if (typeof window !== "undefined" && window.location.protocol === "https:" && isLocalBackend(savedBackendUrl)) {
                            setBackendUrl(getDefaultBackendUrl());
                        } else {
                            setBackendUrl(savedBackendUrl);
                        }
                    }
                    if (s.imageContext) setImageContext(s.imageContext);
                    if (s.procedures) setProcedures(s.procedures);
                    if (s.priorityQuestions) setPriorityQuestions(s.priorityQuestions);                }
                if (all?.settings) setSettingsData((prev) => ({ ...prev, ...all.settings }));
            } catch {}
            setLoading(false);
        })();
    }, []);

    const handleStart = async () => {
        const b = getBridge();
        // Allow test-mode bypass when no Electron bridge is available
        if (!b) {
            setStarting(true);
            setError(null);
            onStart();
            return;
        }
        setStarting(true);
        setError(null);
        try {
            const effectiveBackendUrl = normalizeBackendUrl(backendUrl) || getDefaultBackendUrl();
            const finalBackendUrl = (typeof window !== "undefined" && window.location.protocol === "https:" && isLocalBackend(effectiveBackendUrl))
                ? getDefaultBackendUrl()
                : effectiveBackendUrl;

            // WebSocket goes directly to Railway (Vercel rewrites can't proxy WS upgrades).
            // The Electron app uses DoH DNS to resolve railway.app if ISP blocks it.
            const wsBackendUrl = (typeof window !== "undefined" && window.location.protocol === "https:")
                ? PRODUCTION_WS_BACKEND
                : finalBackendUrl;

            await Promise.all([
                b.setResume?.(resume),
                b.setJobDescription?.(jobDescription),
                b.setAllSettings?.({
                    sessionSetup: {
                        company, position, model, interviewType, backendUrl: finalBackendUrl,
                        imageContext, procedures, priorityQuestions,
                    },
                    settings: settingsData,
                }),
            ]);
            const result = await b.startLoopback({
                backendHttpUrl: wsBackendUrl,
                roomId: generateRoomId(),
                role: sessionMode === "coding" ? "coding" : "candidate",
                assistIntensity: intensityMap[settingsData.processTime] || 2,
            });
            if (!result.ok) {
                setError(result.error || "Failed to start audio capture");
                setStarting(false);
                return;
            }
            onStart();
        } catch (e: any) {
            setError(e?.message || "Failed to start");
            setStarting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            {/* ── TOP HEADER BAR (drag region) ── */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.04] cursor-move select-none shrink-0" style={{ WebkitAppRegion: "drag" } as any}>
                <div className="w-5 h-5 rounded bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                    <Zap className="w-3 h-3 text-white" />
                </div>
                <span className="text-[11px] font-bold text-white tracking-tight">ATLURIIN AI</span>

                <div className="ml-auto flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" } as any}>
                    <button onClick={() => setShowSettings(true)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition text-zinc-500 hover:text-cyan-400" title="Settings">
                        <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={cycleStealthEye} className={`w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition ${stealthEye === "off" ? "text-zinc-500 hover:text-zinc-300" : stealthEye === "dim" ? "text-amber-400" : "text-red-400"}`} title={`Stealth: ${stealthEye === "off" ? "OFF" : stealthEye === "dim" ? "DIM (60%)" : "HIDDEN (30%)"}`}>
                        {stealthEye === "hidden" ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => getBridge()?.minimizeOverlay?.()} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition text-zinc-500 hover:text-zinc-300" title="Minimize">
                        <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => getBridge()?.closeOverlay?.()} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 transition text-zinc-500 hover:text-red-400" title="Close">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* ── BODY (scrollable) ── */}
            <div className="flex-1 overflow-y-auto" style={{ WebkitAppRegion: "no-drag" } as any}>
                {/* Hamburger + Mode Tabs */}
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                    <button onClick={() => setShowMenu(true)} title="Menu" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition text-zinc-500 hover:text-zinc-300">
                        <Menu className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3 ml-1">
                        {(["live", "mock", "coding"] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => setSessionMode(m)}
                                className={`text-[12px] font-semibold transition capitalize ${
                                    sessionMode === m ? "text-cyan-400" : "text-zinc-500 hover:text-zinc-300"
                                }`}
                            >
                                {m === "live" ? "Live" : m === "mock" ? "Mock" : "Coding"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preset bar */}
                <div className="px-3 py-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <Bookmark className="w-3.5 h-3.5 text-zinc-600" />
                        <span className="text-[10px] text-zinc-500 flex-1">Load a preset or recent session</span>
                        <BookmarkPlus className="w-3.5 h-3.5 text-zinc-600 hover:text-cyan-400 cursor-pointer transition" />
                    </div>
                </div>

                {error && (
                    <div className="mx-3 mb-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                        <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                        <p className="text-[10px] text-red-400 leading-tight">{error}</p>
                    </div>
                )}

                {/* ── ACCORDION SECTIONS ── */}
                <div className="px-3 space-y-0.5">
                    {/* 1. Interview Setup */}
                    <AccordionSection
                        num={1} title="Interview Setup" subtitle="Enter interview details"
                        open={openSection === 1} onToggle={() => setOpenSection(openSection === 1 ? null : 1)}
                    >
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500">Company</label>
                                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} onBlur={handleCompanyBlur} placeholder="Google"
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition"
                                />
                                {companyIntelLoaded && (
                                    <p className="text-[9px] text-cyan-400">🧠 {companyIntelLoaded.charAt(0).toUpperCase() + companyIntelLoaded.slice(1)} Intel Pack loaded</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500">Position</label>
                                <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Sr. SWE"
                                    className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500">Interview Type</label>
                            <select title="Interview type" value={interviewType} onChange={(e) => setInterviewType(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-cyan-500/40 transition appearance-none"
                            >
                                <option value="general" className="bg-zinc-900">General Interview</option>
                                <optgroup label="Engineering">
                                    <option value="swe-interview" className="bg-zinc-900">Software Engineering Interview</option>
                                    <option value="system-design" className="bg-zinc-900">System Design Interview</option>
                                    <option value="tech-screen" className="bg-zinc-900">Technical Phone Screen</option>
                                    <option value="live-coding" className="bg-zinc-900">Live Coding Challenge</option>
                                    <option value="arch-review" className="bg-zinc-900">Architecture Review</option>
                                    <option value="code-review" className="bg-zinc-900">Code Review</option>
                                </optgroup>
                                <optgroup label="System Design">
                                    <option value="sd-deep-dive" className="bg-zinc-900">System Design Deep Dive</option>
                                    <option value="distributed-systems" className="bg-zinc-900">Distributed Systems Design</option>
                                    <option value="db-schema-design" className="bg-zinc-900">Database Schema Design</option>
                                    <option value="api-design" className="bg-zinc-900">API Design Interview</option>
                                </optgroup>
                                <optgroup label="Behavioral">
                                    <option value="behavioral" className="bg-zinc-900">Behavioral Interview</option>
                                    <option value="leadership" className="bg-zinc-900">Leadership Interview</option>
                                    <option value="conflict-resolution" className="bg-zinc-900">Conflict Resolution</option>
                                    <option value="career-story" className="bg-zinc-900">Career Story</option>
                                </optgroup>
                                <optgroup label="Product">
                                    <option value="pm-interview" className="bg-zinc-900">Product Manager Interview</option>
                                    <option value="product-sense" className="bg-zinc-900">Product Sense Interview</option>
                                    <option value="product-strategy" className="bg-zinc-900">Product Strategy</option>
                                    <option value="product-analytics" className="bg-zinc-900">Product Analytics</option>
                                </optgroup>
                                <optgroup label="Data / ML">
                                    <option value="data-science" className="bg-zinc-900">Data Science Interview</option>
                                    <option value="ml-interview" className="bg-zinc-900">Machine Learning Interview</option>
                                    <option value="data-engineering" className="bg-zinc-900">Data Engineering</option>
                                    <option value="statistical-analysis" className="bg-zinc-900">Statistical Analysis</option>
                                </optgroup>
                                <optgroup label="Management">
                                    <option value="eng-manager" className="bg-zinc-900">Engineering Manager Interview</option>
                                    <option value="vp-engineering" className="bg-zinc-900">VP Engineering Interview</option>
                                    <option value="cto-interview" className="bg-zinc-900">CTO Interview</option>
                                    <option value="director-interview" className="bg-zinc-900">Director Interview</option>
                                </optgroup>
                                <optgroup label="Specialized">
                                    <option value="devops-sre" className="bg-zinc-900">DevOps / SRE Interview</option>
                                    <option value="frontend-interview" className="bg-zinc-900">Frontend Interview</option>
                                    <option value="backend-interview" className="bg-zinc-900">Backend Interview</option>
                                    <option value="mobile-engineering" className="bg-zinc-900">Mobile Engineering</option>
                                    <option value="qa-testing" className="bg-zinc-900">QA / Testing</option>
                                </optgroup>
                                <optgroup label="AI / ML">
                                    <option value="ai-research" className="bg-zinc-900">AI Research Interview</option>
                                    <option value="nlp-engineer" className="bg-zinc-900">NLP Engineer Interview</option>
                                    <option value="computer-vision" className="bg-zinc-900">Computer Vision</option>
                                    <option value="mlops" className="bg-zinc-900">MLOps Interview</option>
                                </optgroup>
                                <optgroup label="Security">
                                    <option value="security-engineer" className="bg-zinc-900">Security Engineer Interview</option>
                                    <option value="pentest" className="bg-zinc-900">Penetration Testing</option>
                                    <option value="security-arch" className="bg-zinc-900">Security Architecture</option>
                                    <option value="compliance" className="bg-zinc-900">Compliance Interview</option>
                                </optgroup>
                                <optgroup label="Creative">
                                    <option value="design-interview" className="bg-zinc-900">Design Interview</option>
                                    <option value="ux-research" className="bg-zinc-900">UX Research Interview</option>
                                    <option value="creative-director" className="bg-zinc-900">Creative Director Interview</option>
                                </optgroup>
                                <optgroup label="Emerging Tech">
                                    <option value="blockchain" className="bg-zinc-900">Blockchain Interview</option>
                                    <option value="ar-vr" className="bg-zinc-900">AR / VR Interview</option>
                                    <option value="iot" className="bg-zinc-900">IoT Interview</option>
                                    <option value="quantum-computing" className="bg-zinc-900">Quantum Computing</option>
                                </optgroup>
                                <optgroup label="Business">
                                    <option value="sales-engineer" className="bg-zinc-900">Sales Engineer Interview</option>
                                    <option value="solutions-architect" className="bg-zinc-900">Solutions Architect</option>
                                    <option value="technical-writer" className="bg-zinc-900">Technical Writer</option>
                                    <option value="dev-relations" className="bg-zinc-900">Developer Relations</option>
                                </optgroup>
                                <optgroup label="Infrastructure">
                                    <option value="cloud-engineer" className="bg-zinc-900">Cloud Engineer Interview</option>
                                    <option value="network-engineer" className="bg-zinc-900">Network Engineer</option>
                                    <option value="sre" className="bg-zinc-900">Site Reliability Engineer</option>
                                    <option value="platform-engineer" className="bg-zinc-900">Platform Engineer</option>
                                </optgroup>
                            </select>
                        </div>
                    </AccordionSection>

                    {/* 2. Documents */}
                    <AccordionSection
                        num={2} title="Documents" subtitle="Upload materials for context"
                        open={openSection === 2} onToggle={() => setOpenSection(openSection === 2 ? null : 2)}
                    >
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500">Resume</label>
                            <textarea value={resume} onChange={(e) => setResume(e.target.value)} placeholder="Paste resume text or drag a file..." rows={3}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition resize-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500">Job Description</label>
                            <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste JD here..." rows={3}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition resize-none"
                            />
                        </div>
                    </AccordionSection>

                    {/* 3. Advanced */}
                    <AccordionSection
                        num={3} title="Advanced" subtitle="Fine-tune your session"
                        open={openSection === 3} onToggle={() => setOpenSection(openSection === 3 ? null : 3)}
                    >
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500">AI Model</label>
                            <select title="AI model" value={model} onChange={(e) => setModel(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-cyan-500/40 transition appearance-none"
                            >
                                <optgroup label="⚡ Speed Tier">
                                    <option value="general" className="bg-zinc-900">General</option>
                                    <option value="gpt-4o" className="bg-zinc-900">GPT-4o</option>
                                    <option value="gpt-4.1-mini" className="bg-zinc-900">GPT-4.1 Mini 🆕</option>
                                    <option value="gpt-5-mini" className="bg-zinc-900">GPT-5 Mini 🆕 💎</option>
                                    <option value="claude-4.5-haiku" className="bg-zinc-900">Claude Haiku 4.5 🆕 💎</option>
                                    <option value="gemini-2.5-flash" className="bg-zinc-900">Gemini 2.5 Flash 🆕</option>
                                    <option value="gemini-3-flash" className="bg-zinc-900">Gemini 3 Flash 🆕</option>
                                    <option value="grok-4.1-fast" className="bg-zinc-900">Grok 4.1 Fast 🆕</option>
                                </optgroup>
                                <optgroup label="⚖️ Balanced Tier">
                                    <option value="gpt-5" className="bg-zinc-900">GPT-5 🆕</option>
                                    <option value="gpt-4.1" className="bg-zinc-900">GPT-4.1 🆕</option>
                                    <option value="claude-4.5-sonnet" className="bg-zinc-900">Claude Sonnet 4.5 🆕 💎</option>
                                    <option value="kimi-k2-turbo" className="bg-zinc-900">Kimi K2 Turbo 🆕 💎</option>
                                    <option value="deepseek-chat" className="bg-zinc-900">DeepSeek Chat 🆕 💎</option>
                                </optgroup>
                                <optgroup label="🧠 Reasoning Tier">
                                    <option value="gpt-5.2" className="bg-zinc-900">GPT-5.2 🆕 💎</option>
                                    <option value="gpt-5.1" className="bg-zinc-900">GPT-5.1 🆕 💎</option>
                                    <option value="claude-4.5-opus" className="bg-zinc-900">Claude Opus 4.5 🆕 💎</option>
                                    <option value="gemini-3-pro" className="bg-zinc-900">Gemini 3 Pro 🆕 💎</option>
                                    <option value="grok-4" className="bg-zinc-900">Grok 4 🆕 💎 ⏳</option>
                                </optgroup>
                                <optgroup label="🏠 Local">
                                    <option value="ollama-local" className="bg-zinc-900">Ollama Local (Private)</option>
                                </optgroup>
                            </select>
                        </div>

                        {/* Image Analysis Context */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500">Image Analysis Context</label>
                            <textarea
                                value={imageContext}
                                onChange={(e) => setImageContext(e.target.value.slice(0, 400))}
                                placeholder="Guide the Vision AI: e.g. &quot;Prioritize identifying the LeetCode problem statement and ignore the IDE frame&quot;"
                                rows={2}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition resize-none"
                            />
                            <p className="text-[9px] text-zinc-600 text-right">{400 - imageContext.length} chars left</p>
                        </div>

                        {/* Interview Procedures */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500">Interview Procedures</label>
                            <textarea
                                value={procedures}
                                onChange={(e) => setProcedures(e.target.value)}
                                placeholder="Step 1: Intro &amp; warm-up&#10;Step 2: Technical deep-dive&#10;Step 3: System design&#10;Step 4: Behavioral questions"
                                rows={3}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition resize-none"
                            />
                        </div>

                        {/* Priority Questions */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500">Priority Questions</label>
                            <textarea
                                value={priorityQuestions}
                                onChange={(e) => setPriorityQuestions(e.target.value)}
                                placeholder="Questions you expect or want to prepare for:&#10;- Tell me about yourself&#10;- Why this company?&#10;- Describe a challenging project"
                                rows={3}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 transition resize-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500">Backend URL</label>
                            <input type="text" title="Backend URL" placeholder="http://127.0.0.1:9010" value={backendUrl} onChange={(e) => setBackendUrl(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[10px] text-white font-mono focus:outline-none focus:border-cyan-500/40 transition"
                            />
                        </div>
                    </AccordionSection>
                </div>

                {/* ── STEALTH SCORE PANEL ── */}
                <div className="mx-3 mt-2 mb-1 rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                    <div className="flex items-center gap-2.5 px-3 py-2">
                        <div className="relative w-10 h-10 shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                                <circle cx="18" cy="18" r="15.9" fill="none"
                                    stroke={stealthScore >= 90 ? "#22c55e" : stealthScore >= 70 ? "#06b6d4" : stealthScore >= 50 ? "#f59e0b" : "#ef4444"}
                                    strokeWidth="2.5" strokeDasharray={`${stealthScore} ${100 - stealthScore}`} strokeLinecap="round" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">{stealthScore}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-semibold text-white">Stealth Protection</p>
                            <p className={`text-[9px] font-medium ${
                                threatLevel === "CLEAN" ? "text-emerald-400" :
                                threatLevel === "LOW" ? "text-cyan-400" :
                                threatLevel === "MEDIUM" ? "text-amber-400" : "text-red-400"
                            }`}>
                                {threatLevel === "SCANNING" ? "⏳ Scanning..." : `● ${threatLevel}`}
                            </p>
                        </div>
                    </div>
                    {stealthLayers.length > 0 && (
                        <div className="px-3 pb-2 grid grid-cols-2 gap-1">
                            {stealthLayers.slice(0, 6).map((layer) => (
                                <div key={layer.name} className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${layer.active ? "bg-emerald-400" : "bg-zinc-600"}`} />
                                    <span className="text-[8px] text-zinc-500 truncate">{layer.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="shrink-0 px-3 pt-2 pb-2 border-t border-white/[0.04]" style={{ WebkitAppRegion: "no-drag" } as any}>
                <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                        Go
                    </span>
                    <button
                        onClick={handleStart}
                        disabled={starting}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] uppercase tracking-wider transition
                            disabled:opacity-30 disabled:cursor-not-allowed
                            bg-gradient-to-r from-blue-600 to-purple-600 text-white
                            hover:from-blue-500 hover:to-purple-500 hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]
                            border border-blue-500/30"
                    >
                        {starting ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : null}
                        {starting ? "Starting..." : "START"}
                    </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-2 px-1">
                    <span className="text-[9px] text-zinc-600">v0.3.0</span>
                    <div className="flex items-center gap-1">
                        <kbd className="px-1 py-0.5 rounded bg-white/[0.04] text-[8px] text-zinc-600 font-mono">Ctrl+Shift+H</kbd>
                        <span className="text-[8px] text-zinc-700">hide</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button title="Quick start" className="w-5 h-5 flex items-center justify-center rounded-full bg-white/[0.04] text-zinc-500 hover:text-cyan-400 transition">
                            <Play className="w-2.5 h-2.5" />
                        </button>
                        <button title="Help" className="w-5 h-5 flex items-center justify-center rounded-full bg-white/[0.04] text-zinc-500 hover:text-cyan-400 transition">
                            <HelpCircle className="w-2.5 h-2.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── OVERLAYS ── */}
            {showSettings && (
                <SettingsPanel
                    onClose={() => setShowSettings(false)}
                    settings={settingsData}
                    onUpdate={setSettingsData}
                />
            )}
            {showMenu && (
                <SideNav
                    onClose={() => setShowMenu(false)}
                    sessionMode={sessionMode}
                    onSessionMode={(m) => setSessionMode(m as any)}
                />
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// MAIN OVERLAY PAGE
// ═══════════════════════════════════════════════════════════
export default function OverlayPage() {
    const phantom = usePhantomOverlay();
    const [mode, setMode] = useState<"setup" | "live">("setup");
    const [showInjector, setShowInjector] = useState(false);
    const [injectorText, setInjectorText] = useState("");
    const [injecting, setInjecting] = useState(false);

    // ── When switching to live, bootstrap the overlay ──
    const handleSessionStart = useCallback(() => {
        phantom.setVisible(true);
        phantom.startSession();
        setMode("live");

        // Listen for IPC messages from backend via main process
        const bridge = getBridge();
        if (bridge?.onWSMessage) {
            bridge.onWSMessage((msg: { type: string; data: any }) => {
                phantom.handleWSMessage(msg.type, msg.data);
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Test-mode WS message injection (for E2E automation) ──
    useEffect(() => {
        if (mode !== "live") return;
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.type) {
                phantom.handleWSMessage(detail.type, detail.data || detail);
            }
        };
        window.addEventListener("test:ws", handler);
        return () => window.removeEventListener("test:ws", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    // ── IPC control messages from main process ──
    useEffect(() => {
        const bridge = getBridge();
        if (!bridge) return;
        const handlers: Array<() => void> = [];
        if (bridge.onControlMicMuted) {
            handlers.push(bridge.onControlMicMuted((muted: boolean) => {
                phantom.setIsListening(!muted);
            }));
        }
        return () => handlers.forEach((unsub) => unsub?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Ctrl+Shift+Q toggles interviewer simulation panel ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === "Q") {
                e.preventDefault();
                setShowInjector(prev => !prev);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    // ── Inject transcript via loopback WS ──
    const handleInjectQuestion = useCallback(async (text?: string) => {
        const question = (text || injectorText).trim();
        if (!question) return;
        setInjecting(true);
        try {
            const bridge = getBridge();
            if (bridge?.injectTranscript) {
                await bridge.injectTranscript(question);
            }
        } finally {
            setInjecting(false);
            if (!text) setInjectorText("");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [injectorText]);

    const handleClose = useCallback(() => {
        const bridge = getBridge();
        if (mode === "live") {
            // Stop session, go back to setup
            bridge?.stopLoopback?.();
            phantom.setVisible(false);
            setMode("setup");
            return;
        }
        if (bridge?.minimizeOverlay) {
            bridge.minimizeOverlay();
        } else {
            phantom.setVisible(false);
        }
    }, [phantom, mode]);

    const handleStop = useCallback(() => {
        const bridge = getBridge();
        bridge?.stopLoopback?.();
        phantom.setVisible(false);
        setMode("setup");
    }, [phantom]);

    const handleToggleVisibility = useCallback(() => {
        phantom.toggleVisibility();
    }, [phantom]);

    const handleToggleMic = useCallback(() => {
        phantom.toggleMic();
    }, [phantom]);

    const handleCaptureScreenshot = useCallback(async () => {
        const bridge = getBridge();
        if (bridge?.captureAndAnalyze) {
            await bridge.captureAndAnalyze();
        }
    }, []);

    // ── SETUP MODE ──
    if (mode === "setup") {
        return (
            <div className="w-screen h-screen bg-transparent overflow-hidden">
                <div className="w-full h-full rounded-2xl bg-[#0c0c14]/95 backdrop-blur-2xl border border-white/[0.06] shadow-2xl shadow-black/60 overflow-hidden flex flex-col">
                    <SetupPanel onStart={handleSessionStart} />
                </div>
            </div>
        );
    }

    // ── LIVE MODE ──
    const PRESET_QUESTIONS = [
        "Tell me about yourself and your background.",
        "Describe a time you had a conflict with a teammate and how you resolved it.",
        "How would you design a URL shortener like bit.ly at scale?",
        "What is your biggest weakness? Give me a concrete example.",
    ];

    return (
        <div className="w-screen h-screen bg-transparent overflow-hidden">
            <PhantomOverlay
                visible={phantom.visible}
                onClose={handleClose}
                onToggleVisibility={handleToggleVisibility}
                transcript={phantom.transcript}
                aiResponse={phantom.aiResponse}
                coach={phantom.coach}
                deepThink={phantom.deepThink}
                isListening={phantom.isListening}
                onToggleMic={handleToggleMic}
                opacity={phantom.settings.opacity}
                position={phantom.settings.position}
                size={phantom.settings.size}
                currentQuestion={phantom.currentQuestion}
                partialQuestion={phantom.partialQuestion}
                streamingText={phantom.streamingText}
                isStreaming={phantom.isStreaming}
                elapsedSeconds={phantom.elapsedSeconds}
                offerProbability={phantom.offerProbability}
                answerHistory={phantom.answerHistory}
                historyIndex={phantom.historyIndex}
                onNavigateHistory={phantom.navigateHistory}
                stealthHealth={phantom.stealthHealth}
                threatToast={phantom.threatToast}
                onUpdateSettings={phantom.updateSettings}
                onStop={handleStop}
                isSessionActive={mode === "live"}
                screenshotAnalysis={phantom.screenshotAnalysis}
                isAnalyzingScreenshot={phantom.isAnalyzingScreenshot}
                onCaptureScreenshot={handleCaptureScreenshot}
                audioHealth={phantom.audioHealth}
                audioWarning={phantom.audioWarning}
            />

            {/* ── Interviewer Simulation Panel (Ctrl+Shift+Q) ── */}
            {showInjector && (
                <div
                    data-testid="injector-panel"
                    style={{ position: "fixed", bottom: 16, right: 16, zIndex: 99999, width: 380 }}
                    className="bg-zinc-900/95 border border-purple-500/40 rounded-xl p-4 backdrop-blur-xl shadow-2xl"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">🎤 Interviewer Simulator</span>
                        <button onClick={() => setShowInjector(false)} className="text-zinc-500 hover:text-white text-xs">✕</button>
                    </div>

                    <div className="space-y-2 mb-3">
                        {PRESET_QUESTIONS.map((q, i) => (
                            <button
                                key={i}
                                data-testid={`preset-q-${i}`}
                                onClick={() => handleInjectQuestion(q)}
                                disabled={injecting}
                                className="w-full text-left text-xs px-3 py-2 rounded-lg bg-zinc-800 hover:bg-purple-900/40 text-zinc-300 hover:text-white transition border border-zinc-700 hover:border-purple-500/50 disabled:opacity-50"
                            >
                                <span className="text-purple-400 mr-1">Q{i + 1}:</span> {q}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input
                            data-testid="injector-input"
                            type="text"
                            value={injectorText}
                            onChange={(e) => setInjectorText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleInjectQuestion()}
                            placeholder="Type a custom question..."
                            className="flex-1 text-xs px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
                        />
                        <button
                            data-testid="injector-send"
                            onClick={() => handleInjectQuestion()}
                            disabled={injecting || !injectorText.trim()}
                            className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold disabled:opacity-50 transition"
                        >
                            {injecting ? "..." : "Ask"}
                        </button>
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-2 text-center">Press Ctrl+Shift+Q to toggle this panel</p>
                </div>
            )}
        </div>
    );
}
