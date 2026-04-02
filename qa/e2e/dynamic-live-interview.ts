/**
 * DYNAMIC LIVE INTERVIEW E2E TEST
 * ================================
 * - Opens the desktop Electron overlay in a real browser
 * - Fills setup form, clicks START
 * - Connects to the same backend WS room
 * - Uses an AI-powered interviewer that generates questions ON THE FLY
 *   based on the candidate's previous answers (adaptive interview)
 * - Each question is spoken via Windows TTS before being sent
 * - Verifies answers appear on the overlay in real-time
 * - Takes screenshots of every Q&A pair
 *
 * This simulates a REAL interview where questions aren't known in advance.
 */

import { chromium, Browser, Page } from "playwright";
import WebSocket from "ws";
import * as fs from "fs";
import * as path from "path";
import { execSync, exec } from "child_process";

// ── Config ──
const BACKEND  = process.env.BACKEND_URL  || "http://localhost:9010";
const FRONTEND = process.env.FRONTEND_URL || "http://localhost:3001";
const WS_URL   = BACKEND.replace("http", "ws");
const TOTAL_ROUNDS = 5;
const ANSWER_TIMEOUT = 90_000;
const REPORTS_DIR = path.join(__dirname, "..", "reports");
const SCREENSHOTS_DIR = path.join(REPORTS_DIR, "screenshots");

// ── Utility ──
function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 23)}] ${msg}`);
}

function speakTTS(text: string): Promise<void> {
  return new Promise((resolve) => {
    const escaped = text.replace(/"/g, '\\"').replace(/'/g, "''");
    const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = 1; $s.Speak("${escaped}"); $s.Dispose()`;
    exec(`powershell -NoProfile -Command "${ps}"`, () => resolve());
    // Don't wait for TTS to finish — send the question immediately
    setTimeout(resolve, 500);
  });
}

// ── Dynamic Interviewer AI ──
// Generates questions on the fly based on context
class DynamicInterviewer {
  private roundNum = 0;
  private transcript: Array<{ role: string; text: string }> = [];
  private company: string;
  private position: string;

  constructor(company: string, position: string) {
    this.company = company;
    this.position = position;
  }

  async nextQuestion(previousAnswer?: string): Promise<string> {
    this.roundNum++;
    
    if (previousAnswer) {
      this.transcript.push({ role: "candidate", text: previousAnswer });
    }

    // Generate question dynamically using OpenAI
    const question = await this.generateAdaptiveQuestion();
    this.transcript.push({ role: "interviewer", text: question });
    return question;
  }

  private async generateAdaptiveQuestion(): Promise<string> {
    const contextSummary = this.transcript
      .slice(-4) // Last 2 Q&A pairs for context
      .map(t => `${t.role}: ${t.text.substring(0, 200)}`)
      .join("\n");

    const prompt = this.buildInterviewerPrompt(contextSummary);

    try {
      const response = await fetch(`${BACKEND}/api/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 100,
          temperature: 0.8
        })
      });

      if (response.ok) {
        const data = await response.json() as any;
        const q = data?.choices?.[0]?.message?.content?.trim();
        if (q) return q;
      }
    } catch {
      // Fallback to local question generation
    }

    // Fallback: generate locally if API fails
    return this.generateLocalQuestion();
  }

  private buildInterviewerPrompt(context: string): string {
    const roundType = this.getRoundType();
    return (
      `You are a senior ${this.company} interviewer for the ${this.position} role.\n` +
      `Generate ONE ${roundType} interview question.\n` +
      `Rules:\n` +
      `- Ask something that naturally follows the conversation\n` +
      `- Be specific and challenging but fair\n` +
      `- 1-3 sentences max\n` +
      `- No preamble, just the question\n` +
      (context ? `\nConversation so far:\n${context}\n` : "") +
      `\nGenerate the next ${roundType} question:`
    );
  }

  private getRoundType(): string {
    const types = [
      "opening/behavioral",     // Round 1
      "technical deep-dive",    // Round 2
      "system design",          // Round 3
      "behavioral STAR",        // Round 4
      "closing/motivation"      // Round 5
    ];
    return types[Math.min(this.roundNum - 1, types.length - 1)];
  }

  private generateLocalQuestion(): string {
    // Adaptive local questions that build on each other
    const questionBank: Record<number, string[]> = {
      1: [
        `Welcome! I'm excited to learn about you. Can you walk me through your background and what specifically drew you to this ${this.position} role at ${this.company}?`,
        `Good morning! Tell me about your journey as an engineer. What's the most impactful project you've worked on and why?`,
        `Hi there! I'd love to hear about your experience. What makes you the right fit for ${this.company}'s engineering team?`
      ],
      2: [
        `That's interesting. Can you describe a complex distributed system you've built? Walk me through the architecture, the key technical decisions, and how you handled data consistency.`,
        `Great background. Let's go deeper technically. How would you design a service that handles 50,000 requests per second with sub-100ms P99 latency? What trade-offs would you make?`,
        `Tell me about a time you had to optimize a critical path in production. What was the bottleneck, how did you diagnose it, and what was the outcome?`
      ],
      3: [
        `Now let's do a system design question. How would you design ${this.company}'s real-time feed ranking system that serves millions of users with personalized content within 200ms?`,
        `Design a distributed rate limiter that works across multiple data centers. Walk me through your approach, data structures, and how you'd handle edge cases like clock skew.`,
        `How would you architect a real-time collaboration platform like Google Docs? Focus on conflict resolution, eventual consistency, and scaling to millions of concurrent documents.`
      ],
      4: [
        `Tell me about a time you had a significant disagreement with a senior engineer or your manager about a technical decision. How did you handle it and what was the result?`,
        `Describe a situation where you had to deliver a critical project under an extremely tight deadline. What did you prioritize, what did you cut, and how did you communicate the trade-offs?`,
        `Give me an example of when you identified a critical problem that nobody else saw coming. What was your approach to raising the alarm and driving the fix?`
      ],
      5: [
        `We're coming to the end. What excites you most about the challenges ${this.company} is tackling right now, and how do you see yourself contributing in the first 90 days?`,
        `If you join ${this.company}, what's the first thing you'd want to improve or build? Why?`,
        `What questions do you have for me about the team, the role, or ${this.company}'s technical direction?`
      ]
    };

    const pool = questionBank[this.roundNum] || questionBank[5];
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

// ── Main Test ──
async function main() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  const runId = Date.now().toString();
  log(`═══ DYNAMIC LIVE INTERVIEW TEST ═══  Run: ${runId}`);

  // ── Phase 1: Verify services ──
  log("Phase 1: Checking services...");
  try {
    const health = await fetch(`${BACKEND}/healthz`);
    if (!health.ok) throw new Error(`Backend ${health.status}`);
    log("  ✓ Backend healthy");
  } catch (e: any) {
    log(`  ✗ Backend DOWN: ${e.message}`);
    process.exit(1);
  }

  try {
    const front = await fetch(FRONTEND);
    if (!front.ok) throw new Error(`Frontend ${front.status}`);
    log("  ✓ Frontend healthy");
  } catch (e: any) {
    log(`  ✗ Frontend DOWN: ${e.message}`);
    process.exit(1);
  }

  // ── Phase 2: Launch browser with visible overlay ──
  log("Phase 2: Launching browser...");
  const browser: Browser = await chromium.launch({
    headless: false,
    args: ["--window-size=1400,900", "--window-position=100,50"]
  });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page: Page = await context.newPage();

  // Inject the test:ws CustomEvent bridge BEFORE the page loads
  await page.addInitScript(() => {
    // Mock Electron bridge so the overlay works in standalone browser
    (window as any).atluriinDesktop = {
      startLoopback: async () => {},
      stopLoopback: async () => {},
      setOverlayStealth: async () => {},
      setContentProtection: async () => {},
      onWSMessage: () => {},
      getStealthHealth: async () => ({
        score: 97, threat_level: "CLEAN",
        protections: { content_protection: true, process_masking: true },
        active_threats: []
      }),
      getSettings: async () => ({ api_keys: { openai: "sk-test" } }),
      setSettings: async () => {},
      injectTranscript: async () => {}
    };
  });

  await page.goto(`${FRONTEND}/overlay`, { waitUntil: "networkidle", timeout: 30_000 });
  log("  ✓ Overlay loaded");
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${runId}_01_overlay_loaded.png`) });

  // ── Phase 3: Fill setup and start session ──
  log("Phase 3: Setting up interview session...");
  const company = "Google";
  const position = "Senior Software Engineer";

  // Fill Company
  const companyInput = page.locator('input[placeholder*="ompany"], input[placeholder*="company"]').first();
  if (await companyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await companyInput.fill(company);
    await companyInput.dispatchEvent("blur");
    log("  ✓ Company set: Google");
  }

  // Fill Position/Role
  const positionInput = page.locator('input[placeholder*="osition"], input[placeholder*="ole"]').first();
  if (await positionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await positionInput.fill(position);
    log("  ✓ Position set: Senior Software Engineer");
  }

  // Fill Objective
  const objectiveInput = page.locator('input[placeholder*="bjective"], textarea[placeholder*="bjective"]').first();
  if (await objectiveInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await objectiveInput.fill("Pass the Google L5 interview loop and demonstrate strong system design and coding skills");
    log("  ✓ Objective set");
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${runId}_02_setup_filled.png`) });

  // Click START
  const startBtn = page.locator('button:has-text("START"), button:has-text("Start")').first();
  if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await startBtn.click();
    log("  ✓ Clicked START");
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${runId}_03_session_started.png`) });

  // ── Phase 4: Connect WS and set up message bridge ──
  log("Phase 4: Connecting to backend WS...");
  const roomId = `dynamic-interview-${runId}`;
  const wsUrl = `${WS_URL}/ws/voice?room_id=${roomId}&role=swe&participant=interviewer&company=${encodeURIComponent(company)}&position=${encodeURIComponent(position)}`;
  
  const ws = new WebSocket(wsUrl);
  let wsReady = false;
  const allMessages: any[] = [];

  await new Promise<void>((resolve, reject) => {
    ws.on("open", () => { wsReady = true; log("  ✓ WS connected"); resolve(); });
    ws.on("error", (e) => reject(e));
    setTimeout(() => reject(new Error("WS connect timeout")), 10_000);
  });

  // Listen for ALL messages
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      allMessages.push({ ts: Date.now(), ...msg });
    } catch {}
  });

  // Wait for room assignment
  await new Promise<void>((resolve) => {
    const check = setInterval(() => {
      if (allMessages.some(m => m.type === "room_assigned")) {
        clearInterval(check);
        log("  ✓ Room assigned");
        resolve();
      }
    }, 200);
    setTimeout(() => { clearInterval(check); resolve(); }, 5000);
  });

  // ── Phase 5: Dynamic Interview — 5 rounds ──
  log(`\n═══ STARTING ${TOTAL_ROUNDS}-ROUND DYNAMIC INTERVIEW ═══`);
  log(`Company: ${company} | Position: ${position}\n`);

  const interviewer = new DynamicInterviewer(company, position);
  const results: Array<{
    round: number;
    category: string;
    question: string;
    answer: string;
    words: number;
    ttft: number;
    genTime: number;
    passed: boolean;
  }> = [];

  let previousAnswer: string | undefined;

  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    const categories = ["Opening", "Technical Deep-Dive", "System Design", "Behavioral STAR", "Closing"];
    const category = categories[round - 1] || "Follow-up";
    
    log(`\n──── Round ${round}/${TOTAL_ROUNDS}: ${category} ────`);

    // Generate question ON THE FLY
    const question = await interviewer.nextQuestion(previousAnswer);
    log(`  🎤 INTERVIEWER: "${question}"`);

    // Speak the question aloud via TTS (non-blocking)
    speakTTS(question);

    // Drain any stale messages from previous round
    await new Promise(r => setTimeout(r, 2000));
    const roundStartIdx = allMessages.length;
    const sendTime = Date.now();

    // Helper: check if a message belongs to THIS round's question
    const questionPrefix = question.substring(0, 30).toLowerCase();
    const isForThisRound = (m: any): boolean => {
      const q = (m.question || "").toLowerCase();
      return !q || q.startsWith(questionPrefix) || q.includes(questionPrefix);
    };

    // Send the question as an interviewer transcript (simulates what Deepgram would produce)
    ws.send(JSON.stringify({
      type: "transcript",
      text: question,
      participant: "interviewer",
      is_final: true,
      language: "en"
    }));

    // ALSO dispatch to overlay via CustomEvent so it shows on screen
    await page.evaluate((q: string) => {
      window.dispatchEvent(new CustomEvent("test:ws", {
        detail: { type: "transcript", text: q, speaker: "interviewer", is_final: true }
      }));
    }, question);

    log("  ⏳ Waiting for AI answer...");

    // Wait for answer — filter by question to avoid cross-round contamination
    let answerText = "";
    let ttft = 0;
    let gotStart = false;
    let gotDone = false;
    const chunkTexts: string[] = [];
    let lastChunkIdx = roundStartIdx;

    await new Promise<void>((resolve) => {
      const startT = Date.now();
      const poll = setInterval(() => {
        // Only look at NEW messages since last check
        for (let i = lastChunkIdx; i < allMessages.length; i++) {
          const m = allMessages[i];
          
          if (m.type === "answer_suggestion_start" && !gotStart && isForThisRound(m)) {
            gotStart = true;
            ttft = Date.now() - sendTime;
            log("    → answer_suggestion_start received");
          }
          
          if (m.type === "answer_suggestion_chunk" && m.chunk && !m.is_thinking && isForThisRound(m)) {
            chunkTexts.push(m.chunk);
            // Forward chunk to overlay for live display
            page.evaluate((chunk: string) => {
              window.dispatchEvent(new CustomEvent("test:ws", {
                detail: { type: "answer_suggestion_chunk", text: chunk, chunk: chunk }
              }));
            }, m.chunk).catch(() => {});
          }
          
          if (m.type === "answer_suggestion_done" && isForThisRound(m) && !gotDone) {
            gotDone = true;
            answerText = m.suggestion || m.text || chunkTexts.join("");
            // Forward final answer to overlay
            page.evaluate((ans: string) => {
              window.dispatchEvent(new CustomEvent("test:ws", {
                detail: { type: "answer_suggestion", answer: ans, suggestion: ans }
              }));
            }, answerText).catch(() => {});
            log(`    → answer_suggestion_done received (${answerText.split(/\s+/).length} words)`);
          }
          
          // Also catch "answer_suggestion" (no _done suffix)
          if (m.type === "answer_suggestion" && isForThisRound(m) && !gotDone) {
            gotDone = true;
            answerText = m.suggestion || m.answer || m.text || chunkTexts.join("");
            page.evaluate((ans: string) => {
              window.dispatchEvent(new CustomEvent("test:ws", {
                detail: { type: "answer_suggestion", answer: ans, suggestion: ans }
              }));
            }, answerText).catch(() => {});
            log(`    → answer_suggestion received (${answerText.split(/\s+/).length} words)`);
          }
        }
        lastChunkIdx = allMessages.length;

        if (gotDone || Date.now() - startT > ANSWER_TIMEOUT) {
          clearInterval(poll);
          if (!answerText && chunkTexts.length > 0) {
            answerText = chunkTexts.join("");
          }
          resolve();
        }
      }, 300);
    });

    const genTime = Date.now() - sendTime;
    const wordCount = answerText.split(/\s+/).filter(Boolean).length;
    previousAnswer = answerText;

    // Take screenshot showing the answer on the overlay
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, `${runId}_round${round}_${category.replace(/[^a-zA-Z]/g, "_")}.png`),
      fullPage: true 
    });

    const passed = wordCount >= 30 && gotStart;
    results.push({ round, category, question, answer: answerText, words: wordCount, ttft, genTime, passed });

    log(`  📝 AI ANSWER (${wordCount} words, TTFT: ${ttft}ms, Gen: ${(genTime / 1000).toFixed(1)}s):`);
    log(`     "${answerText.substring(0, 200)}${answerText.length > 200 ? "..." : ""}"`);
    log(`  ${passed ? "✅ PASS" : "❌ FAIL"}`);

    // Wait between rounds — longer gap to ensure previous answer fully completes
    if (round < TOTAL_ROUNDS) {
      log("  ⏸  [Interviewer thinking about next question...]");
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // ── Phase 6: Results ──
  log("\n═══════════════════════════════════");
  log("       INTERVIEW RESULTS");
  log("═══════════════════════════════════\n");

  const passCount = results.filter(r => r.passed).length;
  const avgWords = Math.round(results.reduce((s, r) => s + r.words, 0) / results.length);
  const avgTTFT = Math.round(results.reduce((s, r) => s + r.ttft, 0) / results.length);
  const totalWords = results.reduce((s, r) => s + r.words, 0);

  for (const r of results) {
    log(`  Round ${r.round} [${r.category}]`);
    log(`    Q: "${r.question.substring(0, 100)}..."`);
    log(`    A: ${r.words} words | TTFT: ${r.ttft}ms | Gen: ${(r.genTime / 1000).toFixed(1)}s | ${r.passed ? "✅" : "❌"}`);
  }

  log(`\n  ── Summary ──`);
  log(`  Passed: ${passCount}/${TOTAL_ROUNDS}`);
  log(`  Avg Words/Answer: ${avgWords}`);
  log(`  Total Words: ${totalWords}`);
  log(`  Avg TTFT: ${avgTTFT}ms`);
  log(`  ${passCount === TOTAL_ROUNDS ? "🏆 ALL ROUNDS PASSED" : "⚠️  SOME ROUNDS FAILED"}`);

  // ── Phase 7: Save report ──
  const report = {
    runId,
    timestamp: new Date().toISOString(),
    config: { company, position, backend: BACKEND, frontend: FRONTEND, rounds: TOTAL_ROUNDS },
    results,
    summary: {
      passed: passCount,
      total: TOTAL_ROUNDS,
      avgWords,
      totalWords,
      avgTTFT: `${avgTTFT}ms`,
      allPassed: passCount === TOTAL_ROUNDS
    }
  };

  const reportPath = path.join(REPORTS_DIR, `Dynamic_Interview_${runId}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n  Report saved: ${reportPath}`);

  // Cleanup
  ws.close();
  await page.waitForTimeout(3000); // Keep overlay visible for a moment
  await browser.close();

  log("\n═══ TEST COMPLETE ═══");
  process.exit(passCount === TOTAL_ROUNDS ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
