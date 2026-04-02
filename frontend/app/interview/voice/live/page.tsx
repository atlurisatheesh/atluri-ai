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
      items.push("Your structure weakened under pressure. Use a fixed frame: decision â†’ action â†’ measurable result.");
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
        goal: "Use decision â†’ action â†’ measurable result.",
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
      pushLog("ðŸ“‹ Answer copied to clipboard");
    } catch {
      pushLog("âŒ Failed to copy to clipboard");
    }
  };

  // ========== PHASE 1: STOP GENERATION ==========
  const stopGeneration = () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    ws.current.send(JSON.stringify({ type: "stop_answer_generation" }));
    setLiveAnswerStreaming(false);
    setCanStopGeneration(false);
    setLiveAnswerMode("idle");
    pushLog("â¹ï¸ Stopped answer generation");
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
      pushLog("âš ï¸ TTS not supported in this browser");
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
      pushLog("âŒ TTS error");
    };
    
    ttsUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    pushLog("ðŸ”Š Reading answer aloud");
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
      pushLog("âš ï¸ No session data to export");
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
    pushLog("ðŸ“„ Session exported as Markdown");
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
      pushLog("âš ï¸ Answer stream timed out, finalized safely");
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
      pushLog("ðŸ”’ Sign in required. Please log in and retry Live Mode.");
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
      pushLog("ðŸ” Room ID normalized to UUID for secure room mode");
    }

    const roomParam = encodeURIComponent(normalizedRoomId.trim());
    const tokenParam = encodeURIComponent(authToken);
    const scenarioParam = (() => { try { return localStorage.getItem("atluriin.interview.scenario") || ""; } catch { return ""; } })();
    const scenarioQs = scenarioParam ? `&scenario=${encodeURIComponent(scenarioParam)}` : "";
    ws.current = new WebSocket(
      `${WS_BASE}/ws/voice?assist_intensity=${assistIntensity}&room_id=${roomParam}&participant=${participantMode}&token=${tokenParam}&answer_language=${answerLanguage}${scenarioQs}`
    );
    ws.current.binaryType = "arraybuffer";

    ws.current.onopen = () => {
      setConnected(true);
      setReconnecting(false);
      setReconnectAttempts(0);
      pushLog("ðŸŸ¢ Connected");
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
        pushLog("ðŸ”’ Session expired. Please refresh and try again.");
        shouldReconnectRef.current = false;
      } else if (closeCode === 1006 || closeCode === 1001) {
        // Auto-reconnect on network issues
        if (shouldReconnectRef.current && reconnectAttempts < MAX_RECONNECT_ATTEMPTS && !finalSummary) {
          setReconnecting(true);
          pushLog(`ðŸ”„ Reconnecting (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            start();  // Reconnect using start() function
          }, 1500 * (reconnectAttempts + 1));
          return;
        }
        // Max retries exhausted - show clear failure state
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          setReconnecting(false);
          pushLog("âŒ Connection failed. Please refresh the page.");
        } else {
          pushLog("ðŸ›œ Connection lost. Please try again.");
        }
      } else if (closeCode && closeCode !== 1000) {
        pushLog("âš ï¸ Connection closed unexpectedly.");
      }

      if (finalSummary) {
        pushLog("ðŸ Interview completed");
      } else if (!reconnecting) {
        pushLog("ðŸ›‘ Session ended");
      }
      shouldReconnectRef.current = false;
    };

    ws.current.onerror = () => {
      // Stealth mode: Hide raw error messages
      pushLog("âš ï¸ Connection issue. Retrying...");
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("ðŸ“© WS MESSAGE:", data);
      if (typeof data.session_id === "string" && data.session_id.trim()) {
        setFinalSessionId(data.session_id.trim());
      }

      if (data.type === "partial_transcript") {
        setLog((l) => {
          const withoutLastPartial = l.filter((x) => !x.startsWith("ðŸŽ¤ You (speaking):"));
          return [...withoutLastPartial, `ðŸŽ¤ You (speaking): ${data.text}`];
        });
      }

      if (data.type === "transcript") {
        pushLog(`ðŸŽ¤ You said: ${data.text}`);
      }

      if (data.type === "waiting_for_interviewer") {
        // Don't clear anything here - keep showing current answer/question
        // The UI should continue displaying the last answer until a NEW question arrives
        setLiveAnswerStreaming(false);
        clearStreamTimeout();
        // Only log if we don't have an answer showing
        // pushLog("â³ Ready for next interviewer question.");
      }

      if (data.type === "stt_warning") {
        const message = String(data.message || "Speech pipeline warning");
        pushLog(`âš ï¸ STT: ${message}`);
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
          pushLog(`ðŸ¤– AI: ${data.decision.message}`);
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
            `ðŸ“Š Score â†’ Clarity: ${data.decision?.clarity_score ?? 0}% | Depth: ${data.decision?.depth_score ?? 0}% | Structure: ${data.decision?.structure_score ?? 0}%`
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
            `ðŸ§¾ Verdict: ${data.decision?.verdict ?? "Average"}${data.decision?.explanation ? ` â€” ${data.decision.explanation}` : ""}`
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
          pushLog(`ðŸ’¡ Hint (${severity}): ${text}`);
        }
      }

      if (data.type === "live_coaching" && Array.isArray(data.tips)) {
        data.tips.forEach((tip: string) => {
          pushLog(`ðŸ§  Coach: ${tip}`);
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
        pushLog(`ðŸ¤– Next Question: ${nextQuestion}`);

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
        pushLog(`ðŸ§‘ Interviewer: ${liveQuestion}`);
        setCurrentQuestion(liveQuestion);
        setLiveAnswerStreaming(true);
        armStreamTimeout();
        // DO NOT send set_question back - backend already started answer generation
        // Sending set_question would trigger a SECOND answer generation and cancel the first
      }

      if (data.type === "tone_shift_event") {
        const message = String(data?.payload?.message || "Tone shifted to increase interview pressure.");
        setEmotionalEvent({ type: "tone", message });
        pushLog(`ðŸŽ­ Tone Shift: ${message}`);
      }

      if (data.type === "interruption_simulation") {
        const message = String(data?.payload?.message || "Interviewer interruption simulated.");
        setEmotionalEvent({ type: "interrupt", message });
        pushLog(`â›” Interruption: ${message}`);
      }

      if (data.type === "pressure_spike_event") {
        const message = String(data?.payload?.message || "Pressure spike injected.");
        setEmotionalEvent({ type: "pressure", message });
        pushLog(`ðŸ”¥ Pressure Spike: ${message}`);
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
            if (prevText === "Analyzing question..." || prevText.startsWith("â–¸")) {
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
          pushLog("âš ï¸ Using fallback answer mode (model provider unavailable)");
        } else {
          setLiveAnswerMode("live");
          pushLog(`âœ… Answer done (reason=${reason}, len=${fullSuggestion.length})`);
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
        pushLog("ðŸŽ™ Listening for next interviewer question.");
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
          pushLog("ðŸ’¡ AI generated answer draft from interviewer question");
          setCaptureState(true);
          pushLog("ðŸŽ™ Listening for next interviewer question.");
        }
      }

      if (data.type === "room_assigned" && data.room_id) {
        const assigned = String(data.room_id);
        if (assigned && assigned !== roomId) {
          setRoomId(assigned);
          pushLog(`ðŸ” Assigned secure room ID: ${assigned}`);
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
        pushLog("ðŸ Final summary received");
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
            pushLog(`âš¡ Question detected: ${transcript}`);
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
          pushLog("ðŸ§­ Browser question-detect assist enabled");
        } catch {}
      }
      */
      pushLog("ðŸŽ™ Deepgram streaming STT active");
    } catch {
      pushLog("âš ï¸ Audio capture unavailable. Enable mic permission and restart session.");
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

    pushLog("ðŸ›‘ Stopping session...");

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
    <div className="min-h-screen p-[22px] flex justify-center bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="w-full max-w-[1320px] grid grid-cols-[minmax(0,7fr)_minmax(280px,3fr)] gap-[18px] items-start">
        <div className="flex-1 min-w-0 min-h-[calc(100vh-48px)] bg-[var(--surface-1)] rounded-xl p-6 flex flex-col gap-4">
          <h2 className="m-0 text-4xl leading-none tracking-[-0.6px] text-[var(--text-primary)]">Live Mode</h2>
          <p className="m-0 text-[var(--text-muted)] text-sm">Real-time decision signal. Keep answers compact and evidence-backed.</p>

          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#4b5563] font-semibold">Room ID</label>
              <input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="border border-[#d1d5db] rounded-lg px-2.5 py-2 text-[13px] text-[#111827] bg-white"
                placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
                disabled={running}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#4b5563] font-semibold">Participant</label>
              <select
                value={participantMode}
                onChange={(e) => setParticipantMode(e.target.value as "candidate" | "interviewer")}
                className="border border-[#d1d5db] rounded-lg px-2.5 py-2 text-[13px] text-[#111827] bg-white"
                disabled={running}
                title="Participant mode"
              >
                <option value="candidate">Candidate</option>
                <option value="interviewer">Interviewer</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#4b5563] font-semibold">Answer Language</label>
              <select
                value={answerLanguage}
                onChange={(e) => setAnswerLanguage(e.target.value as "english" | "detected")}
                className="border border-[#d1d5db] rounded-lg px-2.5 py-2 text-[13px] text-[#111827] bg-white"
                disabled={running}
                title="Answer language"
              >
                <option value="english">English Only</option>
                <option value="detected">Match Detected Language</option>
              </select>
            </div>
          </div>

          {participantMode === "interviewer" && (
            <div className="border border-dashed border-[#bfdbfe] bg-[#eff6ff] text-[#1e3a8a] rounded-[10px] px-3 py-2.5 text-[13px] font-semibold">
              Interviewer mode is voice-only. Speak your question and it will be broadcast live.
            </div>
          )}

          <div className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-[10px] bg-[#f7f9fb] border border-[#e5e7eb]">
            <span className="font-semibold text-[#374151]">Live Status</span>
            <span className="font-semibold text-[#111827]">
              {reconnecting ? "ðŸ”„ Reconnecting..." : running ? "ðŸŽ™ Listening" : finalSummary ? "ðŸ Completed" : connected ? "ðŸŸ¢ Connected" : "ðŸ”´ Idle"}
            </span>
            {running && connected && (
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-[0_0_8px_2px_rgba(34,197,94,0.6)] ml-2">â—</span>
            )}
          </div>

          {running && (
            <div className="grid grid-cols-[78px_1fr_44px] items-center gap-2.5 px-3 py-2 rounded-[10px] bg-[var(--surface-2)]">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.03em]">Mic Input</span>
              <div className="h-2 w-full rounded-full overflow-hidden bg-[rgba(255,255,255,0.08)]">
                <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-[120ms]" ref={(el) => { if (el) el.style.width = `${Math.max(0, Math.min(100, audioLevel))}%`; }} />
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)] text-right">{audioLevel}%</span>
            </div>
          )}

          {activeRoundGoal && running && (
            <div className="border border-[#bfdbfe] bg-[#eff6ff] text-[#1e3a8a] rounded-[10px] px-[11px] py-[9px] text-[13px] font-bold">Goal for this round: {activeRoundGoal}</div>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className={improvementNeeded ? "border border-[#fecaca] bg-[#fff1f2] text-[#9f1239] rounded-full px-2.5 py-[5px] text-xs font-bold" : "border border-[#bbf7d0] bg-[#f0fdf4] text-[#166534] rounded-full px-2.5 py-[5px] text-xs font-bold"}>
              {improvementNeeded ? "Focus Needed" : "On Track"}
            </span>
            <button className="border-0 bg-[var(--surface-2)] text-[var(--text-muted)] rounded-lg px-2.5 py-1.5 cursor-pointer text-xs font-bold" onClick={() => setShowLiveDetails((prev) => !prev)}>
              {showLiveDetails ? "Collapse diagnostics" : "Diagnostics"}
            </button>
          </div>
          <div className="-mt-1.5 text-[13px] leading-[1.45] text-[#374151]">{focusMessage}</div>

          {showLiveDetails && (
            <>
              <div className="flex gap-2 flex-wrap">
                <span className="border border-[#cbd5e1] bg-[#f8fafc] text-[#334155] rounded-full px-2.5 py-[5px] text-xs font-bold">Session {formatClock(sessionSeconds)}</span>
                <span className="border border-[#cbd5e1] bg-[#f8fafc] text-[#334155] rounded-full px-2.5 py-[5px] text-xs font-bold">Speaking {formatClock(speakingSeconds)}</span>
                <span className={speakingNow ? "border border-[#bbf7d0] bg-[#f0fdf4] text-[#166534] rounded-full px-2.5 py-[5px] text-xs font-bold" : "border border-[#e2e8f0] bg-[#f8fafc] text-[#475569] rounded-full px-2.5 py-[5px] text-xs font-bold"}>{speakingNow ? "Speaking now" : "Waiting for voice"}</span>
                <span className={metricUsageDetected ? "border border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8] rounded-full px-2.5 py-[5px] text-xs font-bold" : "border border-[#fde68a] bg-[#fffbeb] text-[#92400e] rounded-full px-2.5 py-[5px] text-xs font-bold"}>
                  {metricUsageDetected ? "Metric usage detected" : "Add concrete numbers"}
                </span>
              </div>

              {driftDetected && (
                <div className="border border-[#fecaca] bg-[#fff1f2] text-[#9f1239] rounded-[10px] px-[11px] py-[9px] text-[13px] font-bold">âš ï¸ Drift detected. Tighten answer to outcomes, ownership, and measurable impact.</div>
              )}
            </>
          )}

          <div className="flex gap-2 flex-wrap">
            <span className="border border-[#bfdbfe] bg-[#eff6ff] text-[#1e3a8a] rounded-full px-2.5 py-1 text-[11px] font-bold uppercase">Mode: {companyMode}</span>
            {(() => { try { const s = localStorage.getItem("atluriin.interview.scenario"); return s ? <span className="border border-[#c4b5fd] bg-[#f5f3ff] text-[#5b21b6] rounded-full px-2.5 py-1 text-[11px] font-bold uppercase">Scenario: {s.replace(/_/g, " ")}</span> : null; } catch { return null; } })()}
            {(companyMode === "amazon" || companyMode === "google" || companyMode === "meta") && (
              <span className="border border-[#fecaca] bg-[#fff1f2] text-[#9f1239] rounded-full px-2.5 py-1 text-[11px] font-bold uppercase">
                {companyMode === "amazon" ? "LP depth weighting" : companyMode === "google" ? "Rigor weighting" : "Impact-pressure weighting"}
              </span>
            )}
          </div>

          {emotionalEvent && showLiveDetails && (
            <div className="border border-[#fcd34d] bg-[#fffbeb] rounded-[10px] px-3 py-2.5">
              <div className="text-xs font-extrabold tracking-[0.03em] uppercase text-[#92400e]">Pressure Cue</div>
              <div className="mt-1 text-[13px] leading-[1.45] text-[#78350f]">{emotionalEvent.message}</div>
            </div>
          )}

          <div className="border border-[#e5e7eb] rounded-[10px] bg-[#fafafa] px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="text-xs font-bold text-[#374151] uppercase tracking-[0.03em]">Persisted Snapshot</div>
              <button className="border border-[#cbd5e1] bg-white text-[#334155] rounded-lg px-[9px] py-1 text-xs cursor-pointer font-bold" onClick={refreshSnapshot} disabled={snapshotLoading}>
                {snapshotLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <div className="text-xs text-[#374151] leading-[1.4]">
              Resume: {snapshot?.resume?.loaded ? `Loaded (${snapshot.resume.chars} chars)` : "Not loaded"}
            </div>
            <div className="text-xs text-[#374151] leading-[1.4]">
              JD: {snapshot?.job?.loaded ? `Loaded (${snapshot.job.chars} chars)` : "Not loaded"}
            </div>
            <div className="text-xs text-[#374151] leading-[1.4]">
              Interview: {snapshot?.interview?.active ? "Active" : snapshot?.interview?.done ? "Completed" : "Not started"}
            </div>
            <div className="text-xs text-[#374151] leading-[1.4]">Role: {snapshot?.interview?.role || "â€”"}</div>
            <div className="text-xs text-[#374151] leading-[1.4]">Credibility: {snapshot?.credibility?.has_snapshot ? "Available" : "Unavailable"}</div>
            <div className="mt-1 text-[11px] text-[#6b7280]">
              Updated: {snapshot?.interview?.updated_at ? new Date(snapshot.interview.updated_at * 1000).toLocaleString() : "â€”"}
            </div>
          </div>

          <div className={running ? "rounded-xl bg-[var(--surface-2)] p-5" : "p-5 rounded-xl bg-[var(--surface-2)]"}>
            <div className="text-[13px] font-bold text-[#0a66c2]">
              Question {questionIndex} of {TOTAL_QUESTIONS}
            </div>
            <div className="mt-2 leading-[1.5] text-[#111827]">{currentQuestion}</div>
            <div className="mt-2 text-xs text-[#1d4ed8] font-bold">{recruiterState}</div>
          </div>

          {liveInterviewerQuestion && (
            <div className={running ? "rounded-xl bg-[var(--surface-2)] p-3 flex flex-col gap-2" : "rounded-[10px] bg-[var(--surface-2)] p-3 flex flex-col gap-2"}>
              <div className="text-xs font-extrabold tracking-[0.03em] uppercase text-[#1d4ed8]">Interviewer Question</div>
              <div className="text-[13px] leading-[1.45] text-[#1f2937]">{liveInterviewerQuestion}</div>
              <div className="text-xs font-extrabold tracking-[0.03em] uppercase text-[#1d4ed8]">Generated Answer</div>
              <div className={liveAnswerMode === "fallback" ? "self-start border border-[#fde68a] bg-[#fffbeb] text-[#92400e] rounded-full px-2 py-[3px] text-[11px] font-bold" : liveAnswerMode === "live" ? "self-start border border-[#bbf7d0] bg-[#f0fdf4] text-[#166534] rounded-full px-2 py-[3px] text-[11px] font-bold" : "self-start border border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8] rounded-full px-2 py-[3px] text-[11px] font-bold"}>
                {liveAnswerMode === "fallback" ? "Fallback answer mode" : liveAnswerMode === "live" ? "Live model mode" : liveAnswerMode === "generating" ? "Generating answer" : "Waiting for answer"}
              </div>
              <div className="text-[13px] leading-[1.5] text-[#0f172a] whitespace-pre-wrap bg-white border border-[#e2e8f0] rounded-lg px-[11px] py-2.5">
                {liveGeneratedAnswer || (liveAnswerStreaming && previousAnswer ? (
                  <span><em className="opacity-60">(Previous) {previousAnswer.slice(0, 200)}...</em><br/><br/>Generating new answer...</span>
                ) : liveAnswerStreaming ? "Generating answer..." : "Waiting for generated answer...")}
              </div>
              
              {/* Action buttons for answer */}
              <div className="flex gap-2 mt-2 flex-wrap items-center">
                {/* Copy button */}
                <button
                  className="border border-[#d1d5db] bg-white text-[#374151] rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all duration-150"
                  onClick={copyAnswerToClipboard}
                  disabled={!liveGeneratedAnswer}
                  title="Copy answer to clipboard"
                >
                  ðŸ“‹ Copy
                </button>
                
                {/* Stop Generation button */}
                {liveAnswerStreaming && canStopGeneration && (
                  <button
                    className="border border-[#f87171] bg-[#fef2f2] text-[#dc2626] rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer"
                    onClick={stopGeneration}
                    title="Stop generating answer"
                  >
                    â¹ï¸ Stop
                  </button>
                )}
                
                {/* TTS button */}
                <button
                  className={ttsPlaying ? "border border-[#3b82f6] bg-[#eff6ff] text-[#1d4ed8] rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer" : "border border-[#d1d5db] bg-white text-[#374151] rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all duration-150"}
                  onClick={ttsPlaying ? stopTts : speakAnswer}
                  disabled={!liveGeneratedAnswer}
                  title={ttsPlaying ? "Stop reading" : "Read answer aloud"}
                >
                  {ttsPlaying ? "ðŸ”‡ Stop" : "ðŸ”Š Read"}
                </button>
                
                {/* TTS Auto toggle */}
                <label className="flex items-center gap-1 text-xs text-[#6b7280] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ttsEnabled}
                    onChange={(e) => setTtsEnabled(e.target.checked)}
                  />
                  Auto-read
                </label>
              </div>
              
              <button
                className={captureEnabled ? "mt-1.5 border border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-primary)] rounded-lg px-2.5 py-[7px] text-xs font-bold cursor-pointer self-start" : "mt-1.5 border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-muted)] rounded-lg px-2.5 py-[7px] text-xs font-bold cursor-pointer self-start"}
                onClick={() => {
                  const next = !captureEnabled;
                  setCaptureState(next);
                  pushLog(next ? "ðŸŽ™ Listening resumed for next interviewer question." : "â¸ Mic paused while you read.");
                }}
              >
                {captureEnabled ? "Pause mic while I read" : "Listen for next question"}
              </button>
            </div>
          )}

          <div className="flex gap-2.5">
            <button onClick={start} disabled={running} className="bg-[#202733] text-[var(--text-primary)] border-none px-3.5 py-2.5 rounded-[10px] cursor-pointer font-semibold">
              {running ? "Listening..." : "Start"}
            </button>

            <button onClick={stop} className="bg-[var(--surface-2)] text-[var(--text-muted)] border-none px-3.5 py-2.5 rounded-[10px] cursor-pointer font-semibold">
              Stop
            </button>
            
            {/* History toggle button */}
            <button 
              onClick={() => setShowHistory(!showHistory)} 
              className="bg-[var(--surface-2)] text-[var(--text-muted)] border-none px-3.5 py-2.5 rounded-[10px] cursor-pointer font-semibold"
              title="Show answer history"
            >
              ðŸ“œ History ({answerHistory.length})
            </button>
            
            {/* Export button */}
            <button 
              onClick={exportSessionAsMarkdown}
              className="bg-[var(--surface-2)] text-[var(--text-muted)] border-none px-3.5 py-2.5 rounded-[10px] cursor-pointer font-semibold"
              disabled={exportingSession || (answerHistory.length === 0 && !liveGeneratedAnswer)}
              title="Export session as Markdown"
            >
              {exportingSession ? "ðŸ“„ Exporting..." : "ðŸ“„ Export"}
            </button>
          </div>
          
          {/* Answer History Panel */}
          {showHistory && answerHistory.length > 0 && (
            <div className="border border-[#e5e7eb] rounded-[10px] bg-[#fafafa] p-3 flex flex-col gap-2.5 max-h-[400px] overflow-y-auto">
              <div className="text-[13px] font-bold text-[#374151] border-b border-b-[#e5e7eb] pb-2">ðŸ“œ Answer History (Last 5)</div>
              {answerHistory.map((item, idx) => (
                <div key={idx} className="border border-[#e2e8f0] rounded-lg bg-white p-2.5 flex flex-col gap-1.5">
                  <div className="text-xs font-bold text-[#1d4ed8]">Q: {item.question}</div>
                  <div className="text-xs text-[#374151] leading-[1.4]">{item.answer.slice(0, 200)}{item.answer.length > 200 ? "..." : ""}</div>
                  <button 
                    className="self-start border border-[#d1d5db] bg-white text-[#374151] rounded-[6px] px-2 py-1 text-[11px] font-semibold cursor-pointer"
                    onClick={async () => {
                      await navigator.clipboard.writeText(item.answer);
                      pushLog(`ðŸ“‹ Copied answer ${idx + 1} to clipboard`);
                    }}
                  >
                    ðŸ“‹ Copy
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2.5">
            <div className="rounded-[10px] px-3 py-2.5 bg-[var(--surface-2)]">
              <div className="text-xs text-[#6b7280]">Confidence</div>
              <div className="mt-1 text-lg font-bold text-[#111827]">{confidence}%</div>
              <div className="mt-2 w-full h-2 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
                <div className="h-full bg-[#6ea8ff] rounded-full transition-[width] duration-[250ms]" ref={(el) => { if (el) el.style.width = `${Math.max(0, Math.min(100, confidence))}%`; }} />
              </div>
            </div>
            <div className="rounded-[10px] px-3 py-2.5 bg-[var(--surface-2)]">
              <div className="text-xs text-[#6b7280]">Hesitation</div>
              <div className="mt-1 text-lg font-bold text-[#111827]">{hesitation}</div>
            </div>
          </div>

          {showLiveDetails && (
            <div className="border border-[#e5e7eb] rounded-[10px] bg-[#fafafa] px-3 py-2.5 flex flex-col gap-2">
              <div className="text-xs font-bold text-[#334155] uppercase tracking-[0.03em]">Live Score Updates</div>
              <div className="grid grid-cols-[78px_1fr_44px] items-center gap-2">
                <span className="text-xs text-[#475569] font-semibold">Clarity</span>
                <div className="mt-2 w-full h-2 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden"><div className="h-full bg-[#6ea8ff] rounded-full transition-[width] duration-[250ms]" ref={(el) => { if (el) el.style.width = `${Math.max(0, Math.min(100, miniScores.clarity))}%`; }} /></div>
                <span className="text-xs text-[#111827] font-bold text-right">{Math.round(miniScores.clarity)}%</span>
              </div>
              <div className="grid grid-cols-[78px_1fr_44px] items-center gap-2">
                <span className="text-xs text-[#475569] font-semibold">Depth</span>
                <div className="mt-2 w-full h-2 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden"><div className="h-full bg-[#6ea8ff] rounded-full transition-[width] duration-[250ms]" ref={(el) => { if (el) el.style.width = `${Math.max(0, Math.min(100, miniScores.depth))}%`; }} /></div>
                <span className="text-xs text-[#111827] font-bold text-right">{Math.round(miniScores.depth)}%</span>
              </div>
              <div className="grid grid-cols-[78px_1fr_44px] items-center gap-2">
                <span className="text-xs text-[#475569] font-semibold">Structure</span>
                <div className="mt-2 w-full h-2 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden"><div className="h-full bg-[#6ea8ff] rounded-full transition-[width] duration-[250ms]" ref={(el) => { if (el) el.style.width = `${Math.max(0, Math.min(100, miniScores.structure))}%`; }} /></div>
                <span className="text-xs text-[#111827] font-bold text-right">{Math.round(miniScores.structure)}%</span>
              </div>
            </div>
          )}

          {finalSummary && (
            <div className="border border-[#dbeafe] rounded-[10px] bg-[#f8fbff] p-3 flex flex-col gap-2">
              <div className="text-[13px] font-extrabold tracking-[0.03em] uppercase text-[#1d4ed8]">Session Verdict</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-[30px] text-[#0f172a] font-black">{finalOfferProbability}%</span>
                <span className="border border-[#86efac] bg-[#ecfdf5] text-[#166534] rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase">{finalVerdict}</span>
              </div>
              <div className="mt-0.5 text-xs text-[#475569] font-bold">Confidence band: {finalBandLow}% â€“ {finalBandHigh}%</div>
              <div className="mt-1 text-[13px] text-[#0f172a] font-bold">{finalInterpretation}</div>

              <div className="mt-2 text-xs text-[#334155] font-extrabold uppercase tracking-[0.3px]">Why</div>
              {finalWhyItems.length === 0 ? <div className="text-[13px] leading-[1.45] text-[#1f2937]">No high-risk blockers detected.</div> : null}
              {finalWhyItems.map((item, idx) => (
                <div key={`${item}-${idx}`} className="text-[13px] leading-[1.45] text-[#1f2937]">â€¢ {item}</div>
              ))}

              <div className="mt-2 text-xs text-[#334155] font-extrabold uppercase tracking-[0.3px]">What changed</div>
              <div className="text-[13px] leading-[1.45] text-[#1f2937]">â€¢ Offer probability delta: {finalDeltaValue >= 0 ? "+" : ""}{Math.round(finalDeltaValue)} points</div>
              <div className="text-[13px] leading-[1.45] text-[#1f2937]">â€¢ Trajectory focus: {nextSessionFocus.label}</div>

              <div className="mt-2 text-xs text-[#334155] font-extrabold uppercase tracking-[0.3px]">What to fix next</div>
              {(finalFixItems.length ? finalFixItems : coachingItems).map((item, idx) => (
                <div key={`fix-${idx}`} className="text-[13px] leading-[1.45] text-[#1f2937]">â€¢ {item}</div>
              ))}

              <div className="mt-0.5 text-[13px] font-bold text-[#1d4ed8]">Next priority: {nextSessionFocus.goal}</div>
              <div className="mt-1.5 flex justify-start">
                <button onClick={start} disabled={running} className="bg-[#202733] text-[var(--text-primary)] border-none px-3.5 py-2.5 rounded-[10px] cursor-pointer font-semibold">
                  Start Next Session
                </button>
                {finalSessionId && (
                  <a href={`/interview/report/${encodeURIComponent(finalSessionId)}`} className="mt-2.5 inline-block text-[#0a66c2] font-bold no-underline">
                    Open Session Report
                  </a>
                )}
                <button onClick={() => setShowRawSummary((v) => !v)} className="bg-[var(--surface-2)] text-[var(--text-muted)] border-none px-3.5 py-2.5 rounded-[10px] cursor-pointer font-semibold">
                  {showRawSummary ? "Hide detailed JSON" : "Show detailed JSON"}
                </button>
              </div>
              {showRawSummary ? <pre className="mt-2.5 whitespace-pre-wrap break-words text-[13px] leading-[1.45]">{JSON.stringify(finalSummary, null, 2)}</pre> : null}
            </div>
          )}

          <div className="rounded-[10px] bg-[var(--surface-2)] flex flex-col min-h-[220px]">
            <div className="px-3 py-2.5 border-b border-b-[var(--border-subtle)] font-bold text-[var(--text-muted)]">Session Transcript</div>
            <div className="p-3 flex flex-col gap-2 overflow-y-auto whitespace-pre-wrap">
              {log.map((l, i) => (
                <div key={i} className="text-[13px] leading-[1.45] text-[var(--text-primary)]">{l}</div>
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

