"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../../../../lib/api";
import { getAccessTokenOrThrow } from "../../../../lib/auth";
import AssistPanel, { AssistHint } from "../../../../components/AssistPanel";

type ContextSnapshotUi = {
  resume: { loaded: boolean; chars: number };
  job: { loaded: boolean; chars: number };
  interview: { role: string; active: boolean; done: boolean; updated_at: number };
  credibility: { has_snapshot: boolean; updated_at: number };
  company_mode?: string;
  assist?: { intensity?: number };
};

export default function LiveVoiceInterview() {
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:9010").replace(/\/+$/, "");
  const WS_BASE = API_BASE.replace(/^http/i, "ws");

  const ws = useRef<WebSocket | null>(null);
  const streamTimeoutRef = useRef<number | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const processor = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<any | null>(null);
  const lastQuestionTriggerRef = useRef<{ key: string; ts: number }>({ key: "", ts: 0 });
  const lastReceivedQuestionRef = useRef<{ key: string; ts: number }>({ key: "", ts: 0 });
  const stoppingRef = useRef(false);
  const lastHintRef = useRef<{ key: string; ts: number }>({ key: "", ts: 0 });
  const lastSpeechTsRef = useRef<number>(0);
  const speakingMillisRef = useRef<number>(0);
  const captureEnabledRef = useRef<boolean>(true);

  const TOTAL_QUESTIONS = 5;
  const STREAM_TIMEOUT_MS = 20000;
  const NEXT_SESSION_GOAL_KEY = "atluriin.interview.nextGoal.v1";

  const isUuidV4 = (value: string): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());

  const createRoomId = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  };

  const [currentQuestion, setCurrentQuestion] = useState<string>("Please introduce yourself.");
  const [questionIndex, setQuestionIndex] = useState(1);
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [confidence, setConfidence] = useState<number>(0);
  const [hesitation, setHesitation] = useState<number>(0);
  const [finalSummary, setFinalSummary] = useState<any | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [assistIntensity, setAssistIntensity] = useState<1 | 2 | 3>(2);
  const [assistIntensitySaving, setAssistIntensitySaving] = useState(false);
  const [assistHint, setAssistHint] = useState<AssistHint | null>(null);
  const [snapshot, setSnapshot] = useState<ContextSnapshotUi | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [roomId, setRoomId] = useState<string>(() => createRoomId());
  const [participantMode, setParticipantMode] = useState<"candidate" | "interviewer">("candidate");
  const [liveInterviewerQuestion, setLiveInterviewerQuestion] = useState("");
  const [liveGeneratedAnswer, setLiveGeneratedAnswer] = useState("");
  const [previousAnswer, setPreviousAnswer] = useState("");
  const [liveAnswerStreaming, setLiveAnswerStreaming] = useState(false);
  const [liveAnswerMode, setLiveAnswerMode] = useState<"live" | "fallback" | "generating" | "idle">("idle");
  const [finalSessionId, setFinalSessionId] = useState("");
  const [companyMode, setCompanyMode] = useState("general");
  const [emotionalEvent, setEmotionalEvent] = useState<{ type: string; message: string } | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [speakingSeconds, setSpeakingSeconds] = useState(0);
  const [speakingNow, setSpeakingNow] = useState(false);
  const [metricUsageDetected, setMetricUsageDetected] = useState(false);
  const [driftDetected, setDriftDetected] = useState(false);
  const [miniScores, setMiniScores] = useState<{ clarity: number; depth: number; structure: number }>({
    clarity: 0,
    depth: 0,
    structure: 0,
  });
  const [showLiveDetails, setShowLiveDetails] = useState(false);
  const [decisionCount, setDecisionCount] = useState(0);
  const [metricMissCount, setMetricMissCount] = useState(0);
  const [driftEventCount, setDriftEventCount] = useState(0);
  const [ownershipStart, setOwnershipStart] = useState<number | null>(null);
  const [ownershipEnd, setOwnershipEnd] = useState<number | null>(null);
  const [persistedGoalText, setPersistedGoalText] = useState<string>("");
  const [activeRoundGoal, setActiveRoundGoal] = useState<string>("");
  const [showRawSummary, setShowRawSummary] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [captureEnabled, setCaptureEnabled] = useState(true);
  const [answerLanguage, setAnswerLanguage] = useState<"english" | "detected">("english");
  
  // Phase 1: Answer History (last 5 Q&A pairs)
  const [answerHistory, setAnswerHistory] = useState<Array<{question: string; answer: string; timestamp: number}>>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Phase 2: TTS Playback
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const ttsUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Phase 1: Stop Generation
  const [canStopGeneration, setCanStopGeneration] = useState(false);
  
  // Phase 2: Export Session
  const [exportingSession, setExportingSession] = useState(false);
  
  // Stealth Mode: Auto-reconnect
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const MAX_RECONNECT_ATTEMPTS = 3;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(false);
  
  // Show diagnostics (collapsed by default for cleaner UX)
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const formatClock = (totalSeconds: number): string => {
    const safeSeconds = Math.max(0, Number(totalSeconds || 0));
    const mins = Math.floor(safeSeconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(safeSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const improvementNeeded = !metricUsageDetected || driftDetected || confidence < 55;
  const recruiterState = !running
    ? "Evaluator State: Waiting"
    : driftDetected
    ? "Evaluator State: Testing Recovery"
    : !metricUsageDetected
    ? "Evaluator State: Assessing Evidence"
    : "Evaluator State: Assessing Consistency";

  const finalOfferProbability = Math.round(Number(
    finalSummary?.offer_probability ??
      finalSummary?.offer_probability_snapshot?.offer_probability ??
      finalSummary?.summary?.offer_probability ??
      confidence ??
      0
  ));
  const finalConfidenceBandRaw = String(
    finalSummary?.offer_confidence_band ??
      finalSummary?.offer_probability_snapshot?.confidence_band ??
      finalSummary?.summary?.offer_confidence_band ??
      "medium"
  ).toLowerCase();
  const finalBandSpread = finalConfidenceBandRaw === "high" ? 4 : finalConfidenceBandRaw === "medium" ? 8 : 12;
  const finalBandLow = Math.max(0, finalOfferProbability - finalBandSpread);
  const finalBandHigh = Math.min(100, finalOfferProbability + finalBandSpread);
  const finalVerdict = finalOfferProbability >= 70 ? "Likely" : finalOfferProbability >= 55 ? "Borderline" : "Unlikely";
  const finalInterpretation =
    finalOfferProbability >= 70
      ? "Likely to advance if execution remains consistent."
      : finalOfferProbability >= 55
      ? "Borderline: one stronger round can shift this into pass-range."
      : "Unlikely currently: correct ownership and evidence signals before major loops.";
  const finalWhyItems = (
    finalSummary?.drivers_negative ||
    finalSummary?.offer_probability_snapshot?.drivers_negative ||
    finalSummary?.summary?.risk_flags ||
    []
  )
    .slice(0, 3)
    .map((item: any) => String(item));
  const finalDeltaValue = Number(
    finalSummary?.delta_vs_last_session ??
      finalSummary?.offer_probability_snapshot?.delta_vs_last_session ??
      finalSummary?.summary?.offer_delta_vs_last_session ??
      0
  );
  const finalFixItems = (
    finalSummary?.what_to_fix_next ||
    finalSummary?.offer_probability_snapshot?.what_to_fix_next ||
    []
  )
    .slice(0, 3)
    .map((item: any) => String(item));

  const focusMessage = useMemo(() => {
    if (driftDetected) {
      return "Refocus on outcomes: decision, ownership, measurable impact.";
    }
    if (!metricUsageDetected) {
      return "Add at least one concrete metric in your next answer.";
    }
    if (confidence < 55) {
      return "Keep answers short and structured to raise confidence.";
    }
    return "Keep this rhythm: clear decision, clear action, clear result.";
  }, [driftDetected, metricUsageDetected, confidence]);

  const coachingItems = useMemo(() => {
    const items: string[] = [];
    if (decisionCount > 0 && metricMissCount > 0) {
      items.push(`You avoided metrics in ${metricMissCount}/${decisionCount} scoring moments.`);
    }
    if (driftEventCount > 0) {
      items.push(`You drifted ${driftEventCount} time${driftEventCount > 1 ? "s" : ""} under pressure. Keep answers outcome-first.`);
    }
    if (ownershipStart !== null && ownershipEnd !== null && ownershipStart > 0 && ownershipEnd < ownershipStart) {
      const drop = Math.round(((ownershipStart - ownershipEnd) / ownershipStart) * 100);
      items.push(`Ownership clarity dropped ${drop}% during pressure moments.`);
    }
    if (items.length === 0 && miniScores.structure < 65) {
      items.push("Your structure weakened under pressure. Use a fixed frame: decision → action → measurable result.");
    }
    if (items.length === 0 && miniScores.depth < 65) {
      items.push("Depth is inconsistent. Add constraints, trade-offs, and explicit risk handling.");
    }
    if (items.length === 0) {
      items.push("Strong round. Next step: raise difficulty and keep evidence-backed outcomes.");
    }
    return items.slice(0, 3);
  }, [decisionCount, metricMissCount, driftEventCount, ownershipStart, ownershipEnd, miniScores.structure, miniScores.depth]);

  const nextSessionFocus = useMemo(() => {
    if (decisionCount > 0 && metricMissCount > 0) {
      return {
        label: "Metric usage",
        goal: "Use measurable impact in each answer.",
      };
    }
    if (ownershipStart !== null && ownershipEnd !== null && ownershipStart > 0 && ownershipEnd < ownershipStart) {
      return {
        label: "Ownership clarity",
        goal: "Use explicit I-led ownership and decisions.",
      };
    }
    if (driftEventCount > 0) {
      return {
        label: "Answer focus",
        goal: "Keep answers outcome-first and avoid drift.",
      };
    }
    if (miniScores.structure < 65) {
      return {
        label: "Answer structure",
        goal: "Use decision → action → measurable result.",
      };
    }
    return {
      label: "Higher difficulty",
      goal: "Keep evidence-backed outcomes under pressure.",
    };
  }, [decisionCount, metricMissCount, ownershipStart, ownershipEnd, driftEventCount, miniScores.structure]);

  const pushLog = (msg: string) => {
    setLog((l) => [...l.slice(-100), msg]);
  };

  // ========== PHASE 1: COPY TO CLIPBOARD ==========
  const copyAnswerToClipboard = async () => {
    if (!liveGeneratedAnswer) return;
    try {
      await navigator.clipboard.writeText(liveGeneratedAnswer);
      pushLog("📋 Answer copied to clipboard");
    } catch {
      pushLog("❌ Failed to copy to clipboard");
    }
  };

  // ========== PHASE 1: STOP GENERATION ==========
  const stopGeneration = () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    ws.current.send(JSON.stringify({ type: "stop_answer_generation" }));
    setLiveAnswerStreaming(false);
    setCanStopGeneration(false);
    setLiveAnswerMode("idle");
    pushLog("⏹️ Stopped answer generation");
  };

  // ========== PHASE 1: ADD TO HISTORY ==========
  const addToHistory = (question: string, answer: string) => {
    if (!question || !answer) return;
    setAnswerHistory((prev) => {
      const updated = [...prev, { question, answer, timestamp: Date.now() }];
      return updated.slice(-5); // Keep only last 5
    });
  };

  // ========== PHASE 2: TTS PLAYBACK ==========
  const speakAnswer = () => {
    if (!liveGeneratedAnswer || ttsPlaying) return;
    if (!window.speechSynthesis) {
      pushLog("⚠️ TTS not supported in this browser");
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(liveGeneratedAnswer);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => setTtsPlaying(true);
    utterance.onend = () => setTtsPlaying(false);
    utterance.onerror = () => {
      setTtsPlaying(false);
      pushLog("❌ TTS error");
    };
    
    ttsUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    pushLog("🔊 Reading answer aloud");
  };

  const stopTts = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setTtsPlaying(false);
  };

  // ========== PHASE 2: EXPORT SESSION ==========
  const exportSessionAsMarkdown = () => {
    if (answerHistory.length === 0 && !liveGeneratedAnswer) {
      pushLog("⚠️ No session data to export");
      return;
    }
    setExportingSession(true);
    
    const lines: string[] = [
      `# Interview Session Export`,
      `**Date:** ${new Date().toLocaleString()}`,
      `**Role Mode:** ${companyMode}`,
      `**Session Duration:** ${formatClock(sessionSeconds)}`,
      `**Speaking Time:** ${formatClock(speakingSeconds)}`,
      ``,
      `## Session Statistics`,
      `- Confidence: ${confidence}%`,
      `- Hesitation Count: ${hesitation}`,
      `- Clarity: ${Math.round(miniScores.clarity)}%`,
      `- Depth: ${Math.round(miniScores.depth)}%`,
      `- Structure: ${Math.round(miniScores.structure)}%`,
      ``,
      `## Q&A History`,
    ];
    
    answerHistory.forEach((item, idx) => {
      lines.push(`### Question ${idx + 1}`);
      lines.push(`**Q:** ${item.question}`);
      lines.push(`**A:** ${item.answer}`);
      lines.push(``);
    });
    
    if (liveGeneratedAnswer && liveInterviewerQuestion) {
      lines.push(`### Current Question`);
      lines.push(`**Q:** ${liveInterviewerQuestion}`);
      lines.push(`**A:** ${liveGeneratedAnswer}`);
    }
    
    if (finalSummary) {
      lines.push(``, `## Final Summary`);
      lines.push(`\`\`\`json`);
      lines.push(JSON.stringify(finalSummary, null, 2));
      lines.push(`\`\`\``);
    }
    
    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-session-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    setExportingSession(false);
    pushLog("📄 Session exported as Markdown");
  };

  const setCaptureState = (enabled: boolean) => {
    captureEnabledRef.current = enabled;
    setCaptureEnabled(enabled);
  };

  useEffect(() => {
    captureEnabledRef.current = captureEnabled;
  }, [captureEnabled]);

  const clearStreamTimeout = () => {
    if (streamTimeoutRef.current !== null) {
      window.clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }
  };

  const armStreamTimeout = () => {
    clearStreamTimeout();
    streamTimeoutRef.current = window.setTimeout(() => {
      setLiveAnswerStreaming(false);
      setLiveAnswerMode("fallback");
      pushLog("⚠️ Answer stream timed out, finalized safely");
    }, STREAM_TIMEOUT_MS);
  };

  const refreshSnapshot = async () => {
    try {
      setSnapshotLoading(true);
      const authToken = await getAccessTokenOrThrow();
      const snap = await apiRequest<any>("/api/context/snapshot", {
        method: "GET",
        retries: 0,
        authToken,
      });

      setSnapshot({
        resume: {
          loaded: Boolean(snap?.resume?.loaded),
          chars: Number(snap?.resume?.chars || 0),
        },
        job: {
          loaded: Boolean(snap?.job?.loaded),
          chars: Number(snap?.job?.chars || 0),
        },
        interview: {
          role: String(snap?.interview?.role || ""),
          active: Boolean(snap?.interview?.active),
          done: Boolean(snap?.interview?.done),
          updated_at: Number(snap?.interview?.updated_at || 0),
        },
        credibility: {
          has_snapshot: Boolean(snap?.credibility?.has_snapshot),
          updated_at: Number(snap?.credibility?.updated_at || 0),
        },
        company_mode: String(snap?.company_mode || "general"),
        assist: {
          intensity: Number(snap?.assist?.intensity || 2),
        },
      });
      setCompanyMode(String(snap?.company_mode || "general"));

      const savedIntensity = Number(snap?.assist?.intensity || 2);
      if (savedIntensity === 1 || savedIntensity === 2 || savedIntensity === 3) {
        setAssistIntensity(savedIntensity as 1 | 2 | 3);
      }
    } catch {
    } finally {
      setSnapshotLoading(false);
    }
  };

  const updateAssistIntensity = async (level: 1 | 2 | 3) => {
    try {
      setAssistIntensity(level);
      setAssistIntensitySaving(true);
      const authToken = await getAccessTokenOrThrow();
      const data = await apiRequest<{ level: number }>("/api/assist/intensity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level }),
        retries: 1,
        authToken,
      });

      const normalized = Number(data?.level || level);
      if (normalized === 1 || normalized === 2 || normalized === 3) {
        setAssistIntensity(normalized as 1 | 2 | 3);
      }
    } catch {
    } finally {
      setAssistIntensitySaving(false);
    }
  };

  useEffect(() => {
    refreshSnapshot();
    const onUpdated = () => refreshSnapshot();
    window.addEventListener("context-updated", onUpdated as EventListener);
    return () => window.removeEventListener("context-updated", onUpdated as EventListener);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(NEXT_SESSION_GOAL_KEY) || "";
    if (saved) {
      setPersistedGoalText(saved);
    }
  }, []);

  useEffect(() => {
    if (!finalSummary || typeof window === "undefined") return;
    const goalText = String(nextSessionFocus.goal || "").trim();
    if (!goalText) return;
    window.localStorage.setItem(NEXT_SESSION_GOAL_KEY, goalText);
    setPersistedGoalText(goalText);
  }, [finalSummary, nextSessionFocus]);

  useEffect(() => {
    if (!running) return;
    const timerId = window.setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
      setSpeakingSeconds(Math.floor(speakingMillisRef.current / 1000));
      setSpeakingNow(Date.now() - lastSpeechTsRef.current < 800);
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [running]);

  const shouldShowHint = (severity: "high" | "medium" | "low", priority: number): boolean => {
    if (assistIntensity === 1) {
      return severity === "high" || priority <= 1;
    }
    if (assistIntensity === 2) {
      return severity !== "low" || priority <= 3;
    }
    return true;
  };

  const looksLikeQuestion = (text: string): boolean => {
    const normalized = String(text || "").trim().toLowerCase();
    if (!normalized) return false;
    if (normalized.includes("?")) return true;
    return [
      "what is",
      "what are",
      "how do",
      "how does",
      "can you",
      "could you",
      "would you",
      "explain",
      "tell me",
      "why",
      "when",
      "where",
    ].some((prefix) => normalized.startsWith(prefix));
  };

  const looksLikeInterviewerOpening = (text: string): boolean => {
    const normalized = String(text || "").trim().toLowerCase().replace(/[?.!]+$/g, "");
    if (!normalized) return false;
    if (["hi", "hello", "hey", "good morning", "good afternoon", "good evening"].includes(normalized)) {
      return true;
    }
    return normalized.startsWith("hi ") || normalized.startsWith("hello ") || normalized.startsWith("hey ");
  };

  const isQuestionOrOpening = (text: string): boolean => {
    const wordCount = String(text || "").trim().split(/\s+/).length;
    // Require at least 4 words to avoid partial questions like "What is" triggering answers
    if (wordCount < 4) return false;
    return looksLikeQuestion(text) || looksLikeInterviewerOpening(text);
  };

  const questionKey = (text: string): string => String(text || "").trim().toLowerCase().replace(/[?.!]+$/g, "");

  const showAssistHint = (hint: { rule_id: string; text: string; severity: "high" | "medium" | "low"; priority: number; confidence: number; key: string }) => {
    const now = Date.now();
    const minInterval = assistIntensity === 1 ? 2800 : assistIntensity === 2 ? 2200 : 1600;
    if (now - lastHintRef.current.ts < minInterval && lastHintRef.current.key === hint.key) {
      return;
    }

    lastHintRef.current = { key: hint.key, ts: now };

    setAssistHint({
      rule_id: hint.rule_id,
      text: hint.text,
      severity: hint.severity,
      confidence: hint.confidence,
    });
  };

  const start = async () => {
    if (running) return;

    let authToken = "";
    try {
      authToken = await getAccessTokenOrThrow();
    } catch {
      setRunning(false);
      setConnected(false);
      pushLog("🔒 Sign in required. Please log in and retry Live Mode.");
      return;
    }

    // Enable auto-reconnect for this session
    shouldReconnectRef.current = true;
    
    // Clear any pending reconnect timers
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (persistedGoalText) {
      setActiveRoundGoal(persistedGoalText);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(NEXT_SESSION_GOAL_KEY);
      }
      setPersistedGoalText("");
    } else {
      setActiveRoundGoal("");
    }

    stoppingRef.current = false;
    setRunning(true);
    setReconnecting(false);
    setLog([]);
    setFinalSummary(null);
    setQuestionIndex(1);
    setCurrentQuestion("Please introduce yourself.");
    setConfidence(0);
    setHesitation(0);
    setAssistHint(null);
    setLiveInterviewerQuestion("");
    setLiveGeneratedAnswer("");
    setLiveAnswerStreaming(false);
    setLiveAnswerMode("idle");
    setFinalSessionId("");
    setEmotionalEvent(null);
    setSessionSeconds(0);
    setSpeakingSeconds(0);
    setSpeakingNow(false);
    setMetricUsageDetected(false);
    setDriftDetected(false);
    setMiniScores({ clarity: 0, depth: 0, structure: 0 });
    setShowLiveDetails(false);
    setDecisionCount(0);
    setMetricMissCount(0);
    setDriftEventCount(0);
    setOwnershipStart(null);
    setOwnershipEnd(null);
    setAudioLevel(0);
    setCaptureState(true);
    speakingMillisRef.current = 0;
    lastSpeechTsRef.current = Date.now();

    const normalizedRoomId = isUuidV4(roomId) ? roomId : createRoomId();
    if (normalizedRoomId !== roomId) {
      setRoomId(normalizedRoomId);
      pushLog("🔐 Room ID normalized to UUID for secure room mode");
    }

    const roomParam = encodeURIComponent(normalizedRoomId.trim());
    const tokenParam = encodeURIComponent(authToken);
    ws.current = new WebSocket(
      `${WS_BASE}/ws/voice?assist_intensity=${assistIntensity}&room_id=${roomParam}&participant=${participantMode}&token=${tokenParam}&answer_language=${answerLanguage}`
    );
    ws.current.binaryType = "arraybuffer";

    ws.current.onopen = () => {
      setConnected(true);
      setReconnecting(false);
      setReconnectAttempts(0);
      pushLog("🟢 Connected");
      ws.current?.send(JSON.stringify({ type: "sync_state_request" }));
    };

    ws.current.onclose = (event) => {
      setConnected(false);
      setRunning(false);
      clearStreamTimeout();
      setLiveAnswerStreaming(false);
      setLiveAnswerMode("idle");
      setAudioLevel(0);

      const closeCode = Number(event?.code || 0);
      
      // Stealth mode: User-friendly error messages (hide raw errors)
      if (closeCode === 1008 || closeCode === 4401) {
        pushLog("🔒 Session expired. Please refresh and try again.");
        shouldReconnectRef.current = false;
      } else if (closeCode === 1006 || closeCode === 1001) {
        // Auto-reconnect on network issues
        if (shouldReconnectRef.current && reconnectAttempts < MAX_RECONNECT_ATTEMPTS && !finalSummary) {
          setReconnecting(true);
          pushLog(`🔄 Reconnecting (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            start();  // Reconnect using start() function
          }, 1500 * (reconnectAttempts + 1));
          return;
        }
        // Max retries exhausted - show clear failure state
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          setReconnecting(false);
          pushLog("❌ Connection failed. Please refresh the page.");
        } else {
          pushLog("🛜 Connection lost. Please try again.");
        }
      } else if (closeCode && closeCode !== 1000) {
        pushLog("⚠️ Connection closed unexpectedly.");
      }

      if (finalSummary) {
        pushLog("🏁 Interview completed");
      } else if (!reconnecting) {
        pushLog("🛑 Session ended");
      }
      shouldReconnectRef.current = false;
    };

    ws.current.onerror = () => {
      // Stealth mode: Hide raw error messages
      pushLog("⚠️ Connection issue. Retrying...");
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📩 WS MESSAGE:", data);
      if (typeof data.session_id === "string" && data.session_id.trim()) {
        setFinalSessionId(data.session_id.trim());
      }

      if (data.type === "partial_transcript") {
        setLog((l) => {
          const withoutLastPartial = l.filter((x) => !x.startsWith("🎤 You (speaking):"));
          return [...withoutLastPartial, `🎤 You (speaking): ${data.text}`];
        });
      }

      if (data.type === "transcript") {
        pushLog(`🎤 You said: ${data.text}`);
      }

      if (data.type === "waiting_for_interviewer") {
        // Don't clear anything here - keep showing current answer/question
        // The UI should continue displaying the last answer until a NEW question arrives
        setLiveAnswerStreaming(false);
        clearStreamTimeout();
        // Only log if we don't have an answer showing
        // pushLog("⏳ Ready for next interviewer question.");
      }

      if (data.type === "stt_warning") {
        const message = String(data.message || "Speech pipeline warning");
        pushLog(`⚠️ STT: ${message}`);
      }

      if (data.type === "ping") {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: "pong", ts: Date.now() }));
        }
      }

      if (data.type === "ai_decision") {
        const decisionPayload = data.decision || {};
        if (typeof data.decision?.confidence === "number") {
          setConfidence(Math.round(data.decision.confidence * 100));
        }

        if (typeof data.decision?.hesitation_count === "number") {
          setHesitation(data.decision.hesitation_count);
        }

        if (data.decision?.message) {
          pushLog(`🤖 AI: ${data.decision.message}`);
        }

        if (
          typeof data.decision?.clarity_score === "number" ||
          typeof data.decision?.depth_score === "number" ||
          typeof data.decision?.structure_score === "number"
        ) {
          setMiniScores({
            clarity: Number(data.decision?.clarity_score || 0),
            depth: Number(data.decision?.depth_score || 0),
            structure: Number(data.decision?.structure_score || 0),
          });
          pushLog(
            `📊 Score → Clarity: ${data.decision?.clarity_score ?? 0}% | Depth: ${data.decision?.depth_score ?? 0}% | Structure: ${data.decision?.structure_score ?? 0}%`
          );
        }

        const metricSignal = Number(decisionPayload?.metric_usage_score ?? decisionPayload?.metric_signal ?? 0);
        const metricFlag =
          metricSignal > 0
            ? metricSignal >= 55
            : /metric|quantif|numbers|latency|throughput|impact/i.test(String(data.decision?.message || ""));
        setMetricUsageDetected(metricFlag);
        setDecisionCount((prev) => prev + 1);
        if (!metricFlag) {
          setMetricMissCount((prev) => prev + 1);
        }

        const driftSignal = Number(decisionPayload?.drift_frequency ?? 0);
        const contradictionSignal = Number(decisionPayload?.contradictions_detected ?? 0);
        const hesitationSignal = Number(data.decision?.hesitation_count ?? 0);
        const driftFlag = driftSignal >= 0.45 || contradictionSignal > 0 || hesitationSignal >= 3;
        setDriftDetected(driftFlag);
        if (driftFlag) {
          setDriftEventCount((prev) => prev + 1);
        }

        const ownership = Number(decisionPayload?.ownership_clarity_score ?? NaN);
        if (Number.isFinite(ownership)) {
          setOwnershipEnd(ownership);
          setOwnershipStart((prev) => (prev === null ? ownership : prev));
        }

        if (data.decision?.verdict || data.decision?.explanation) {
          pushLog(
            `🧾 Verdict: ${data.decision?.verdict ?? "Average"}${data.decision?.explanation ? ` — ${data.decision.explanation}` : ""}`
          );
        }
      }

      if (data.type === "assist_hint" && (data.payload || data.hint)) {
        const hintPayload = data.payload || data.hint;
        const text = typeof hintPayload?.message === "string" && hintPayload.message.trim()
          ? hintPayload.message.trim()
          : "Refine your current answer.";
        const rawSeverity = String(hintPayload?.severity || "medium").toLowerCase();
        const severity: "high" | "medium" | "low" =
          rawSeverity === "high" || rawSeverity === "low" ? (rawSeverity as "high" | "low") : "medium";
        const priority = Number(hintPayload?.priority ?? 3);
        const ruleId = String(hintPayload?.rule_id || "hint");
        const key = `${ruleId}|${text}`;
        const confidenceFromPayload = Number(hintPayload?.confidence ?? 0);
        const confidence = Number.isFinite(confidenceFromPayload) && confidenceFromPayload > 0
          ? Math.max(0, Math.min(confidenceFromPayload, 1))
          : Math.max(0.35, Math.min(0.95, 1 - ((priority - 1) * 0.2)));

        if (shouldShowHint(severity, priority)) {
          showAssistHint({ rule_id: ruleId, text, severity, priority, confidence, key });
          pushLog(`💡 Hint (${severity}): ${text}`);
        }
      }

      if (data.type === "live_coaching" && Array.isArray(data.tips)) {
        data.tips.forEach((tip: string) => {
          pushLog(`🧠 Coach: ${tip}`);
        });
      }

      if (data.type === "next_question" && data.question) {
        const nextQuestion = String(data.question);
        setCurrentQuestion(nextQuestion);
        setLiveInterviewerQuestion(nextQuestion);
        setLiveGeneratedAnswer("");
        setLiveAnswerStreaming(true);
        setLiveAnswerMode("generating");
        armStreamTimeout();
        setQuestionIndex((q) => Math.min(TOTAL_QUESTIONS, q + 1));
        setConfidence(0);
        setHesitation(0);
        pushLog(`🤖 Next Question: ${nextQuestion}`);

        if (participantMode === "candidate" && ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: "set_question", question: nextQuestion }));
        }
      }

      if (data.type === "interviewer_question" && data.question) {
        const liveQuestion = String(data.question).trim();
        const questionKey = liveQuestion.toLowerCase().slice(0, 50);
        const now = Date.now();
        
        // Synchronous deduplication using ref (React state is async and may miss rapid duplicates)
        const isDuplicate = (
          questionKey === lastReceivedQuestionRef.current.key &&
          (now - lastReceivedQuestionRef.current.ts) < 3000
        );
        if (isDuplicate) {
          // Skip duplicate question received within 3 seconds
          return;
        }
        lastReceivedQuestionRef.current = { key: questionKey, ts: now };
        
        // New question - update state and log
        setLiveInterviewerQuestion(liveQuestion);
        setLiveGeneratedAnswer("");
        setLiveAnswerMode("generating");
        setQuestionIndex((q) => Math.min(TOTAL_QUESTIONS, q + 1));
        setConfidence(0);
        setHesitation(0);
        pushLog(`🧑 Interviewer: ${liveQuestion}`);
        setCurrentQuestion(liveQuestion);
        setLiveAnswerStreaming(true);
        armStreamTimeout();
        // DO NOT send set_question back - backend already started answer generation
        // Sending set_question would trigger a SECOND answer generation and cancel the first
      }

      if (data.type === "tone_shift_event") {
        const message = String(data?.payload?.message || "Tone shifted to increase interview pressure.");
        setEmotionalEvent({ type: "tone", message });
        pushLog(`🎭 Tone Shift: ${message}`);
      }

      if (data.type === "interruption_simulation") {
        const message = String(data?.payload?.message || "Interviewer interruption simulated.");
        setEmotionalEvent({ type: "interrupt", message });
        pushLog(`⛔ Interruption: ${message}`);
      }

      if (data.type === "pressure_spike_event") {
        const message = String(data?.payload?.message || "Pressure spike injected.");
        setEmotionalEvent({ type: "pressure", message });
        pushLog(`🔥 Pressure Spike: ${message}`);
      }

      if (data.type === "answer_suggestion_start") {
        if (data.question) {
          const liveQuestion = String(data.question);
          setLiveInterviewerQuestion(liveQuestion);
          setCurrentQuestion(liveQuestion);
        }
        // Save current answer as previous before clearing so user can still see it
        setLiveGeneratedAnswer((prev) => {
          if (prev) setPreviousAnswer(prev);
          return "";
        });
        setLiveAnswerStreaming(true);
        setLiveAnswerMode("generating");
        setCanStopGeneration(true);  // Enable stop button
        armStreamTimeout();
      }

      if (data.type === "answer_suggestion_chunk") {
        const chunk = String(data.chunk || "").trim();
        const isThinking = Boolean(data.is_thinking);
        console.log("[DEBUG] answer_suggestion_chunk received:", { chunk, hasChunk: !!chunk, isThinking });
        
        // Handle thinking indicator differently - show "Analyzing..." instead
        if (isThinking) {
          setLiveGeneratedAnswer("Analyzing question...");
          setLiveAnswerStreaming(true);
          armStreamTimeout();
        } else if (chunk) {
          setLiveGeneratedAnswer((prev) => {
            // If previous was thinking indicator, replace it; otherwise append
            const prevText = prev || "";
            if (prevText === "Analyzing question..." || prevText.startsWith("▸")) {
              return chunk; // Replace thinking with first real content
            }
            const newVal = prevText ? `${prevText} ${chunk}` : chunk;
            console.log("[DEBUG] answer_suggestion_chunk updating answer:", { prev: prev?.slice(0, 50), newVal: newVal?.slice(0, 50) });
            return newVal;
          });
          setLiveAnswerStreaming(true);
          armStreamTimeout();
        }
      }

      if (data.type === "answer_suggestion_done") {
        const fullSuggestion = String(data.suggestion || "").trim();
        const reason = String(data.reason || "").toLowerCase();
        console.log("[DEBUG] answer_suggestion_done received:", { 
          fullSuggestion: fullSuggestion?.slice(0, 100), 
          reason, 
          hasSuggestion: !!fullSuggestion 
        });
        // Only show fallback mode for actual model failures (timeout_fallback, error_fallback)
        if (reason === "timeout_fallback" || reason === "error_fallback") {
          setLiveAnswerMode("fallback");
          pushLog("⚠️ Using fallback answer mode (model provider unavailable)");
        } else {
          setLiveAnswerMode("live");
          pushLog(`✅ Answer done (reason=${reason}, len=${fullSuggestion.length})`);
        }
        if (fullSuggestion) {
          setLiveGeneratedAnswer(fullSuggestion);
          setPreviousAnswer(""); // Clear previous when new answer is complete
          // Save to history
          if (liveInterviewerQuestion) {
            addToHistory(liveInterviewerQuestion, fullSuggestion);
          }
          // Auto-speak if TTS enabled
          if (ttsEnabled && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(fullSuggestion);
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
          }
        }
        setLiveAnswerStreaming(false);
        setCanStopGeneration(false);
        clearStreamTimeout();
        setCaptureState(true);
        pushLog("🎙 Listening for next interviewer question.");
      }

      if (data.type === "answer_suggestion" && data.suggestion) {
        const suggestionText = String(data.suggestion || "").trim();
        const reason = String(data.reason || "").toLowerCase();
        console.log("[DEBUG] answer_suggestion received:", { 
          suggestionText: suggestionText?.slice(0, 100), 
          reason, 
          hasSuggestion: !!suggestionText 
        });
        if (suggestionText) {
          setLiveGeneratedAnswer(suggestionText);
          setPreviousAnswer(""); // Clear previous when new answer arrives
          setLiveAnswerStreaming(false);
          // Only show fallback mode for actual model failures
          if (reason === "timeout_fallback" || reason === "error_fallback") {
            setLiveAnswerMode("fallback");
          } else {
            setLiveAnswerMode("live");
          }
          clearStreamTimeout();
          setAssistHint({
            rule_id: "answer_suggestion",
            text: suggestionText,
            severity: "medium",
            confidence: 0.92,
          });
          pushLog("💡 AI generated answer draft from interviewer question");
          setCaptureState(true);
          pushLog("🎙 Listening for next interviewer question.");
        }
      }

      if (data.type === "room_assigned" && data.room_id) {
        const assigned = String(data.room_id);
        if (assigned && assigned !== roomId) {
          setRoomId(assigned);
          pushLog(`🔐 Assigned secure room ID: ${assigned}`);
        }
      }

      if (data.type === "sync_state") {
        const syncedQuestion = String(data.active_question || "").trim();
        const syncedAnswer = String(data.partial_answer || "").trim();
        const isStreaming = Boolean(data.is_streaming);
        const syncedIntensity = Number(data.assist_intensity || 0);

        if (syncedQuestion) {
          setLiveInterviewerQuestion(syncedQuestion);
          setCurrentQuestion(syncedQuestion);
        }
        if (syncedAnswer) {
          setLiveGeneratedAnswer(syncedAnswer);
        }
        setLiveAnswerStreaming(isStreaming);
        if (isStreaming) {
          armStreamTimeout();
        } else {
          clearStreamTimeout();
        }
        if (syncedIntensity === 1 || syncedIntensity === 2 || syncedIntensity === 3) {
          setAssistIntensity(syncedIntensity as 1 | 2 | 3);
        }
      }

      if (data.type === "final_summary") {
        setFinalSummary(data.data);
        setRunning(false);
        pushLog("🏁 Final summary received");
      }
    };

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("mediaDevices.getUserMedia unavailable");
      }

      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const AudioContextCtor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
      if (!AudioContextCtor) {
        throw new Error("AudioContext unavailable");
      }

      audioContext.current = new AudioContextCtor();
      await audioContext.current.resume().catch(() => undefined);

      await audioContext.current.audioWorklet.addModule("/audio-processor.js");

      if (!audioContext.current || !streamRef.current) {
        throw new Error("Audio context or stream not ready");
      }

      const source = audioContext.current.createMediaStreamSource(streamRef.current);
      processor.current = new AudioWorkletNode(audioContext.current, "pcm-processor");

      const silentGain = audioContext.current.createGain();
      silentGain.gain.value = 0;

      processor.current.connect(silentGain);
      silentGain.connect(audioContext.current.destination);

      processor.current.port.onmessage = (e) => {
        if (stoppingRef.current || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
          return;
        }

        if (!captureEnabledRef.current) {
          return;
        }

        const audio = new Int16Array(e.data);
        let sum = 0;
        for (let i = 0; i < audio.length; i++) sum += Math.abs(audio[i]);
        const avgEnergy = sum / audio.length;
        const chunkMs = Math.round((audio.length / 16000) * 1000);
        const normalizedLevel = Math.max(0, Math.min(100, Math.round((avgEnergy / 1800) * 100)));
        setAudioLevel((prev) => Math.round(prev * 0.7 + normalizedLevel * 0.3));

        if (avgEnergy > 500) {
          lastSpeechTsRef.current = Date.now();
          speakingMillisRef.current += Math.max(0, chunkMs);
        }

        ws.current.send(e.data);
      };

      source.connect(processor.current);

      // DISABLED: Browser speech detection causes duplicates with Deepgram
      // Deepgram FINAL results are now the single source of truth for question detection
      // Keeping the code commented for reference in case Deepgram has issues
      /*
      const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionCtor) {
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          if (stoppingRef.current || !captureEnabledRef.current || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
            return;
          }

          for (let index = event.resultIndex; index < event.results.length; index++) {
            const result = event.results[index];
            if (!result.isFinal) continue;
            
            const transcript = String(result?.[0]?.transcript || "").trim();
            if (!transcript) continue;

            const waitingMode = /waiting for interviewer question/i.test(String(currentQuestion || ""));
            if (!waitingMode) continue;
            if (!isQuestionOrOpening(transcript)) continue;

            const key = questionKey(transcript);
            const now = Date.now();
            const duplicate = key && key === lastQuestionTriggerRef.current.key && (now - lastQuestionTriggerRef.current.ts) < 3000;
            if (duplicate) continue;

            lastQuestionTriggerRef.current = { key, ts: now };
            ws.current.send(JSON.stringify({ type: "interviewer_question", text: transcript }));
            pushLog(`⚡ Question detected: ${transcript}`);
          }
        };

        recognition.onerror = () => {};
        recognition.onend = () => {
          if (!stoppingRef.current && running) {
            try { recognition.start(); } catch {}
          }
        };

        speechRecognitionRef.current = recognition;
        try {
          recognition.start();
          pushLog("🧭 Browser question-detect assist enabled");
        } catch {}
      }
      */
      pushLog("🎙 Deepgram streaming STT active");
    } catch {
      pushLog("⚠️ Audio capture unavailable. Enable mic permission and restart session.");
    }
  };

  const stop = async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    
    // Disable auto-reconnect when user explicitly stops
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setReconnecting(false);
    setReconnectAttempts(0);

    pushLog("🛑 Stopping session...");

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "stop" }));
    }

    processor.current?.disconnect();
    processor.current = null;

    try {
      speechRecognitionRef.current?.stop?.();
    } catch {
    }
    speechRecognitionRef.current = null;

    await audioContext.current?.close();
    audioContext.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    clearStreamTimeout();
    setLiveAnswerStreaming(false);
    setAudioLevel(0);

    setRunning(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.interviewLayout}>
        <div style={styles.card}>
          <h2 style={styles.title}>Live Mode</h2>
          <p style={styles.subtitle}>Real-time decision signal. Keep answers compact and evidence-backed.</p>

          <div style={styles.collabRow}>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Room ID</label>
              <input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                style={styles.fieldInput}
                placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
                disabled={running}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Participant</label>
              <select
                value={participantMode}
                onChange={(e) => setParticipantMode(e.target.value as "candidate" | "interviewer")}
                style={styles.fieldInput}
                disabled={running}
              >
                <option value="candidate">Candidate</option>
                <option value="interviewer">Interviewer</option>
              </select>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Answer Language</label>
              <select
                value={answerLanguage}
                onChange={(e) => setAnswerLanguage(e.target.value as "english" | "detected")}
                style={styles.fieldInput}
                disabled={running}
              >
                <option value="english">English Only</option>
                <option value="detected">Match Detected Language</option>
              </select>
            </div>
          </div>

          {participantMode === "interviewer" && (
            <div style={styles.interviewerModeHint}>
              Interviewer mode is voice-only. Speak your question and it will be broadcast live.
            </div>
          )}

          <div style={styles.statusRow}>
            <span style={styles.statusLabel}>Live Status</span>
            <span style={styles.statusValue}>
              {reconnecting ? "🔄 Reconnecting..." : running ? "🎙 Listening" : finalSummary ? "🏁 Completed" : connected ? "🟢 Connected" : "🔴 Idle"}
            </span>
            {running && connected && (
              <span style={styles.livePulse}>●</span>
            )}
          </div>

          {running && (
            <div style={styles.micLevelRow}>
              <span style={styles.micLevelLabel}>Mic Input</span>
              <div style={styles.micLevelTrack}>
                <div style={{ ...styles.micLevelFill, width: `${Math.max(0, Math.min(100, audioLevel))}%` }} />
              </div>
              <span style={styles.micLevelValue}>{audioLevel}%</span>
            </div>
          )}

          {activeRoundGoal && running && (
            <div style={styles.roundGoalCard}>Goal for this round: {activeRoundGoal}</div>
          )}

          <div style={styles.liveFocusRow}>
            <span style={improvementNeeded ? styles.improvementBadgeWarn : styles.improvementBadgeGood}>
              {improvementNeeded ? "Focus Needed" : "On Track"}
            </span>
            <button style={styles.detailsToggle} onClick={() => setShowLiveDetails((prev) => !prev)}>
              {showLiveDetails ? "Collapse diagnostics" : "Diagnostics"}
            </button>
          </div>
          <div style={styles.focusHint}>{focusMessage}</div>

          {showLiveDetails && (
            <>
              <div style={styles.liveIntensityRow}>
                <span style={styles.timerChip}>Session {formatClock(sessionSeconds)}</span>
                <span style={styles.timerChip}>Speaking {formatClock(speakingSeconds)}</span>
                <span style={speakingNow ? styles.liveBadgeActive : styles.liveBadgeIdle}>{speakingNow ? "Speaking now" : "Waiting for voice"}</span>
                <span style={metricUsageDetected ? styles.metricBadgeOn : styles.metricBadgeOff}>
                  {metricUsageDetected ? "Metric usage detected" : "Add concrete numbers"}
                </span>
              </div>

              {driftDetected && (
                <div style={styles.driftAlert}>⚠️ Drift detected. Tighten answer to outcomes, ownership, and measurable impact.</div>
              )}
            </>
          )}

          <div style={styles.modeChipRow}>
            <span style={styles.modeChip}>Mode: {companyMode}</span>
            {(companyMode === "amazon" || companyMode === "google" || companyMode === "meta") && (
              <span style={styles.modeChipStrong}>
                {companyMode === "amazon" ? "LP depth weighting" : companyMode === "google" ? "Rigor weighting" : "Impact-pressure weighting"}
              </span>
            )}
          </div>

          {emotionalEvent && showLiveDetails && (
            <div style={styles.emotionCard}>
              <div style={styles.emotionTitle}>Pressure Cue</div>
              <div style={styles.emotionText}>{emotionalEvent.message}</div>
            </div>
          )}

          <div style={styles.snapshotCard}>
            <div style={styles.snapshotHeaderRow}>
              <div style={styles.snapshotTitle}>Persisted Snapshot</div>
              <button style={styles.snapshotRefreshButton} onClick={refreshSnapshot} disabled={snapshotLoading}>
                {snapshotLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <div style={styles.snapshotLine}>
              Resume: {snapshot?.resume?.loaded ? `Loaded (${snapshot.resume.chars} chars)` : "Not loaded"}
            </div>
            <div style={styles.snapshotLine}>
              JD: {snapshot?.job?.loaded ? `Loaded (${snapshot.job.chars} chars)` : "Not loaded"}
            </div>
            <div style={styles.snapshotLine}>
              Interview: {snapshot?.interview?.active ? "Active" : snapshot?.interview?.done ? "Completed" : "Not started"}
            </div>
            <div style={styles.snapshotLine}>Role: {snapshot?.interview?.role || "—"}</div>
            <div style={styles.snapshotLine}>Credibility: {snapshot?.credibility?.has_snapshot ? "Available" : "Unavailable"}</div>
            <div style={styles.snapshotSubLine}>
              Updated: {snapshot?.interview?.updated_at ? new Date(snapshot.interview.updated_at * 1000).toLocaleString() : "—"}
            </div>
          </div>

          <div style={running ? styles.questionCardFocused : styles.questionCard}>
            <div style={styles.questionMeta}>
              Question {questionIndex} of {TOTAL_QUESTIONS}
            </div>
            <div style={styles.questionText}>{currentQuestion}</div>
            <div style={styles.evaluatorLine}>{recruiterState}</div>
          </div>

          {liveInterviewerQuestion && (
            <div style={running ? styles.qaCardFocused : styles.qaCard}>
              <div style={styles.qaTitle}>Interviewer Question</div>
              <div style={styles.qaText}>{liveInterviewerQuestion}</div>
              <div style={styles.qaTitle}>Generated Answer</div>
              <div style={liveAnswerMode === "fallback" ? styles.answerModeFallback : liveAnswerMode === "live" ? styles.answerModeLive : styles.answerModeGenerating}>
                {liveAnswerMode === "fallback" ? "Fallback answer mode" : liveAnswerMode === "live" ? "Live model mode" : liveAnswerMode === "generating" ? "Generating answer" : "Waiting for answer"}
              </div>
              <div style={styles.qaAnswer}>
                {liveGeneratedAnswer || (liveAnswerStreaming && previousAnswer ? (
                  <span><em style={{opacity: 0.6}}>(Previous) {previousAnswer.slice(0, 200)}...</em><br/><br/>Generating new answer...</span>
                ) : liveAnswerStreaming ? "Generating answer..." : "Waiting for generated answer...")}
              </div>
              
              {/* Action buttons for answer */}
              <div style={styles.answerActions}>
                {/* Copy button */}
                <button
                  style={styles.actionButton}
                  onClick={copyAnswerToClipboard}
                  disabled={!liveGeneratedAnswer}
                  title="Copy answer to clipboard"
                >
                  📋 Copy
                </button>
                
                {/* Stop Generation button */}
                {liveAnswerStreaming && canStopGeneration && (
                  <button
                    style={styles.actionButtonDanger}
                    onClick={stopGeneration}
                    title="Stop generating answer"
                  >
                    ⏹️ Stop
                  </button>
                )}
                
                {/* TTS button */}
                <button
                  style={ttsPlaying ? styles.actionButtonActive : styles.actionButton}
                  onClick={ttsPlaying ? stopTts : speakAnswer}
                  disabled={!liveGeneratedAnswer}
                  title={ttsPlaying ? "Stop reading" : "Read answer aloud"}
                >
                  {ttsPlaying ? "🔇 Stop" : "🔊 Read"}
                </button>
                
                {/* TTS Auto toggle */}
                <label style={styles.ttsToggle}>
                  <input
                    type="checkbox"
                    checked={ttsEnabled}
                    onChange={(e) => setTtsEnabled(e.target.checked)}
                  />
                  Auto-read
                </label>
              </div>
              
              <button
                style={captureEnabled ? styles.captureButtonOn : styles.captureButtonOff}
                onClick={() => {
                  const next = !captureEnabled;
                  setCaptureState(next);
                  pushLog(next ? "🎙 Listening resumed for next interviewer question." : "⏸ Mic paused while you read.");
                }}
              >
                {captureEnabled ? "Pause mic while I read" : "Listen for next question"}
              </button>
            </div>
          )}

          <div style={styles.controls}>
            <button onClick={start} disabled={running} style={styles.primaryButton}>
              {running ? "Listening..." : "Start"}
            </button>

            <button onClick={stop} style={styles.secondaryButton}>
              Stop
            </button>
            
            {/* History toggle button */}
            <button 
              onClick={() => setShowHistory(!showHistory)} 
              style={styles.secondaryButton}
              title="Show answer history"
            >
              📜 History ({answerHistory.length})
            </button>
            
            {/* Export button */}
            <button 
              onClick={exportSessionAsMarkdown}
              style={styles.secondaryButton}
              disabled={exportingSession || (answerHistory.length === 0 && !liveGeneratedAnswer)}
              title="Export session as Markdown"
            >
              {exportingSession ? "📄 Exporting..." : "📄 Export"}
            </button>
          </div>
          
          {/* Answer History Panel */}
          {showHistory && answerHistory.length > 0 && (
            <div style={styles.historyCard}>
              <div style={styles.historyTitle}>📜 Answer History (Last 5)</div>
              {answerHistory.map((item, idx) => (
                <div key={idx} style={styles.historyItem}>
                  <div style={styles.historyQuestion}>Q: {item.question}</div>
                  <div style={styles.historyAnswer}>{item.answer.slice(0, 200)}{item.answer.length > 200 ? "..." : ""}</div>
                  <button 
                    style={styles.historyCopyBtn}
                    onClick={async () => {
                      await navigator.clipboard.writeText(item.answer);
                      pushLog(`📋 Copied answer ${idx + 1} to clipboard`);
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={styles.metrics}>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Confidence</div>
              <div style={styles.metricValue}>{confidence}%</div>
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${Math.max(0, Math.min(100, confidence))}%` }} />
              </div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Hesitation</div>
              <div style={styles.metricValue}>{hesitation}</div>
            </div>
          </div>

          {showLiveDetails && (
            <div style={styles.miniScoreCard}>
              <div style={styles.miniScoreTitle}>Live Score Updates</div>
              <div style={styles.miniScoreRow}>
                <span style={styles.miniScoreLabel}>Clarity</span>
                <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${Math.max(0, Math.min(100, miniScores.clarity))}%` }} /></div>
                <span style={styles.miniScoreValue}>{Math.round(miniScores.clarity)}%</span>
              </div>
              <div style={styles.miniScoreRow}>
                <span style={styles.miniScoreLabel}>Depth</span>
                <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${Math.max(0, Math.min(100, miniScores.depth))}%` }} /></div>
                <span style={styles.miniScoreValue}>{Math.round(miniScores.depth)}%</span>
              </div>
              <div style={styles.miniScoreRow}>
                <span style={styles.miniScoreLabel}>Structure</span>
                <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${Math.max(0, Math.min(100, miniScores.structure))}%` }} /></div>
                <span style={styles.miniScoreValue}>{Math.round(miniScores.structure)}%</span>
              </div>
            </div>
          )}

          {finalSummary && (
            <div style={styles.coachingCard}>
              <div style={styles.coachingTitle}>Session Verdict</div>
              <div style={styles.verdictValueRow}>
                <span style={styles.verdictPercent}>{finalOfferProbability}%</span>
                <span style={styles.verdictChip}>{finalVerdict}</span>
              </div>
              <div style={styles.verdictBand}>Confidence band: {finalBandLow}% – {finalBandHigh}%</div>
              <div style={styles.verdictInterpretation}>{finalInterpretation}</div>

              <div style={styles.coachingSubTitle}>Why</div>
              {finalWhyItems.length === 0 ? <div style={styles.coachingItem}>No high-risk blockers detected.</div> : null}
              {finalWhyItems.map((item, idx) => (
                <div key={`${item}-${idx}`} style={styles.coachingItem}>• {item}</div>
              ))}

              <div style={styles.coachingSubTitle}>What changed</div>
              <div style={styles.coachingItem}>• Offer probability delta: {finalDeltaValue >= 0 ? "+" : ""}{Math.round(finalDeltaValue)} points</div>
              <div style={styles.coachingItem}>• Trajectory focus: {nextSessionFocus.label}</div>

              <div style={styles.coachingSubTitle}>What to fix next</div>
              {(finalFixItems.length ? finalFixItems : coachingItems).map((item, idx) => (
                <div key={`fix-${idx}`} style={styles.coachingItem}>• {item}</div>
              ))}

              <div style={styles.nextFocusLine}>Next priority: {nextSessionFocus.goal}</div>
              <div style={styles.coachingFooter}>
                <button onClick={start} disabled={running} style={styles.primaryButton}>
                  Start Next Session
                </button>
                {finalSessionId && (
                  <a href={`/interview/report/${encodeURIComponent(finalSessionId)}`} style={styles.reportLink}>
                    Open Session Report
                  </a>
                )}
                <button onClick={() => setShowRawSummary((v) => !v)} style={styles.secondaryButton}>
                  {showRawSummary ? "Hide detailed JSON" : "Show detailed JSON"}
                </button>
              </div>
              {showRawSummary ? <pre style={styles.summaryPre}>{JSON.stringify(finalSummary, null, 2)}</pre> : null}
            </div>
          )}

          <div style={styles.logCard}>
            <div style={styles.logTitle}>Session Transcript</div>
            <div style={styles.logBody}>
              {log.map((l, i) => (
                <div key={i} style={styles.logLine}>{l}</div>
              ))}
            </div>
          </div>
        </div>

        <AssistPanel
          hint={assistHint}
          intensity={assistIntensity}
          onIntensityChange={updateAssistIntensity}
          intensitySaving={assistIntensitySaving}
        />
      </div>
    </div>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    padding: 22,
    display: "flex",
    justifyContent: "center",
    background: "var(--bg)",
    color: "var(--text-primary)",
  },
  interviewLayout: {
    width: "100%",
    maxWidth: 1320,
    display: "grid",
    gridTemplateColumns: "minmax(0, 7fr) minmax(280px, 3fr)",
    gap: 18,
    alignItems: "flex-start",
  },
  card: {
    flex: 1,
    minWidth: 0,
    minHeight: "calc(100vh - 48px)",
    background: "var(--surface-1)",
    borderRadius: 12,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  title: {
    margin: 0,
    fontSize: 36,
    lineHeight: 1,
    letterSpacing: -0.6,
    color: "var(--text-primary)",
  },
  subtitle: {
    margin: 0,
    color: "var(--text-muted)",
    fontSize: 14,
  },
  collabRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: 600,
  },
  fieldInput: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    color: "#111827",
    background: "#fff",
  },
  interviewerModeHint: {
    border: "1px dashed #bfdbfe",
    background: "#eff6ff",
    color: "#1e3a8a",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 600,
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 10,
    background: "#f7f9fb",
    border: "1px solid #e5e7eb",
  },
  statusLabel: {
    fontWeight: 600,
    color: "#374151",
  },
  statusValue: {
    fontWeight: 600,
    color: "#111827",
  },
  livePulse: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 8px 2px rgba(34, 197, 94, 0.6)",
    marginLeft: 8,
  },
  micLevelRow: {
    display: "grid",
    gridTemplateColumns: "78px 1fr 44px",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 10,
    background: "var(--surface-2)",
  },
  micLevelLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
  },
  micLevelTrack: {
    height: 8,
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
    background: "rgba(255,255,255,0.08)",
  },
  micLevelFill: {
    height: "100%",
    borderRadius: 999,
    background: "var(--accent)",
    transition: "width 120ms linear",
  },
  micLevelValue: {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--text-primary)",
    textAlign: "right" as const,
  },
  roundGoalCard: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1e3a8a",
    borderRadius: 10,
    padding: "9px 11px",
    fontSize: 13,
    fontWeight: 700,
  },
  liveIntensityRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  liveFocusRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  focusHint: {
    marginTop: -6,
    fontSize: 13,
    lineHeight: 1.45,
    color: "#374151",
  },
  improvementBadgeWarn: {
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#9f1239",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  improvementBadgeGood: {
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#166534",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  detailsToggle: {
    border: 0,
    background: "var(--surface-2)",
    color: "var(--text-muted)",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },
  timerChip: {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#334155",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  liveBadgeActive: {
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#166534",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  liveBadgeIdle: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#475569",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  metricBadgeOn: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  metricBadgeOff: {
    border: "1px solid #fde68a",
    background: "#fffbeb",
    color: "#92400e",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  driftAlert: {
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#9f1239",
    borderRadius: 10,
    padding: "9px 11px",
    fontSize: 13,
    fontWeight: 700,
  },
  modeChipRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  modeChip: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1e3a8a",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
  },
  modeChipStrong: {
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#9f1239",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
  },
  emotionCard: {
    border: "1px solid #fcd34d",
    background: "#fffbeb",
    borderRadius: 10,
    padding: "10px 12px",
  },
  emotionTitle: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.03em",
    textTransform: "uppercase" as const,
    color: "#92400e",
  },
  emotionText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 1.45,
    color: "#78350f",
  },
  snapshotCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    background: "#fafafa",
    padding: "10px 12px",
  },
  snapshotHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  snapshotTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#374151",
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
  },
  snapshotRefreshButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    borderRadius: 8,
    padding: "4px 9px",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 700,
  },
  snapshotLine: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 1.4,
  },
  snapshotSubLine: {
    marginTop: 4,
    fontSize: 11,
    color: "#6b7280",
  },
  intensityRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  intensityLabel: {
    fontSize: 13,
    color: "#4b5563",
    fontWeight: 600,
  },
  intensityButtons: {
    display: "flex",
    gap: 6,
  },
  intensityButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 600,
  },
  intensityButtonActive: {
    background: "#0a66c2",
    borderColor: "#0a66c2",
    color: "#fff",
  },
  assistStrip: {
    border: "1px solid",
    borderRadius: 10,
    padding: "10px 12px",
    transition: "opacity 0.35s ease",
    minHeight: 58,
  },
  assistHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  assistHeaderLabel: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
  },
  pinButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    borderRadius: 8,
    padding: "4px 9px",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 700,
  },
  pinButtonActive: {
    background: "#0a66c2",
    borderColor: "#0a66c2",
    color: "#fff",
  },
  assistTitle: {
    fontSize: 13,
    fontWeight: 700,
  },
  assistMessage: {
    marginTop: 4,
    fontSize: 13,
    color: "#1f2937",
    lineHeight: 1.4,
  },
  assistPlaceholder: {
    fontSize: 13,
    color: "#6b7280",
  },
  hintHistoryCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    background: "#fff",
    padding: "10px 12px",
  },
  hintHistoryTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 8,
  },
  hintHistoryEmpty: {
    fontSize: 12,
    color: "#6b7280",
  },
  hintHistoryList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  hintHistoryItem: {
    border: "1px solid #edf0f2",
    borderRadius: 8,
    padding: "8px 10px",
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: 8,
    alignItems: "start",
  },
  hintChip: {
    borderRadius: 999,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.02em",
  },
  hintChipHigh: {
    background: "#fff1f2",
    color: "#9f1239",
    border: "1px solid #fecdd3",
  },
  hintChipMedium: {
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
  },
  hintChipLow: {
    background: "#f0fdf4",
    color: "#166534",
    border: "1px solid #bbf7d0",
  },
  hintItemTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#1f2937",
  },
  hintItemMessage: {
    marginTop: 2,
    fontSize: 12,
    color: "#4b5563",
    lineHeight: 1.4,
  },
  questionCard: {
    padding: 20,
    borderRadius: 12,
    background: "var(--surface-2)",
  },
  questionMeta: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0a66c2",
  },
  questionText: {
    marginTop: 8,
    lineHeight: 1.5,
    color: "#111827",
  },
  questionCardFocused: {
    borderRadius: 12,
    background: "var(--surface-2)",
    padding: 20,
  },
  evaluatorLine: {
    marginTop: 8,
    fontSize: 12,
    color: "#1d4ed8",
    fontWeight: 700,
  },
  qaCard: {
    borderRadius: 10,
    background: "var(--surface-2)",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  qaCardFocused: {
    borderRadius: 12,
    background: "var(--surface-2)",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  qaTitle: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.03em",
    textTransform: "uppercase" as const,
    color: "#1d4ed8",
  },
  qaText: {
    fontSize: 13,
    lineHeight: 1.45,
    color: "#1f2937",
  },
  qaAnswer: {
    fontSize: 13,
    lineHeight: 1.5,
    color: "#0f172a",
    whiteSpace: "pre-wrap" as const,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "10px 11px",
  },
  answerModeLive: {
    alignSelf: "flex-start" as const,
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    color: "#166534",
    borderRadius: 999,
    padding: "3px 8px",
    fontSize: 11,
    fontWeight: 700,
  },
  answerModeFallback: {
    alignSelf: "flex-start" as const,
    border: "1px solid #fde68a",
    background: "#fffbeb",
    color: "#92400e",
    borderRadius: 999,
    padding: "3px 8px",
    fontSize: 11,
    fontWeight: 700,
  },
  answerModeGenerating: {
    alignSelf: "flex-start" as const,
    border: "1px solid #dbeafe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 999,
    padding: "3px 8px",
    fontSize: 11,
    fontWeight: 700,
  },
  captureButtonOn: {
    marginTop: 6,
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    alignSelf: "flex-start" as const,
  },
  captureButtonOff: {
    marginTop: 6,
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-1)",
    color: "var(--text-muted)",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    alignSelf: "flex-start" as const,
  },
  // ========== NEW STYLES FOR PHASES ==========
  answerActions: {
    display: "flex",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap" as const,
    alignItems: "center",
  },
  actionButton: {
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  actionButtonActive: {
    border: "1px solid #3b82f6",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  actionButtonDanger: {
    border: "1px solid #f87171",
    background: "#fef2f2",
    color: "#dc2626",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  ttsToggle: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    color: "#6b7280",
    cursor: "pointer",
  },
  historyCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    background: "#fafafa",
    padding: 12,
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    maxHeight: 400,
    overflowY: "auto" as const,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 8,
  },
  historyItem: {
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: "#fff",
    padding: 10,
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  historyQuestion: {
    fontSize: 12,
    fontWeight: 700,
    color: "#1d4ed8",
  },
  historyAnswer: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 1.4,
  },
  historyCopyBtn: {
    alignSelf: "flex-start" as const,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },
  controls: {
    display: "flex",
    gap: 10,
  },
  primaryButton: {
    background: "#202733",
    color: "var(--text-primary)",
    border: "none",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
  },
  secondaryButton: {
    background: "var(--surface-2)",
    color: "var(--text-muted)",
    border: "none",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  metricCard: {
    borderRadius: 10,
    padding: "10px 12px",
    background: "var(--surface-2)",
  },
  metricLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  metricValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
  },
  progressTrack: {
    marginTop: 8,
    width: "100%",
    height: 8,
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "#6ea8ff",
    borderRadius: 999,
    transition: "width 250ms ease",
  },
  miniScoreCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    background: "#fafafa",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  miniScoreTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#334155",
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
  },
  miniScoreRow: {
    display: "grid",
    gridTemplateColumns: "78px 1fr 44px",
    alignItems: "center",
    gap: 8,
  },
  miniScoreLabel: {
    fontSize: 12,
    color: "#475569",
    fontWeight: 600,
  },
  miniScoreValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: 700,
    textAlign: "right" as const,
  },
  summaryCard: {
    border: "1px solid #d9e2ec",
    borderRadius: 10,
    background: "#eef3f8",
    padding: 12,
  },
  summaryTitle: {
    margin: 0,
    fontSize: 16,
    color: "#0a66c2",
  },
  summaryPre: {
    margin: "10px 0 0",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: 13,
    lineHeight: 1.45,
  },
  reportLink: {
    marginTop: 10,
    display: "inline-block",
    color: "#0a66c2",
    fontWeight: 700,
    textDecoration: "none",
  },
  coachingCard: {
    border: "1px solid #dbeafe",
    borderRadius: 10,
    background: "#f8fbff",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  coachingTitle: {
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.03em",
    textTransform: "uppercase" as const,
  coachingSubTitle: {
    marginTop: 8,
    fontSize: 12,
    color: "#334155",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  verdictValueRow: {
    marginTop: 6,
    display: "flex",
    alignItems: "baseline",
    gap: 8,
  },
  verdictPercent: {
    fontSize: 30,
    color: "#0f172a",
    fontWeight: 900,
  },
  verdictChip: {
    border: "1px solid #86efac",
    background: "#ecfdf5",
    color: "#166534",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  verdictBand: {
    marginTop: 2,
    fontSize: 12,
    color: "#475569",
    fontWeight: 700,
  },
  verdictInterpretation: {
    marginTop: 4,
    fontSize: 13,
    color: "#0f172a",
    fontWeight: 700,
  },
    color: "#1d4ed8",
  },
  coachingItem: {
    fontSize: 13,
    lineHeight: 1.45,
    color: "#1f2937",
  },
  nextFocusLine: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: 700,
    color: "#1d4ed8",
  },
  coachingFooter: {
    marginTop: 6,
    display: "flex",
    justifyContent: "flex-start",
  },
  logCard: {
    borderRadius: 10,
    background: "var(--surface-2)",
    display: "flex",
    flexDirection: "column",
    minHeight: 220,
  },
  logTitle: {
    padding: "10px 12px",
    borderBottom: "1px solid var(--border-subtle)",
    fontWeight: 700,
    color: "var(--text-muted)",
  },
  logBody: {
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowY: "auto",
    whiteSpace: "pre-wrap",
  },
  logLine: {
    fontSize: 13,
    lineHeight: 1.45,
    color: "var(--text-primary)",
  },
};
