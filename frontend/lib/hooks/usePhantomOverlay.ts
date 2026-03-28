"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type OverlayPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
export type OverlaySize = "compact" | "standard" | "wide";
export type ThreatLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface TranscriptLine {
    speaker: string;
    text: string;
    timestamp: string;
    isQuestion?: boolean;
}

export interface AIResponseData {
    answer: string;
    keyPoints: string[];
    starExample?: string;
    star?: { situation: string; task: string; action: string; result: string };
    avoidSaying?: string[];
    followUpPredictions?: string[];
    confidence?: number;
}

export interface CoachData {
    pacing?: string;
    trapAlert?: string;
    avoid?: string[];
    communicationAlert?: string;
    gazeReminder?: string;
}

export interface AnswerHistoryEntry {
    id: string;
    question: string;
    response: AIResponseData;
    coach: CoachData | null;
    timestamp: number;
}

export interface StealthHealth {
    score: number;
    threatLevel: ThreatLevel;
    activeThreats: string[];
    recordingDetected: boolean;
    recordingTools: string[];
}

export interface OverlaySettings {
    opacity: number;
    position: OverlayPosition;
    size: OverlaySize;
}

export interface PhantomOverlayState {
    // Visibility
    visible: boolean;
    collapsed: boolean;
    minimalMode: boolean;

    // Settings
    settings: OverlaySettings;

    // Session
    sessionStartTime: number | null;
    elapsedSeconds: number;
    isListening: boolean;

    // Data
    transcript: TranscriptLine[];
    currentResponse: AIResponseData | null;
    streamingText: string;
    isStreaming: boolean;
    coach: CoachData | null;
    deepThink: boolean;

    // Answer History (Phase 3)
    answerHistory: AnswerHistoryEntry[];
    historyIndex: number;

    // Stealth Health (Phase 3)
    stealthHealth: StealthHealth;
    threatToast: string | null;

    // Confidence (Phase 2)
    offerProbability: number | null;
}

// Detect Electron desktop environment
function isDesktopApp(): boolean {
    return typeof window !== "undefined" && "atluriinDesktop" in window;
}

function getDesktopBridge(): any {
    if (isDesktopApp()) return (window as any).atluriinDesktop;
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function usePhantomOverlay() {
    // Visibility
    const [visible, setVisible] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [minimalMode, setMinimalMode] = useState(false);

    // Settings
    const [settings, setSettings] = useState<OverlaySettings>({
        opacity: 0.95,
        position: "top-right",
        size: "standard",
    });

    // Session
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isListening, setIsListening] = useState(false);

    // Data
    const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
    const [currentResponse, setCurrentResponse] = useState<AIResponseData | null>(null);
    const [streamingText, setStreamingText] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [coach, setCoach] = useState<CoachData | null>(null);
    const [deepThink, setDeepThink] = useState(false);

    // Answer History
    const [answerHistory, setAnswerHistory] = useState<AnswerHistoryEntry[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Stealth Health
    const [stealthHealth, setStealthHealth] = useState<StealthHealth>({
        score: 100,
        threatLevel: "NONE",
        activeThreats: [],
        recordingDetected: false,
        recordingTools: [],
    });
    const [threatToast, setThreatToast] = useState<string | null>(null);

    // Offer probability
    const [offerProbability, setOfferProbability] = useState<number | null>(null);

    // Refs for streaming
    const streamBufferRef = useRef("");
    const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Session Timer ──
    useEffect(() => {
        if (!sessionStartTime) return;
        const interval = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [sessionStartTime]);

    // ── Stealth Health Polling (Desktop only) ──
    useEffect(() => {
        const bridge = getDesktopBridge();
        if (!bridge) return;

        const poll = async () => {
            try {
                const health = await bridge.getStealthHealth?.();
                if (health) {
                    setStealthHealth((prev) => {
                        const recordingTools = health.activeThreats
                            ?.filter((t: any) => /obs|loom|camtasia|snagit|sharex|bandicam|record/i.test(t.name || t))
                            ?.map((t: any) => t.name || t) || [];

                        return {
                            score: health.score ?? prev.score,
                            threatLevel: health.threatLevel ?? prev.threatLevel,
                            activeThreats: health.activeThreats?.map((t: any) => t.name || t) || prev.activeThreats,
                            recordingDetected: recordingTools.length > 0,
                            recordingTools,
                        };
                    });
                }
            } catch { /* ignore in non-desktop */ }
        };

        poll();
        const interval = setInterval(poll, 3000);
        return () => clearInterval(interval);
    }, []);

    // ── Desktop Threat Events ──
    useEffect(() => {
        const bridge = getDesktopBridge();
        if (!bridge) return;

        const unsubThreat = bridge.onThreatDetected?.((detection: any) => {
            setStealthHealth((prev) => ({
                ...prev,
                activeThreats: [...new Set([...prev.activeThreats, detection.name || String(detection)])],
            }));
        });

        const unsubLevel = bridge.onThreatLevelChanged?.((level: ThreatLevel) => {
            setStealthHealth((prev) => ({ ...prev, threatLevel: level }));

            // Phase 3: Auto-opacity on CRITICAL
            if (level === "CRITICAL") {
                setSettings((prev) => ({ ...prev, opacity: 0.3 }));
                setThreatToast("CRITICAL threat — stealth engaged");
                setTimeout(() => setThreatToast(null), 4000);
            } else if (level === "HIGH") {
                setSettings((prev) => ({ ...prev, opacity: Math.min(prev.opacity, 0.6) }));
                setThreatToast("HIGH threat detected");
                setTimeout(() => setThreatToast(null), 3000);
            }
        });

        return () => {
            unsubThreat?.();
            unsubLevel?.();
        };
    }, []);

    // ── Recording detection listener (Desktop) ──
    useEffect(() => {
        const bridge = getDesktopBridge();
        if (!bridge) return;
        // Listen for recording-state-changed from main process
        const handler = (_event: any, isRecording: boolean) => {
            setStealthHealth((prev) => ({
                ...prev,
                recordingDetected: isRecording,
            }));
        };
        // If using ipcRenderer directly it would be via bridge
        // The bridge exposes onRecordingStateChanged if available
        const unsub = bridge.onRecordingStateChanged?.(handler);
        return () => { unsub?.(); };
    }, []);

    // ── Streaming Typewriter Effect ──
    const startStreaming = useCallback((fullText?: string) => {
        setIsStreaming(true);
        setStreamingText("");
        if (fullText) {
            streamBufferRef.current = fullText;
        }
    }, []);

    const appendStreamChunk = useCallback((chunk: string) => {
        streamBufferRef.current += chunk;
    }, []);

    const finishStreaming = useCallback(() => {
        setIsStreaming(false);
        setStreamingText(streamBufferRef.current);
        streamBufferRef.current = "";
    }, []);

    // Typewriter drain: reads from buffer and shows chars incrementally
    useEffect(() => {
        if (!isStreaming) {
            if (streamTimerRef.current) {
                clearInterval(streamTimerRef.current);
                streamTimerRef.current = null;
            }
            return;
        }

        let displayIdx = 0;
        streamTimerRef.current = setInterval(() => {
            const buf = streamBufferRef.current;
            if (displayIdx < buf.length) {
                // Show 3 chars at a time for speed
                const end = Math.min(displayIdx + 3, buf.length);
                setStreamingText(buf.slice(0, end));
                displayIdx = end;
            }
        }, 16); // ~60fps

        return () => {
            if (streamTimerRef.current) {
                clearInterval(streamTimerRef.current);
                streamTimerRef.current = null;
            }
        };
    }, [isStreaming]);

    // ── WebSocket Message Handler ──
    const handleWSMessage = useCallback((msgType: string, data: any) => {
        switch (msgType) {
            case "partial_transcript":
            case "transcript": {
                const line: TranscriptLine = {
                    speaker: data.speaker || "candidate",
                    text: data.text || "",
                    timestamp: data.timestamp || new Date().toLocaleTimeString(),
                    isQuestion: data.isQuestion || data.speaker === "interviewer",
                };
                setTranscript((prev) => {
                    // Update last entry if same speaker partial, else append
                    if (msgType === "partial_transcript" && prev.length > 0 && prev[prev.length - 1].speaker === line.speaker) {
                        return [...prev.slice(0, -1), line];
                    }
                    return [...prev, line];
                });
                break;
            }

            case "answer_suggestion_start":
                startStreaming();
                setDeepThink(data.deepThink || false);
                break;

            case "answer_suggestion_chunk":
                appendStreamChunk(data.text || data.chunk || "");
                break;

            case "answer_suggestion": {
                finishStreaming();
                const response: AIResponseData = {
                    answer: data.answer || data.text || streamBufferRef.current,
                    keyPoints: data.keyPoints || data.key_points || [],
                    star: data.star || undefined,
                    starExample: data.starExample || undefined,
                    avoidSaying: data.avoidSaying || data.avoid_saying || [],
                    followUpPredictions: data.followUpPredictions || data.follow_up_predictions || [],
                    confidence: data.confidence || data.offer_probability || undefined,
                };
                setCurrentResponse(response);
                if (response.confidence != null) {
                    setOfferProbability(response.confidence);
                }
                // Save to history
                const entry: AnswerHistoryEntry = {
                    id: `ans-${Date.now()}`,
                    question: data.question || transcript.filter(t => t.isQuestion).pop()?.text || "",
                    response,
                    coach: null, // will be updated by coach message
                    timestamp: Date.now(),
                };
                setAnswerHistory((prev) => [...prev, entry]);
                setHistoryIndex(-1); // reset to latest
                break;
            }

            case "coach_feedback": {
                const c: CoachData = {
                    pacing: data.pacing,
                    trapAlert: data.trapAlert || data.trap_alert,
                    avoid: data.avoid || [],
                    communicationAlert: data.communicationAlert || data.communication_alert,
                    gazeReminder: data.gazeReminder,
                };
                setCoach(c);
                // Update latest history entry with coach data
                setAnswerHistory((prev) => {
                    if (prev.length === 0) return prev;
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...updated[updated.length - 1], coach: c };
                    return updated;
                });
                break;
            }

            case "offer_probability":
                setOfferProbability(data.probability ?? data.score ?? null);
                break;

            case "deep_think":
                setDeepThink(data.active ?? true);
                break;
        }
    }, [startStreaming, appendStreamChunk, finishStreaming, transcript]);

    // ── Actions ──
    const toggleVisibility = useCallback(() => {
        setVisible((v) => !v);
        // Sync with desktop bridge if available
        const bridge = getDesktopBridge();
        bridge?.setOverlayStealth?.(!visible, settings.opacity);
    }, [visible, settings.opacity]);

    const toggleMic = useCallback(() => {
        setIsListening((v) => !v);
        const bridge = getDesktopBridge();
        bridge?.toggleMic?.();
    }, []);

    const startSession = useCallback(() => {
        setSessionStartTime(Date.now());
        setTranscript([]);
        setCurrentResponse(null);
        setCoach(null);
        setAnswerHistory([]);
        setHistoryIndex(-1);
        setOfferProbability(null);
        setStreamingText("");
        setIsStreaming(false);
    }, []);

    const endSession = useCallback(() => {
        setSessionStartTime(null);
        setElapsedSeconds(0);
    }, []);

    const updateSettings = useCallback((patch: Partial<OverlaySettings>) => {
        setSettings((prev) => {
            const next = { ...prev, ...patch };
            // Sync opacity to desktop bridge
            const bridge = getDesktopBridge();
            if (patch.opacity != null) {
                bridge?.setOverlayStealth?.(true, next.opacity);
            }
            return next;
        });
    }, []);

    // ── Answer History Navigation ──
    const navigateHistory = useCallback((direction: "prev" | "next") => {
        setHistoryIndex((prev) => {
            const maxIdx = answerHistory.length - 1;
            if (direction === "prev") {
                const newIdx = prev === -1 ? maxIdx - 1 : Math.max(0, prev - 1);
                if (newIdx >= 0 && newIdx < answerHistory.length) {
                    setCurrentResponse(answerHistory[newIdx].response);
                    setCoach(answerHistory[newIdx].coach);
                }
                return newIdx;
            } else {
                const newIdx = prev === -1 ? -1 : Math.min(maxIdx, prev + 1);
                if (newIdx >= 0 && newIdx < answerHistory.length) {
                    setCurrentResponse(answerHistory[newIdx].response);
                    setCoach(answerHistory[newIdx].coach);
                } else if (newIdx > maxIdx || newIdx === -1) {
                    // Back to latest
                    if (answerHistory.length > 0) {
                        const latest = answerHistory[answerHistory.length - 1];
                        setCurrentResponse(latest.response);
                        setCoach(latest.coach);
                    }
                    return -1;
                }
                return newIdx;
            }
        });
    }, [answerHistory]);

    // ── Gaze Reminder (Phase 4) ──
    useEffect(() => {
        if (!sessionStartTime || !isListening) return;
        const interval = setInterval(() => {
            setCoach((prev) => prev ? { ...prev, gazeReminder: "Remember: look at the camera when speaking" } : prev);
            // Clear after 5s
            setTimeout(() => {
                setCoach((prev) => prev ? { ...prev, gazeReminder: undefined } : prev);
            }, 5000);
        }, 45000); // Every 45 seconds
        return () => clearInterval(interval);
    }, [sessionStartTime, isListening]);

    // ── Build State Object ──
    const state: PhantomOverlayState = useMemo(() => ({
        visible,
        collapsed,
        minimalMode,
        settings,
        sessionStartTime,
        elapsedSeconds,
        isListening,
        transcript,
        currentResponse,
        streamingText,
        isStreaming,
        coach,
        deepThink,
        answerHistory,
        historyIndex,
        stealthHealth,
        threatToast,
        offerProbability,
    }), [
        visible, collapsed, minimalMode, settings, sessionStartTime,
        elapsedSeconds, isListening, transcript, currentResponse,
        streamingText, isStreaming, coach, deepThink, answerHistory,
        historyIndex, stealthHealth, threatToast, offerProbability,
    ]);

    return {
        state,
        // Flat convenience accessors (avoids state.xxx everywhere)
        visible,
        collapsed,
        minimalMode,
        settings,
        elapsedSeconds,
        isListening,
        transcript,
        aiResponse: currentResponse,
        currentResponse,
        streamingText,
        isStreaming,
        coach,
        deepThink,
        answerHistory,
        historyIndex,
        stealthHealth,
        threatToast,
        offerProbability,
        // Actions
        setVisible,
        setCollapsed,
        setMinimalMode,
        toggleVisibility,
        toggleMic,
        updateSettings,
        startSession,
        endSession,
        navigateHistory,
        handleWSMessage,
        // Setters for direct control (demo mode, etc.)
        setTranscript,
        setCurrentResponse,
        setCoach,
        setDeepThink,
        setOfferProbability,
        setStreamingText,
        setIsStreaming,
        setStealthHealth,
        setIsListening,
    };
}

export type UsePhantomOverlayReturn = ReturnType<typeof usePhantomOverlay>;
