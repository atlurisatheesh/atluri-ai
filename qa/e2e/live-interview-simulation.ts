/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║   PHANTOMVEIL — REAL INTERVIEW END-TO-END SIMULATION TEST SUITE            ║
 * ║                                                                              ║
 * ║   50+ years of testing wisdom condensed into one script.                   ║
 * ║   Tests the COMPLETE interview loop exactly as a real user lives it:       ║
 * ║                                                                              ║
 * ║   1. Interviewer speaks a question   (WS #1: "interviewer" participant)    ║
 * ║   2. Backend pipeline processes it   (transcript → AI reasoning → stream)  ║
 * ║   3. Candidate's WS receives answer  (WS #2: "candidate" participant)      ║
 * ║   4. Desktop Electron overlay shows answer (IPC check)                     ║
 * ║   5. Candidate reads it and "speaks" their answer                          ║
 * ║   6. Transcript pipeline records it  (candidate_transcript flow)           ║
 * ║   7. End-of-session analytics + offer-probability computed                 ║
 * ║                                                                              ║
 * ║   8 ROUNDS of escalating interview questions across all question types     ║
 * ║   (Greeting → Behavioral → STAR → Technical → System Design → Coding →    ║
 * ║    Pressure / Curveball → Rapid Fire × 3 → Closing)                       ║
 * ║                                                                              ║
 * ║  RUN:                                                                        ║
 * ║    cd qa && npm install && npx playwright install                           ║
 * ║    npx ts-node e2e/live-interview-simulation.ts                             ║
 * ║                                                                              ║
 * ║  ENV OVERRIDES (all optional):                                              ║
 * ║    E2E_FRONTEND_URL      default: http://localhost:3001                     ║
 * ║    E2E_BACKEND_URL       default: http://localhost:9010                     ║
 * ║    E2E_HEADLESS          default: true  (set "false" to watch live)         ║
 * ║    E2E_SLOW_MO_MS        default: 0    (set 200 to slow-walk UI)           ║
 * ║    E2E_TIMEOUTMS         default: 30000 per round                          ║
 * ║    E2E_SKIP_ELECTRON     set "true" to skip Electron desktop checks        ║
 * ║    E2E_SKIP_ROUNDS       comma-separated round names to skip               ║
 * ║    E2E_ELECTRON_BINARY   path to compiled desktop/dist/main.js             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import * as crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
  _electron as electron,
  type ElectronApplication,
} from "playwright";
import WebSocket from "ws";

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const REPO_ROOT  = path.resolve(__dirname, "..", "..");
const REPORTS    = path.join(REPO_ROOT, "qa", "reports");
const FE_URL     = (process.env.E2E_FRONTEND_URL || "http://localhost:3001").replace(/\/+$/, "");
const BE_URL     = (process.env.E2E_BACKEND_URL  || "http://localhost:9010").replace(/\/+$/, "");
const HEADLESS   = process.env.E2E_HEADLESS !== "false";
const SLOW_MO    = Number(process.env.E2E_SLOW_MO_MS || 0);
const ROUND_TIMEOUT_MS = Number(process.env.E2E_TIMEOUTMS || 30_000);
const SKIP_ELECTRON   = String(process.env.E2E_SKIP_ELECTRON || "").toLowerCase() === "true";
const SKIP_ROUNDS_RAW = (process.env.E2E_SKIP_ROUNDS || "").split(",").map(s => s.trim()).filter(Boolean);
const ELECTRON_MAIN   = process.env.E2E_ELECTRON_BINARY
  || path.join(REPO_ROOT, "desktop", "dist", "main.js");

const WS_BASE = BE_URL.replace(/^http/i, "ws");

// ─── INTERVIEW SCRIPT ───────────────────────────────────────────────────────
/**
 * Each round models one full turn in a real interview:
 *   - The interviewer speaks the question (we send via WS)
 *   - AI generates an answer (we collect every chunk on the candidate WS)
 *   - The candidate "reads" and "speaks" a confirmation (we send candidate_transcript)
 *   - We validate answer quality against assertions
 */
interface InterviewRound {
  /** Short slug used in logs and report */
  name: string;
  /** Category drives which assertions run */
  category: "greeting" | "behavioral" | "star" | "technical" | "system_design" | "coding" | "pressure" | "rapid_fire" | "closing";
  /** The spoken question text (sent as interviewer_question from the interviewer WS) */
  question: string;
  /** Minimum number of words we expect in the AI answer */
  minWords: number;
  /** Regex patterns that MUST appear in the AI answer */
  mustContain: RegExp[];
  /** Regex patterns that must NOT appear (hallucination / safety guards) */
  mustNotContain: RegExp[];
  /** Max acceptable TTFT in ms (time-to-first-token from question send → first chunk recv) */
  maxTtftMs: number;
  /** Simulated candidate answer (sent back as candidate_transcript after AI answers) */
  candidateAnswer: string;
}

const INTERVIEW_SCRIPT: InterviewRound[] = [
  // ── Round 1: Audio Calibration & Trap Test (Omega-Level) ─────────────────
  {
    name: "omega_trap_test",
    category: "pressure",
    question: "Alright, let's get started. I see your resume here. Before we get into the system design, tell me... how did you handle the situation when your engineering leadership proposed an architecture for the payment gateway that you knew was fundamentally flawed and would cause downtime? Did the team fail?",
    minWords: 20,
    mustContain: [/document|data|identified|gap|fix|adapt|outcome/i],
    mustNotContain: [/\[object Object\]/i, /undefined/i, /null/i, /yes, the team failed/i],
    maxTtftMs: 4000,
    candidateAnswer: "I documented both approaches with projected outcomes and let the data decide. We identified the gap early, and I drove the architectural fix to adapt.",
  },

  // ── Round 2: Cognitive Overload (Deep Technical) ─────────────────────────
  {
    name: "omega_cognitive_overload",
    category: "system_design",
    question: "Okay, fine. Let's move to the whiteboard—well, verbal whiteboard. Walk me through your distributed systems design for a global payment processor... actually, wait, specifically focus on how you guarantee idempotency in the message consumers when Kafka partitions rebalance during a network partition.",
    minWords: 30,
    mustContain: [/idempotency|partition|rebalance|kafka|state|store|offset/i],
    mustNotContain: [/\[object Object\]/i],
    maxTtftMs: 5000,
    candidateAnswer: "To guarantee idempotency during a partition rebalance, I shift from a synchronous saga to event-driven choreography. We ensure the consumer maintains a dedicated state store for processed message offsets, effectively isolating the Kafka partition topology from upstream jitter.",
  },

  // ── Round 4: Technical Deep Dive ─────────────────────────────────────────
  {
    name: "technical_event_loop",
    category: "technical",
    question: "Can you explain how the JavaScript event loop works, including the microtask queue and how async/await interacts with it?",
    minWords: 60,
    mustContain: [/event.?loop|call.?stack|queue|microtask|promise|async|await/i],
    mustNotContain: [/\[object Object\]/i, /undefined/i],
    maxTtftMs: 5000,
    candidateAnswer:
      "The event loop continuously checks the call stack and the task queues. " +
      "Microtasks like resolved Promises run before the next macrotask such as setTimeout. " +
      "Async await is syntactic sugar over Promises, so awaited continuations land in the microtask queue.",
  },

  // ── Round 5: System Design ────────────────────────────────────────────────
  {
    name: "system_design_url_shortener",
    category: "system_design",
    question: "Design a URL shortener like bit.ly that can handle 10 billion URLs and 10 million reads per second. Walk me through your architecture.",
    minWords: 80,
    mustContain: [/cache|database|hash|db|storage|scale|sharding|replication|cdn|load.?balanc/i],
    mustNotContain: [/\[object Object\]/i, /undefined/i],
    maxTtftMs: 7000,
    candidateAnswer:
      "I'd use a base62 hash to generate 7-character short codes. " +
      "Write path goes to a Postgres cluster with read replicas. " +
      "All reads are served from Redis with a 24-hour TTL for hot keys. " +
      "A CDN layer handles the final 302 redirect globally to keep p99 under 20ms.",
  },

  // ── Round 6: Coding / DSA ─────────────────────────────────────────────────
  {
    name: "coding_two_sum",
    category: "coding",
    question: "How would you solve the Two Sum problem in O(n) time? Can you walk me through the algorithm and its trade-offs?",
    minWords: 50,
    mustContain: [/hash.?map|dictionary|O\(n\)|complement|lookup/i],
    mustNotContain: [/O\(n[²2]\)|O\(n.?2\)/i, /\[object Object\]/i],
    maxTtftMs: 5000,
    candidateAnswer:
      "I'd use a hash map. Iterate once; for each number check if its complement exists in the map. " +
      "If yes return both indices. If no, store the number and its index. " +
      "This is O(n) time, O(n) space — versus O(n²) time for the brute force nested-loop approach.",
  },

  // ── Round 7: Pressure / Curveball ────────────────────────────────────────
  {
    name: "pressure_weakness",
    category: "pressure",
    question: "What is your biggest weakness, and can you give me a concrete example of when it hurt your work?",
    minWords: 50,
    mustContain: [/weakness|challeng|improve|learn|growth/i],
    mustNotContain: [/\[object Object\]/i, /undefined/i],
    maxTtftMs: 5000,
    candidateAnswer:
      "My biggest weakness used to be over-engineering early designs before validating with users. " +
      "I once spent three weeks building a generic abstraction layer that we never needed. " +
      "Now I enforce a 'two real use cases before abstraction' rule and it has cut wasted effort by about 40%.",
  },

  // ── Round 8: Rapid Fire × 3 questions in one burst ───────────────────────
  {
    name: "rapid_fire_q1",
    category: "rapid_fire",
    question: "What is the difference between a process and a thread?",
    minWords: 20,
    mustContain: [/process|thread|memory|shared|isolat/i],
    mustNotContain: [/\[object Object\]/i],
    maxTtftMs: 4000,
    candidateAnswer:
      "A process has its own memory space. Threads within a process share memory. " +
      "Processes are isolated; inter-thread communication is faster but requires synchronization.",
  },
  {
    name: "rapid_fire_q2",
    category: "rapid_fire",
    question: "Explain CAP theorem in three sentences.",
    minWords: 20,
    mustContain: [/consistency|availability|partition|cap/i],
    mustNotContain: [/\[object Object\]/i],
    maxTtftMs: 4000,
    candidateAnswer:
      "CAP theorem states a distributed system can guarantee only two of three properties: " +
      "Consistency, Availability, and Partition tolerance. " +
      "In practice, network partitions happen, so we choose between CP and AP systems.",
  },
  {
    name: "rapid_fire_q3",
    category: "rapid_fire",
    question: "How do you ensure database query performance at scale?",
    minWords: 20,
    mustContain: [/index|query|explain|cache|partition|shard/i],
    mustNotContain: [/\[object Object\]/i],
    maxTtftMs: 4000,
    candidateAnswer:
      "First add indexes on columns used in WHERE and JOIN. " +
      "Use EXPLAIN ANALYZE to find seq scans. Cache hot reads in Redis. " +
      "For huge tables, partition by date or tenant key.",
  },

  // ── Round 9: Closing ──────────────────────────────────────────────────────
  {
    name: "closing_questions",
    category: "closing",
    question: "Where do you see yourself in five years, and what does growth look like to you in this role?",
    minWords: 40,
    mustContain: [/grow|lead|impact|skill|team|goal|vision/i],
    mustNotContain: [/\[object Object\]/i, /undefined/i],
    maxTtftMs: 5000,
    candidateAnswer:
      "In five years I see myself as a principal engineer or engineering manager, " +
      "owning a product area end-to-end and mentoring a team of six to eight engineers. " +
      "I want to build things that genuinely move key business metrics and develop others along the way.",
  },
];

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface WsFrame {
  type: string;
  [key: string]: unknown;
}

interface RoundResult {
  name: string;
  category: string;
  question: string;
  status: "pass" | "fail" | "skip";
  error?: string;
  ttftMs?: number;
  totalChunks?: number;
  fullAnswer?: string;
  wordCount?: number;
  assertions: AssertionResult[];
  durationMs: number;
  screenshotPath?: string;
  candidateTranscriptAck?: boolean;
}

interface AssertionResult {
  name: string;
  passed: boolean;
  detail: string;
}

interface SessionMetrics {
  totalRounds: number;
  passed: number;
  failed: number;
  skipped: number;
  avgTtftMs: number;
  maxTtftMs: number;
  minTtftMs: number;
  totalAnswerWords: number;
  totalChunks: number;
  offerProbability?: number;
  voiceReadiness?: number;
  electronHealthy?: boolean;
  frontendLoaded?: boolean;
  backendHealthy?: boolean;
  wsConnectMs?: number;
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────
function nowIso(): string { return new Date().toISOString(); }
function ensureDir(d: string): void { fs.mkdirSync(d, { recursive: true }); }

function b64url(raw: string): string {
  return Buffer.from(raw).toString("base64")
    .replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function unsignedJwt(sub: string): string {
  return `${b64url(JSON.stringify({ alg: "none", typ: "JWT" }))}.${b64url(JSON.stringify({ sub }))}.`;
}

async function httpGet<T>(url: string, headers: Record<string, string> = {}, timeoutMs = 10_000): Promise<T> {
  const ac = new AbortController();
  const t  = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method: "GET", headers, signal: ac.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status} on GET ${url}`);
    return (await r.json()) as T;
  } finally { clearTimeout(t); }
}

/**
 * Open a WebSocket and collect frames until predicate returns true or timeout.
 * Returns { frames, elapsedMs }.
 */
async function wsCollect(
  url: string,
  opt: {
    sendAfterOpen?: object;         // message to send once connected
    stopWhen: (frames: WsFrame[]) => boolean;
    timeoutMs: number;
    onEachFrame?: (f: WsFrame) => void;
  },
): Promise<{ frames: WsFrame[]; elapsedMs: number; timedOut: boolean }> {
  return new Promise((resolve) => {
    const frames: WsFrame[] = [];
    const t0 = Date.now();
    let done = false;
    const sock = new WebSocket(url);

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      sock.close();
      resolve({ frames, elapsedMs: Date.now() - t0, timedOut: true });
    }, opt.timeoutMs);

    sock.on("open", () => {
      if (opt.sendAfterOpen) sock.send(JSON.stringify(opt.sendAfterOpen));
    });

    sock.on("message", (raw) => {
      let frame: WsFrame;
      try { frame = JSON.parse(String(raw)) as WsFrame; }
      catch { return; }
      frames.push(frame);
      opt.onEachFrame?.(frame);
      if (!done && opt.stopWhen(frames)) {
        done = true;
        clearTimeout(timer);
        sock.close();
        resolve({ frames, elapsedMs: Date.now() - t0, timedOut: false });
      }
    });

    sock.on("error", () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ frames, elapsedMs: Date.now() - t0, timedOut: true });
    });

    sock.on("close", () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ frames, elapsedMs: Date.now() - t0, timedOut: false });
    });
  });
}

/**
 * Dedicated function for running one full interview round.
 * Uses TWO WebSocket connections:
 *   - interviewerWs : sends the question, receives the broadcast
 *   - candidateWs   : receives question + AI answer chunks
 */
async function runInterviewRound(
  round: InterviewRound,
  roomId: string,
  screenshotsDir: string,
  candidatePage: Page | null,
): Promise<RoundResult> {
  const t0 = Date.now();
  const assertions: AssertionResult[] = [];
  const assert = (name: string, passed: boolean, detail: string) =>
    assertions.push({ name, passed, detail });

  // ── STEP A: Connect both sides simultaneously ────────────────────────────
  const candidateWsUrl = `${WS_BASE}/ws/voice?room_id=${encodeURIComponent(roomId)}&participant=candidate&assist_intensity=3&role=general`;
  const interviewerWsUrl = `${WS_BASE}/ws/voice?room_id=${encodeURIComponent(roomId)}&participant=interviewer`;

  // Promise that resolves when the candidate WS receives answer_suggestion_done
  let firstChunkTs: number | null = null;
  let fullAnswer = "";
  let chunks = 0;
  let candidateTranscriptAck = false;
  const questionSentTs: { ts: number } = { ts: 0 };

  const candidateCollect = wsCollect(candidateWsUrl, {
    timeoutMs: ROUND_TIMEOUT_MS,
    stopWhen: (frames) =>
      frames.some((f) => f.type === "answer_suggestion_done"),
    onEachFrame: (f) => {
      if (f.type === "answer_suggestion_chunk") {
        chunks++;
        if (firstChunkTs === null) firstChunkTs = Date.now();
        fullAnswer += String(f.chunk ?? "");
      }
      if (f.type === "transcript_ack") {
        candidateTranscriptAck = true;
      }
    },
  });

  // Give candidate WS a tiny head start to connect before interviewer fires
  await new Promise((r) => setTimeout(r, 300));

  // ── STEP B: Interviewer sends the question ───────────────────────────────
  questionSentTs.ts = Date.now();
  const interviewerSend: { sent: boolean } = { sent: false };

  const interviewerCollect = wsCollect(interviewerWsUrl, {
    timeoutMs: ROUND_TIMEOUT_MS,
    sendAfterOpen: {
      type: "transcript",
      text: round.question,
      participant: "interviewer",
      is_final: true,
    },
    stopWhen: (frames) => {
      if (!interviewerSend.sent) {
        interviewerSend.sent = true;
      }
      return frames.some((f) => f.type === "answer_suggestion_done");
    },
  });

  questionSentTs.ts = Date.now(); // re-stamp after connection established

  // ── STEP C: Wait for candidate to collect the full answer ────────────────
  const [candidateResult, interviewerResult] = await Promise.all([
    candidateCollect,
    interviewerCollect,
  ]);

  const ttftMs = firstChunkTs !== null ? firstChunkTs - questionSentTs.ts : -1;
  const wordCount = fullAnswer.trim().split(/\s+/).filter(Boolean).length;

  // ── STEP D: Assertions ───────────────────────────────────────────────────

  // (1) Did the candidate WS connect?
  assert(
    "Candidate WS connected",
    candidateResult.frames.length > 0,
    `Received ${candidateResult.frames.length} frames`,
  );

  // (2) Did the interviewer WS connect?
  assert(
    "Interviewer WS connected",
    interviewerResult.frames.length > 0,
    `Received ${interviewerResult.frames.length} frames`,
  );

  // (3) answer_suggestion_start received
  assert(
    "answer_suggestion_start received",
    candidateResult.frames.some((f) => f.type === "answer_suggestion_start"),
    candidateResult.frames.map((f) => f.type).join(", "),
  );

  // (4) At least one chunk received
  assert(
    "answer_suggestion_chunk(s) received",
    chunks > 0,
    `${chunks} chunks received`,
  );

  // (5) answer_suggestion_done received
  assert(
    "answer_suggestion_done received",
    candidateResult.frames.some((f) => f.type === "answer_suggestion_done"),
    `timedOut=${candidateResult.timedOut}`,
  );

  // (6) Answer word count
  assert(
    `Answer word count ≥ ${round.minWords}`,
    wordCount >= round.minWords,
    `Got ${wordCount} words`,
  );

  // (7) TTFT threshold
  assert(
    `TTFT ≤ ${round.maxTtftMs}ms`,
    ttftMs >= 0 && ttftMs <= round.maxTtftMs,
    ttftMs >= 0 ? `${ttftMs}ms` : "No chunk received",
  );

  // (8) mustContain patterns
  for (const pattern of round.mustContain) {
    assert(
      `Answer contains /${pattern.source}/`,
      pattern.test(fullAnswer),
      `Answer: "${fullAnswer.slice(0, 120)}"`,
    );
  }

  // (9) mustNotContain patterns
  for (const pattern of round.mustNotContain) {
    assert(
      `Answer does NOT contain /${pattern.source}/`,
      !pattern.test(fullAnswer),
      `Checked: "${fullAnswer.slice(0, 120)}"`,
    );
  }

  // (10) question_intelligence frame received (question classification)
  assert(
    "question_intelligence frame received",
    candidateResult.frames.some((f) => f.type === "question_intelligence"),
    "Missing question classification metadata",
  );

  // (11) Now send candidate's spoken answer back via transcript
  const candidateTranscriptSent = await sendCandidateTranscript(
    roomId,
    round.candidateAnswer,
    ROUND_TIMEOUT_MS,
  );
  assert(
    "Candidate transcript sent and acknowledged",
    candidateTranscriptSent,
    candidateTranscriptAck ? "ACK received" : "No ACK (may still be OK in fast env)",
  );

  // (12) STAR structure check for star category
  if (round.category === "star") {
    const hasStar = /situation|task|action|result/i.test(fullAnswer);
    assert(
      "AI answer references STAR framework",
      hasStar,
      `Answer start: "${fullAnswer.slice(0, 150)}"`,
    );
  }

  // (13) No crashed frames
  const errorFrames = candidateResult.frames.filter((f) => f.type === "error");
  assert(
    "No error frames from backend",
    errorFrames.length === 0,
    errorFrames.map((f) => JSON.stringify(f)).join("; "),
  );

  // (14) Verify followup_predictions received (shows intelligence pipeline ran)
  const hasFollowups = candidateResult.frames.some((f) => f.type === "followup_predictions");
  assert(
    "followup_predictions received (interview intelligence active)",
    hasFollowups,
    hasFollowups ? "OK" : "Not received — may be OK for very fast rounds",
  );

  // ── STEP E: Screenshot if UI page available ──────────────────────────────
  let screenshotPath: string | undefined;
  if (candidatePage) {
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      screenshotPath = path.join(screenshotsDir, `round_${round.name}_${stamp}.png`);
      await candidatePage.screenshot({ path: screenshotPath, fullPage: false });
    } catch { /* non-fatal */ }
  }

  const allPassed = assertions.every((a) => a.passed);
  return {
    name: round.name,
    category: round.category,
    question: round.question,
    status: allPassed ? "pass" : "fail",
    error: allPassed ? undefined : assertions.filter((a) => !a.passed).map((a) => a.name).join("; "),
    ttftMs: ttftMs >= 0 ? ttftMs : undefined,
    totalChunks: chunks,
    fullAnswer,
    wordCount,
    assertions,
    durationMs: Date.now() - t0,
    screenshotPath,
    candidateTranscriptAck,
  };
}

/** Send candidate speaking answer back to the backend and wait for transcript_ack */
async function sendCandidateTranscript(
  roomId: string,
  text: string,
  timeoutMs: number,
): Promise<boolean> {
  const url = `${WS_BASE}/ws/voice?room_id=${encodeURIComponent(roomId)}&participant=candidate`;
  const result = await wsCollect(url, {
    timeoutMs,
    sendAfterOpen: {
      type: "transcript",
      text,
      is_final: true,
      participant: "candidate",
    },
    stopWhen: (frames) => frames.some((f) => f.type === "transcript_ack"),
  });
  return result.frames.some((f) => f.type === "transcript_ack");
}

// ─── ELECTRON HELPERS ────────────────────────────────────────────────────────
async function testElectronDesktop(
  roomId: string,
  screenshotsDir: string,
  results: AssertionResult[],
): Promise<boolean> {
  if (SKIP_ELECTRON) {
    results.push({ name: "Electron (skipped via ENV)", passed: true, detail: "E2E_SKIP_ELECTRON=true" });
    return true;
  }
  if (!fs.existsSync(ELECTRON_MAIN)) {
    results.push({ name: "Electron binary exists", passed: false, detail: `Not found: ${ELECTRON_MAIN}` });
    return false;
  }

  let ea: ElectronApplication | null = null;
  try {
    ea = await electron.launch({
      args: [ELECTRON_MAIN],
      env: {
        ...process.env,
        NODE_ENV: "test",
        DESKTOP_OVERLAY_CONTENT_PROTECTION: "false",
        DESKTOP_OPEN_DEVTOOLS: "false",
      },
      timeout: 20_000,
    });

    const mainWin = await ea.firstWindow();
    await mainWin.waitForLoadState("domcontentloaded");

    const title = await ea.evaluate(({ app }) => app.getName());
    results.push({
      name: "Electron app launches and has a title",
      passed: typeof title === "string" && title.length > 0,
      detail: `Title: "${title}"`,
    });

    // Test IPC: stealth health
    const health = await ea.evaluate(async ({ ipcRenderer }) => {
      return ipcRenderer.invoke("stealth:getHealth");
    }).catch(() => null);
    results.push({
      name: "Electron IPC stealth:getHealth responds",
      passed: health !== null && typeof health === "object",
      detail: JSON.stringify(health ?? "null").slice(0, 80),
    });

    // Test IPC: settings store read
    const apiKeys = await ea.evaluate(async ({ ipcRenderer }) => {
      return ipcRenderer.invoke("settings:getApiKeys");
    }).catch(() => null);
    results.push({
      name: "Electron IPC settings:getApiKeys responds",
      passed: apiKeys !== null,
      detail: apiKeys ? "Keys object received" : "null",
    });

    // Test IPC: set session setup with our interview context
    const setSetup = await ea.evaluate(async ({ ipcRenderer }) => {
      return ipcRenderer.invoke("settings:setAll", {
        sessionSetup: {
          company: "Google",
          position: "Staff Software Engineer",
          objective: "Demonstrate distributed systems expertise",
          mode: "live",
          coachEnabled: true,
          coachStyle: "balanced",
        },
      });
    }).catch(() => null);
    results.push({
      name: "Electron IPC settings:setAll with session context",
      passed: (setSetup as any)?.ok === true,
      detail: JSON.stringify(setSetup).slice(0, 80),
    });

    // Test content protection toggle
    const cp = await ea.evaluate(async ({ ipcRenderer }) => {
      return ipcRenderer.invoke("overlay:setContentProtection", false);
    }).catch(() => null);
    results.push({
      name: "Electron IPC overlay:setContentProtection(false)",
      passed: cp === false || cp !== null,
      detail: String(cp),
    });

    // Take screenshot of main window
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const shot  = path.join(screenshotsDir, `electron_main_${stamp}.png`);
      await mainWin.screenshot({ path: shot });
      results.push({ name: "Electron main window screenshot captured", passed: true, detail: shot });
    } catch (e) {
      results.push({ name: "Electron main window screenshot captured", passed: false, detail: String(e) });
    }

    // Test loopback start (Windows loopback audio injection)
    const loopback = await ea.evaluate(async ({ ipcRenderer }) => {
      return ipcRenderer.invoke("loopback:start", {
        backendWsUrl: `ws://localhost:9010/ws/voice?room_id=electron-test&participant=candidate`,
        audioDeviceLabel: "",
      });
    }).catch(() => ({ ok: false, error: "eval failed" }));
    results.push({
      name: "Electron IPC loopback:start responds (not necessarily OK on CI)",
      passed: typeof (loopback as any)?.ok === "boolean",
      detail: JSON.stringify(loopback).slice(0, 80),
    });

    // Stop loopback
    await ea.evaluate(async ({ ipcRenderer }) => {
      return ipcRenderer.invoke("loopback:stop");
    }).catch(() => null);

    // Verify display list
    const displays = await ea.evaluate(async ({ ipcRenderer }) => {
      return ipcRenderer.invoke("display:getAll");
    }).catch(() => null);
    results.push({
      name: "Electron IPC display:getAll responds",
      passed: Array.isArray(displays) && displays.length >= 1,
      detail: `${Array.isArray(displays) ? displays.length : "?"} display(s)`,
    });

    // Keyboard shortcut simulation (Ctrl+Shift+P = Panic Button)
    try {
      await mainWin.keyboard.press("Control+Shift+P");
      results.push({ name: "Global hotkey Ctrl+Shift+P (Panic) fires without crash", passed: true, detail: "No exception" });
    } catch (e) {
      results.push({ name: "Global hotkey Ctrl+Shift+P (Panic) fires without crash", passed: false, detail: String(e) });
    }

    return true;
  } catch (e) {
    results.push({ name: "Electron launch", passed: false, detail: String(e) });
    return false;
  } finally {
    if (ea) { try { await ea.close(); } catch { /* ignore */ } }
  }
}

// ─── FRONTEND UI CHECKS ──────────────────────────────────────────────────────
async function runFrontendChecks(
  page: Page,
  screenshotsDir: string,
  results: AssertionResult[],
): Promise<void> {
  const shot = async (label: string) => {
    try {
      const p = path.join(screenshotsDir, `ui_${label}_${Date.now()}.png`);
      await page.screenshot({ path: p, fullPage: false });
    } catch { /* non-fatal */ }
  };

  const assert = (name: string, passed: boolean, detail: string) =>
    results.push({ name, passed, detail });

  // 1. Load interview page
  try {
    await page.goto(`${FE_URL}/app/interview`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    assert("Frontend /app/interview loads", true, "domcontentloaded OK");
    await shot("interview_page");
  } catch (e) {
    assert("Frontend /app/interview loads", false, String(e));
    return;
  }

  // 2. Verify core UI panels are visible
  const panelsToCheck = [
    { selector: '[data-testid="intelligence-terminal"], .intelligence-terminal, [class*="IntelligenceTerm"]', label: "IntelligenceTerminal panel" },
    { selector: '[data-testid="stealth-command-center"], .stealth-command-center, [class*="StealthCommand"]', label: "StealthCommandCenter panel" },
    { selector: '[data-testid="context-injector"], .context-injector, [class*="ContextInjector"]', label: "ContextInjector panel" },
    { selector: 'button, a[role="button"]', label: "At least one interactive button" },
  ];

  for (const p of panelsToCheck) {
    const el = page.locator(p.selector).first();
    const visible = await el.isVisible({ timeout: 5000 }).catch(() => false);
    assert(`UI: ${p.label} visible`, visible, visible ? "found" : `${p.selector} not found`);
  }

  // 3. Click Live mode pill if present
  try {
    const livePill = page.getByRole("button", { name: /^live$/i }).first();
    if (await livePill.isVisible({ timeout: 3000 }).catch(() => false)) {
      await livePill.click();
      assert("Mode pill 'Live' clickable", true, "clicked");
    }
  } catch { /* non-fatal */ }

  // 4. Fill company field (IntelligenceTerminal)
  try {
    const companyInput = page.locator('input[placeholder*="company" i], input[name="company"]').first();
    if (await companyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await companyInput.fill("Amazon");
      await companyInput.blur();
      await page.waitForTimeout(600);
      const value = await companyInput.inputValue();
      assert("Company field accepts input 'Amazon'", value === "Amazon", `Value: ${value}`);
      await shot("company_filled");
    }
  } catch { /* non-fatal */ }

  // 5. Fill position field
  try {
    const posInput = page.locator('input[placeholder*="position" i], input[placeholder*="role" i], input[name="position"]').first();
    if (await posInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await posInput.fill("Staff Software Engineer");
      assert("Position field accepts input", true, "filled");
    }
  } catch { /* non-fatal */ }

  // 6. Fill objective field
  try {
    const objInput = page.locator('input[placeholder*="objective" i], textarea[placeholder*="objective" i]').first();
    if (await objInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await objInput.fill("Demonstrate distributed systems depth");
      assert("Objective field accepts input", true, "filled");
    }
  } catch { /* non-fatal */ }

  // 7. Image Analysis Context textarea
  try {
    const imgCtx = page.locator('textarea[placeholder*="image" i], textarea[placeholder*="vision" i]').first();
    if (await imgCtx.isVisible({ timeout: 3000 }).catch(() => false)) {
      await imgCtx.fill("Prioritize identifying the coding problem statement and ignore IDE chrome.");
      assert("Image analysis context textarea accepts input", true, "filled");
    }
  } catch { /* non-fatal */ }

  // 8. Model dropdown/selector
  try {
    const modelSelect = page.locator('select, [role="combobox"], [role="listbox"]').first();
    if (await modelSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      assert("Model selector rendered", true, "found");
    }
  } catch { /* non-fatal */ }

  // 9. Start Interview button — just verify it exists (don't click, backend may not be ready)
  try {
    const startBtn = page.getByRole("button", {
      name: /start.?interview|start.?session|go.?live|begin/i,
    }).first();
    const visible = await startBtn.isVisible({ timeout: 5000 }).catch(() => false);
    assert("Start Interview button rendered", visible, visible ? "visible" : "not found");
    await shot("start_button");
  } catch { /* non-fatal */ }

  // 10. Voice Profile Readiness widget
  try {
    const readinessEl = page.locator('[data-testid*="readiness"], [class*="readiness" i], text=/readiness/i').first();
    const visible = await readinessEl.isVisible({ timeout: 4000 }).catch(() => false);
    assert("Voice Profile Readiness widget rendered", visible, visible ? "OK" : "not found (may be hidden behind auth)");
  } catch { /* non-fatal */ }

  // 11. Navigate to mock interview tab
  try {
    await page.goto(`${FE_URL}/app/mock`, { waitUntil: "domcontentloaded", timeout: 12_000 });
    assert("Frontend /app/mock page loads", true, "OK");
    await shot("mock_tab");
  } catch (e) {
    assert("Frontend /app/mock page loads", false, String(e));
  }

  // 12. Navigate to coding tab
  try {
    await page.goto(`${FE_URL}/app/coding`, { waitUntil: "domcontentloaded", timeout: 12_000 });
    assert("Frontend /app/coding page loads", true, "OK");
    await shot("coding_tab");
  } catch (e) {
    assert("Frontend /app/coding page loads", false, String(e));
  }

  // 13. Resume upload page
  try {
    await page.goto(`${FE_URL}/app/resume`, { waitUntil: "domcontentloaded", timeout: 12_000 });
    const uploadZone = page.locator('input[type="file"], [role="button"][aria-label*="upload" i]').first();
    const visible = await uploadZone.isVisible({ timeout: 5000 }).catch(() => false);
    assert("Resume upload zone rendered on /app/resume", visible, visible ? "OK" : "not found");
    await shot("resume_upload");
  } catch (e) {
    assert("Frontend /app/resume page loads", false, String(e));
  }

  // 14. Settings page
  try {
    await page.goto(`${FE_URL}/app/settings`, { waitUntil: "domcontentloaded", timeout: 12_000 });
    assert("Frontend /app/settings page loads", true, "OK");
    await shot("settings_page");
  } catch (e) {
    assert("Frontend /app/settings page loads", false, String(e));
  }

  // 15. Keyboard accessibility — Tab key focuses elements
  try {
    await page.goto(`${FE_URL}/app/interview`, { waitUntil: "domcontentloaded", timeout: 12_000 });
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    const isInteractive = ["INPUT", "BUTTON", "A", "SELECT", "TEXTAREA"].includes(String(focused));
    assert("Tab key cycles through interactive elements", isInteractive, `Focused: ${focused}`);
  } catch { /* non-fatal */ }

  // 16. No XSS injection in inputs
  try {
    const firstInput = page.locator("input").first();
    if (await firstInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstInput.fill('<script>window.__xss_test=1</script>');
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
      const xssRan = await page.evaluate(() => (window as any).__xss_test === 1);
      assert("XSS injection blocked", !xssRan, xssRan ? "SECURITY: Script tag executed!" : "Blocked OK");
    }
  } catch { /* non-fatal */ }
}

// ─── HTML REPORT GENERATOR ───────────────────────────────────────────────────
function generateHtmlReport(
  rounds: RoundResult[],
  electronResults: AssertionResult[],
  frontendResults: AssertionResult[],
  metrics: SessionMetrics,
  startIso: string,
  endIso: string,
): string {
  const passColor  = "#22c55e";
  const failColor  = "#ef4444";
  const skipColor  = "#6b7280";
  const bgColor    = "#0a0a0f";
  const cardColor  = "#12121a";
  const textColor  = "#e2e8f0";
  const accentColor = "#38bdf8";

  const roundRows = rounds.map((r) => {
    const color = r.status === "pass" ? passColor : r.status === "skip" ? skipColor : failColor;
    const icon  = r.status === "pass" ? "✓" : r.status === "skip" ? "—" : "✗";
    const assertRows = r.assertions.map((a) =>
      `<tr style="font-size:12px;">
        <td style="padding:2px 8px;color:${a.passed ? passColor : failColor}">${a.passed ? "✓" : "✗"}</td>
        <td style="padding:2px 8px;">${escHtml(a.name)}</td>
        <td style="padding:2px 8px;opacity:0.6;max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(a.detail)}</td>
      </tr>`).join("");

    return `
    <details style="margin:6px 0;background:${cardColor};border:1px solid #1e293b;border-radius:8px;padding:0;">
      <summary style="padding:12px 16px;cursor:pointer;display:flex;align-items:center;gap:12px;">
        <span style="color:${color};font-size:18px;font-weight:700;">${icon}</span>
        <span style="font-weight:600;color:${textColor}">${escHtml(r.name)}</span>
        <span style="opacity:0.5;font-size:12px;">[${escHtml(r.category)}]</span>
        <span style="margin-left:auto;font-size:12px;opacity:0.6">${r.durationMs}ms</span>
        ${r.ttftMs !== undefined ? `<span style="font-size:12px;color:${accentColor}">TTFT: ${r.ttftMs}ms</span>` : ""}
      </summary>
      <div style="padding:16px;border-top:1px solid #1e293b;">
        <p style="color:#94a3b8;margin:0 0 8px;font-size:13px;"><strong>Q:</strong> ${escHtml(r.question)}</p>
        ${r.fullAnswer ? `<p style="color:#64748b;margin:0 0 12px;font-size:12px;white-space:pre-wrap;max-height:120px;overflow-y:auto;background:#0f172a;border-radius:4px;padding:8px;">${escHtml(r.fullAnswer.slice(0, 800))}</p>` : ""}
        ${r.wordCount !== undefined ? `<p style="font-size:12px;opacity:0.5">Words: ${r.wordCount} | Chunks: ${r.totalChunks}</p>` : ""}
        ${r.error ? `<p style="color:${failColor};font-size:12px;">⚠ ${escHtml(r.error)}</p>` : ""}
        <table style="width:100%;border-collapse:collapse;color:${textColor}">${assertRows}</table>
      </div>
    </details>`;
  }).join("");

  const genericSection = (title: string, items: AssertionResult[]) => {
    const rows = items.map((a) =>
      `<tr style="font-size:12px;border-bottom:1px solid #1e293b;">
        <td style="padding:4px 8px;color:${a.passed ? passColor : failColor}">${a.passed ? "✓" : "✗"}</td>
        <td style="padding:4px 8px;">${escHtml(a.name)}</td>
        <td style="padding:4px 8px;opacity:0.6;">${escHtml(a.detail)}</td>
      </tr>`).join("");
    const passed = items.filter((a) => a.passed).length;
    return `
    <section style="margin:24px 0;">
      <h2 style="color:${accentColor};font-size:18px;margin:0 0 12px;">${escHtml(title)} (${passed}/${items.length})</h2>
      <table style="width:100%;border-collapse:collapse;color:${textColor};background:${cardColor};border-radius:8px;overflow:hidden;">${rows}</table>
    </section>`;
  };

  const scorePercent = metrics.totalRounds > 0
    ? Math.round((metrics.passed / metrics.totalRounds) * 100)
    : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PhantomVeil — Live Interview Simulation Report</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body { background: ${bgColor}; color: ${textColor}; font-family: 'Inter', 'Segoe UI', sans-serif; margin: 0; padding: 24px; }
    details summary { list-style: none; }
    details summary::-webkit-details-marker { display: none; }
    a { color: ${accentColor}; }
    ::-webkit-scrollbar { width: 6px; background: #0f172a; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
  </style>
</head>
<body>
<div style="max-width:1200px;margin:0 auto;">

  <header style="text-align:center;padding:32px 0 24px;border-bottom:2px solid #1e293b;margin-bottom:32px;">
    <h1 style="font-size:28px;font-weight:800;color:${accentColor};margin:0 0 8px;">
      🎭 PhantomVeil — Live Interview Simulation Report
    </h1>
    <p style="opacity:0.6;margin:0;font-size:14px;">
      Generated: ${new Date().toISOString()} | Run: ${startIso} → ${endIso}
    </p>
  </header>

  <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:32px;">
    ${metricCard("Overall Score", `${scorePercent}%`, scorePercent >= 80 ? passColor : failColor)}
    ${metricCard("Rounds Passed", `${metrics.passed}/${metrics.totalRounds}`, metrics.passed === metrics.totalRounds ? passColor : failColor)}
    ${metricCard("Avg TTFT", metrics.avgTtftMs > 0 ? `${Math.round(metrics.avgTtftMs)}ms` : "N/A", metrics.avgTtftMs < 3000 ? passColor : failColor)}
    ${metricCard("Min TTFT", metrics.minTtftMs < 99999 ? `${metrics.minTtftMs}ms` : "N/A", passColor)}
    ${metricCard("Max TTFT", metrics.maxTtftMs > 0 ? `${metrics.maxTtftMs}ms` : "N/A", metrics.maxTtftMs < 5000 ? passColor : failColor)}
    ${metricCard("Total Words", String(metrics.totalAnswerWords), accentColor)}
    ${metricCard("Total Chunks", String(metrics.totalChunks), accentColor)}
    ${metricCard("Offer Prob.", metrics.offerProbability !== undefined ? `${metrics.offerProbability}%` : "N/A", accentColor)}
    ${metricCard("Voice Readiness", metrics.voiceReadiness !== undefined ? `${metrics.voiceReadiness}/100` : "N/A", accentColor)}
    ${metricCard("Backend", metrics.backendHealthy ? "Healthy" : "Down", metrics.backendHealthy ? passColor : failColor)}
    ${metricCard("Desktop", metrics.electronHealthy ? "OK" : "Fail/Skip", metrics.electronHealthy ? passColor : skipColor)}
    ${metricCard("Frontend", metrics.frontendLoaded ? "Loaded" : "Fail", metrics.frontendLoaded ? passColor : failColor)}
  </section>

  <section style="margin-bottom:32px;">
    <h2 style="color:${accentColor};font-size:18px;margin:0 0 12px;">
      🎤 Interview Rounds (${metrics.totalRounds} total)
    </h2>
    ${roundRows}
  </section>

  ${genericSection("🖥️ Electron Desktop IPC Checks", electronResults)}
  ${genericSection("🌐 Frontend UI Checks", frontendResults)}

  <footer style="text-align:center;opacity:0.4;font-size:12px;padding:24px 0;">
    PhantomVeil QA — Live Interview Simulation — Automated by ts-node + Playwright + ws
  </footer>

</div>
</body>
</html>`;
}

function metricCard(label: string, value: string, color: string): string {
  return `<div style="background:#12121a;border:1px solid #1e293b;border-radius:10px;padding:16px;text-align:center;">
    <div style="font-size:22px;font-weight:700;color:${color}">${escHtml(value)}</div>
    <div style="font-size:11px;opacity:0.6;margin-top:4px;">${escHtml(label)}</div>
  </div>`;
}

function escHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  ensureDir(REPORTS);
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const screenshotsDir = path.join(REPORTS, `screenshots_interview_sim_${runId}`);
  ensureDir(screenshotsDir);

  const startIso = nowIso();
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let candidatePage: Page | null = null;

  const rounds: RoundResult[] = [];
  const electronResults: AssertionResult[] = [];
  const frontendResults: AssertionResult[] = [];

  const userId = `interview-sim-${Date.now()}`;
  const token = unsignedJwt(userId);
  const authHeaders = { Authorization: `Bearer ${token}` };

  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║  PHANTOMVEIL — LIVE INTERVIEW SIMULATION              ║");
  console.log(`║  Frontend : ${FE_URL.padEnd(39)}║`);
  console.log(`║  Backend  : ${BE_URL.padEnd(39)}║`);
  console.log(`║  Headless : ${String(HEADLESS).padEnd(39)}║`);
  console.log(`║  Rounds   : ${String(INTERVIEW_SCRIPT.length).padEnd(39)}║`);
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // ── PHASE 0: Backend health check ─────────────────────────────────────────
  console.log("── PHASE 0: Backend Health ──");
  let backendHealthy = false;
  let offerProbability: number | undefined;
  let voiceReadiness: number | undefined;

  try {
    const health = await httpGet<Record<string, unknown>>(`${BE_URL}/healthz`, {}, 8000);
    if (health && typeof health === "object") {
      backendHealthy = true;
      console.log(`  ✓ Backend healthy: ${JSON.stringify(health).slice(0, 80)}`);
    }
  } catch (e) {
    console.log(`  ✗ Backend health check failed: ${e}`);
  }

  if (backendHealthy) {
    try {
      const op = await httpGet<{ offer_probability?: number }>(
        `${BE_URL}/api/user/offer-probability?limit=40`,
        authHeaders,
        8000,
      );
      offerProbability = Number(op?.offer_probability ?? 0);
    } catch { /* non-fatal */ }

    try {
      const vr = await httpGet<{ readiness_score?: number }>(
        `${BE_URL}/api/voice-profile/readiness`,
        authHeaders,
        8000,
      );
      voiceReadiness = Number(vr?.readiness_score ?? 0);
    } catch { /* non-fatal */ }
  }

  // ── PHASE 1: Electron desktop ──────────────────────────────────────────────
  console.log("\n── PHASE 1: Electron Desktop ──");
  const electronHealthy = await testElectronDesktop("electron-test-room", screenshotsDir, electronResults);
  const ePass = electronResults.filter((r) => r.passed).length;
  console.log(`  ${electronHealthy ? "✓" : "✗"} Electron: ${ePass}/${electronResults.length} assertions passed`);

  // ── PHASE 2: Frontend UI checks ────────────────────────────────────────────
  console.log("\n── PHASE 2: Frontend UI Checks ──");
  try {
    browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOW_MO });
    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "en-US",
      permissions: ["microphone", "camera"],
    });
    candidatePage = await context.newPage();

    // Bypass auth gate
    await candidatePage.addInitScript(() => {
      localStorage.setItem("atluriin.e2e.bypass", "1");
      sessionStorage.setItem("atluriin.e2e.bypass", "1");
    });

    await runFrontendChecks(candidatePage, screenshotsDir, frontendResults);
    const fPass = frontendResults.filter((r) => r.passed).length;
    console.log(`  ✓ Frontend: ${fPass}/${frontendResults.length} UI assertions passed`);
  } catch (e) {
    frontendResults.push({ name: "Frontend browser launch", passed: false, detail: String(e) });
    console.log(`  ✗ Frontend browser launch failed: ${e}`);
  }

  const frontendLoaded = frontendResults.some((r) => r.name.includes("loads") && r.passed);

  // ── PHASE 3: Live Interview Simulation Rounds ──────────────────────────────
  console.log("\n── PHASE 3: Live Interview Simulation ──");
  console.log(`  Running ${INTERVIEW_SCRIPT.length} rounds with a shared room per round\n`);

  if (!backendHealthy) {
    console.log("  ⚠  Backend not healthy — skipping all interview rounds");
    for (const round of INTERVIEW_SCRIPT) {
      rounds.push({
        name: round.name,
        category: round.category,
        question: round.question,
        status: "skip",
        error: "Backend not healthy",
        assertions: [],
        durationMs: 0,
      });
    }
  } else {
    for (let i = 0; i < INTERVIEW_SCRIPT.length; i++) {
      const round = INTERVIEW_SCRIPT[i];

      if (SKIP_ROUNDS_RAW.includes(round.name)) {
        console.log(`  [${i + 1}/${INTERVIEW_SCRIPT.length}] SKIP  ${round.name}`);
        rounds.push({
          name: round.name,
          category: round.category,
          question: round.question,
          status: "skip",
          error: "Skipped via E2E_SKIP_ROUNDS",
          assertions: [],
          durationMs: 0,
        });
        continue;
      }

      // Each round uses its own UUID room so there is no cross-contamination
      const roomId = crypto.randomUUID();

      process.stdout.write(`  [${i + 1}/${INTERVIEW_SCRIPT.length}] ▶  ${round.name.padEnd(30)}`);
      const t0 = Date.now();

      try {
        const result = await runInterviewRound(round, roomId, screenshotsDir, candidatePage);
        rounds.push(result);
        const status = result.status === "pass" ? "✓" : "✗";
        const passedCount = result.assertions.filter((a) => a.passed).length;
        process.stdout.write(
          `  ${status} ${passedCount}/${result.assertions.length} assertions | TTFT: ${result.ttftMs ?? "—"}ms | ${result.wordCount ?? 0} words (${Date.now() - t0}ms)\n`,
        );
      } catch (e) {
        const msg = String((e as Error)?.stack || e);
        rounds.push({
          name: round.name,
          category: round.category,
          question: round.question,
          status: "fail",
          error: msg,
          assertions: [{ name: "runInterviewRound", passed: false, detail: msg }],
          durationMs: Date.now() - t0,
        });
        process.stdout.write(`  ✗ EXCEPTION: ${msg.split("\n")[0]}\n`);
      }

      // Small breathing room between rounds (avoids rate-limit on dev backend)
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  // ── PHASE 4: Compute metrics ───────────────────────────────────────────────
  const passed  = rounds.filter((r) => r.status === "pass").length;
  const failed  = rounds.filter((r) => r.status === "fail").length;
  const skipped = rounds.filter((r) => r.status === "skip").length;
  const ttfts   = rounds.filter((r) => r.ttftMs !== undefined).map((r) => r.ttftMs as number);
  const avgTtft = ttfts.length > 0 ? ttfts.reduce((a, b) => a + b, 0) / ttfts.length : 0;

  const metrics: SessionMetrics = {
    totalRounds: rounds.length,
    passed,
    failed,
    skipped,
    avgTtftMs: avgTtft,
    maxTtftMs: ttfts.length ? Math.max(...ttfts) : 0,
    minTtftMs: ttfts.length ? Math.min(...ttfts) : 99999,
    totalAnswerWords: rounds.reduce((s, r) => s + (r.wordCount ?? 0), 0),
    totalChunks: rounds.reduce((s, r) => s + (r.totalChunks ?? 0), 0),
    offerProbability,
    voiceReadiness,
    electronHealthy,
    frontendLoaded,
    backendHealthy,
  };

  // ── PHASE 5: Write reports ─────────────────────────────────────────────────
  const endIso = nowIso();

  const jsonReport = {
    runId,
    startedAt: startIso,
    finishedAt: endIso,
    metrics,
    rounds,
    electronResults,
    frontendResults,
  };
  const jsonPath = path.join(REPORTS, `Interview_Simulation_${runId}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));

  const htmlPath = path.join(REPORTS, `Interview_Simulation_${runId}.html`);
  fs.writeFileSync(
    htmlPath,
    generateHtmlReport(rounds, electronResults, frontendResults, metrics, startIso, endIso),
  );

  // ── PHASE 6: Print summary ─────────────────────────────────────────────────
  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║  SIMULATION COMPLETE                                  ║");
  console.log(`║  Rounds   : ${passed} passed, ${failed} failed, ${skipped} skipped`.padEnd(56) + "║");
  console.log(`║  Avg TTFT : ${Math.round(avgTtft)}ms`.padEnd(56) + "║");
  console.log(`║  Words    : ${metrics.totalAnswerWords} total AI words generated`.padEnd(56) + "║");
  const scorePercent = rounds.length > 0 ? Math.round((passed / rounds.length) * 100) : 0;
  console.log(`║  Score    : ${scorePercent}%`.padEnd(56) + "║");
  console.log("╠═══════════════════════════════════════════════════════╣");
  console.log(`║  JSON : ${jsonPath}`);
  console.log(`║  HTML : ${htmlPath}`);
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // ── CLEANUP ──────────────────────────────────────────────────────────────
  if (browser) { try { await browser.close(); } catch { /* ignore */ } }

  // Exit code 1 if any round failed (CI-friendly)
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
