// This file has been renamed to InterviewLegacy.tsx to resolve casing/module conflict.
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";
import StatusBanner from "./StatusBanner";
import { showToast, triggerTestimonialPrompt } from "../lib/toast";
import { getAccessTokenOrThrow } from "../lib/auth";

type StrategyTrack = "launch" | "depth" | "stealth" | "enterprise";

type OfferProbability = {
  offer_probability: number;
  confidence_band: string;
  drivers_positive: string[];
  drivers_negative: string[];
  delta_vs_last_session: number;
  what_to_fix_next: string[];
  session_count: number;
  latest_session_id?: string | null;
  improvement_velocity_pp_per_session?: number;
  beta_percentile?: number | null;
  beta_cohort_size?: number | null;
  baseline_range_hint?: string | null;
  target_ladder?: string[] | null;
  plateau_note?: string | null;
  how_it_works?: string | null;
};

type SentenceTag = "Context" | "Action" | "Result" | "Reflection";

type TaggedSentence = {
  text: string;
  tag: SentenceTag;
  weakness: string | null;
};

function splitSentences(raw: string): string[] {
  return String(raw || "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function classifySentence(text: string): SentenceTag {
  const lower = text.toLowerCase();
  if (/(^|\b)(as a|when|during|at the time|our team|the system|in that project)(\b|$)/.test(lower)) return "Context";
  if (/(^|\b)(i |i led|i built|i designed|i implemented|i drove|i owned|i reduced|i fixed)(\b|$)/.test(lower)) return "Action";
  if (/(%|\b)(result|improved|reduced|increased|decreased|saved|latency|throughput|uptime|impact)(\b|$)/.test(lower)) return "Result";
  return "Reflection";
}

function detectWeakness(text: string): string | null {
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;
  const fillerHits = ["um", "uh", "like", "you know", "kind of"].reduce((acc, token) => acc + (lower.includes(token) ? 1 : 0), 0);
  const vagueHits = ["things", "stuff", "somehow", "a lot", "many"].reduce((acc, token) => acc + (lower.includes(token) ? 1 : 0), 0);
  const hasMetric = /\d/.test(text) || /(%|latency|throughput|revenue|cost|uptime|sla)/i.test(text);

  if (fillerHits >= 1 || words > 34) return "filler-heavy";
  if (vagueHits >= 1) return "vague";
  if (!hasMetric && /result|impact|improved|reduced|increased/i.test(lower)) return "unsupported";
  return null;
}

function tagAnswerSentences(answer: string): TaggedSentence[] {
  return splitSentences(answer).map((sentence) => ({
    text: sentence,
    tag: classifySentence(sentence),
    weakness: detectWeakness(sentence),
  }));
}

export default function Interview({ strategyTrack = "launch", autoStartNonce = 0 }: { strategyTrack?: StrategyTrack; autoStartNonce?: number }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ question: string; answer: string; feedback: string }>>([]);
  const [status, setStatus] = useState<{ type: "error" | "success" | "info"; message: string }>({
    type: "info",
    message: "",
  });
  const [retryAction, setRetryAction] = useState<"start" | "submit" | null>(null);
  const [credibilityPulseActive, setCredibilityPulseActive] = useState(false);
  const [riskPulseActive, setRiskPulseActive] = useState(false);
  const [pressureTintActive, setPressureTintActive] = useState(false);
  const [completionOffer, setCompletionOffer] = useState<OfferProbability | null>(null);
  const [accuracyFeedback, setAccuracyFeedback] = useState<"accurate" | "inaccurate" | null>(null);
  const [accuracyFeedbackState, setAccuracyFeedbackState] = useState("");
  const promptedSessionsRef = useRef<Set<string>>(new Set());
  const previousMetricsRef = useRef<{ credibility: number; pressure: number; drift: number } | null>(null);
  const metricsReadyRef = useRef(false);

  const liveMetrics = useMemo(() => {
    const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
    const metricSignal = /(\d|%|latency|throughput|revenue|cost|sla|uptime)/i.test(answer) ? 1 : 0;
    const confidence = Math.max(32, Math.min(96, 36 + words * 1.8 + (evaluation ? 8 : 0)));
    const structure = Math.max(28, Math.min(95, 34 + words * 1.3));
    const pressure = loading ? 74 : words > 130 ? 62 : words > 80 ? 49 : 36;
    const credibility = Math.max(35, Math.min(94, 42 + transcript.length * 8 + (evaluation ? 6 : 0)));
    const drift = Math.max(8, Math.min(78, 68 - structure * 0.48));
    const confidenceStability = Math.max(20, Math.min(96, 100 - pressure));
    const impactStrength = Math.max(18, Math.min(95, 26 + Math.min(42, words * 0.35) + metricSignal * 18));

    return {
      confidence: Math.round(confidence),
      structure: Math.round(structure),
      pressure: Math.round(pressure),
      credibility: Math.round(credibility),
      drift: Math.round(drift),
      confidenceStability: Math.round(confidenceStability),
      impactStrength: Math.round(impactStrength),
      words,
    };
  }, [answer, evaluation, loading, transcript.length]);

  const taggedSentences = useMemo(() => tagAnswerSentences(answer), [answer]);

  const isStealth = strategyTrack === "stealth";
  const isEnterprise = strategyTrack === "enterprise";

  const start = async () => {
    try {
      setLoading(true);
      setStatus({ type: "info", message: "Starting interview..." });
      setRetryAction(null);
      const authToken = await getAccessTokenOrThrow();
      const data = await apiRequest<any>("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "behavioral",
        }),
        retries: 1,
        authToken,
      });
      setSessionId(String(data.session_id || ""));
      setQuestion(String(data.question || ""));
      setEvaluation("");
      setCompletionOffer(null);
      setAccuracyFeedback(null);
      setAccuracyFeedbackState("");
      setTranscript([]);
      setStatus({ type: "success", message: "Interview started." });
      showToast({ type: "success", message: "Interview started." });
    } catch (error: any) {
      const message = `Failed to start interview: ${error?.message || "unknown error"}`;
      setStatus({ type: "error", message });
      showToast({ type: "error", message });
      setRetryAction("start");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!sessionId) {
      setStatus({ type: "error", message: "Start the interview first." });
      showToast({ type: "error", message: "Start the interview first." });
      setRetryAction("start");
      return;
    }
    if (!answer.trim()) {
      setStatus({ type: "error", message: "Please enter an answer before submitting." });
      showToast({ type: "error", message: "Please enter an answer before submitting." });
      setRetryAction(null);
      return;
    }

    try {
      const currentQuestion = question;
      const submittedAnswer = answer.trim();
      setLoading(true);
      setStatus({ type: "info", message: "Submitting answer..." });
      setRetryAction(null);
      const authToken = await getAccessTokenOrThrow();
      const data = await apiRequest<any>("/api/interview/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          answer: submittedAnswer,
        }),
        retries: 1,
        authToken,
      });
      const evaluationText = typeof data.evaluation === "string" ? data.evaluation : JSON.stringify(data.evaluation || {}, null, 2);
      setEvaluation(evaluationText);
      setTranscript((prev) => [
        ...prev,
        {
          question: currentQuestion,
          answer: submittedAnswer,
          feedback: evaluationText,
        },
      ]);
      setAnswer("");
      setStatus({ type: "success", message: "Answer submitted." });
      showToast({ type: "success", message: "Answer submitted." });

      if (data.done) {
        const summary = {
          score: data.score,
          decision: data.decision,
        };
        try {
          const offerData = await apiRequest<OfferProbability>("/api/user/offer-probability?limit=40", {
            method: "GET",
            retries: 0,
            authToken,
          });
          setCompletionOffer(offerData);
          const latestSessionId = String(offerData.latest_session_id || "");
          const significantGain = Number(offerData.delta_vs_last_session || 0) >= 5;
          const confidenceBand = String(offerData.confidence_band || "low").toLowerCase();
          const confidenceQualified = confidenceBand === "medium" || confidenceBand === "high";
          const sessionQualified = Number(offerData.session_count || 0) >= 3;
          if (significantGain && confidenceQualified && sessionQualified && latestSessionId && !promptedSessionsRef.current.has(latestSessionId)) {
            promptedSessionsRef.current.add(latestSessionId);
            triggerTestimonialPrompt({
              message: "You just improved meaningfully. Share a 1-line testimonial to help others trust the system.",
              cycleKey: latestSessionId,
            });
          }
        } catch {
        }
        setQuestion("Interview completed");
        setEvaluation(JSON.stringify(summary, null, 2));
        return;
      }

      if (data.next_question) {
        setQuestion(String(data.next_question));
      }
    } catch (error: any) {
      const message = `Failed to submit answer: ${error?.message || "unknown error"}`;
      setStatus({ type: "error", message });
      showToast({ type: "error", message });
      setRetryAction("submit");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (retryAction === "start") {
      start();
      return;
    }
    if (retryAction === "submit") {
      submit();
    }
  };

  useEffect(() => {
    if (autoStartNonce <= 0) return;
    if (sessionId || question || loading) return;
    start();
  }, [autoStartNonce]);

  const pressureState = liveMetrics.pressure >= 70 ? "high" : liveMetrics.pressure >= 52 ? "medium" : "low";

  const submitAccuracyFeedback = async (feltAccurate: boolean) => {
    if (!completionOffer || !sessionId || accuracyFeedback !== null) return;
    try {
      setAccuracyFeedback(feltAccurate ? "accurate" : "inaccurate");
      setAccuracyFeedbackState("Saving feedback...");
      const authToken = await getAccessTokenOrThrow();
      await apiRequest("/api/user/offer-probability/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          offer_probability: completionOffer.offer_probability,
          confidence_band: completionOffer.confidence_band,
          felt_accuracy: feltAccurate,
          label: feltAccurate ? "accurate" : "inaccurate",
        }),
        retries: 0,
        authToken,
      });
      setAccuracyFeedbackState("Feedback saved. This improves future calibration.");
    } catch {
      setAccuracyFeedback(null);
      setAccuracyFeedbackState("Feedback failed to save. Please try again.");
    }
  };

  useEffect(() => {
    const previous = previousMetricsRef.current;
    if (!previous) {
      previousMetricsRef.current = {
        credibility: liveMetrics.credibility,
        pressure: liveMetrics.pressure,
        drift: liveMetrics.drift,
      };
      metricsReadyRef.current = true;
      return;
    }

    const timers: number[] = [];
    const credibilityIncrease = liveMetrics.credibility > previous.credibility;
    const riskSpike = liveMetrics.drift > previous.drift + 4 || liveMetrics.drift > 30;
    const pressureSpike = liveMetrics.pressure > previous.pressure + 6 || liveMetrics.pressure > 60;

    if (credibilityIncrease) {
      setCredibilityPulseActive(true);
      timers.push(window.setTimeout(() => setCredibilityPulseActive(false), 220));
      if (metricsReadyRef.current) {
        showToast({ type: "success", message: "Signal Strengthened" });
      }
    }

    if (riskSpike) {
      setRiskPulseActive(true);
      timers.push(window.setTimeout(() => setRiskPulseActive(false), 340));
    }

    if (pressureSpike) {
      setPressureTintActive(true);
      timers.push(window.setTimeout(() => setPressureTintActive(false), 280));
    }

    previousMetricsRef.current = {
      credibility: liveMetrics.credibility,
      pressure: liveMetrics.pressure,
      drift: liveMetrics.drift,
    };

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [liveMetrics.credibility, liveMetrics.drift, liveMetrics.pressure]);

  const computedMetricCommentary = [
    liveMetrics.credibility > 70
      ? "Signal strong. Maintain structured proof."
      : liveMetrics.credibility < 50
      ? "Signal weakening. Add measurable impact."
      : null,
    liveMetrics.drift > 30 ? "Overclaim drift detected." : null,
    liveMetrics.pressure > 60 ? "Delivery instability rising." : null,
  ].filter(Boolean) as string[];

  const metricCommentary = computedMetricCommentary.slice(0, 2);
  const queuedMetricCommentaryCount = Math.max(0, computedMetricCommentary.length - metricCommentary.length);

  return (
    <div className="w-full max-w-[1060px] grid grid-cols-[1fr_320px] gap-3.5">
      <div className="p-5 bg-[rgba(2,6,23,0.94)] rounded-xl border border-[rgba(51,65,85,0.92)] shadow-[0_10px_28px_rgba(2,6,23,0.52)]">
        <div className="flex justify-between items-start gap-2.5">
          <div>
            <h2 className="m-0 text-2xl text-[#f8fafc] font-black">Live Pressure Round</h2>
            <p className="mt-2 mb-3 text-[#94a3b8] text-sm">
              {isStealth
                ? "Run realistic rounds with compact, low-friction prompts that keep you conversion-ready."
                : isEnterprise
                ? "Run realistic rounds with governed signals and audit-ready checkpoints for accountable outcomes."
                : "Run realistic rounds while your interviewer-perception signals update in real time."}
            </p>
            <div className="inline-flex rounded-full border border-[rgba(125,211,252,0.35)] bg-[rgba(2,132,199,0.14)] text-[#bae6fd] px-2.5 py-1 text-[11px] font-bold mb-1">
              {strategyTrack === "stealth"
                ? "Stealth Track: low-friction copilot prompts"
                : strategyTrack === "enterprise"
                ? "Enterprise Track: governed performance signals"
                : strategyTrack === "depth"
                ? "Depth Track: expanded intelligence instrumentation"
                : "Launch Track: polished simulation flow"}
            </div>
          </div>
          <button onClick={() => router.push("/interview")} className="mb-3 bg-[rgba(15,23,42,0.72)] text-[#bae6fd] border border-[rgba(125,211,252,0.35)] px-3.5 py-2.5 rounded-[10px] cursor-pointer font-bold">Open Voice Simulation</button>
        </div>

        {!question && (
          <button onClick={start} className="bg-[linear-gradient(180deg,#0ea5e9_0%,#2563eb_100%)] text-[#f8fafc] border border-[rgba(125,211,252,0.62)] px-3.5 py-2.5 rounded-[10px] cursor-pointer font-extrabold shadow-[0_8px_20px_rgba(14,165,233,0.25)]" disabled={loading}>
            {loading ? "Starting..." : "Start Live Pressure Round"}
          </button>
        )}

        {question && (
          <>
            <div className="mt-1 mb-2.5 p-3.5 rounded-[10px] bg-[rgba(2,132,199,0.14)] border border-[rgba(125,211,252,0.3)]">
              <div className="text-xs text-[#93c5fd] font-bold mb-1">Current Question</div>
              <div className="font-bold text-[#f8fafc] leading-[1.45]">{question}</div>
            </div>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full min-h-[132px] p-3 rounded-[10px] border border-[rgba(125,211,252,0.35)] text-[#e2e8f0] bg-[rgba(15,23,42,0.72)] mb-2.5 resize-y leading-[1.45] outline-none"
              placeholder="Type your answer with structure: context, action, impact, reflection..."
            />

            <div className="flex items-center justify-between gap-2.5 mb-2">
              <button onClick={submit} className="bg-[linear-gradient(180deg,#0ea5e9_0%,#2563eb_100%)] text-[#f8fafc] border border-[rgba(125,211,252,0.62)] px-3.5 py-2.5 rounded-[10px] cursor-pointer font-extrabold shadow-[0_8px_20px_rgba(14,165,233,0.25)]" disabled={loading}>{loading ? "Submitting..." : "Submit Answer"}</button>
              <div className="text-xs text-[#93c5fd] font-bold">Words: {liveMetrics.words}</div>
            </div>

            {taggedSentences.length > 0 && !isStealth && (
              <div className="mt-2.5 rounded-[10px] border border-[rgba(125,211,252,0.28)] bg-[rgba(15,23,42,0.72)] px-3 py-2.5">
                <div className="text-xs text-[#bae6fd] font-extrabold mb-1.5">Live Transcript Signal Tagging</div>
                {taggedSentences.map((item, index) => (
                  <div key={`${item.text}-${index}`} className={`grid grid-cols-[auto_1fr_auto] gap-2 items-center border-t pt-[7px] mt-[7px] ${item.weakness ? "border-t-[rgba(248,113,113,0.3)]" : "border-t-[rgba(125,211,252,0.18)]"}`}>
                    <span className="rounded-full border border-[rgba(125,211,252,0.35)] text-[#bae6fd] bg-[rgba(2,132,199,0.16)] text-[10px] font-extrabold px-2 py-[3px]">{item.tag}</span>
                    <span className="text-[#dbeafe] text-xs leading-[1.4]">{item.text}</span>
                    {item.weakness ? <span className="rounded-full border border-[rgba(248,113,113,0.38)] text-[#fecaca] bg-[rgba(127,29,29,0.34)] text-[10px] font-extrabold px-2 py-[3px] uppercase">{item.weakness}</span> : null}
                  </div>
                ))}
                {taggedSentences.some((item) => item.weakness) ? (
                  <div className="mt-2 rounded-lg border border-[rgba(250,204,21,0.45)] bg-[rgba(113,63,18,0.38)] text-[#fde68a] text-xs font-semibold px-[9px] py-[7px]">Rewrite weak spans with one metric, one action, and one concrete result.</div>
                ) : null}
              </div>
            )}
          </>
        )}

        {evaluation && (
          <div className="mt-2.5 rounded-[10px] border border-[rgba(125,211,252,0.32)] bg-[rgba(2,132,199,0.12)] px-3 py-2.5">
            <div className="text-xs text-[#bae6fd] font-extrabold mb-1.5">{isStealth ? "Stealth Summary" : "Coach Evaluation"}</div>
            <pre className="m-0 whitespace-pre-wrap text-[#e2e8f0] text-[13px]">{isStealth ? `${evaluation.slice(0, 300)}${evaluation.length > 300 ? "..." : ""}` : evaluation}</pre>
          </div>
        )}

        {transcript.length > 0 && !isStealth && (
          <div className="mt-2.5 rounded-[10px] border border-[rgba(125,211,252,0.28)] bg-[rgba(15,23,42,0.72)] px-3 py-2.5">
            <div className="text-xs text-[#bae6fd] font-extrabold mb-1.5">Round Transcript</div>
            {transcript.slice(-3).map((item, idx) => (
              <div key={idx} className="mt-2 pt-2 border-t border-t-[rgba(125,211,252,0.2)]">
                <div className="text-xs text-[#e2e8f0] font-bold">Q: {item.question}</div>
                <div className="mt-1 text-xs text-[#cbd5e1] leading-[1.45]">A: {item.answer}</div>
              </div>
            ))}
          </div>
        )}

        {transcript.length > 0 && isStealth && (
          <div className="mt-2.5 rounded-[10px] border border-[rgba(125,211,252,0.28)] bg-[rgba(15,23,42,0.72)] px-3 py-2.5 text-[#93c5fd] text-xs font-semibold leading-[1.4]">
            Stealth mode keeps transcript details compact. Switch to Launch or Depth for full turn-by-turn review.
          </div>
        )}

        {completionOffer && question === "Interview completed" && (
          <div className="mt-3 rounded-[10px] border border-[rgba(45,212,191,0.48)] bg-[linear-gradient(180deg,rgba(20,184,166,0.18)_0%,rgba(2,6,23,0.82)_100%)] px-3 py-3">
            {(() => {
              const value = Number(completionOffer.offer_probability || 0);
              const meaning =
                value >= 75
                  ? "Strong trajectory for final-round performance."
                  : value >= 60
                  ? "Competitive trajectory; continue tightening weak drivers."
                  : value >= 45
                  ? "Emerging trajectory; consistency work still needed."
                  : "High-risk trajectory; focus on structure and evidence now.";
              const targetHint = value >= 70 ? "Keep momentum and protect consistency." : "Run another round and push toward 70%+.";
              const velocity = Number(completionOffer.improvement_velocity_pp_per_session || completionOffer.delta_vs_last_session || 0);
              return (
                <>
                  <div className="text-[11px] font-extrabold text-[#99f6e4] uppercase tracking-[0.4px]">Session-End Delta</div>
                  <div className="mt-[3px] text-[#f0fdfa] text-[22px] font-black">
                    Offer Probability {completionOffer.delta_vs_last_session >= 0 ? "+" : ""}{completionOffer.delta_vs_last_session.toFixed(1)} pts
                  </div>
                  <div className="mt-1 text-[#ccfbf1] text-xs">Current probability: {completionOffer.offer_probability.toFixed(1)}% ({completionOffer.confidence_band} confidence)</div>
                  <div className="mt-1 text-[#99f6e4] text-xs font-bold">Velocity: {velocity >= 0 ? "+" : ""}{velocity.toFixed(1)} pts/session</div>
                  <div className="mt-[5px] text-[#ccfbf1] text-xs font-bold">{meaning}</div>
                  <div className="mt-1 text-[#99f6e4] text-xs font-semibold">{targetHint}</div>
                  {completionOffer.baseline_range_hint ? <div className="mt-1 text-[#bae6fd] text-xs font-semibold">{completionOffer.baseline_range_hint}</div> : null}
                  {completionOffer.beta_percentile != null && completionOffer.beta_cohort_size ? (
                    <div className="mt-1 text-[#dbeafe] text-xs font-semibold">Beta context: top {Math.max(1, Math.round(100 - Number(completionOffer.beta_percentile || 0)))}% (n={completionOffer.beta_cohort_size})</div>
                  ) : null}
                  {(completionOffer.target_ladder || []).length > 0 ? (
                    <div className="mt-1.5 flex gap-1.5 flex-wrap">
                      {(completionOffer.target_ladder || []).slice(0, 3).map((item) => (
                        <span key={item} className="border border-[rgba(125,211,252,0.35)] bg-[rgba(2,132,199,0.15)] text-[#bae6fd] rounded-full px-2 py-1 text-[11px] font-bold">{item}</span>
                      ))}
                    </div>
                  ) : null}
                  {completionOffer.plateau_note ? <div className="mt-1.5 rounded-lg border border-[rgba(250,204,21,0.38)] bg-[rgba(113,63,18,0.32)] text-[#fde68a] px-2 py-1.5 text-xs font-semibold">{completionOffer.plateau_note}</div> : null}
                </>
              );
            })()}
            <div className="mt-2 text-[#bae6fd] text-xs font-extrabold">What changed</div>
            {(completionOffer.drivers_positive || []).slice(0, 2).map((item) => (
              <div key={item} className="text-[#dbeafe] text-xs leading-[1.4] mt-[3px]">â€¢ {item}</div>
            ))}
            <div className="mt-2 text-[#bae6fd] text-xs font-extrabold">What to fix next</div>
            {(completionOffer.what_to_fix_next || []).slice(0, 2).map((item) => (
              <div key={item} className="text-[#dbeafe] text-xs leading-[1.4] mt-[3px]">â€¢ {item}</div>
            ))}
            <div className="mt-2.5 rounded-lg border border-[rgba(125,211,252,0.28)] bg-[rgba(15,23,42,0.64)] px-[9px] py-2">
              <div className="text-[#dbeafe] text-xs font-bold">Did this score feel accurate?</div>
              <div className="mt-1.5 flex gap-2">
                <button
                  className={accuracyFeedback === "accurate" ? "border border-[rgba(45,212,191,0.55)] bg-[rgba(13,148,136,0.3)] text-[#ccfbf1] rounded-lg px-2.5 py-1.5 cursor-default text-xs font-extrabold" : "border border-[rgba(125,211,252,0.35)] bg-[rgba(15,23,42,0.74)] text-[#dbeafe] rounded-lg px-2.5 py-1.5 cursor-pointer text-xs font-bold"}
                  onClick={() => submitAccuracyFeedback(true)}
                  disabled={accuracyFeedback !== null}
                >
                  Yes
                </button>
                <button
                  className={accuracyFeedback === "inaccurate" ? "border border-[rgba(45,212,191,0.55)] bg-[rgba(13,148,136,0.3)] text-[#ccfbf1] rounded-lg px-2.5 py-1.5 cursor-default text-xs font-extrabold" : "border border-[rgba(125,211,252,0.35)] bg-[rgba(15,23,42,0.74)] text-[#dbeafe] rounded-lg px-2.5 py-1.5 cursor-pointer text-xs font-bold"}
                  onClick={() => submitAccuracyFeedback(false)}
                  disabled={accuracyFeedback !== null}
                >
                  No
                </button>
              </div>
              {accuracyFeedbackState ? <div className="mt-1.5 text-[#99f6e4] text-[11px] font-semibold">{accuracyFeedbackState}</div> : null}
            </div>
            {completionOffer.how_it_works ? <div className="mt-2 text-[#cbd5e1] text-[11px] leading-[1.4]">How this works: {completionOffer.how_it_works}</div> : null}
            <button onClick={start} className="mt-2.5 bg-[linear-gradient(180deg,#14b8a6_0%,#0ea5e9_100%)] text-[#ecfeff] border border-[rgba(94,234,212,0.55)] px-3 py-[9px] rounded-[10px] cursor-pointer font-extrabold" disabled={loading}>Run next pressure round now</button>
          </div>
        )}

        <StatusBanner
          type={status.type}
          message={status.message}
          actionLabel={status.type === "error" && retryAction ? "Retry" : undefined}
          onAction={status.type === "error" && retryAction ? handleRetry : undefined}
        />
      </div>

      <div
        className={`p-4 rounded-xl border border-[rgba(51,65,85,0.92)] h-fit ${pressureTintActive ? "bg-[rgba(120,53,15,0.26)] transition-[background] duration-300 ease-in-out" : "bg-[rgba(2,6,23,0.96)]"} ${credibilityPulseActive ? "shadow-[0_0_0_1px_rgba(56,189,248,0.28),0_0_14px_rgba(56,189,248,0.24)] transition-shadow duration-200 ease-in-out" : riskPulseActive ? "shadow-[0_0_0_1px_rgba(248,113,113,0.3),0_0_14px_rgba(248,113,113,0.25)] transition-shadow duration-300 ease-in-out" : "shadow-[0_10px_28px_rgba(2,6,23,0.52)]"}`}
      >
        <div className="text-lg font-black text-[#f8fafc]">Interviewer Perception Console</div>
        <div className="mt-1 mb-2.5 text-xs text-[#94a3b8] leading-[1.4]">Engine-calibrated signals. Expand for advanced diagnostics.</div>

        <div
          className={`mb-2.5 rounded-[10px] border bg-[rgba(15,23,42,0.75)] px-[9px] py-2 text-xs font-bold leading-[1.4] ${pressureState === "high" ? "border-[rgba(248,113,113,0.45)] text-[#fecaca]" : pressureState === "medium" ? "border-[rgba(251,191,36,0.45)] text-[#fde68a]" : "border-[rgba(45,212,191,0.45)] text-[#99f6e4]"}`}
          ref={(el) => { if (el) el.style.animation = pressureState === "high" ? "aiAlertPulse 1.3s ease-out infinite" : ""; }}
        >
          {pressureState === "high"
            ? "Pressure Spike detected â€” slow pace, anchor objective, then respond."
            : pressureState === "medium"
            ? "Pressure elevated â€” keep concise structure and one measurable impact."
            : "Pressure stable â€” maintain signal quality and pacing."}
        </div>

        <MetricRow label="Credibility" value={liveMetrics.credibility} tone="good" emphasis={credibilityPulseActive ? "pulse" : "none"} />
        <MetricRow label="STAR Structure" value={liveMetrics.structure} tone="good" />
        <MetricRow label="Confidence Stability" value={liveMetrics.confidenceStability} tone="good" />
        <MetricRow label="Impact Strength" value={liveMetrics.impactStrength} tone="good" />
        <MetricRow label="Risk Drift" value={liveMetrics.drift} tone="warn" emphasis={liveMetrics.drift > 30 || riskPulseActive ? "alert" : "none"} />

        {metricCommentary.length > 0 && (
          <div className="rounded-[10px] border border-[rgba(51,65,85,0.72)] bg-[rgba(2,6,23,0.88)] px-[9px] py-2 mb-2.5">
            {metricCommentary.map((line) => (
              <div key={line} className="text-[#cbd5e1] text-xs font-semibold leading-[1.4]">{line}</div>
            ))}
            {queuedMetricCommentaryCount > 0 ? (
              <div className="text-[#cbd5e1] text-xs font-semibold leading-[1.4]">
                +{queuedMetricCommentaryCount} more signal{queuedMetricCommentaryCount === 1 ? "" : "s"} queued
              </div>
            ) : null}
          </div>
        )}

        {!isStealth && (
          <button className="w-full mt-1 rounded-[10px] border border-[rgba(125,211,252,0.35)] bg-[rgba(15,23,42,0.74)] text-[#bae6fd] px-2.5 py-[9px] text-xs font-bold cursor-pointer" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? "Hide Advanced" : "Show Advanced"}
          </button>
        )}

        {showAdvanced && !isStealth && (
          <div className="mt-2 rounded-[10px] border border-[rgba(125,211,252,0.25)] bg-[rgba(2,132,199,0.08)] p-2.5">
            <div className="text-xs text-[#dbeafe] font-extrabold mb-1.5">Signal Notes</div>
            <div className="text-xs text-[#bfdbfe] leading-[1.45] mb-[5px]">- Keep answers under 140 words unless question demands depth.</div>
            <div className="text-xs text-[#bfdbfe] leading-[1.45] mb-[5px]">- Use one measurable impact statement in each answer.</div>
            <div className="text-xs text-[#bfdbfe] leading-[1.45] mb-[5px]">- If drift rises, restate objective and role context in one line.</div>
          </div>
        )}

        {isEnterprise && (
          <div className="mt-2 rounded-[10px] border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.08)] p-2.5">
            <div className="text-xs text-[#dbeafe] font-extrabold mb-1.5">Governance Layer</div>
            <div className="text-xs text-[#bfdbfe] leading-[1.45] mb-[5px]">- Session is tagged for audit-ready reporting and reviewer handoff.</div>
            <div className="text-xs text-[#bfdbfe] leading-[1.45] mb-[5px]">- Keep one evidence statement per answer for downstream calibration.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  tone,
  emphasis = "none",
}: {
  label: string;
  value: number;
  tone: "good" | "warn";
  emphasis?: "none" | "pulse" | "alert" | "tint";
}) {
  const previousValue = useRef<number | null>(null);
  const [flashState, setFlashState] = useState<"up" | "down" | null>(null);
  const isCritical = tone === "warn" && value >= 66;

  useEffect(() => {
    if (previousValue.current === null) {
      previousValue.current = value;
      return;
    }
    const delta = value - previousValue.current;
    if (delta !== 0) {
      setFlashState(delta > 0 ? "up" : "down");
      const timeout = window.setTimeout(() => setFlashState(null), 420);
      previousValue.current = value;
      return () => window.clearTimeout(timeout);
    }
    previousValue.current = value;
  }, [value]);

  return (
    <div
      className={`mb-2.5 rounded-xl px-2.5 py-[9px] transition-all duration-300 ease-in-out ${emphasis === "tint" ? "bg-[rgba(120,53,15,0.26)]" : "bg-[rgba(2,6,23,0.86)]"} ${emphasis === "pulse" ? "border border-[rgba(56,189,248,0.62)] shadow-[0_0_0_1px_rgba(56,189,248,0.22),0_0_12px_rgba(56,189,248,0.24)]" : emphasis === "alert" ? "border border-[rgba(248,113,113,0.65)] shadow-[0_0_0_1px_rgba(248,113,113,0.24),0_0_12px_rgba(248,113,113,0.24)]" : "border border-[rgba(51,65,85,0.7)]"}`}
    >
      <div className="flex items-center justify-between text-[13px] font-extrabold text-[#dbeafe] mb-1.5">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-[rgba(51,65,85,0.8)] overflow-hidden border border-[rgba(148,163,184,0.2)]">
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-in-out"
          ref={(el) => {
            if (!el) return;
            el.style.width = `${value}%`;
            el.style.background = tone === "good" ? "linear-gradient(90deg, #22d3ee 0%, #3b82f6 100%)" : "linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)";
            el.style.animation = isCritical ? "aiAlertPulse 1.45s ease-out infinite" : flashState ? "aiPulse 0.7s ease-out" : "";
            el.style.boxShadow = flashState === "up" ? "0 0 14px rgba(34, 197, 94, 0.45)" : flashState === "down" ? "0 0 14px rgba(239, 68, 68, 0.45)" : isCritical ? "0 0 14px rgba(239, 68, 68, 0.35)" : "none";
          }}
        />
      </div>
    </div>
  );
}
