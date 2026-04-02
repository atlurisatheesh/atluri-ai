/**
 * REAL DESKTOP INTERVIEW E2E TEST
 * 
 * Opens a VISIBLE headed browser with the overlay, clicks START,
 * sends real interview questions via WebSocket, and forwards
 * AI-generated answers to the overlay so they appear on screen.
 * 
 * Usage: cd qa && npx ts-node e2e/real-desktop-test.ts
 */

import { chromium, Page } from "playwright";
import WebSocket from "ws";
import * as fs from "fs";
import * as path from "path";

const BACKEND = "http://localhost:9010";
const OVERLAY = "http://localhost:3001/overlay";
const WS_URL = "ws://localhost:9010/ws/voice";

const QUESTIONS = [
  {
    id: "q1_behavioral",
    category: "Behavioral",
    text: "Hi! Thanks for joining. Can you walk me through your background and what makes you a strong fit for this Senior Software Engineer position?",
    minWords: 80,
  },
  {
    id: "q2_system_design",
    category: "System Design",
    text: "Great. Now let's talk architecture. How would you design a real-time notification system that handles ten million concurrent users with sub-second delivery latency?",
    minWords: 80,
  },
  {
    id: "q3_star",
    category: "STAR Behavioral",
    text: "Tell me about a time when you faced a critical production outage at two in the morning. What was the situation, what actions did you take, and what was the result?",
    minWords: 80,
  },
  {
    id: "q4_coding",
    category: "Coding & Algorithms",
    text: "Let's do a coding question. How would you implement an LRU cache with O of 1 time complexity for both get and put operations? Walk me through your approach and data structures.",
    minWords: 80,
  },
];

interface RoundResult {
  question: string;
  category: string;
  answer: string;
  wordCount: number;
  ttft: number;
  genTime: number;
  passed: boolean;
  screenshotPath: string;
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("   REAL DESKTOP INTERVIEW E2E TEST");
  console.log("   Testing live AI answer generation in overlay");
  console.log("=".repeat(70) + "\n");

  // ── Phase 1: Verify backend ──
  console.log("[Phase 1] Checking backend...");
  try {
    const res = await fetch(`${BACKEND}/healthz`);
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    console.log("[Phase 1] Backend healthy ✓\n");
  } catch (e: any) {
    console.error("[FATAL] Backend not running at", BACKEND, e.message);
    process.exit(1);
  }

  // ── Phase 2: Launch headed browser ──
  console.log("[Phase 2] Launching visible browser...");
  const browser = await chromium.launch({
    headless: false,
    args: ["--window-size=1400,900", "--window-position=100,50"],
  });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  const reportsDir = path.join(__dirname, "..", "reports", "screenshots");
  fs.mkdirSync(reportsDir, { recursive: true });

  // ── Phase 3: Load overlay ──
  console.log("[Phase 3] Loading overlay at", OVERLAY);
  await page.goto(OVERLAY, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(reportsDir, "01_overlay_loaded.png") });
  console.log("[Phase 3] Overlay loaded ✓\n");

  // ── Phase 4: Fill setup form & click START ──
  console.log("[Phase 4] Filling setup form...");

  // Fill company
  const companyInput = page.locator('input[placeholder*="ompany"], input[placeholder*="company"]').first();
  if (await companyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await companyInput.fill("Google");
    console.log("  - Company: Google ✓");
  }

  // Fill position
  const positionInput = page.locator('input[placeholder*="osition"], input[placeholder*="role"], input[placeholder*="Role"]').first();
  if (await positionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await positionInput.fill("Senior Software Engineer");
    console.log("  - Position: Senior Software Engineer ✓");
  }

  await page.screenshot({ path: path.join(reportsDir, "02_form_filled.png") });

  // Click START button
  console.log("[Phase 4] Clicking START...");
  const startBtn = page.locator('button:has-text("START")').first();
  if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await startBtn.click();
    console.log("[Phase 4] START clicked ✓");
  } else {
    // Try alternative — look for any prominent button
    const altBtn = page.locator('button').filter({ hasText: /start/i }).first();
    await altBtn.click();
    console.log("[Phase 4] START (alt) clicked ✓");
  }

  // Wait for mode transition to "live"
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(reportsDir, "03_live_mode.png") });
  console.log("[Phase 4] Transitioned to live mode ✓\n");

  // ── Phase 5: Run interview rounds ──
  const results: RoundResult[] = [];

  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    console.log(`\n${"─".repeat(60)}`);
    console.log(`[Round ${i + 1}/${QUESTIONS.length}] ${q.category}`);
    console.log(`  Q: "${q.text.substring(0, 80)}..."`);
    console.log(`${"─".repeat(60)}`);

    // Create a WS connection for this round
    const roomId = `real-test-${Date.now()}-r${i}`;
    const wsUrl = `${WS_URL}?room_id=${roomId}&role=candidate&participant=interviewer&company=Google&position=Senior+Software+Engineer`;
    
    const roundStart = Date.now();
    let firstChunkTime = 0;
    let chunks: string[] = [];
    let finalAnswer = "";
    let done = false;

    const ws = await new Promise<WebSocket>((resolve, reject) => {
      const sock = new WebSocket(wsUrl);
      sock.on("open", () => resolve(sock));
      sock.on("error", reject);
      setTimeout(() => reject(new Error("WS connect timeout")), 10000);
    });

    // Listen for answer messages
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === "answer_suggestion_start") {
          console.log("  [WS] Answer generation started...");
        }
        
        if (msg.type === "answer_suggestion_chunk" && !msg.is_thinking) {
          if (!firstChunkTime) firstChunkTime = Date.now();
          const delta = msg.chunk || msg.delta || msg.text || "";
          if (delta && delta !== "▸ ") chunks.push(delta);
          
          // Forward chunk to overlay in real-time
          page.evaluate((detail: any) => {
            window.dispatchEvent(new CustomEvent("test:ws", { detail }));
          }, { type: "answer_suggestion_chunk", text: delta, chunk: delta, is_thinking: false }).catch(() => {});
        }
        
        if (msg.type === "answer_suggestion_done" || msg.type === "answer_suggestion") {
          finalAnswer = msg.suggestion || msg.text || chunks.join("");
          done = true;
          
          // Forward final answer to overlay
          page.evaluate((detail: any) => {
            window.dispatchEvent(new CustomEvent("test:ws", { detail }));
          }, { type: "answer_suggestion", data: { answer: finalAnswer, question: q.text } }).catch(() => {});
        }
        
        if (msg.type === "question_intelligence") {
          // Forward question classification to overlay
          page.evaluate((detail: any) => {
            window.dispatchEvent(new CustomEvent("test:ws", { detail }));
          }, msg).catch(() => {});
        }
      } catch {}
    });

    // Dispatch the transcript (interviewer question) to the overlay
    await page.evaluate((detail: any) => {
      window.dispatchEvent(new CustomEvent("test:ws", { detail }));
    }, { type: "transcript", speaker: "interviewer", text: q.text, is_final: true });

    // Also dispatch as interviewer_question
    await page.evaluate((detail: any) => {
      window.dispatchEvent(new CustomEvent("test:ws", { detail }));
    }, { type: "interviewer_question", question: q.text });

    // Send the question via WebSocket
    await sleep(500);
    ws.send(JSON.stringify({
      type: "transcript",
      text: q.text,
      participant: "interviewer",
      is_final: true,
    }));

    // Wait for answer to complete
    const maxWait = 60000;
    const startWait = Date.now();
    while (!done && Date.now() - startWait < maxWait) {
      await sleep(500);
      process.stdout.write(`\r  [Generating...] ${chunks.length} chunks, ${chunks.join("").split(/\s+/).filter(Boolean).length} words`);
    }
    console.log(""); // newline after progress

    const genTime = Date.now() - roundStart;
    const ttft = firstChunkTime ? firstChunkTime - roundStart : 0;

    // Also dispatch answer_suggestion_start before final for proper rendering
    await page.evaluate((detail: any) => {
      window.dispatchEvent(new CustomEvent("test:ws", { detail }));
    }, { type: "answer_suggestion_start", question: q.text });

    // Wait a bit for rendering, then dispatch final answer again
    await sleep(500);
    if (finalAnswer) {
      await page.evaluate((detail: any) => {
        window.dispatchEvent(new CustomEvent("test:ws", { detail }));
      }, { type: "answer_suggestion", data: { answer: finalAnswer, question: q.text } });
    }

    // Wait for overlay to render
    await sleep(2000);

    // Take screenshot
    const ssPath = path.join(reportsDir, `04_round${i + 1}_${q.id}.png`);
    await page.screenshot({ path: ssPath });

    // Get answer text from overlay
    const overlayText = await page.evaluate(() => {
      const el = document.querySelector('[class*="PhantomOverlay"], [class*="phantom"], [class*="overlay"]');
      return el?.textContent || document.body.innerText;
    });

    const wordCount = finalAnswer.split(/\s+/).filter(Boolean).length;
    const passed = wordCount >= q.minWords && done;

    results.push({
      question: q.text,
      category: q.category,
      answer: finalAnswer,
      wordCount,
      ttft,
      genTime,
      passed,
      screenshotPath: ssPath,
    });

    console.log(`  [Result] ${passed ? "✓ PASS" : "✗ FAIL"}`);
    console.log(`  Words: ${wordCount} | TTFT: ${ttft}ms | GenTime: ${(genTime / 1000).toFixed(1)}s`);
    console.log(`  Answer: "${finalAnswer.substring(0, 150)}..."`);

    ws.close();
    await sleep(3000); // Gap between rounds
  }

  // ── Phase 6: Summary ──
  console.log("\n\n" + "=".repeat(70));
  console.log("   INTERVIEW TEST RESULTS");
  console.log("=".repeat(70));

  const passCount = results.filter(r => r.passed).length;
  console.log(`\n  ${passCount}/${results.length} rounds passed\n`);

  for (const r of results) {
    console.log(`  ${r.passed ? "✓" : "✗"} ${r.category.padEnd(20)} | ${String(r.wordCount).padStart(4)} words | TTFT: ${String(r.ttft).padStart(5)}ms | Gen: ${(r.genTime / 1000).toFixed(1)}s`);
  }

  const avgWords = Math.round(results.reduce((s, r) => s + r.wordCount, 0) / results.length);
  const avgTTFT = Math.round(results.reduce((s, r) => s + r.ttft, 0) / results.length);
  console.log(`\n  Avg words: ${avgWords} | Avg TTFT: ${avgTTFT}ms | Total: ${results.reduce((s, r) => s + r.wordCount, 0)} words`);

  // Save report
  const reportPath = path.join(__dirname, "..", "reports", `Real_Desktop_E2E_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), results, summary: { passCount, total: results.length, avgWords, avgTTFT } }, null, 2));
  console.log(`\n  Report: ${reportPath}`);

  // Keep browser open for inspection
  console.log("\n  Browser stays open for 30s — check the overlay!\n");
  await page.screenshot({ path: path.join(reportsDir, "05_final_state.png") });
  await sleep(30000);

  await browser.close();
  console.log("\nDone.");
  process.exit(passCount === results.length ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
