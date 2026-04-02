/**
 * REAL INTERVIEW SIMULATION TEST
 * ================================
 * This script simulates a complete real interview session:
 * 
 * 1. Connects to the backend WebSocket as INTERVIEWER + CANDIDATE (same room)
 * 2. Sends 4 real interview questions as transcript messages (simulating Zoom audio capture)
 * 3. Receives AI-generated answer suggestions on the CANDIDATE channel
 * 4. Verifies answers appear, measures TTFT (Time to First Token), and checks quality
 * 5. The desktop Electron overlay (if running) will display these answers in real-time
 *
 * Usage:
 *   npx ts-node e2e/real-interview-test.ts
 *   npx ts-node e2e/real-interview-test.ts --backend http://localhost:9010 --headed
 */

import WebSocket from "ws";

// ─── Configuration ───────────────────────────────────────
const BACKEND_URL = process.argv.includes("--backend")
  ? process.argv[process.argv.indexOf("--backend") + 1]
  : "http://localhost:9010";

const ROOM_ID = `real-interview-test-${Date.now()}`;
const VERBOSE = process.argv.includes("--verbose");

// ─── Interview Questions ─────────────────────────────────
const INTERVIEW_QUESTIONS = [
  {
    id: "q1_intro",
    category: "Behavioral",
    question: "Tell me about yourself and walk me through your resume. What makes you a strong fit for this senior software engineer position?",
    expectedKeywords: ["experience", "project", "skill", "team", "built", "engineer"],
    minWords: 30,
    maxWaitMs: 120000,
  },
  {
    id: "q2_technical",
    category: "Technical",
    question: "Can you explain how you would design a real-time notification system that needs to handle 10 million concurrent users with sub-second delivery latency?",
    expectedKeywords: ["websocket", "queue", "scale", "redis", "pub", "sub", "latency", "load", "server", "architecture"],
    minWords: 30,
    maxWaitMs: 120000,
  },
  {
    id: "q3_star",
    category: "STAR Behavioral",
    question: "Tell me about a time when you had to deal with a critical production outage at 2 AM. What was the situation, what actions did you take, and what was the result?",
    expectedKeywords: ["situation", "task", "action", "result", "incident", "fix", "deploy", "team", "monitor"],
    minWords: 30,
    maxWaitMs: 120000,
  },
  {
    id: "q4_closing",
    category: "Pressure / Closing",
    question: "If we gave you an offer today, what would be the single biggest concern or hesitation you would have about joining our team, and how would you address it?",
    expectedKeywords: ["team", "growth", "challenge", "opportunity", "culture", "learn"],
    minWords: 30,
    maxWaitMs: 120000,
  },
];

// ─── Types ───────────────────────────────────────────────
interface RoundResult {
  questionId: string;
  category: string;
  question: string;
  answerGenerated: boolean;
  fullAnswer: string;
  wordCount: number;
  ttftMs: number | null;         // Time to first token
  totalGenerationMs: number;     // Total time from question sent to answer_done
  keywordsFound: string[];
  keywordsMissed: string[];
  passed: boolean;
  errors: string[];
}

// ─── Helpers ─────────────────────────────────────────────
function wsUrl(baseHttp: string, path: string): string {
  return baseHttp.replace(/^http/i, "ws") + path;
}

function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] ${msg}`);
}

function dim(msg: string) {
  if (VERBOSE) console.log(`  \x1b[2m${msg}\x1b[0m`);
}

function green(msg: string) { return `\x1b[32m${msg}\x1b[0m`; }
function red(msg: string) { return `\x1b[31m${msg}\x1b[0m`; }
function yellow(msg: string) { return `\x1b[33m${msg}\x1b[0m`; }
function cyan(msg: string) { return `\x1b[36m${msg}\x1b[0m`; }
function bold(msg: string) { return `\x1b[1m${msg}\x1b[0m`; }

function connectWs(url: string, name: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`${name} WebSocket connection timeout (8s)`));
    }, 8000);

    ws.on("open", () => {
      clearTimeout(timeout);
      log(`${green("✓")} ${name} WebSocket connected`);
      resolve(ws);
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(new Error(`${name} WebSocket error: ${err.message}`));
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Main Interview Runner ──────────────────────────────
async function runInterview(): Promise<void> {
  console.log("\n" + bold("═══════════════════════════════════════════════════════════"));
  console.log(bold("  🎯 REAL INTERVIEW SIMULATION TEST"));
  console.log(bold("═══════════════════════════════════════════════════════════"));
  console.log(`  Backend:  ${cyan(BACKEND_URL)}`);
  console.log(`  Room:     ${cyan(ROOM_ID)}`);
  console.log(`  Questions: ${INTERVIEW_QUESTIONS.length}`);
  console.log(`  Desktop:  Overlay should display answers in real-time`);
  console.log(bold("═══════════════════════════════════════════════════════════\n"));

  // ─── Step 1: Connect both channels ─────────────────────
  log("Connecting interviewer + candidate WebSockets to the same room...");

  const interviewerUrl = wsUrl(
    BACKEND_URL,
    `/ws/voice?assist_intensity=2&room_id=${encodeURIComponent(ROOM_ID)}&participant=interviewer&role=behavioral`
  );
  const candidateUrl = wsUrl(
    BACKEND_URL,
    `/ws/voice?assist_intensity=2&room_id=${encodeURIComponent(ROOM_ID)}&participant=candidate&role=behavioral`
  );

  const interviewerWs = await connectWs(interviewerUrl, "Interviewer");
  const candidateWs = await connectWs(candidateUrl, "Candidate");

  // Debug: log all raw frames
  interviewerWs.on("message", (raw: WebSocket.Data) => {
    const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf-8") : "";
    if (text) dim(`[INT RAW] ${text.slice(0, 200)}`);
  });
  candidateWs.on("message", (raw: WebSocket.Data) => {
    const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf-8") : "";
    if (text) dim(`[CAN RAW] ${text.slice(0, 200)}`);
  });

  // Send session context (same as what the overlay sends on Start)
  const sessionContext = JSON.stringify({
    role: "behavioral",
    company: "Google",
    position: "Senior Software Engineer",
    objective: "Test the full AI answer generation pipeline end-to-end",
    industry: "technology",
    experience: "senior",
    model: "gpt4o",
    coachStyle: "balanced",
    coachEnabled: true,
    mode: "live",
    companyResearch: "Google is a leading technology company known for search, cloud, and AI.",
    imageContext: "",
  });

  interviewerWs.send(sessionContext);
  candidateWs.send(sessionContext);
  log(`${green("✓")} Session context sent to both channels`);

  await sleep(1500);

  // ─── Step 2: Run each question ─────────────────────────
  const results: RoundResult[] = [];
  const allMessages: Array<{ type: string; data: any; ts: number }> = [];

  // Listen on BOTH channels for all messages
  const attachListener = (ws: WebSocket, label: string) => {
    ws.on("message", (raw: WebSocket.Data) => {
      try {
        const text = typeof raw === "string" ? raw.toString() : Buffer.isBuffer(raw) ? raw.toString("utf-8") : "";
        if (!text.startsWith("{")) return; // skip binary audio frames
        const msg = JSON.parse(text);
        allMessages.push({ type: msg.type, data: msg, ts: Date.now() });
        dim(`[${label}] ← ${msg.type}: ${JSON.stringify(msg).slice(0, 120)}`);
      } catch {
        // binary frame
      }
    });
  };

  attachListener(interviewerWs, "INT");
  attachListener(candidateWs, "CAN");

  for (let i = 0; i < INTERVIEW_QUESTIONS.length; i++) {
    const q = INTERVIEW_QUESTIONS[i];
    const roundNum = i + 1;

    console.log(`\n${bold(`─── Round ${roundNum}/${INTERVIEW_QUESTIONS.length}: ${q.category} ───`)}`);
    console.log(`  ${cyan("Q:")} ${q.question}\n`);

    // Clear message buffer for this round
    const roundStartIdx = allMessages.length;
    const questionSentAt = Date.now();

    // Send the question as an interviewer transcript (this is what happens when
    // Zoom audio is captured, transcribed, and identified as a question)
    interviewerWs.send(JSON.stringify({
      type: "transcript",
      text: q.question,
      participant: "interviewer",
      is_final: true,
    }));

    log(`${yellow("→")} Question sent to backend as transcript`);

    // Wait for answer_suggestion_start → chunks → answer_suggestion_done
    // Filter messages by question text to avoid cross-question contamination.
    // The backend includes a `question` field in every chunk — use prefix matching.
    let answerText = "";
    let ttftMs: number | null = null;
    let gotStart = false;
    let gotDone = false;
    const errors: string[] = [];
    const questionPrefix = q.question.slice(0, 60);

    const isForCurrentQuestion = (m: { type: string; data: any }): boolean => {
      const msgQuestion = String(m.data?.question || "");
      return msgQuestion.startsWith(questionPrefix);
    };

    const waitForAnswer = new Promise<void>((resolve) => {
      const deadline = setTimeout(() => {
        if (!gotDone) {
          errors.push(`Timed out after ${q.maxWaitMs}ms waiting for answer`);
        }
        resolve();
      }, q.maxWaitMs);

      const checkInterval = setInterval(() => {
        // Scan messages received since this round started
        for (let j = roundStartIdx; j < allMessages.length; j++) {
          const m = allMessages[j];

          if (m.type === "answer_suggestion_start" && !gotStart && isForCurrentQuestion(m)) {
            gotStart = true;
            ttftMs = m.ts - questionSentAt;
            log(`${green("◀")} answer_suggestion_start (TTFT: ${ttftMs}ms)`);
          }

          if (m.type === "answer_suggestion_chunk" && isForCurrentQuestion(m)) {
            const chunk = String(m.data?.chunk || m.data?.text || "");
            // Skip thinking indicator chunks
            if (m.data?.is_thinking || chunk.trim() === "▸" || chunk.trim() === "") continue;
            answerText += chunk;
            if (ttftMs === null) {
              ttftMs = m.ts - questionSentAt;
            }
          }

          if (m.type === "answer_suggestion_done" && isForCurrentQuestion(m)) {
            gotDone = true;
            // Use the 'suggestion' field from answer_suggestion_done as the clean full answer
            if (m.data?.suggestion) {
              answerText = String(m.data.suggestion);
            } else if (m.data?.text) {
              answerText = String(m.data.text);
            } else if (m.data?.full_answer) {
              answerText = String(m.data.full_answer);
            }
            const totalMs = m.ts - questionSentAt;
            log(`${green("◀")} answer_suggestion_done (total: ${totalMs}ms)`);
            clearInterval(checkInterval);
            clearTimeout(deadline);
            resolve();
            return;
          }

          if (m.type === "error") {
            errors.push(`Backend error: ${JSON.stringify(m.data)}`);
          }
        }
      }, 200);
    });

    await waitForAnswer;

    // Also check if we got the answer from a different message type
    if (!answerText) {
      // Sometimes the answer comes via `assist_response` or `ai_response`
      for (let j = roundStartIdx; j < allMessages.length; j++) {
        const m = allMessages[j];
        if (m.type === "assist_response" || m.type === "ai_response") {
          answerText = String(m.data?.text || m.data?.response || m.data?.answer || "");
          if (answerText) {
            log(`${yellow("◀")} Got answer via ${m.type}`);
            break;
          }
        }
      }
    }

    // Analyze the answer
    const wordCount = answerText.split(/\s+/).filter(Boolean).length;
    const answerLower = answerText.toLowerCase();
    const keywordsFound = q.expectedKeywords.filter((k) => answerLower.includes(k.toLowerCase()));
    const keywordsMissed = q.expectedKeywords.filter((k) => !answerLower.includes(k.toLowerCase()));

    const passed =
      answerText.length > 0 &&
      wordCount >= q.minWords &&
      errors.length === 0;

    const result: RoundResult = {
      questionId: q.id,
      category: q.category,
      question: q.question,
      answerGenerated: answerText.length > 0,
      fullAnswer: answerText,
      wordCount,
      ttftMs,
      totalGenerationMs: Date.now() - questionSentAt,
      keywordsFound,
      keywordsMissed,
      passed,
      errors,
    };
    results.push(result);

    // Print result
    if (answerText) {
      console.log(`  ${green("A:")} ${answerText.slice(0, 300)}${answerText.length > 300 ? "..." : ""}\n`);
      log(`  Words: ${wordCount} | TTFT: ${ttftMs ?? "N/A"}ms | Keywords: ${keywordsFound.length}/${q.expectedKeywords.length}`);
      log(`  ${passed ? green("PASS ✓") : red("FAIL ✗")} ${errors.join(", ")}`);
    } else {
      console.log(`  ${red("A: (no answer received)")}\n`);
      log(`  ${red("FAIL ✗")} No AI answer was generated`);
      
      // Log all messages we DID receive for debugging
      const roundMsgs = allMessages.slice(roundStartIdx);
      if (roundMsgs.length > 0) {
        log(`  Received ${roundMsgs.length} messages: ${roundMsgs.map(m => m.type).join(", ")}`);
      } else {
        log(`  ${red("No messages received at all from backend")}`);
      }
    }

    // Wait between questions (like a real interview)
    if (i < INTERVIEW_QUESTIONS.length - 1) {
      log("Waiting 3s before next question (simulating real interview pace)...");
      await sleep(3000);
    }
  }

  // ─── Step 3: Print Summary ─────────────────────────────
  console.log(`\n${bold("═══════════════════════════════════════════════════════════")}`);
  console.log(bold("  📊 INTERVIEW SIMULATION RESULTS"));
  console.log(bold("═══════════════════════════════════════════════════════════"));

  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.filter((r) => !r.passed).length;
  const avgTtft = results.filter(r => r.ttftMs !== null).reduce((s, r) => s + r.ttftMs!, 0) / (results.filter(r => r.ttftMs !== null).length || 1);
  const totalWords = results.reduce((s, r) => s + r.wordCount, 0);

  console.log(`\n  ${green(`PASSED: ${totalPassed}`)}  ${totalFailed > 0 ? red(`FAILED: ${totalFailed}`) : ""}`);
  console.log(`  Avg TTFT:     ${Math.round(avgTtft)}ms`);
  console.log(`  Total Words:  ${totalWords}`);
  console.log(`  Avg Words/Q:  ${Math.round(totalWords / results.length)}`);

  for (const r of results) {
    const icon = r.passed ? green("✓") : red("✗");
    const ttft = r.ttftMs !== null ? `${r.ttftMs}ms` : "N/A";
    console.log(`\n  ${icon} ${bold(r.category)} (${r.questionId})`);
    console.log(`    Words: ${r.wordCount} | TTFT: ${ttft} | Gen: ${r.totalGenerationMs}ms`);
    console.log(`    Keywords: ${r.keywordsFound.length}/${r.keywordsFound.length + r.keywordsMissed.length} (${r.keywordsFound.join(", ") || "none"})`);
    if (r.errors.length) console.log(`    ${red("Errors:")} ${r.errors.join("; ")}`);
  }

  // ─── Step 4: Log all message types received ────────────
  const msgTypes = new Map<string, number>();
  for (const m of allMessages) {
    msgTypes.set(m.type, (msgTypes.get(m.type) || 0) + 1);
  }
  console.log(`\n  ${bold("Message Types Received:")}`);
  for (const [type, count] of msgTypes) {
    console.log(`    ${type}: ${count}`);
  }

  console.log(`\n${bold("═══════════════════════════════════════════════════════════")}`);

  // ─── Cleanup ───────────────────────────────────────────
  log("Closing WebSocket connections...");
  try { interviewerWs.send(JSON.stringify({ type: "stop" })); } catch {}
  try { candidateWs.send(JSON.stringify({ type: "stop" })); } catch {}
  await sleep(500);
  try { interviewerWs.close(); } catch {}
  try { candidateWs.close(); } catch {}

  console.log(`\n  ${totalFailed === 0 ? green("ALL TESTS PASSED ✓") : red(`${totalFailed} TESTS FAILED ✗`)}\n`);

  // Exit with failure code if any failed
  process.exit(totalFailed > 0 ? 1 : 0);
}

// ─── Run ─────────────────────────────────────────────────
runInterview().catch((err) => {
  console.error(`\n${red("FATAL:")} ${err.message}`);
  process.exit(1);
});
