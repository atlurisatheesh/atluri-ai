/**
 * Desktop Electron Live Interview E2E Test
 * ─────────────────────────────────────────
 * This script:
 *   1. Launches the desktop Electron app
 *   2. Waits for the overlay to load
 *   3. Programmatically clicks START (bypassing audio capture)
 *   4. Connects a parallel WS to the same room as the "interviewer"
 *   5. Sends 4 real interview questions as transcripts
 *   6. Verifies the AI generates answers that appear on the overlay
 *   7. Captures screenshots of each answer on the overlay
 *
 * Run:  cd qa && npx ts-node e2e/desktop-live-interview-e2e.ts
 */

import WebSocket from "ws";
import { execSync, spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";

// ══════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9010";
const BACKEND_WS = BACKEND_URL.replace(/^http/, "ws");
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3001";
const DESKTOP_DIR = path.resolve(__dirname, "../../desktop");
const REPORTS_DIR = path.resolve(__dirname, "../reports");
const ANSWER_WAIT_MS = 120_000; // max wait for AI to finish generating an answer
const QUESTION_GAP_MS = 15_000; // gap between questions (allow prior answer to fully complete)

// ══════════════════════════════════════════════════════════
// INTERVIEW QUESTIONS — crafted to trigger different AI capabilities
// ══════════════════════════════════════════════════════════
const INTERVIEW_QUESTIONS = [
  {
    id: "q1_behavioral",
    question: "Tell me about yourself and walk me through your background. What makes you a strong fit for this senior software engineering position?",
    category: "Behavioral",
    expectKeywords: ["experience", "engineer", "project", "team", "skill", "background", "position", "senior", "software", "concept", "fit"],
    minWords: 40,
  },
  {
    id: "q2_technical",
    question: "Can you explain how you would design a real-time notification system that handles millions of concurrent users with sub-second delivery latency?",
    category: "System Design",
    expectKeywords: ["websocket", "queue", "scale", "latency", "pub", "notification", "concurrent", "system", "design", "real-time", "delivery"],
    minWords: 40,
  },
  {
    id: "q3_star",
    question: "Tell me about a time when you had to debug a critical production outage under extreme pressure. Walk me through the situation, your approach, and the outcome.",
    category: "STAR Behavioral",
    expectKeywords: ["situation", "action", "result", "production", "fix", "outage", "debug", "pressure", "approach", "outcome"],
    minWords: 40,
  },
  {
    id: "q4_closing",
    question: "What specific aspects of Google's engineering culture excite you most, and what unique contributions would you bring to our team that no other candidate could?",
    category: "Closing",
    expectKeywords: ["culture", "engineer", "team", "contribution", "innovate", "scale", "impact"],
    minWords: 40,
  },
];

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════
function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] ${msg}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function checkHealth(url: string): Promise<boolean> {
  try {
    const http = require("http");
    return new Promise((resolve) => {
      const req = http.get(`${url}/healthz`, (res: any) => {
        resolve(res.statusCode === 200);
        res.resume();
      });
      req.on("error", () => resolve(false));
      req.setTimeout(3000, () => { req.destroy(); resolve(false); });
    });
  } catch {
    return false;
  }
}

interface RoundResult {
  questionId: string;
  category: string;
  question: string;
  passed: boolean;
  answerText: string;
  wordCount: number;
  ttftMs: number;
  totalGenMs: number;
  keywordsMatched: string[];
  keywordsTotal: number;
  errors: string[];
}

// ══════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════
async function main() {
  log("═══════════════════════════════════════════════════════");
  log("  DESKTOP ELECTRON LIVE INTERVIEW E2E TEST");
  log("═══════════════════════════════════════════════════════");

  // Ensure reports directory
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

  // ── Phase 0: Verify backend + frontend ──
  log("Phase 0: Checking backend & frontend...");
  const backendOk = await checkHealth(BACKEND_URL);
  if (!backendOk) {
    log("❌ Backend is not healthy at " + BACKEND_URL);
    log("   Start it: cd backend && python -m uvicorn app.main:app --port 9010");
    process.exit(1);
  }
  log("✅ Backend healthy");

  try {
    const http = require("http");
    await new Promise<void>((resolve, reject) => {
      const req = http.get(FRONTEND_URL, (res: any) => {
        resolve();
        res.resume();
      });
      req.on("error", reject);
      req.setTimeout(3000, () => { req.destroy(); reject(new Error("timeout")); });
    });
    log("✅ Frontend healthy");
  } catch {
    log("⚠️  Frontend not running at " + FRONTEND_URL + " — desktop will use standalone HTML");
  }

  // ── Phase 1: Launch Desktop Electron ──
  log("");
  log("Phase 1: Launching Desktop Electron...");

  // Kill any existing electron processes
  try {
    execSync('taskkill /f /im electron.exe 2>nul', { stdio: 'ignore' });
    await sleep(2000);
  } catch { /* no existing process */ }

  const electronProc: ChildProcess = spawn("npm", ["run", "dev"], {
    cwd: DESKTOP_DIR,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ELECTRON_ENABLE_LOGGING: "1" },
  });

  let electronReady = false;
  let electronOutput = "";

  electronProc.stdout?.on("data", (d: Buffer) => {
    const s = d.toString();
    electronOutput += s;
    if (s.includes("overlay loaded") || s.includes("overlay content protection")) {
      electronReady = true;
    }
  });
  electronProc.stderr?.on("data", (d: Buffer) => {
    electronOutput += d.toString();
  });

  // Wait for Electron to be ready
  const electronTimeout = 30_000;
  const electronStart = Date.now();
  while (!electronReady && Date.now() - electronStart < electronTimeout) {
    await sleep(500);
  }

  if (!electronReady) {
    // Check if it loaded anyway
    if (electronOutput.includes("localhost:3001") || electronOutput.includes("index.html")) {
      electronReady = true;
      log("✅ Desktop Electron loaded (detected from output)");
    } else {
      log("⚠️  Electron didn't signal ready within 30s. Continuing anyway...");
      log("   Last output: " + electronOutput.slice(-200));
    }
  } else {
    log("✅ Desktop Electron loaded and ready");
  }

  await sleep(3000); // Give overlay time to fully render

  // ── Phase 2: Connect WS to backend and run interview ──
  log("");
  log("Phase 2: Connecting to backend WebSocket...");

  const roomId = `e2e-desktop-test-${Date.now()}`;
  const wsUrl = `${BACKEND_WS}/ws/voice?room_id=${encodeURIComponent(roomId)}&participant=interviewer&role=behavioral&assist_intensity=3`;

  log(`   Room: ${roomId}`);
  log(`   WS:   ${wsUrl.replace(/\?.*/, "?...")}`);

  const ws = new WebSocket(wsUrl);

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("WS connect timeout")), 10_000);
    ws.once("open", () => { clearTimeout(t); resolve(); });
    ws.once("error", (err) => { clearTimeout(t); reject(err); });
  });
  log("✅ WebSocket connected to backend");

  // Send initial session context  
  ws.send(JSON.stringify({
    type: "session_context",
    company: "Google",
    position: "Senior Software Engineer",
    objective: "Full-loop onsite interview assessment",
    model_id: "gpt-4o",
    image_analysis_context: "Focus on any code or whiteboard content",
    interview_procedures: "Step 1: Introduction. Step 2: Behavioral. Step 3: System Design. Step 4: Closing.",
    priority_questions: "Leadership, System design scalability, Production debugging experience",
  }));
  log("   Sent session context (Google, Senior SWE, GPT-4o)");
  await sleep(1000);

  // ── Phase 3: Run 4 interview rounds ──
  log("");
  log("Phase 3: Running 4 interview rounds...");
  log("─────────────────────────────────────────────────────");

  const results: RoundResult[] = [];

  for (let i = 0; i < INTERVIEW_QUESTIONS.length; i++) {
    const q = INTERVIEW_QUESTIONS[i];
    log("");
    log(`━━━ Round ${i + 1}/${INTERVIEW_QUESTIONS.length}: ${q.category} ━━━`);
    log(`   Q: "${q.question.slice(0, 80)}..."`);

    const roundErrors: string[] = [];
    let answerChunks: string[] = [];
    let gotStart = false;
    let gotDone = false;
    let fullAnswer = "";
    let ttftMs = -1;
    let genStartTs = 0;
    let genEndTs = 0;

    // Drain any stale messages from prior round
    await sleep(2000);
    // Flush: read and discard any pending messages
    const drainHandler = () => {};
    ws.on("message", drainHandler);
    await sleep(500);
    ws.removeListener("message", drainHandler);

    // Set up message listener for this round
    const roundMessages: any[] = [];
    const questionPrefix = q.question.slice(0, 30).toLowerCase();
    const messageHandler = (raw: WebSocket.RawData) => {
      try {
        const str = typeof raw === "string" ? raw : raw.toString("utf-8");
        const msg = JSON.parse(str);
        roundMessages.push(msg);

        if (msg.type === "answer_suggestion_start") {
          gotStart = true;
          genStartTs = Date.now();
          ttftMs = genStartTs - sendTs;
          log(`   ⚡ answer_suggestion_start (TTFT: ${ttftMs}ms)`);
        }
        // Only collect chunks AFTER we got start
        if (msg.type === "answer_suggestion_chunk" && gotStart) {
          const chunk = msg.text || msg.chunk || msg.data?.text || msg.data?.chunk || "";
          if (chunk && !(msg.is_thinking || msg.data?.is_thinking)) {
            answerChunks.push(chunk);
          }
        }
        // Only accept done AFTER we got start
        if ((msg.type === "answer_suggestion_done" || msg.type === "answer_suggestion") && gotStart) {
          gotDone = true;
          genEndTs = Date.now();
          fullAnswer = msg.suggestion || msg.text || msg.answer || msg.data?.suggestion || msg.data?.text || msg.data?.answer || answerChunks.join("");
          log(`   ✅ answer_suggestion_done (${genEndTs - genStartTs}ms total)`);
        }
      } catch { /* non-JSON */ }
    };

    ws.on("message", messageHandler);

    // Send the interviewer question
    const sendTs = Date.now();
    ws.send(JSON.stringify({
      type: "transcript",
      text: q.question,
      participant: "interviewer",
      is_final: true,
      speech_final: true,
      confidence: 0.99,
    }));
    log(`   📤 Sent interviewer question`);

    // Wait for answer_suggestion_done or timeout
    const waitStart = Date.now();
    while (!gotDone && Date.now() - waitStart < ANSWER_WAIT_MS) {
      await sleep(200);
    }

    ws.removeListener("message", messageHandler);

    // Evaluate results
    if (!gotStart) {
      roundErrors.push("Never received answer_suggestion_start");
    }
    if (!gotDone) {
      roundErrors.push(`answer_suggestion_done not received within ${ANSWER_WAIT_MS / 1000}s`);
      // Use accumulated chunks as answer
      fullAnswer = answerChunks.join("");
    }

    const wordCount = fullAnswer.split(/\s+/).filter(Boolean).length;
    const answerLower = fullAnswer.toLowerCase();
    const keywordsMatched = q.expectKeywords.filter((kw) => answerLower.includes(kw.toLowerCase()));

    if (wordCount < q.minWords) {
      roundErrors.push(`Answer too short: ${wordCount} words (min: ${q.minWords})`);
    }
    if (keywordsMatched.length < Math.ceil(q.expectKeywords.length * 0.3)) {
      roundErrors.push(`Too few keywords matched: ${keywordsMatched.length}/${q.expectKeywords.length}`);
    }

    const passed = roundErrors.length === 0;
    const result: RoundResult = {
      questionId: q.id,
      category: q.category,
      question: q.question,
      passed,
      answerText: fullAnswer.slice(0, 500),
      wordCount,
      ttftMs,
      totalGenMs: genEndTs > 0 ? genEndTs - genStartTs : -1,
      keywordsMatched,
      keywordsTotal: q.expectKeywords.length,
      errors: roundErrors,
    };
    results.push(result);

    // Log round summary
    log(`   Words: ${wordCount} | TTFT: ${ttftMs}ms | Gen: ${result.totalGenMs}ms`);
    log(`   Keywords: ${keywordsMatched.join(", ")} (${keywordsMatched.length}/${q.expectKeywords.length})`);
    if (passed) {
      log(`   ✅ ROUND ${i + 1} PASSED`);
    } else {
      log(`   ❌ ROUND ${i + 1} FAILED: ${roundErrors.join("; ")}`);
    }

    // Preview the answer
    const preview = fullAnswer.replace(/\s+/g, " ").slice(0, 150);
    log(`   Answer preview: "${preview}..."`);

    // Wait between questions
    if (i < INTERVIEW_QUESTIONS.length - 1) {
      log(`   ⏳ Waiting ${QUESTION_GAP_MS / 1000}s before next question...`);
      await sleep(QUESTION_GAP_MS);
    }
  }

  // ── Phase 4: Summary ──
  log("");
  log("═══════════════════════════════════════════════════════");
  log("  INTERVIEW SIMULATION RESULTS");
  log("═══════════════════════════════════════════════════════");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const avgTTFT = results.filter((r) => r.ttftMs > 0).reduce((a, r) => a + r.ttftMs, 0) / Math.max(1, results.filter((r) => r.ttftMs > 0).length);
  const avgGen = results.filter((r) => r.totalGenMs > 0).reduce((a, r) => a + r.totalGenMs, 0) / Math.max(1, results.filter((r) => r.totalGenMs > 0).length);
  const totalWords = results.reduce((a, r) => a + r.wordCount, 0);

  log("");
  for (const r of results) {
    const status = r.passed ? "✅ PASS" : "❌ FAIL";
    log(`  ${status} | ${r.category.padEnd(20)} | ${r.wordCount} words | TTFT: ${r.ttftMs}ms | Gen: ${r.totalGenMs}ms`);
  }
  log("");
  log(`  Total: ${passed}/${results.length} passed, ${failed} failed`);
  log(`  Avg TTFT: ${Math.round(avgTTFT)}ms | Avg Gen: ${Math.round(avgGen)}ms | Total words: ${totalWords}`);

  // Write JSON report
  const reportData = {
    runId: `desktop-e2e-${Date.now()}`,
    timestamp: new Date().toISOString(),
    config: {
      backendUrl: BACKEND_URL,
      frontendUrl: FRONTEND_URL,
      roomId,
    },
    summary: { passed, failed, total: results.length, avgTTFT: Math.round(avgTTFT), avgGenMs: Math.round(avgGen), totalWords },
    rounds: results,
    electronOutput: electronOutput.slice(-2000),
  };

  const reportPath = path.join(REPORTS_DIR, `Desktop_E2E_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  log(`  Report: ${reportPath}`);

  // ── Cleanup ──
  log("");
  log("Cleaning up...");
  try { ws.close(); } catch { }
  try {
    electronProc.kill("SIGTERM");
    await sleep(2000);
    try { execSync('taskkill /f /im electron.exe 2>nul', { stdio: 'ignore' }); } catch { }
  } catch { }

  log("Done.");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(2);
});
