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
    <div style={styles.shell}>
      <div style={styles.stage}>
        <div style={styles.topRow}>
          <div>
            <h2 style={styles.title}>Live Pressure Round</h2>
            <p style={styles.subtitle}>
              {isStealth
                ? "Run realistic rounds with compact, low-friction prompts that keep you conversion-ready."
                : isEnterprise
                ? "Run realistic rounds with governed signals and audit-ready checkpoints for accountable outcomes."
                : "Run realistic rounds while your interviewer-perception signals update in real time."}
            </p>
            <div style={styles.trackBadge}>
              {strategyTrack === "stealth"
                ? "Stealth Track: low-friction copilot prompts"
                : strategyTrack === "enterprise"
                ? "Enterprise Track: governed performance signals"
                : strategyTrack === "depth"
                ? "Depth Track: expanded intelligence instrumentation"
                : "Launch Track: polished simulation flow"}
            </div>
          </div>
          <button onClick={() => router.push("/interview")} style={styles.liveButton}>Open Voice Simulation</button>
        </div>

        {!question && (
          <button onClick={start} style={styles.primaryButton} disabled={loading}>
            {loading ? "Starting..." : "Start Live Pressure Round"}
          </button>
        )}

        {question && (
          <>
            <div style={styles.questionCard}>
              <div style={styles.questionLabel}>Current Question</div>
              <div style={styles.questionText}>{question}</div>
            </div>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              style={styles.text}
              placeholder="Type your answer with structure: context, action, impact, reflection..."
            />

            <div style={styles.actionRow}>
              <button onClick={submit} style={styles.primaryButton} disabled={loading}>{loading ? "Submitting..." : "Submit Answer"}</button>
              <div style={styles.wordCount}>Words: {liveMetrics.words}</div>
            </div>

            {taggedSentences.length > 0 && !isStealth && (
              <div style={styles.tagCard}>
                <div style={styles.evalTitle}>Live Transcript Signal Tagging</div>
                {taggedSentences.map((item, index) => (
                  <div key={`${item.text}-${index}`} style={{ ...styles.tagRow, ...(item.weakness ? styles.tagRowWeak : {}) }}>
                    <span style={styles.tagPill}>{item.tag}</span>
                    <span style={styles.tagText}>{item.text}</span>
                    {item.weakness ? <span style={styles.weakPill}>{item.weakness}</span> : null}
                  </div>
                ))}
                {taggedSentences.some((item) => item.weakness) ? (
                  <div style={styles.tagHint}>Rewrite weak spans with one metric, one action, and one concrete result.</div>
                ) : null}
              </div>
            )}
          </>
        )}

        {evaluation && (
          <div style={styles.evalCard}>
            <div style={styles.evalTitle}>{isStealth ? "Stealth Summary" : "Coach Evaluation"}</div>
            <pre style={styles.eval}>{isStealth ? `${evaluation.slice(0, 300)}${evaluation.length > 300 ? "..." : ""}` : evaluation}</pre>
          </div>
        )}

        {transcript.length > 0 && !isStealth && (
          <div style={styles.transcriptCard}>
            <div style={styles.evalTitle}>Round Transcript</div>
            {transcript.slice(-3).map((item, idx) => (
              <div key={idx} style={styles.transcriptItem}>
                <div style={styles.transcriptQ}>Q: {item.question}</div>
                <div style={styles.transcriptA}>A: {item.answer}</div>
              </div>
            ))}
          </div>
        )}

        {transcript.length > 0 && isStealth && (
          <div style={styles.stealthNote}>
            Stealth mode keeps transcript details compact. Switch to Launch or Depth for full turn-by-turn review.
          </div>
        )}

        {completionOffer && question === "Interview completed" && (
          <div style={styles.deltaCard}>
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
                  <div style={styles.deltaKicker}>Session-End Delta</div>
                  <div style={styles.deltaHeadline}>
                    Offer Probability {completionOffer.delta_vs_last_session >= 0 ? "+" : ""}{completionOffer.delta_vs_last_session.toFixed(1)} pts
                  </div>
                  <div style={styles.deltaSub}>Current probability: {completionOffer.offer_probability.toFixed(1)}% ({completionOffer.confidence_band} confidence)</div>
                  <div style={styles.deltaVelocity}>Velocity: {velocity >= 0 ? "+" : ""}{velocity.toFixed(1)} pts/session</div>
                  <div style={styles.deltaMeaning}>{meaning}</div>
                  <div style={styles.deltaHint}>{targetHint}</div>
                  {completionOffer.baseline_range_hint ? <div style={styles.deltaBaseline}>{completionOffer.baseline_range_hint}</div> : null}
                  {completionOffer.beta_percentile != null && completionOffer.beta_cohort_size ? (
                    <div style={styles.deltaPercentile}>Beta context: top {Math.max(1, Math.round(100 - Number(completionOffer.beta_percentile || 0)))}% (n={completionOffer.beta_cohort_size})</div>
                  ) : null}
                  {(completionOffer.target_ladder || []).length > 0 ? (
                    <div style={styles.deltaLadderRow}>
                      {(completionOffer.target_ladder || []).slice(0, 3).map((item) => (
                        <span key={item} style={styles.deltaLadderChip}>{item}</span>
                      ))}
                    </div>
                  ) : null}
                  {completionOffer.plateau_note ? <div style={styles.deltaPlateau}>{completionOffer.plateau_note}</div> : null}
                </>
              );
            })()}
            <div style={styles.deltaListTitle}>What changed</div>
            {(completionOffer.drivers_positive || []).slice(0, 2).map((item) => (
              <div key={item} style={styles.deltaListItem}>• {item}</div>
            ))}
            <div style={styles.deltaListTitle}>What to fix next</div>
            {(completionOffer.what_to_fix_next || []).slice(0, 2).map((item) => (
              <div key={item} style={styles.deltaListItem}>• {item}</div>
            ))}
            <div style={styles.feedbackRow}>
              <div style={styles.feedbackLabel}>Did this score feel accurate?</div>
              <div style={styles.feedbackActions}>
                <button
                  style={accuracyFeedback === "accurate" ? styles.feedbackButtonActive : styles.feedbackButton}
                  onClick={() => submitAccuracyFeedback(true)}
                  disabled={accuracyFeedback !== null}
                >
                  Yes
                </button>
                <button
                  style={accuracyFeedback === "inaccurate" ? styles.feedbackButtonActive : styles.feedbackButton}
                  onClick={() => submitAccuracyFeedback(false)}
                  disabled={accuracyFeedback !== null}
                >
                  No
                </button>
              </div>
              {accuracyFeedbackState ? <div style={styles.feedbackState}>{accuracyFeedbackState}</div> : null}
            </div>
            {completionOffer.how_it_works ? <div style={styles.deltaHowText}>How this works: {completionOffer.how_it_works}</div> : null}
            <button onClick={start} style={styles.deltaButton} disabled={loading}>Run next pressure round now</button>
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
        style={{
          ...styles.intelligencePanel,
          ...(pressureTintActive ? styles.intelligencePanelPressure : {}),
          ...(riskPulseActive ? styles.intelligencePanelRisk : {}),
          ...(credibilityPulseActive ? styles.intelligencePanelCredibility : {}),
        }}
      >
        <div style={styles.panelTitle}>Interviewer Perception Console</div>
        <div style={styles.panelSub}>Engine-calibrated signals. Expand for advanced diagnostics.</div>

        <div
          style={{
            ...styles.signalLine,
            borderColor:
              pressureState === "high"
                ? "rgba(248, 113, 113, 0.45)"
                : pressureState === "medium"
                ? "rgba(251, 191, 36, 0.45)"
                : "rgba(45, 212, 191, 0.45)",
            color:
              pressureState === "high"
                ? "#fecaca"
                : pressureState === "medium"
                ? "#fde68a"
                : "#99f6e4",
            animation: pressureState === "high" ? "aiAlertPulse 1.3s ease-out infinite" : undefined,
          }}
        >
          {pressureState === "high"
            ? "Pressure Spike detected — slow pace, anchor objective, then respond."
            : pressureState === "medium"
            ? "Pressure elevated — keep concise structure and one measurable impact."
            : "Pressure stable — maintain signal quality and pacing."}
        </div>

        <MetricRow label="Credibility" value={liveMetrics.credibility} tone="good" emphasis={credibilityPulseActive ? "pulse" : "none"} />
        <MetricRow label="STAR Structure" value={liveMetrics.structure} tone="good" />
        <MetricRow label="Confidence Stability" value={liveMetrics.confidenceStability} tone="good" />
        <MetricRow label="Impact Strength" value={liveMetrics.impactStrength} tone="good" />
        <MetricRow label="Risk Drift" value={liveMetrics.drift} tone="warn" emphasis={liveMetrics.drift > 30 || riskPulseActive ? "alert" : "none"} />

        {metricCommentary.length > 0 && (
          <div style={styles.metricCommentaryBlock}>
            {metricCommentary.map((line) => (
              <div key={line} style={styles.metricCommentaryLine}>{line}</div>
            ))}
            {queuedMetricCommentaryCount > 0 ? (
              <div style={styles.metricCommentaryLine}>
                +{queuedMetricCommentaryCount} more signal{queuedMetricCommentaryCount === 1 ? "" : "s"} queued
              </div>
            ) : null}
          </div>
        )}

        {!isStealth && (
          <button style={styles.advancedToggle} onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? "Hide Advanced" : "Show Advanced"}
          </button>
        )}

        {showAdvanced && !isStealth && (
          <div style={styles.advancedCard}>
            <div style={styles.advancedLine}>Signal Notes</div>
            <div style={styles.advancedItem}>- Keep answers under 140 words unless question demands depth.</div>
            <div style={styles.advancedItem}>- Use one measurable impact statement in each answer.</div>
            <div style={styles.advancedItem}>- If drift rises, restate objective and role context in one line.</div>
          </div>
        )}

        {isEnterprise && (
          <div style={styles.enterpriseCard}>
            <div style={styles.advancedLine}>Governance Layer</div>
            <div style={styles.advancedItem}>- Session is tagged for audit-ready reporting and reviewer handoff.</div>
            <div style={styles.advancedItem}>- Keep one evidence statement per answer for downstream calibration.</div>
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
      style={{
        ...styles.metricWrap,
        ...(emphasis === "pulse" ? styles.metricWrapPulse : {}),
        ...(emphasis === "alert" ? styles.metricWrapAlert : {}),
        ...(emphasis === "tint" ? styles.metricWrapTint : {}),
      }}
    >
      <div style={styles.metricHeader}>
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div style={styles.metricTrack}>
        <div
          style={{
            ...styles.metricFill,
            width: `${value}%`,
            background: tone === "good" ? "linear-gradient(90deg, #22d3ee 0%, #3b82f6 100%)" : "linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)",
            animation: isCritical ? "aiAlertPulse 1.45s ease-out infinite" : flashState ? "aiPulse 0.7s ease-out" : undefined,
            boxShadow:
              flashState === "up"
                ? "0 0 14px rgba(34, 197, 94, 0.45)"
                : flashState === "down"
                ? "0 0 14px rgba(239, 68, 68, 0.45)"
                : isCritical
                ? "0 0 14px rgba(239, 68, 68, 0.35)"
                : "none",
          }}
        />
      </div>
    </div>
  );
}

const styles: any = {
  shell: {
    width: "100%",
    maxWidth: 1060,
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: 14,
  },
  stage: {
    padding: 20,
    background: "rgba(2, 6, 23, 0.94)",
    borderRadius: 12,
    border: "1px solid rgba(51, 65, 85, 0.92)",
    boxShadow: "0 10px 28px rgba(2, 6, 23, 0.52)",
  },
  intelligencePanel: {
    padding: 16,
    background: "rgba(2, 6, 23, 0.96)",
    borderRadius: 12,
    border: "1px solid rgba(51, 65, 85, 0.92)",
    boxShadow: "0 10px 28px rgba(2, 6, 23, 0.52)",
    height: "fit-content",
  },
  intelligencePanelPressure: {
    background: "rgba(120, 53, 15, 0.26)",
    transition: "background 300ms ease-in-out",
  },
  intelligencePanelRisk: {
    boxShadow: "0 0 0 1px rgba(248, 113, 113, 0.3), 0 0 14px rgba(248, 113, 113, 0.25)",
    transition: "box-shadow 300ms ease-in-out",
  },
  intelligencePanelCredibility: {
    boxShadow: "0 0 0 1px rgba(56, 189, 248, 0.28), 0 0 14px rgba(56, 189, 248, 0.24)",
    transition: "box-shadow 200ms ease-in-out",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  title: {
    margin: 0,
    fontSize: 24,
    color: "#f8fafc",
    fontWeight: 900,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 12,
    color: "#94a3b8",
    fontSize: 14,
  },
  trackBadge: {
    display: "inline-flex",
    borderRadius: 999,
    border: "1px solid rgba(125, 211, 252, 0.35)",
    background: "rgba(2, 132, 199, 0.14)",
    color: "#bae6fd",
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
  },
  questionCard: {
    marginTop: 4,
    marginBottom: 10,
    padding: "14px 14px",
    borderRadius: 10,
    background: "rgba(2, 132, 199, 0.14)",
    border: "1px solid rgba(125, 211, 252, 0.3)",
  },
  questionLabel: {
    fontSize: 12,
    color: "#93c5fd",
    fontWeight: 700,
    marginBottom: 4,
  },
  questionText: {
    fontWeight: 700,
    color: "#f8fafc",
    lineHeight: 1.45,
  },
  text: {
    width: "100%",
    minHeight: 132,
    padding: 12,
    borderRadius: 10,
    border: "1px solid rgba(125, 211, 252, 0.35)",
    color: "#e2e8f0",
    background: "rgba(15, 23, 42, 0.72)",
    marginBottom: 10,
    resize: "vertical",
    lineHeight: 1.45,
    outline: "none",
  },
  actionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  wordCount: {
    fontSize: 12,
    color: "#93c5fd",
    fontWeight: 700,
  },
  evalCard: {
    marginTop: 10,
    borderRadius: 10,
    border: "1px solid rgba(125, 211, 252, 0.32)",
    background: "rgba(2, 132, 199, 0.12)",
    padding: "10px 12px",
  },
  eval: {
    margin: 0,
    whiteSpace: "pre-wrap",
    color: "#e2e8f0",
    fontSize: 13,
  },
  evalTitle: {
    fontSize: 12,
    color: "#bae6fd",
    fontWeight: 800,
    marginBottom: 6,
  },
  transcriptCard: {
    marginTop: 10,
    borderRadius: 10,
    border: "1px solid rgba(125, 211, 252, 0.28)",
    background: "rgba(15, 23, 42, 0.72)",
    padding: "10px 12px",
  },
  tagCard: {
    marginTop: 10,
    borderRadius: 10,
    border: "1px solid rgba(125, 211, 252, 0.28)",
    background: "rgba(15, 23, 42, 0.72)",
    padding: "10px 12px",
  },
  tagRow: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    gap: 8,
    alignItems: "center",
    borderTop: "1px solid rgba(125, 211, 252, 0.18)",
    paddingTop: 7,
    marginTop: 7,
  },
  tagRowWeak: {
    borderTop: "1px solid rgba(248, 113, 113, 0.3)",
  },
  tagPill: {
    borderRadius: 999,
    border: "1px solid rgba(125, 211, 252, 0.35)",
    color: "#bae6fd",
    background: "rgba(2, 132, 199, 0.16)",
    fontSize: 10,
    fontWeight: 800,
    padding: "3px 8px",
  },
  tagText: {
    color: "#dbeafe",
    fontSize: 12,
    lineHeight: 1.4,
  },
  weakPill: {
    borderRadius: 999,
    border: "1px solid rgba(248, 113, 113, 0.38)",
    color: "#fecaca",
    background: "rgba(127, 29, 29, 0.34)",
    fontSize: 10,
    fontWeight: 800,
    padding: "3px 8px",
    textTransform: "uppercase",
  },
  tagHint: {
    marginTop: 8,
    borderRadius: 8,
    border: "1px solid rgba(250, 204, 21, 0.45)",
    background: "rgba(113, 63, 18, 0.38)",
    color: "#fde68a",
    fontSize: 12,
    fontWeight: 600,
    padding: "7px 9px",
  },
  deltaCard: {
    marginTop: 12,
    borderRadius: 10,
    border: "1px solid rgba(45, 212, 191, 0.48)",
    background: "linear-gradient(180deg, rgba(20, 184, 166, 0.18) 0%, rgba(2, 6, 23, 0.82) 100%)",
    padding: "12px 12px",
  },
  deltaKicker: {
    fontSize: 11,
    fontWeight: 800,
    color: "#99f6e4",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  deltaHeadline: {
    marginTop: 3,
    color: "#f0fdfa",
    fontSize: 22,
    fontWeight: 900,
  },
  deltaSub: {
    marginTop: 4,
    color: "#ccfbf1",
    fontSize: 12,
  },
  deltaMeaning: {
    marginTop: 5,
    color: "#ccfbf1",
    fontSize: 12,
    fontWeight: 700,
  },
  deltaVelocity: {
    marginTop: 4,
    color: "#99f6e4",
    fontSize: 12,
    fontWeight: 700,
  },
  deltaHint: {
    marginTop: 4,
    color: "#99f6e4",
    fontSize: 12,
    fontWeight: 600,
  },
  deltaBaseline: {
    marginTop: 4,
    color: "#bae6fd",
    fontSize: 12,
    fontWeight: 600,
  },
  deltaPercentile: {
    marginTop: 4,
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: 600,
  },
  deltaLadderRow: {
    marginTop: 6,
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  deltaLadderChip: {
    border: "1px solid rgba(125, 211, 252, 0.35)",
    background: "rgba(2, 132, 199, 0.15)",
    color: "#bae6fd",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 700,
  },
  deltaPlateau: {
    marginTop: 6,
    borderRadius: 8,
    border: "1px solid rgba(250, 204, 21, 0.38)",
    background: "rgba(113, 63, 18, 0.32)",
    color: "#fde68a",
    padding: "6px 8px",
    fontSize: 12,
    fontWeight: 600,
  },
  deltaListTitle: {
    marginTop: 8,
    color: "#bae6fd",
    fontSize: 12,
    fontWeight: 800,
  },
  deltaListItem: {
    color: "#dbeafe",
    fontSize: 12,
    lineHeight: 1.4,
    marginTop: 3,
  },
  feedbackRow: {
    marginTop: 10,
    borderRadius: 8,
    border: "1px solid rgba(125, 211, 252, 0.28)",
    background: "rgba(15, 23, 42, 0.64)",
    padding: "8px 9px",
  },
  feedbackLabel: {
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: 700,
  },
  feedbackActions: {
    marginTop: 6,
    display: "flex",
    gap: 8,
  },
  feedbackButton: {
    border: "1px solid rgba(125, 211, 252, 0.35)",
    background: "rgba(15, 23, 42, 0.74)",
    color: "#dbeafe",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },
  feedbackButtonActive: {
    border: "1px solid rgba(45, 212, 191, 0.55)",
    background: "rgba(13, 148, 136, 0.3)",
    color: "#ccfbf1",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "default",
    fontSize: 12,
    fontWeight: 800,
  },
  feedbackState: {
    marginTop: 6,
    color: "#99f6e4",
    fontSize: 11,
    fontWeight: 600,
  },
  deltaHowText: {
    marginTop: 8,
    color: "#cbd5e1",
    fontSize: 11,
    lineHeight: 1.4,
  },
  deltaButton: {
    marginTop: 10,
    background: "linear-gradient(180deg, #14b8a6 0%, #0ea5e9 100%)",
    color: "#ecfeff",
    border: "1px solid rgba(94, 234, 212, 0.55)",
    padding: "9px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 800,
  },
  transcriptItem: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px solid rgba(125, 211, 252, 0.2)",
  },
  transcriptQ: {
    fontSize: 12,
    color: "#e2e8f0",
    fontWeight: 700,
  },
  transcriptA: {
    marginTop: 4,
    fontSize: 12,
    color: "#cbd5e1",
    lineHeight: 1.45,
  },
  stealthNote: {
    marginTop: 10,
    borderRadius: 10,
    border: "1px solid rgba(125, 211, 252, 0.28)",
    background: "rgba(15, 23, 42, 0.72)",
    padding: "10px 12px",
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.4,
  },
  liveButton: {
    marginBottom: 12,
    background: "rgba(15, 23, 42, 0.72)",
    color: "#bae6fd",
    border: "1px solid rgba(125, 211, 252, 0.35)",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
  primaryButton: {
    background: "linear-gradient(180deg, #0ea5e9 0%, #2563eb 100%)",
    color: "#f8fafc",
    border: "1px solid rgba(125, 211, 252, 0.62)",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 800,
    boxShadow: "0 8px 20px rgba(14, 165, 233, 0.25)",
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: "#f8fafc",
  },
  panelSub: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 1.4,
  },
  signalLine: {
    marginBottom: 10,
    borderRadius: 10,
    border: "1px solid rgba(45, 212, 191, 0.45)",
    background: "rgba(15, 23, 42, 0.75)",
    padding: "8px 9px",
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.4,
  },
  metricWrap: {
    marginBottom: 10,
    borderRadius: 12,
    border: "1px solid rgba(51, 65, 85, 0.7)",
    background: "rgba(2, 6, 23, 0.86)",
    padding: "9px 10px",
    transition: "all 300ms ease-in-out",
  },
  metricWrapPulse: {
    border: "1px solid rgba(56, 189, 248, 0.62)",
    boxShadow: "0 0 0 1px rgba(56, 189, 248, 0.22), 0 0 12px rgba(56, 189, 248, 0.24)",
  },
  metricWrapAlert: {
    border: "1px solid rgba(248, 113, 113, 0.65)",
    boxShadow: "0 0 0 1px rgba(248, 113, 113, 0.24), 0 0 12px rgba(248, 113, 113, 0.24)",
  },
  metricWrapTint: {
    background: "rgba(120, 53, 15, 0.26)",
  },
  metricHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 13,
    fontWeight: 800,
    color: "#dbeafe",
    marginBottom: 6,
  },
  metricTrack: {
    height: 8,
    borderRadius: 999,
    background: "rgba(51, 65, 85, 0.8)",
    overflow: "hidden",
    border: "1px solid rgba(148, 163, 184, 0.2)",
  },
  metricFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 300ms ease-in-out",
  },
  metricCommentaryBlock: {
    borderRadius: 10,
    border: "1px solid rgba(51, 65, 85, 0.72)",
    background: "rgba(2, 6, 23, 0.88)",
    padding: "8px 9px",
    marginBottom: 10,
  },
  metricCommentaryLine: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.4,
  },
  advancedToggle: {
    width: "100%",
    marginTop: 4,
    borderRadius: 10,
    border: "1px solid rgba(125, 211, 252, 0.35)",
    background: "rgba(15, 23, 42, 0.74)",
    color: "#bae6fd",
    padding: "9px 10px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  advancedCard: {
    marginTop: 8,
    borderRadius: 10,
    border: "1px solid rgba(125, 211, 252, 0.25)",
    background: "rgba(2, 132, 199, 0.08)",
    padding: "10px 10px",
  },
  enterpriseCard: {
    marginTop: 8,
    borderRadius: 10,
    border: "1px solid rgba(16, 185, 129, 0.35)",
    background: "rgba(16, 185, 129, 0.08)",
    padding: "10px 10px",
  },
  advancedLine: {
    fontSize: 12,
    color: "#dbeafe",
    fontWeight: 800,
    marginBottom: 6,
  },
  advancedItem: {
    fontSize: 12,
    color: "#bfdbfe",
    lineHeight: 1.45,
    marginBottom: 5,
  },
};
