"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
    GripVertical, X, Copy, Settings, Mic, MicOff, Square,
    ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
    Maximize2, Minimize2, MessageSquare, BrainCircuit,
    UserCircle, Layers, Activity, AlertTriangle,
    Shield, ShieldAlert, Radio, Clock, Eye,
    ArrowDown, Video, VideoOff, Camera,
} from "lucide-react";
import type {
    OverlayPosition, OverlaySize, TranscriptLine,
    AIResponseData, CoachData, StealthHealth, AnswerHistoryEntry,
} from "@/lib/hooks/usePhantomOverlay";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PhantomOverlayProps {
    visible: boolean;
    onClose: () => void;
    onToggleVisibility: () => void;
    transcript: TranscriptLine[];
    aiResponse: AIResponseData | null;
    coach?: CoachData | null;
    deepThink?: boolean;
    isListening: boolean;
    onToggleMic: () => void;
    opacity?: number;
    position?: OverlayPosition;
    size?: OverlaySize;
    // Live question tracking
    currentQuestion?: string;
    partialQuestion?: string;
    // Phase 2: Streaming
    streamingText?: string;
    isStreaming?: boolean;
    // Phase 2: Session timer
    elapsedSeconds?: number;
    // Phase 2: Confidence
    offerProbability?: number | null;
    // Phase 3: Answer History
    answerHistory?: AnswerHistoryEntry[];
    historyIndex?: number;
    onNavigateHistory?: (dir: "prev" | "next") => void;
    // Phase 3: Stealth Health
    stealthHealth?: StealthHealth;
    threatToast?: string | null;
    // Settings callback
    onUpdateSettings?: (patch: { opacity?: number; position?: OverlayPosition; size?: OverlaySize }) => void;
    // Stop session callback
    onStop?: () => void;
    isSessionActive?: boolean;
    // Screenshot analysis
    screenshotAnalysis?: string;
    isAnalyzingScreenshot?: boolean;
    onCaptureScreenshot?: () => void;
    // Audio health
    audioHealth?: {
        level: number;
        peak: number;
        status: "good" | "weak" | "silent" | "no_device";
        device: string;
        deviceType: string;
        silenceDurationSec: number;
    } | null;
    audioWarning?: string | null;
}

const POSITION_STYLES: Record<OverlayPosition, string> = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
    center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
};

const SIZE_STYLES: Record<OverlaySize, string> = {
    compact: "w-[320px] max-h-[300px]",
    standard: "w-[460px] max-h-[560px]",
    wide: "w-[580px] max-h-[640px]",
};

const TAB_KEYS: ("master" | "coach" | "transcript")[] = ["master", "coach", "transcript"];

// ── Helpers ──
function formatTimer(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getHealthColor(score: number): string {
    if (score >= 80) return "text-brand-green";
    if (score >= 50) return "text-brand-amber";
    return "text-brand-red";
}

function getHealthBg(score: number): string {
    if (score >= 80) return "bg-brand-green";
    if (score >= 50) return "bg-brand-amber";
    return "bg-brand-red";
}

/** Phase 3: highlight the most impactful sentence (has numbers/metrics) */
function highlightImpactSentence(text: string): { before: string; highlight: string; after: string } | null {
    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length < 2) return null;
    let bestIdx = -1;
    let bestScore = 0;
    sentences.forEach((s, i) => {
        const numCount = (s.match(/\d+[\d,.%x]*/g) || []).length;
        const metricWords = (s.match(/\b(reduced|increased|improved|achieved|delivered|saved|grew|cut|boosted|handled)\b/gi) || []).length;
        const score = numCount * 3 + metricWords * 2;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
    });
    if (bestIdx < 0 || bestScore < 3) return null;
    return {
        before: sentences.slice(0, bestIdx).join(" "),
        highlight: sentences[bestIdx],
        after: sentences.slice(bestIdx + 1).join(" "),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function PhantomOverlay({
    visible,
    onClose,
    onToggleVisibility,
    transcript,
    aiResponse,
    coach,
    deepThink = false,
    isListening,
    onToggleMic,
    opacity = 0.95,
    position = "top-right",
    size = "standard",
    currentQuestion = "",
    partialQuestion = "",
    streamingText = "",
    isStreaming = false,
    elapsedSeconds = 0,
    offerProbability,
    answerHistory = [],
    historyIndex = -1,
    onNavigateHistory,
    stealthHealth,
    threatToast,
    onUpdateSettings,
    onStop,
    isSessionActive = false,
    screenshotAnalysis = "",
    isAnalyzingScreenshot = false,
    onCaptureScreenshot,
    audioHealth,
    audioWarning,
}: PhantomOverlayProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [minimalMode, setMinimalMode] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [localOpacity, setLocalOpacity] = useState(opacity);
    const [localPosition, setLocalPosition] = useState(position);
    const [localSize, setLocalSize] = useState(size);
    const [activeTab, setActiveTab] = useState<"master" | "coach" | "transcript">("master");
    const [showFollowUps, setShowFollowUps] = useState(false);
    const [showThreats, setShowThreats] = useState(false);
    const [copiedToast, setCopiedToast] = useState(false);

    // Smart auto-scroll (Phase 2)
    const transcriptContainerRef = useRef<HTMLDivElement>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [newMessagesCount, setNewMessagesCount] = useState(0);

    const dragControls = useDragControls();

    // Sync external prop changes
    useEffect(() => setLocalOpacity(opacity), [opacity]);
    useEffect(() => setLocalPosition(position), [position]);
    useEffect(() => setLocalSize(size), [size]);

    // ── Keyboard Navigation (Phase 2: keyboard-only mode + panic hide) ──
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Panic Hide: Ctrl+Shift+H
            if (e.ctrlKey && e.shiftKey && e.key === "H") {
                e.preventDefault();
                onToggleVisibility();
                return;
            }
            // Escape → collapse
            if (e.key === "Escape" && visible) {
                setCollapsed(true);
                return;
            }
            // Tab switching: 1/2/3 (only when overlay focused and not typing)
            if (!e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
                const target = e.target as HTMLElement;
                if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
                if (e.key === "1") { setActiveTab("master"); e.preventDefault(); }
                if (e.key === "2") { setActiveTab("coach"); e.preventDefault(); }
                if (e.key === "3") { setActiveTab("transcript"); e.preventDefault(); }
            }
            // Ctrl+Shift+Left/Right → navigate answer history
            if (e.ctrlKey && e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
                e.preventDefault();
                onNavigateHistory?.(e.key === "ArrowLeft" ? "prev" : "next");
            }
            // Enter to copy current answer
            if (e.key === "Enter" && e.ctrlKey && aiResponse?.answer) {
                e.preventDefault();
                copyToClipboard(aiResponse.answer);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onToggleVisibility, visible, aiResponse, onNavigateHistory]);

    // ── Smart Auto-scroll (Phase 2) ──
    useEffect(() => {
        const container = transcriptContainerRef.current;
        if (!container) return;
        const handleScroll = () => {
            const threshold = 80;
            const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
            setIsAtBottom(atBottom);
            if (atBottom) setNewMessagesCount(0);
        };
        container.addEventListener("scroll", handleScroll, { passive: true });
        return () => container.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        if (isAtBottom) {
            transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setNewMessagesCount(0);
        } else if (activeTab === "transcript") {
            setNewMessagesCount((c) => c + 1);
        }
    }, [transcript, isAtBottom, activeTab]);

    const scrollToBottom = useCallback(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setIsAtBottom(true);
        setNewMessagesCount(0);
    }, []);

    const copyToClipboard = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 1500);
    }, []);

    const handleOpacityChange = useCallback((val: number) => {
        setLocalOpacity(val);
        onUpdateSettings?.({ opacity: val });
    }, [onUpdateSettings]);

    const handlePositionChange = useCallback((pos: OverlayPosition) => {
        setLocalPosition(pos);
        onUpdateSettings?.({ position: pos });
    }, [onUpdateSettings]);

    const handleSizeChange = useCallback((s: OverlaySize) => {
        setLocalSize(s);
        onUpdateSettings?.({ size: s });
    }, [onUpdateSettings]);

    // Phase 3: Smart answer highlighting
    const answerHighlight = useMemo(() => {
        if (!aiResponse?.answer) return null;
        return highlightImpactSentence(aiResponse.answer);
    }, [aiResponse?.answer]);

    // The effective display text (streaming or final).
    // During streaming, fall back to previous answer until new chunks arrive
    // so the user never sees a blank flash.
    const displayAnswer = isStreaming
        ? (streamingText || aiResponse?.answer || "")
        : (aiResponse?.answer || "");

    if (!visible) return null;

    // ── Minimal Mode: thin bar ──
    if (minimalMode) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: localOpacity, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="fixed top-0 left-1/2 -translate-x-1/2 z-[9999]"
                style={{ opacity: localOpacity }}
            >
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-b-xl bg-black/80 backdrop-blur-xl border border-white/[0.08] border-t-0 shadow-lg shadow-black/40">
                    <div className={`w-2 h-2 rounded-full ${isListening ? "bg-brand-green animate-pulse" : "bg-brand-red"}`} />
                    {audioHealth && isListening && audioHealth.status !== "good" && (
                        <div className={`w-2 h-2 rounded-full ${audioHealth.status === "weak" ? "bg-brand-amber animate-pulse" : "bg-brand-red animate-pulse"}`} title={`Audio: ${audioHealth.status}`} />
                    )}
                    {deepThink && <Layers className="w-3 h-3 text-brand-purple animate-pulse" />}
                    {stealthHealth && (
                        <div className={`w-2 h-2 rounded-full ${getHealthBg(stealthHealth.score)} ${stealthHealth.threatLevel !== "NONE" ? "animate-pulse" : ""}`} title={`Stealth: ${stealthHealth.score}/100`} />
                    )}
                    <span className="text-xs text-textSecondary max-w-[400px] truncate">
                        {isStreaming ? (
                            <>{streamingText || aiResponse?.answer || "Generating..."}<span className="inline-block w-0.5 h-3 bg-brand-purple ml-0.5 animate-pulse" /></>
                        ) : (
                            aiResponse?.answer || "Waiting for question..."
                        )}
                    </span>
                    {elapsedSeconds > 0 && (
                        <span className="text-[9px] text-textMuted font-code">{formatTimer(elapsedSeconds)}</span>
                    )}
                    <button title="Expand overlay" onClick={() => setMinimalMode(false)} className="text-textMuted hover:text-brand-cyan transition ml-2" tabIndex={0}>
                        <Maximize2 className="w-3 h-3" />
                    </button>
                    <button title="Close overlay" onClick={onClose} className="text-textMuted hover:text-brand-red transition" tabIndex={0}>
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: localOpacity, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                drag
                dragControls={dragControls}
                dragMomentum={false}
                className={`fixed z-[9999] ${POSITION_STYLES[localPosition]} ${SIZE_STYLES[localSize]}`}
                style={{ opacity: localOpacity }}
            >
                <div className="rounded-2xl overflow-hidden bg-black/90 backdrop-blur-2xl border border-white/[0.08] shadow-2xl shadow-black/60 flex flex-col h-full relative">

                    {/* ── Threat Toast (Phase 3) ── */}
                    <AnimatePresence>
                        {threatToast && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="absolute top-0 left-0 right-0 z-50 px-3 py-2 bg-brand-red/90 text-white text-[10px] font-bold text-center backdrop-blur-sm"
                            >
                                <ShieldAlert className="w-3 h-3 inline mr-1" />{threatToast}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Audio Warning Toast ── */}
                    <AnimatePresence>
                        {audioWarning && !threatToast && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="absolute top-0 left-0 right-0 z-40 px-3 py-2 bg-brand-amber/90 text-white text-[10px] font-bold text-center backdrop-blur-sm"
                            >
                                <MicOff className="w-3 h-3 inline mr-1" />{audioWarning}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Copied Toast ── */}
                    <AnimatePresence>
                        {copiedToast && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 px-3 py-1.5 rounded-lg bg-brand-green/90 text-white text-[10px] font-bold"
                            >
                                Copied!
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Header Bar ── */}
                    <div
                        className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/[0.06] cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => dragControls.start(e)}
                    >
                        <div className="flex items-center gap-1.5">
                            <GripVertical className="w-3.5 h-3.5 text-textMuted" />
                            <div className={`w-2 h-2 rounded-full ${isListening ? "bg-brand-green animate-pulse" : "bg-brand-red"}`} />
                            <span className="text-xs font-heading font-semibold text-brand-cyan">PhantomVeil™</span>

                            {/* Phase 3: Stealth Health HUD */}
                            {stealthHealth && (
                                <button
                                    onClick={() => setShowThreats(!showThreats)}
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold transition ${
                                        stealthHealth.score >= 80 ? "bg-brand-green/10 text-brand-green" :
                                        stealthHealth.score >= 50 ? "bg-brand-amber/10 text-brand-amber" :
                                        "bg-brand-red/10 text-brand-red animate-pulse"
                                    }`}
                                    title={`Stealth: ${stealthHealth.score}/100 · ${stealthHealth.activeThreats.length} threats`}
                                    tabIndex={0}
                                >
                                    <Shield className="w-2.5 h-2.5" />
                                    {stealthHealth.score}
                                </button>
                            )}

                            {/* Phase 2: Confidence badge */}
                            {offerProbability != null && (
                                <span className="px-1.5 py-0.5 rounded bg-brand-green/10 text-brand-green text-[9px] font-bold" title="Offer probability">
                                    {Math.round(offerProbability)}%
                                </span>
                            )}

                            {deepThink && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand-purple/20 text-brand-purple text-[9px] font-bold uppercase animate-pulse">
                                    <Layers className="w-2.5 h-2.5" /> Deep Think
                                </span>
                            )}

                            {/* Phase 3: Recording detection alert */}
                            {stealthHealth?.recordingDetected && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand-red/20 text-brand-red text-[9px] font-bold animate-pulse" title={`Recording: ${stealthHealth.recordingTools.join(", ")}`}>
                                    <Video className="w-2.5 h-2.5" /> REC
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Phase 2: Session timer */}
                            {elapsedSeconds > 0 && (
                                <span className="text-[9px] text-textMuted font-code mr-1 flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" />{formatTimer(elapsedSeconds)}
                                </span>
                            )}
                            <button onClick={onToggleMic} className="p-1 rounded hover:bg-white/[0.06] transition" tabIndex={0} title={isListening ? "Mute mic" : "Unmute mic"}>
                                {isListening ? <Mic className="w-3.5 h-3.5 text-brand-green" /> : <MicOff className="w-3.5 h-3.5 text-brand-red" />}
                            </button>
                            {/* Audio level VU indicator */}
                            {audioHealth && isListening && (
                                <div
                                    className={`w-2 h-2 rounded-full transition-colors ${
                                        audioHealth.status === "good" ? "bg-brand-green" :
                                        audioHealth.status === "weak" ? "bg-brand-amber animate-pulse" :
                                        "bg-brand-red animate-pulse"
                                    }`}
                                    title={`Audio: ${audioHealth.status} · Level: ${(audioHealth.level * 100).toFixed(0)}% · ${audioHealth.device || "unknown"}`}
                                />
                            {isSessionActive && onCaptureScreenshot && (
                                <button
                                    onClick={onCaptureScreenshot}
                                    className={`p-1 rounded hover:bg-brand-cyan/20 transition ${isAnalyzingScreenshot ? "animate-pulse" : ""}`}
                                    tabIndex={0}
                                    title="Capture Screenshot for AI Analysis (Ctrl+Shift+F)"
                                >
                                    <Camera className={`w-3.5 h-3.5 ${isAnalyzingScreenshot ? "text-brand-cyan" : "text-textMuted"}`} />
                                </button>
                            )}
                            {isSessionActive && onStop && (
                                <button
                                    onClick={onStop}
                                    className="px-2 py-0.5 rounded bg-brand-red/20 hover:bg-brand-red/40 border border-brand-red/30 transition flex items-center gap-1 group"
                                    tabIndex={0}
                                    title="Stop Interview Session"
                                >
                                    <Square className="w-3 h-3 text-brand-red fill-brand-red group-hover:scale-110 transition-transform" />
                                    <span className="text-[9px] font-semibold text-brand-red uppercase tracking-wider">Stop</span>
                                </button>
                            )}
                            <button onClick={() => setMinimalMode(true)} className="p-1 rounded hover:bg-white/[0.06] transition" title="Minimal mode" tabIndex={0}>
                                <Minimize2 className="w-3.5 h-3.5 text-textMuted" />
                            </button>
                            <button onClick={() => setShowSettings(!showSettings)} className="p-1 rounded hover:bg-white/[0.06] transition" title="Settings" tabIndex={0}>
                                <Settings className="w-3.5 h-3.5 text-textMuted" />
                            </button>
                            <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-white/[0.06] transition" tabIndex={0}>
                                {collapsed ? <ChevronDown className="w-3.5 h-3.5 text-textMuted" /> : <ChevronUp className="w-3.5 h-3.5 text-textMuted" />}
                            </button>
                            <button onClick={onClose} className="p-1 rounded hover:bg-brand-red/20 transition" title="Hide (Ctrl+Shift+H)" tabIndex={0}>
                                <X className="w-3.5 h-3.5 text-textMuted hover:text-brand-red" />
                            </button>
                        </div>
                    </div>

                    {/* ── Threat Detail Dropdown (Phase 3) ── */}
                    <AnimatePresence>
                        {showThreats && stealthHealth && !collapsed && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-b border-white/[0.06]"
                            >
                                <div className="p-2.5 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-textMuted uppercase tracking-wider font-medium flex items-center gap-1">
                                            <Shield className="w-3 h-3" /> Stealth Health
                                        </span>
                                        <span className={`text-[10px] font-bold ${getHealthColor(stealthHealth.score)}`}>
                                            {stealthHealth.score}/100 · {stealthHealth.threatLevel}
                                        </span>
                                    </div>
                                    {stealthHealth.activeThreats.length > 0 ? (
                                        <div className="space-y-1">
                                            {stealthHealth.activeThreats.map((t, i) => (
                                                <div key={i} className="flex items-center gap-2 text-[10px] text-brand-red px-2 py-1 rounded bg-brand-red/5 border border-brand-red/10">
                                                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />{t}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-brand-green">No active threats detected</p>
                                    )}
                                    {stealthHealth.recordingDetected && (
                                        <div className="flex items-center gap-2 text-[10px] text-brand-red px-2 py-1 rounded bg-brand-red/10 border border-brand-red/20">
                                            <Video className="w-2.5 h-2.5 shrink-0" />
                                            Recording detected: {stealthHealth.recordingTools.join(", ")}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Settings Panel (slide down) ── */}
                    <AnimatePresence>
                        {showSettings && !collapsed && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-b border-white/[0.06]"
                            >
                                <div className="p-3 space-y-3">
                                    {/* Opacity slider */}
                                    <div>
                                        <label className="text-[10px] text-textMuted uppercase tracking-wider font-medium">Opacity · {Math.round(localOpacity * 100)}%</label>
                                        <input type="range" min="10" max="100" title="Adjust opacity" value={localOpacity * 100} onChange={(e) => handleOpacityChange(Number(e.target.value) / 100)} className="w-full h-1 mt-1 rounded-full appearance-none bg-white/[0.08] accent-brand-cyan" />
                                    </div>
                                    {/* Position presets */}
                                    <div>
                                        <label className="text-[10px] text-textMuted uppercase tracking-wider font-medium">Position</label>
                                        <div className="flex gap-1 mt-1">
                                            {(["top-left", "top-right", "bottom-left", "bottom-right", "center"] as OverlayPosition[]).map((pos) => (
                                                <button
                                                    key={pos}
                                                    onClick={() => handlePositionChange(pos)}
                                                    className={`px-2 py-1 rounded text-[10px] font-medium transition ${localPosition === pos ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30" : "bg-white/[0.04] text-textMuted border border-white/[0.06] hover:border-white/[0.12]"}`}
                                                    tabIndex={0}
                                                >
                                                    {pos.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Size presets */}
                                    <div>
                                        <label className="text-[10px] text-textMuted uppercase tracking-wider font-medium">Size</label>
                                        <div className="flex gap-1 mt-1">
                                            {(["compact", "standard", "wide"] as OverlaySize[]).map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => handleSizeChange(s)}
                                                    className={`px-3 py-1 rounded text-[10px] font-medium transition ${localSize === s ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30" : "bg-white/[0.04] text-textMuted border border-white/[0.06] hover:border-white/[0.12]"}`}
                                                    tabIndex={0}
                                                >
                                                    {s[0].toUpperCase() + s.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Keyboard shortcuts hint */}
                                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                        <span className="text-[9px] text-textMuted uppercase tracking-wider font-medium">Keyboard</span>
                                        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] text-textMuted">
                                            <span><kbd className="bg-white/[0.06] px-1 rounded">1</kbd><kbd className="bg-white/[0.06] px-1 rounded ml-0.5">2</kbd><kbd className="bg-white/[0.06] px-1 rounded ml-0.5">3</kbd> Switch tabs</span>
                                            <span><kbd className="bg-white/[0.06] px-1 rounded">Ctrl+Enter</kbd> Copy answer</span>
                                            <span><kbd className="bg-white/[0.06] px-1 rounded">Ctrl+Shift+←→</kbd> History</span>
                                            <span><kbd className="bg-white/[0.06] px-1 rounded">Esc</kbd> Collapse</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Content ── */}
                    {!collapsed && (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {/* 3-Tab Navigation: AI Master | AI Coach | Transcript */}
                            <div className="flex border-b border-white/[0.06]">
                                {TAB_KEYS.map((tab, i) => {
                                    const cfg = {
                                        master: { icon: <BrainCircuit className="w-3 h-3" />, label: "AI Master", color: "brand-purple" },
                                        coach: { icon: <UserCircle className="w-3 h-3" />, label: "Aria", color: "brand-cyan" },
                                        transcript: { icon: <MessageSquare className="w-3 h-3" />, label: "Transcript", color: "brand-amber" },
                                    }[tab];
                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`flex-1 px-3 py-2 text-[11px] font-medium transition flex items-center justify-center gap-1.5 ${activeTab === tab ? `text-${cfg.color} border-b-2 border-${cfg.color} bg-${cfg.color}/5` : "text-textMuted hover:text-textSecondary"}`}
                                            tabIndex={0}
                                            title={`${cfg.label} (${i + 1})`}
                                        >
                                            {cfg.icon} {cfg.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Tab Content */}
                            <div ref={activeTab === "transcript" ? transcriptContainerRef : undefined} className="flex-1 overflow-y-auto p-3 custom-scrollbar relative">

                                {/* ═══ AI MASTER TAB ═══ */}
                                {activeTab === "master" && (
                                    <div className="space-y-3">
                                        {/* Phase 3: Answer History Navigation */}
                                        {answerHistory.length > 1 && (
                                            <div className="flex items-center justify-between">
                                                <button
                                                    onClick={() => onNavigateHistory?.("prev")}
                                                    disabled={historyIndex === 0}
                                                    className="p-1 rounded hover:bg-white/[0.06] transition disabled:opacity-20"
                                                    title="Previous answer (Ctrl+Shift+←)"
                                                    tabIndex={0}
                                                >
                                                    <ChevronLeft className="w-3.5 h-3.5 text-textMuted" />
                                                </button>
                                                <span className="text-[9px] text-textMuted">
                                                    {historyIndex === -1 ? `${answerHistory.length}/${answerHistory.length} (latest)` : `${historyIndex + 1}/${answerHistory.length}`}
                                                </span>
                                                <button
                                                    onClick={() => onNavigateHistory?.("next")}
                                                    disabled={historyIndex === -1}
                                                    className="p-1 rounded hover:bg-white/[0.06] transition disabled:opacity-20"
                                                    title="Next answer (Ctrl+Shift+→)"
                                                    tabIndex={0}
                                                >
                                                    <ChevronRight className="w-3.5 h-3.5 text-textMuted" />
                                                </button>
                                            </div>
                                        )}

                                        {/* ═══ LIVE QUESTION BLOCK ═══ */}
                                        {(currentQuestion || partialQuestion) && (
                                            <div className="p-3 rounded-xl bg-brand-amber/5 border border-brand-amber/10 relative">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="text-[9px] text-brand-amber font-bold uppercase tracking-wider flex items-center gap-1">
                                                        👤 Interviewer
                                                        {partialQuestion && !currentQuestion && (
                                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-amber animate-pulse" />
                                                        )}
                                                    </span>
                                                </div>
                                                <p className="text-[13px] text-textPrimary leading-relaxed italic">
                                                    &ldquo;{partialQuestion || currentQuestion}&rdquo;
                                                    {partialQuestion && !currentQuestion && (
                                                        <span className="inline-block w-0.5 h-4 bg-brand-amber ml-0.5 animate-pulse" />
                                                    )}
                                                </p>
                                            </div>
                                        )}

                                        {/* ═══ SCREENSHOT ANALYSIS BLOCK ═══ */}
                                        {(screenshotAnalysis || isAnalyzingScreenshot) && (
                                            <div className="p-3 rounded-xl bg-brand-cyan/5 border border-brand-cyan/10 relative">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="text-[9px] text-brand-cyan font-bold uppercase tracking-wider flex items-center gap-1">
                                                        📸 Screenshot Analysis
                                                        {isAnalyzingScreenshot && (
                                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="text-[12px] text-textPrimary leading-relaxed whitespace-pre-wrap">
                                                    {screenshotAnalysis}
                                                    {isAnalyzingScreenshot && (
                                                        <span className="inline-block w-0.5 h-4 bg-brand-cyan ml-0.5 animate-pulse" />
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {aiResponse || isStreaming ? (
                                            <>
                                                {/* Quick Pitch (with streaming + smart highlighting) */}
                                                <div className="p-3 rounded-xl bg-brand-purple/5 border border-brand-purple/10 relative">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[9px] text-brand-purple font-bold uppercase tracking-wider">Quick Pitch</span>
                                                        <button title="Copy answer (Ctrl+Enter)" onClick={() => copyToClipboard(displayAnswer)} className="text-textMuted hover:text-brand-purple transition" tabIndex={0}>
                                                            <Copy className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    {/* Phase 2: Streaming typewriter + Phase 3: Smart highlighting */}
                                                    {isStreaming ? (
                                                        <p className="text-[13px] text-textPrimary leading-relaxed">
                                                            {streamingText}
                                                            <span className="inline-block w-0.5 h-4 bg-brand-purple ml-0.5 animate-pulse" />
                                                        </p>
                                                    ) : answerHighlight ? (
                                                        <p className="text-[13px] text-textPrimary leading-relaxed">
                                                            {answerHighlight.before}{answerHighlight.before ? " " : ""}
                                                            <span className="bg-brand-purple/15 text-brand-purple px-0.5 rounded font-medium">{answerHighlight.highlight}</span>
                                                            {answerHighlight.after ? " " : ""}{answerHighlight.after}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[13px] text-textPrimary leading-relaxed">{aiResponse?.answer}</p>
                                                    )}
                                                </div>

                                                {/* Avoid Saying */}
                                                {aiResponse?.avoidSaying && aiResponse.avoidSaying.length > 0 && (
                                                    <div className="p-2 rounded-lg bg-brand-red/5 border border-brand-red/10">
                                                        <span className="text-[9px] text-brand-red font-bold uppercase tracking-wider">⚠ Avoid Saying</span>
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {aiResponse.avoidSaying.map((a, i) => (
                                                                <span key={i} className="text-[10px] text-red-400/80 px-1.5 py-0.5 rounded bg-brand-red/5 border border-brand-red/10">
                                                                    {a}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* STAR Breakdown */}
                                                {aiResponse?.star && (
                                                    <div className="space-y-1.5 pl-2 border-l-2 border-brand-purple/20">
                                                        {[
                                                            { label: "S", text: aiResponse.star.situation, color: "text-textMuted" },
                                                            { label: "T", text: aiResponse.star.task, color: "text-textMuted" },
                                                            { label: "A", text: aiResponse.star.action, color: "text-textPrimary" },
                                                            { label: "R", text: aiResponse.star.result, color: "text-brand-green" },
                                                        ].map(item => (
                                                            <div key={item.label} className="flex gap-2">
                                                                <span className="text-[10px] font-bold text-brand-purple w-3 shrink-0">{item.label}:</span>
                                                                <span className={`text-xs ${item.color} leading-relaxed`}>{item.text}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Legacy STAR example fallback */}
                                                {!aiResponse?.star && aiResponse?.starExample && (
                                                    <div className="p-2 rounded-lg bg-brand-purple/5 border border-brand-purple/10">
                                                        <span className="text-[9px] text-brand-purple font-bold uppercase tracking-wider">STAR Example</span>
                                                        <p className="text-xs text-textSecondary leading-relaxed mt-1">{aiResponse.starExample}</p>
                                                    </div>
                                                )}

                                                {/* Key Points */}
                                                {aiResponse?.keyPoints && aiResponse.keyPoints.length > 0 && (
                                                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                                                        <span className="text-[9px] text-brand-green font-bold uppercase tracking-wider">Key Points</span>
                                                        <ul className="mt-1.5 space-y-1">
                                                            {aiResponse.keyPoints.map((p, i) => (
                                                                <li key={i} className="flex items-start gap-2 text-xs text-textSecondary">
                                                                    <span className="text-brand-green mt-0.5 shrink-0">▸</span>{p}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Phase 3: Follow-up Predictions */}
                                                {aiResponse?.followUpPredictions && aiResponse.followUpPredictions.length > 0 && (
                                                    <div className="p-2 rounded-lg bg-brand-amber/5 border border-brand-amber/10">
                                                        <button
                                                            onClick={() => setShowFollowUps(!showFollowUps)}
                                                            className="flex items-center gap-1 text-[9px] text-brand-amber font-bold uppercase tracking-wider w-full"
                                                            tabIndex={0}
                                                        >
                                                            {showFollowUps ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                                                            Likely Follow-Ups ({aiResponse.followUpPredictions.length})
                                                        </button>
                                                        <AnimatePresence>
                                                            {showFollowUps && (
                                                                <motion.ul
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="mt-1.5 space-y-1 overflow-hidden"
                                                                >
                                                                    {aiResponse.followUpPredictions.map((q, i) => (
                                                                        <li key={i} className="flex items-start gap-2 text-xs text-textSecondary">
                                                                            <span className="text-brand-amber mt-0.5 shrink-0">?</span>{q}
                                                                        </li>
                                                                    ))}
                                                                </motion.ul>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-center py-8">
                                                <BrainCircuit className="w-8 h-8 mx-auto text-textMuted mb-2 opacity-30" />
                                                <p className="text-xs text-textMuted">Waiting for interview question...</p>
                                                <p className="text-[10px] text-textMuted mt-1">AI Master will generate a word-for-word response</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ═══ AI COACH TAB ═══ */}
                                {activeTab === "coach" && (
                                    <div className="space-y-3">
                                        {coach ? (
                                            <>
                                                {/* Delivery Monitor */}
                                                {coach.pacing && (
                                                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                                        <p className="text-[9px] text-brand-amber font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                            <Activity className="w-3 h-3" /> Delivery Monitor
                                                        </p>
                                                        <p className="text-xs text-textSecondary leading-relaxed">{coach.pacing}</p>
                                                    </div>
                                                )}

                                                {/* Communication Skills Alert */}
                                                {coach.communicationAlert && (
                                                    <div className="p-3 rounded-xl bg-brand-cyan/5 border border-brand-cyan/10">
                                                        <p className="text-[9px] text-brand-cyan font-bold uppercase tracking-wider mb-1.5">Communication Skills</p>
                                                        <p className="text-xs text-textSecondary leading-relaxed">{coach.communicationAlert}</p>
                                                    </div>
                                                )}

                                                {/* Trap Question / Strategic Pivot */}
                                                {coach.trapAlert && (
                                                    <div className="p-3 rounded-xl bg-brand-red/5 border border-brand-red/10">
                                                        <p className="text-[9px] text-brand-red font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                            <AlertTriangle className="w-3 h-3" /> Strategic Pivot
                                                        </p>
                                                        <p className="text-xs text-textSecondary leading-relaxed">{coach.trapAlert}</p>
                                                    </div>
                                                )}

                                                {/* Avoid Phrases */}
                                                {coach.avoid && coach.avoid.length > 0 && (
                                                    <div className="p-2 rounded-lg bg-brand-red/5 border border-brand-red/10">
                                                        <span className="text-[9px] text-brand-red font-bold uppercase tracking-wider">⚠ Avoid Saying</span>
                                                        <ul className="mt-1.5 space-y-1">
                                                            {coach.avoid.map((a, i) => (
                                                                <li key={i} className="text-[11px] text-red-400/80 flex items-start gap-1.5">
                                                                    <span className="text-red-500 mt-0.5">•</span> {a}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Phase 4: Webcam Gaze Reminder */}
                                                {coach.gazeReminder && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 10 }}
                                                        className="p-3 rounded-xl bg-brand-purple/5 border border-brand-purple/10"
                                                    >
                                                        <p className="text-[9px] text-brand-purple font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                                            <Eye className="w-3 h-3" /> Camera Awareness
                                                        </p>
                                                        <p className="text-xs text-textSecondary leading-relaxed">{coach.gazeReminder}</p>
                                                    </motion.div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-center py-8">
                                                <UserCircle className="w-8 h-8 mx-auto text-textMuted mb-2 opacity-30" />
                                                <p className="text-xs text-textMuted">Aria is monitoring...</p>
                                                <p className="text-[10px] text-textMuted mt-1">AI coaching tips and delivery alerts will appear here</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ═══ TRANSCRIPT TAB ═══ */}
                                {activeTab === "transcript" && (
                                    <div className="space-y-2">
                                        {transcript.length === 0 ? (
                                            <div className="text-center py-8">
                                                <Mic className="w-8 h-8 mx-auto text-textMuted mb-2 opacity-30" />
                                                <p className="text-xs text-textMuted">No transcript yet</p>
                                                <p className="text-[10px] text-textMuted mt-1">Start speaking or enable microphone</p>
                                            </div>
                                        ) : (
                                            transcript.map((line, i) => (
                                                <div
                                                    key={i}
                                                    className={`group flex gap-2 p-2 rounded-lg transition ${line.isQuestion ? "bg-brand-amber/5 border border-brand-amber/10" : "hover:bg-white/[0.02]"}`}
                                                >
                                                    <span className={`text-[10px] font-semibold shrink-0 mt-0.5 ${line.speaker === "interviewer" ? "text-brand-amber" : "text-brand-cyan"}`}>
                                                        {line.speaker === "interviewer" ? "👤" : "🎙"}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-textSecondary leading-relaxed">{line.text}</p>
                                                        <span className="text-[9px] text-textMuted">{line.timestamp}</span>
                                                    </div>
                                                    <button
                                                        title="Copy text"
                                                        onClick={() => copyToClipboard(line.text)}
                                                        className="opacity-0 group-hover:opacity-100 text-textMuted hover:text-brand-cyan transition shrink-0"
                                                        tabIndex={0}
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                        <div ref={transcriptEndRef} />
                                    </div>
                                )}

                                {/* Phase 2: Smart auto-scroll — new messages badge */}
                                {activeTab === "transcript" && !isAtBottom && newMessagesCount > 0 && (
                                    <button
                                        onClick={scrollToBottom}
                                        className="sticky bottom-0 left-1/2 -translate-x-1/2 mx-auto flex items-center gap-1 px-3 py-1 rounded-full bg-brand-cyan/90 text-white text-[10px] font-bold shadow-lg hover:bg-brand-cyan transition z-10"
                                        tabIndex={0}
                                    >
                                        <ArrowDown className="w-3 h-3" /> {newMessagesCount} new
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Footer Status ── */}
                    {!collapsed && (
                        <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.02] border-t border-white/[0.04]">
                            <span className="text-[9px] text-textMuted flex items-center gap-1">
                                {isListening ? <><Radio className="w-2.5 h-2.5 text-brand-red animate-pulse" /> Live</> : "⏸ Paused"}
                                <span className="text-white/[0.15]">·</span>
                                <span className="text-white/[0.3]">Ctrl+Shift+H</span>
                                {elapsedSeconds > 0 && (
                                    <>
                                        <span className="text-white/[0.15]">·</span>
                                        <span className="font-code">{formatTimer(elapsedSeconds)}</span>
                                    </>
                                )}
                            </span>
                            <span className="text-[9px] text-textMuted flex items-center gap-2">
                                {stealthHealth && (
                                    <span className={`${getHealthColor(stealthHealth.score)} font-bold`}>
                                        ● {stealthHealth.score}
                                    </span>
                                )}
                                {transcript.length} lines
                            </span>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
