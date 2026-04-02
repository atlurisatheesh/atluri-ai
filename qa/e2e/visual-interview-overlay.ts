#!/usr/bin/env ts-node
/**
 * VISUAL INTERVIEW OVERLAY TEST
 * ─────────────────────────────
 * Opens a VISIBLE browser window showing the overlay page.
 * Mocks the Electron bridge so START works in a browser.
 * Connects a real WebSocket to the backend, sends interview
 * questions, and the AI-generated answers appear VISUALLY on the overlay.
 *
 * Usage:
 *   npx ts-node e2e/visual-interview-overlay.ts          # headed
 *   npx ts-node e2e/visual-interview-overlay.ts --headless  # CI mode
 */

import { chromium, Page, Browser } from "playwright";
import WebSocket from "ws";
import * as fs from "fs";
import * as path from "path";

// ── Config ──
const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:9010";
const WS_URL  = BACKEND.replace("http", "ws") + "/ws/voice";
const OVERLAY = process.env.OVERLAY_URL || "http://localhost:3001/overlay";
const HEADLESS = process.argv.includes("--headless");
const REPORTS_DIR = path.join(__dirname, "..", "reports");
const SCREENSHOTS_DIR = path.join(REPORTS_DIR, "screenshots");

// ── Interview rounds ──
const ROUNDS = [
  {
    id: "behavioral_intro",
    question: "Tell me about yourself and walk me through your experience as a software engineer.",
    delayBefore: 2000,
    displayTime: 15000,   // how long to show the answer on screen
  },
  {
    id: "system_design",
    question: "How would you design a real-time notification system that handles 10 million concurrent users with sub-second delivery latency?",
    delayBefore: 3000,
    displayTime: 18000,
  },
  {
    id: "star_behavioral",
    question: "Tell me about a time you had a critical production outage at 2 AM. What was the situation, what actions did you take, and what was the result?",
    delayBefore: 3000,
    displayTime: 18000,
  },
  {
    id: "coding_algo",
    question: "Can you explain how you would implement an LRU cache with O(1) get and put operations? Walk me through the data structures you would use.",
    delayBefore: 3000,
    displayTime: 18000,
  },
];

// ── Helpers ──
function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] ${msg}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function generateRoomId(): string {
  return "test-" + Math.random().toString(36).slice(2, 10);
}

// ── Main ──
(async () => {
  log("═══════════════════════════════════════════════════════");
  log("  VISUAL INTERVIEW OVERLAY TEST");
  log("  Mode: " + (HEADLESS ? "HEADLESS" : "HEADED (visible browser)"));
  log("═══════════════════════════════════════════════════════");

  // Ensure dirs exist
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  // ── Step 1: Verify backend ──
  log("Step 1: Checking backend...");
  try {
    const res = await fetch(`${BACKEND}/healthz`);
    const body = await res.json();
    log(`  Backend healthy: ${JSON.stringify(body).slice(0, 80)}`);
  } catch {
    log("  ✗ Backend is DOWN. Start it first: cd backend && python -m uvicorn app.main:app --port 9010");
    process.exit(1);
  }

  // ── Step 2: Launch browser ──
  log("Step 2: Launching browser...");
  const browser: Browser = await chromium.launch({
    headless: HEADLESS,
    args: [
      "--window-size=420,780",
      "--disable-web-security",       // allow WS cross-origin
      "--auto-open-devtools-for-tabs", // for debugging
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 420, height: 780 },
    colorScheme: "dark",
  });
  const page: Page = await context.newPage();

  // ── Step 3: Inject mock Electron bridge BEFORE page loads ──
  const roomId = generateRoomId();
  log(`Step 3: Injecting mock bridge (room: ${roomId})...`);

  await page.addInitScript((opts: { roomId: string; backend: string }) => {
    // This runs BEFORE React hydrates
    const wsCallbacks: Array<(msg: { type: string; data: any }) => void> = [];

    // Expose injection function for external control
    (window as any).__injectWS = (type: string, data: any) => {
      wsCallbacks.forEach((cb) => cb({ type, data }));
    };
    (window as any).__wsCallbackCount = () => wsCallbacks.length;
    (window as any).__roomId = opts.roomId;

    // Mock the full Electron bridge
    (window as any).atluriinDesktop = {
      // Settings
      getResume: async () => "Senior Software Engineer with 8+ years of experience in distributed systems, microservices, and real-time applications. Led teams of 5-12 engineers. Expert in Python, TypeScript, Go. Built systems handling 50M+ requests/day at scale.",
      getJobDescription: async () => "Senior Software Engineer at Google. Requirements: 5+ years experience, distributed systems, system design, strong coding skills.",
      getAllSettings: async () => ({
        sessionSetup: {
          company: "Google",
          position: "Senior Software Engineer",
          model: "gpt4o",
          interviewType: "behavioral",
          backendUrl: opts.backend,
          imageContext: "",
          procedures: "Step 1: Intro (5 min)\\nStep 2: Behavioral (20 min)\\nStep 3: Technical (25 min)\\nStep 4: Questions (10 min)",
          priorityQuestions: "Tell me about yourself\\nSystem design experience\\nConflict resolution",
        },
        settings: {
          responseLength: "concise",
          interviewLang: "English",
          aiResponseLang: "Auto",
          processTime: "medium",
          threshold: 0.33,
        },
      }),
      setResume: async () => {},
      setJobDescription: async () => {},
      setAllSettings: async () => {},

      // Loopback — the key mock! Returns success without audio
      startLoopback: async () => {
        console.log("[MOCK BRIDGE] startLoopback called — session active");
        return { ok: true };
      },
      stopLoopback: async () => {
        console.log("[MOCK BRIDGE] stopLoopback called");
        return { ok: true };
      },

      // WS message bridge — stores callbacks
      onWSMessage: (callback: (msg: { type: string; data: any }) => void) => {
        wsCallbacks.push(callback);
        console.log(`[MOCK BRIDGE] onWSMessage registered (${wsCallbacks.length} total)`);
        return () => {
          const idx = wsCallbacks.indexOf(callback);
          if (idx >= 0) wsCallbacks.splice(idx, 1);
        };
      },

      // Control handlers
      onControlMicMuted: () => () => {},

      // Stealth
      getStealthHealth: async () => ({
        score: 97,
        threat_level: "CLEAN",
        layers: [
          { name: "Content Protection", active: true },
          { name: "Process Masking", active: true },
          { name: "Proctoring Detection", active: true },
          { name: "Screen Capture Block", active: true },
          { name: "Window Cloak", active: true },
          { name: "Network Stealth", active: true },
        ],
      }),
      setOverlayStealth: async () => ({ ok: true }),

      // Window controls
      minimizeOverlay: () => {},
      hideAppWindow: async () => ({ ok: true }),
      showAppWindow: async () => ({ ok: true }),
      minimizeAppWindow: async () => ({ ok: true }),
    };

    console.log("[MOCK BRIDGE] window.atluriinDesktop injected successfully");
  }, { roomId, backend: BACKEND });

  // ── Step 4: Navigate to overlay ──
  log("Step 4: Opening overlay page...");
  await page.goto(OVERLAY, { waitUntil: "networkidle", timeout: 30000 });
  await sleep(2000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "01_setup_loaded.png") });
  log("  ✓ Overlay loaded — setup panel visible");

  // ── Step 5: Click START ──
  log("Step 5: Clicking START to enter live mode...");

  // The START button is a large button with play icon or text "START"
  // Try multiple selectors
  let startClicked = false;
  for (const sel of [
    'button:has-text("START")',
    'button:has-text("Start")',
    'button:has-text("start")',
    '[data-testid="start-button"]',
    'button.bg-cyan-500',
    'button >> text=/start/i',
  ]) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1000 })) {
        await btn.click();
        startClicked = true;
        log(`  ✓ Clicked START via selector: ${sel}`);
        break;
      }
    } catch {}
  }

  if (!startClicked) {
    // Try finding any button with Play icon or gradient background
    const allButtons = await page.locator("button").all();
    for (const btn of allButtons) {
      const text = await btn.textContent().catch(() => "");
      if (text && /start/i.test(text)) {
        await btn.click();
        startClicked = true;
        log(`  ✓ Clicked START via text scan: "${text?.trim().slice(0, 30)}"`);
        break;
      }
    }
  }

  if (!startClicked) {
    log("  ✗ Could not find START button. Taking debug screenshot...");
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "ERROR_no_start_button.png") });
    await browser.close();
    process.exit(1);
  }

  // Wait for live mode transition
  await sleep(3000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "02_live_mode.png") });

  // Verify we're in live mode — PhantomOverlay should be visible
  const cbCount = await page.evaluate(() => (window as any).__wsCallbackCount?.() || 0);
  log(`  Bridge callback registered: ${cbCount > 0 ? "YES ✓" : "NO ✗"}`);

  if (cbCount === 0) {
    log("  ✗ No WS callback registered. handleSessionStart may have failed.");
    log("  Attempting manual state injection...");

    // Force inject: dispatch a phantom start event
    await page.evaluate(() => {
      (window as any).__injectWS("answer_suggestion_start", { question: "Test" });
    });
    await sleep(500);
  }

  // ── Step 6: Connect WebSocket to backend ──
  log("Step 6: Connecting WebSocket to backend...");
  const wsUrl = `${WS_URL}?room_id=${roomId}&role=candidate&participant=interviewer&company=Google&position=Senior+Software+Engineer`;

  const ws = new WebSocket(wsUrl);
  let wsReady = false;
  let wsRoomId = "";

  // Per-round tracking — reset before each round
  let roundChunks: string[] = [];
  let roundGotStart = false;
  let roundGotDone = false;
  let roundFinalAnswer = "";
  let roundFirstChunkTime = 0;
  let roundStartTime = 0;
  let currentRoundQuestion = "";

  ws.on("open", () => {
    log("  ✓ WebSocket connected to backend");
    wsReady = true;
  });

  ws.on("message", async (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "room_assigned") {
        wsRoomId = msg.data?.room_id || msg.room_id || "";
        log(`  ✓ Room assigned: ${wsRoomId}`);
        return;
      }

      // Forward answer-related messages to the overlay in real-time
      // NOTE: Backend sends FLAT messages (msg.text, msg.chunk) NOT nested (msg.data.text)
      if (msg.type === "answer_suggestion_start") {
        roundGotStart = true;
        try {
          await page.evaluate((q: string) => {
            (window as any).__injectWS("answer_suggestion_start", {
              question: q,
              deepThink: false,
            });
          }, currentRoundQuestion);
        } catch {}
      }

      if (msg.type === "answer_suggestion_chunk") {
        const chunk = msg.chunk || msg.text || msg.delta || "";
        const isThinking = msg.is_thinking || false;
        if (chunk && !isThinking) {
          if (roundFirstChunkTime === 0) roundFirstChunkTime = Date.now();
          roundChunks.push(chunk);
          // Forward chunk to overlay — THIS makes the answer appear on screen
          try {
            await page.evaluate((text: string) => {
              (window as any).__injectWS("answer_suggestion_chunk", {
                text,
                chunk: text,
                is_thinking: false,
              });
            }, chunk);
          } catch {}
        }
      }

      if (msg.type === "answer_suggestion" || msg.type === "answer_suggestion_done") {
        roundGotDone = true;
        roundFinalAnswer = msg.suggestion || msg.answer || msg.text || roundChunks.join("");
        // Forward final answer to overlay
        try {
          await page.evaluate(
            (args: { text: string; question: string }) => {
              (window as any).__injectWS("answer_suggestion", {
                answer: args.text,
                text: args.text,
                question: args.question,
                keyPoints: [],
                avoidSaying: [],
                followUpPredictions: [],
                confidence: 0.85,
              });
            },
            { text: roundFinalAnswer, question: currentRoundQuestion }
          );
        } catch {}
      }

      if (msg.type === "question_intelligence") {
        try {
          await page.evaluate((data: any) => {
            (window as any).__injectWS("question_intelligence", data);
          }, msg);
        } catch {}
      }
    } catch {}
  });

  ws.on("error", (err: Error) => log(`  ✗ WS error: ${err.message}`));

  // Wait for WS connection
  for (let i = 0; i < 30 && !wsReady; i++) await sleep(200);
  if (!wsReady) {
    log("  ✗ WebSocket failed to connect");
    await browser.close();
    process.exit(1);
  }
  await sleep(1500); // wait for room_assigned

  // ── Step 7: Run interview rounds ──
  log("");
  log("═══════════════════════════════════════════════════════");
  log("  STARTING REAL INTERVIEW — 4 ROUNDS");
  log("═══════════════════════════════════════════════════════");

  const results: any[] = [];

  for (let i = 0; i < ROUNDS.length; i++) {
    const round = ROUNDS[i];
    log("");
    log(`──── ROUND ${i + 1}/${ROUNDS.length}: ${round.id} ────`);
    log(`  Interviewer asks: "${round.question.slice(0, 70)}..."`);

    await sleep(round.delayBefore);

    // Reset per-round tracking
    roundChunks = [];
    roundGotStart = false;
    roundGotDone = false;
    roundFinalAnswer = "";
    roundFirstChunkTime = 0;
    roundStartTime = Date.now();
    currentRoundQuestion = round.question;

    // Inject the interviewer's question as a transcript line on the overlay
    await page.evaluate((q: string) => {
      (window as any).__injectWS("transcript", {
        speaker: "Interviewer",
        text: q,
        timestamp: new Date().toISOString(),
        isQuestion: true,
        participant: "interviewer",
        is_final: true,
      });
    }, round.question);

    await sleep(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `03_round${i + 1}_question.png`),
    });
    log("  ✓ Question displayed on overlay transcript");

    // Send the transcript to backend via WS — triggers real AI answer generation
    ws.send(JSON.stringify({
      type: "transcript",
      text: round.question,
      participant: "interviewer",
      is_final: true,
      language: "en",
    }));
    log("  ✓ Transcript sent to backend — waiting for AI answer...");

    // Wait for answer to complete (max 60s)
    const maxWait = 60000;
    const waitStart = Date.now();
    while (!roundGotDone && Date.now() - waitStart < maxWait) {
      await sleep(300);
    }

    const genTime = Date.now() - roundStartTime;
    const ttft = roundFirstChunkTime ? roundFirstChunkTime - roundStartTime : -1;
    const answerText = roundFinalAnswer || roundChunks.join("");
    const wordCount = answerText.split(/\s+/).filter(Boolean).length;

    // Take screenshot showing the answer on screen
    await sleep(1000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `04_round${i + 1}_answer.png`),
    });

    // Wait display time so user can see the answer
    if (!HEADLESS) {
      log(`  ⏳ Displaying answer for ${round.displayTime / 1000}s (watch the browser!)...`);
      await sleep(round.displayTime);
    }

    const passed = roundGotDone && wordCount >= 20;
    const status = passed ? "✓ PASS" : "✗ FAIL";

    log(`  ${status} | Words: ${wordCount} | TTFT: ${ttft}ms | Gen: ${genTime}ms | Chunks: ${roundChunks.length}`);
    if (answerText.length > 0) {
      log(`  Answer preview: "${answerText.slice(0, 120)}..."`);
    }

    results.push({
      round: i + 1,
      id: round.id,
      question: round.question,
      passed,
      wordCount,
      ttft,
      genTime,
      chunkCount: roundChunks.length,
      answerPreview: answerText.slice(0, 200),
    });
  }

  // ── Step 8: Final screenshot and summary ──
  log("");
  log("═══════════════════════════════════════════════════════");
  log("  INTERVIEW COMPLETE — RESULTS");
  log("═══════════════════════════════════════════════════════");

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "05_final_overlay.png"),
    fullPage: true,
  });

  const passCount = results.filter((r) => r.passed).length;
  const totalRounds = results.length;

  for (const r of results) {
    const sym = r.passed ? "✓" : "✗";
    log(`  ${sym} Round ${r.round} (${r.id}): ${r.wordCount} words, TTFT ${r.ttft}ms, Gen ${r.genTime}ms`);
  }

  log("");
  log(`  TOTAL: ${passCount}/${totalRounds} passed`);

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    mode: HEADLESS ? "headless" : "headed",
    backend: BACKEND,
    results,
    summary: { passed: passCount, total: totalRounds },
  };
  const reportPath = path.join(REPORTS_DIR, `Visual_Interview_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`  Report: ${reportPath}`);
  log(`  Screenshots: ${SCREENSHOTS_DIR}/`);

  // Cleanup
  ws.close();
  if (HEADLESS) {
    await browser.close();
  } else {
    log("");
    log("  Browser left open for inspection. Press Ctrl+C to close.");
    // Keep alive
    await new Promise(() => {});
  }
})().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
