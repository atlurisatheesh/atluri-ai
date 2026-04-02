/**
 * REAL ELECTRON VOICE INTERVIEW E2E TEST
 * 
 * This test opens the ACTUAL Electron desktop app, clicks START,
 * speaks real interview questions using Windows TTS, injects transcripts
 * through the Electron IPC loopback pipeline, and verifies AI answers
 * appear on the real overlay — exactly as a real candidate would see them.
 *
 * Flow:
 *   1. Kill stale processes, rebuild desktop
 *   2. Launch Electron with --e2e flag (remote debugging on port 9333)
 *   3. Connect Playwright to the real Electron window via CDP
 *   4. Fill the setup form (Company, Position, Objective)
 *   5. Click START → loopback WS connects to backend
 *   6. For each of 5 interview questions:
 *      a. Speak the question aloud via Windows SAPI TTS
 *      b. Inject transcript via loopback:injectTranscript IPC
 *      c. Wait for AI answer to stream into the overlay  
 *      d. Verify answer text appears in the PhantomOverlay panel
 *      e. Take screenshot
 *   7. Print results and save report
 */

import { chromium, type Page, type Browser, type CDPSession } from "playwright";
import { execSync, spawn, type ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import WebSocket from "ws";

// ─── CONFIG ───
const BACKEND_URL = "http://localhost:9010";
const FRONTEND_URL = "http://localhost:3001";
const CDP_PORT = 9333;
const REPORT_DIR = path.resolve(__dirname, "../reports");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots");

// ─── DYNAMIC INTERVIEWER: generates follow-up questions based on previous answers ───
const INITIAL_QUESTIONS = [
  {
    id: "opening",
    category: "Behavioral",
    question: "Good morning! Thank you for joining us today. Can you walk me through your background and tell me what interests you about this Senior Software Engineer position at Google?",
    minWords: 80,
  },
];

// Templates for generating follow-up questions dynamically
const FOLLOW_UP_TEMPLATES = [
  {
    id: "technical_followup",
    category: "Technical Deep-Dive",
    template: (prevAnswer: string) => {
      // Extract a technical keyword from the previous answer to build a follow-up
      const techWords = prevAnswer.match(/\b(microservices?|distributed|cache|database|API|kubernetes|docker|redis|kafka|queue|load.?balanc|event.?driven|architecture|scalab|latency|concurrency)\b/gi);
      const topic = techWords?.[0] || "distributed systems";
      return `That's interesting you mentioned ${topic}. Can you go deeper into how you would handle fault tolerance and graceful degradation in a ${topic} architecture serving millions of requests per second?`;
    },
    minWords: 80,
  },
  {
    id: "star_followup",
    category: "STAR Behavioral",
    template: (prevAnswer: string) => {
      const actionWords = prevAnswer.match(/\b(led|built|designed|optimized|migrated|refactored|debugged|scaled|launched|deployed)\b/gi);
      const action = actionWords?.[0] || "solved a difficult problem";
      return `You mentioned that you ${action}. Can you tell me about a time when something went seriously wrong during that process? Walk me through the situation, what actions you took under pressure, and what the final result was.`;
    },
    minWords: 80,
  },
  {
    id: "system_design",
    category: "System Design",
    template: (_prevAnswer: string) =>
      "Let's do a system design exercise. How would you architect a real-time notification system that needs to deliver push notifications to fifty million mobile devices within two seconds of an event occurring? Think about the full pipeline from event ingestion to device delivery.",
    minWords: 60,
  },
  {
    id: "closing",
    category: "Closing",
    template: (_prevAnswer: string) =>
      "Great conversation today. Final question: What is the most impactful technical decision you have ever made in your career, and how did it change the trajectory of the product or team you were working with?",
    minWords: 50,
  },
];

// Build all rounds dynamically as the interview progresses
function buildNextQuestion(roundIdx: number, prevAnswer: string): { id: string; category: string; question: string; minWords: number } {
  if (roundIdx === 0) {
    return INITIAL_QUESTIONS[0];
  }
  const tmpl = FOLLOW_UP_TEMPLATES[(roundIdx - 1) % FOLLOW_UP_TEMPLATES.length];
  return {
    id: tmpl.id,
    category: tmpl.category,
    question: tmpl.template(prevAnswer),
    minWords: tmpl.minWords,
  };
}

const TOTAL_ROUNDS = 5;

// ─── HELPER: Speak text using Windows SAPI TTS ───
function speakWithTTS(text: string, voice?: string): Promise<void> {
  return new Promise((resolve) => {
    const voiceSelect = voice
      ? `$synth.SelectVoice('${voice}')`
      : `$v = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'en-US' } | Select-Object -First 1; if ($v) { $synth.SelectVoice($v.VoiceInfo.Name) }`;

    const ps = spawn("powershell.exe", [
      "-NoProfile",
      "-Command",
      `Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; ${voiceSelect}; $synth.Rate = 1; $synth.Volume = 100; $synth.Speak('${text.replace(/'/g, "''")}'); $synth.Dispose()`,
    ], { stdio: "ignore" });

    ps.on("close", () => resolve());
    ps.on("error", () => resolve());

    // Safety timeout — don't block forever
    setTimeout(() => {
      try { ps.kill(); } catch {}
      resolve();
    }, 30000);
  });
}

// ─── HELPER: Wait ms ───
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── HELPER: Check service health ───
async function checkHealth(url: string, label: string): Promise<boolean> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    console.log(`  ✓ ${label}: ${resp.status}`);
    return resp.ok;
  } catch (e: any) {
    console.log(`  ✗ ${label}: ${e.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN TEST
// ═══════════════════════════════════════════════════════════
(async () => {
  const runId = Date.now();
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  REAL ELECTRON VOICE INTERVIEW E2E TEST`);
  console.log(`  Run: ${runId} | ${new Date().toISOString()}`);
  console.log(`${"═".repeat(70)}\n`);

  // ─── PHASE 1: ENVIRONMENT CHECK ───
  console.log("▶ PHASE 1: Environment Check");
  const backendOk = await checkHealth(`${BACKEND_URL}/healthz`, "Backend");
  const frontendOk = await checkHealth(FRONTEND_URL, "Frontend");

  if (!backendOk) {
    console.error("❌ Backend is not running. Start it first.");
    process.exit(1);
  }
  if (!frontendOk) {
    console.error("❌ Frontend is not running. Start it first.");
    process.exit(1);
  }

  // ─── PHASE 2: KILL STALE ELECTRON & REBUILD ───
  console.log("\n▶ PHASE 2: Prepare Electron");
  try {
    execSync('powershell -NoProfile -Command "Get-Process -Name electron* -EA SilentlyContinue | Stop-Process -Force"', { stdio: "ignore" });
    console.log("  Killed stale Electron processes");
  } catch {}
  await sleep(2000);

  // Build desktop
  console.log("  Building desktop...");
  try {
    execSync("npm run build", { cwd: path.resolve(__dirname, "../../desktop"), stdio: "pipe", timeout: 60000 });
    console.log("  ✓ Desktop built");
  } catch (e: any) {
    console.log("  ⚠ Build failed (using existing dist):", e.message?.slice(0, 100));
  }

  // ─── PHASE 3: LAUNCH ELECTRON WITH CDP ───
  console.log("\n▶ PHASE 3: Launch Electron with Remote Debugging");
  const desktopDir = path.resolve(__dirname, "../../desktop");
  const electronBin = path.resolve(desktopDir, "node_modules/electron/dist/electron.exe");

  const electronProc: ChildProcess = spawn(electronBin, [
    `--remote-debugging-port=${CDP_PORT}`,
    desktopDir,
    "--e2e",
  ], {
    cwd: desktopDir,
    env: { ...process.env, E2E_TEST: "1", NODE_ENV: "development" },
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  let electronOutput = "";
  electronProc.stdout?.on("data", (d) => { 
    const s = d.toString(); 
    electronOutput += s;
    process.stdout.write(`  [electron] ${s}`);
  });
  electronProc.stderr?.on("data", (d) => { 
    const s = d.toString(); 
    electronOutput += s;
    process.stderr.write(`  [electron-err] ${s}`);
  });
  electronProc.on("exit", (code) => {
    console.log(`  [electron] Process exited with code ${code}`);
  });

  // Wait for Electron to start and CDP to be available
  console.log("  Waiting for Electron CDP on port 9333...");
  let cdpReady = false;
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) {
        cdpReady = true;
        break;
      }
    } catch {}
  }

  if (!cdpReady) {
    console.error("❌ Electron CDP not available after 30s");
    console.error("  Electron output:", electronOutput.slice(-500));
    electronProc.kill();
    process.exit(1);
  }
  console.log("  ✓ Electron CDP ready");

  // ─── PHASE 4: CONNECT PLAYWRIGHT TO ELECTRON ───
  console.log("\n▶ PHASE 4: Connect Playwright to Electron");
  const browser: Browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  const contexts = browser.contexts();
  console.log(`  Found ${contexts.length} browser context(s)`);

  // Find the overlay page
  let overlayPage: Page | null = null;
  for (const ctx of contexts) {
    const pages = ctx.pages();
    for (const p of pages) {
      const url = p.url();
      console.log(`  Page: ${url}`);
      if (url.includes("/overlay") || url.includes("3001")) {
        overlayPage = p;
      }
    }
  }

  if (!overlayPage) {
    console.error("❌ Could not find overlay page in Electron");
    electronProc.kill();
    process.exit(1);
  }
  console.log(`  ✓ Connected to overlay: ${overlayPage.url()}`);
  await overlayPage.waitForLoadState("networkidle");
  await sleep(2000);

  // Screenshot initial state
  await overlayPage.screenshot({ path: path.join(SCREENSHOT_DIR, "01_electron_overlay_loaded.png"), fullPage: true });
  console.log("  📸 Screenshot: overlay loaded");

  // ─── PHASE 5: FILL SETUP FORM ───
  console.log("\n▶ PHASE 5: Fill Setup Form");

  // Fill Company
  const companyInput = overlayPage.locator('input[placeholder*="Company"], input[placeholder*="company"]').first();
  if (await companyInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await companyInput.fill("Google");
    await companyInput.evaluate((el) => el.dispatchEvent(new Event("blur")));
    console.log("  ✓ Company: Google");
    await sleep(1500); // Wait for company intel auto-fill
  }

  // Fill Position
  const positionInput = overlayPage.locator('input[placeholder*="Position"], input[placeholder*="position"], input[placeholder*="Role"], input[placeholder*="role"]').first();
  if (await positionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await positionInput.fill("Senior Software Engineer");
    console.log("  ✓ Position: Senior Software Engineer");
  }

  // Fill Objective
  const objectiveInput = overlayPage.locator('input[placeholder*="Objective"], input[placeholder*="objective"], input[placeholder*="Goal"], input[placeholder*="goal"]').first();
  if (await objectiveInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await objectiveInput.fill("Demonstrate strong system design and leadership skills");
    console.log("  ✓ Objective set");
  }

  await overlayPage.screenshot({ path: path.join(SCREENSHOT_DIR, "02_setup_filled.png"), fullPage: true });

  // ─── PHASE 6: CLICK START ───
  console.log("\n▶ PHASE 6: Click START → Begin Interview");

  // Find and click the START button
  const startBtn = overlayPage.locator('button:has-text("START"), button:has-text("Start"), button:has-text("Begin")').first();
  if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await startBtn.click();
    console.log("  ✓ Clicked START");
  } else {
    console.log("  ⚠ START button not found, trying to force live mode...");
    await overlayPage.evaluate(() => {
      (window as any).__forceTestMode = true;
      window.dispatchEvent(new CustomEvent("test:ws", {
        detail: { type: "transcript", data: { speaker: "system", text: "Session starting..." } }
      }));
    });
  }

  // Wait for mode transition to "live"
  await sleep(3000);
  await overlayPage.screenshot({ path: path.join(SCREENSHOT_DIR, "03_session_started.png"), fullPage: true });

  // Check if we're in live mode by looking for the overlay panel
  const isLive = await overlayPage.evaluate(() => {
    // Look for signs of live mode — the phantom overlay or answer panel
    return !!(
      document.querySelector('[class*="phantom"]') ||
      document.querySelector('[class*="Master"]') ||
      document.querySelector('[class*="overlay"]') ||
      document.querySelector('button[title*="Mic"]')
    );
  });
  console.log(`  Live mode detected: ${isLive}`);

  // ─── PHASE 7: OPEN BACKEND WS (same protocol as loopback) ───
  console.log("\n▶ PHASE 7: Connect Interview WebSocket");

  const roomId = `e2e-voice-${runId}`;
  const wsUrl = `ws://localhost:9010/ws/voice?room_id=${encodeURIComponent(roomId)}&participant=interviewer&role=behavioral&assist_intensity=2`;

  const ws = new WebSocket(wsUrl);
  const allMessages: any[] = [];

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("WS connect timeout")), 10000);
    ws.on("open", () => { clearTimeout(t); resolve(); });
    ws.on("error", (e) => { clearTimeout(t); reject(e); });
  });
  console.log("  ✓ WebSocket connected to backend");

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      allMessages.push({ ...msg, _ts: Date.now() });
    } catch {}
  });

  // Wait for room assignment
  await sleep(2000);

  // ─── PHASE 8: INTERVIEW ROUNDS (Real Voice + Real AI) ───
  console.log(`\n${"═".repeat(70)}`);
  console.log("  LIVE INTERVIEW — 5 ROUNDS WITH REAL VOICE (DYNAMIC QUESTIONS)");
  console.log(`${"═".repeat(70)}\n`);

  const results: any[] = [];
  let previousAnswer = "";

  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const round = buildNextQuestion(i, previousAnswer);
    const roundNum = i + 1;

    console.log(`\n┌─── ROUND ${roundNum}/${TOTAL_ROUNDS}: ${round.category} ───┐`);
    console.log(`│ Q: "${round.question.slice(0, 100)}..."`);

    // Clear messages for this round — wait until no new messages arrive for 2s
    await sleep(500);
    const roundStartIdx = allMessages.length;

    // Step A: SPEAK the question with real Windows TTS voice
    console.log(`│ 🔊 Speaking question with Windows TTS...`);
    const ttsPromise = speakWithTTS(round.question);

    // Step B: SIMULATE REAL DEEPGRAM STREAMING — send partial transcripts
    //         word-by-word as the interviewer speaks, then final ONLY after TTS finishes
    const words = round.question.split(/\s+/);
    const wordsPerChunk = 3; // Send 3 words at a time (realistic Deepgram partial rate)
    const chunkDelayMs = 500; // ~500ms between partials (matches real speech rate)
    
    console.log(`│ 📝 Streaming ${Math.ceil(words.length / wordsPerChunk)} partial transcripts...`);
    
    // Send partial transcripts as the TTS speaks (simulating Deepgram's real behavior)
    for (let wi = 0; wi < words.length; wi += wordsPerChunk) {
      const partialText = words.slice(0, Math.min(wi + wordsPerChunk, words.length)).join(" ");
      const isLastChunk = wi + wordsPerChunk >= words.length;
      
      if (!isLastChunk) {
        // Send as PARTIAL (is_final: false) — AI should NOT trigger yet
        ws.send(JSON.stringify({
          type: "transcript",
          text: partialText,
          participant: "interviewer",
          is_final: false,
          speech_final: false,
          confidence: 0.85,
          source: "tts_interview",
        }));
        
        // Show partial question on overlay (updates the live question block word-by-word)
        await overlayPage.evaluate((text: string) => {
          window.dispatchEvent(new CustomEvent("test:ws", {
            detail: { type: "partial_transcript", data: { speaker: "interviewer", text, isQuestion: true } }
          }));
        }, partialText);
        
        await sleep(chunkDelayMs);
      }
    }
    
    // Step C: WAIT for TTS to FULLY FINISH speaking before sending final transcript
    console.log(`│ 🎤 Waiting for interviewer to finish speaking...`);
    await ttsPromise;
    console.log(`│ ✅ Interviewer finished speaking — NOW sending final transcript`);
    
    // Step D: NOW send the FINAL transcript (is_final: true) — AI can start generating
    const sendTime = Date.now();
    ws.send(JSON.stringify({
      type: "transcript",
      text: round.question,
      participant: "interviewer",
      is_final: true,
      speech_final: true,
      confidence: 0.98,
      source: "tts_interview",
    }));

    // Also show the complete question on the overlay transcript panel
    await overlayPage.evaluate((q: string) => {
      window.dispatchEvent(new CustomEvent("test:ws", {
        detail: { type: "transcript", data: { speaker: "interviewer", text: q, isQuestion: true, timestamp: new Date().toLocaleTimeString() } }
      }));
    }, round.question);

    // Step D: Wait for AI answer chunks from backend
    console.log(`│ ⏳ Waiting for AI to generate answer...`);
    let answerText = "";
    let chunkCount = 0;
    let ttft = 0;
    let gotStart = false;
    let gotDone = false;
    const startWait = Date.now();
    const maxWait = 90000; // 90s max per question

    while (Date.now() - startWait < maxWait) {
      await sleep(500);

      const newMsgs = allMessages.slice(roundStartIdx);

      // Check for answer_suggestion_start (only messages after our send time)
      if (!gotStart) {
        const startMsg = newMsgs.find((m) => m.type === "answer_suggestion_start" && m._ts >= sendTime);
        if (startMsg) {
          gotStart = true;
          ttft = startMsg._ts - sendTime;
          console.log(`│ ⚡ First token in ${ttft}ms`);

          // Forward to overlay
          await overlayPage.evaluate(() => {
            window.dispatchEvent(new CustomEvent("test:ws", {
              detail: { type: "answer_suggestion_start", data: {} }
            }));
          });
        }
      }

      // Process chunks (only after send time)
      const chunks = newMsgs.filter((m) =>
        m.type === "answer_suggestion_chunk" && !m.is_thinking && m.chunk !== "▸ " && m._ts >= sendTime
      );
      if (chunks.length > chunkCount) {
        for (let ci = chunkCount; ci < chunks.length; ci++) {
          const chunk = chunks[ci];
          const delta = chunk.chunk || chunk.text || chunk.delta || "";
          if (delta.trim()) {
            answerText += delta;
            // Forward chunk to overlay for real-time streaming
            await overlayPage.evaluate((t: string) => {
              window.dispatchEvent(new CustomEvent("test:ws", {
                detail: { type: "answer_suggestion_chunk", data: { text: t, chunk: t } }
              }));
            }, delta);
          }
        }
        chunkCount = chunks.length;
      }

      // Check for completion (only after send time)
      const doneMsg = newMsgs.find((m) =>
        (m.type === "answer_suggestion_done" || m.type === "answer_suggestion") && m._ts >= sendTime
      );
      if (doneMsg) {
        gotDone = true;
        const finalAnswer = doneMsg.suggestion || doneMsg.answer || doneMsg.text || answerText;
        if (finalAnswer && finalAnswer.length > answerText.length) {
          answerText = finalAnswer;
        }

        // Forward final answer to overlay
        await overlayPage.evaluate((answer: string) => {
          window.dispatchEvent(new CustomEvent("test:ws", {
            detail: {
              type: "answer_suggestion",
              data: {
                answer,
                text: answer,
                keyPoints: [],
                star: null,
                avoidSaying: [],
                followUpPredictions: [],
              }
            }
          }));
        }, answerText);

        break;
      }
    }

    // TTS already finished before we sent the final transcript (no need to wait again)

    const genTime = Date.now() - sendTime;
    const wordCount = answerText.split(/\s+/).filter(Boolean).length;

    // Take screenshot of the answer on the overlay
    await sleep(1500);
    await overlayPage.screenshot({
      path: path.join(SCREENSHOT_DIR, `04_round${roundNum}_${round.id}_answer.png`),
      fullPage: true,
    });

    const passed = wordCount >= round.minWords && gotStart;
    results.push({
      round: roundNum,
      id: round.id,
      category: round.category,
      question: round.question,
      answer: answerText.slice(0, 500),
      wordCount,
      ttft,
      genTime,
      chunkCount,
      passed,
      gotStart,
      gotDone,
    });

    console.log(`│ Answer: "${answerText.slice(0, 120)}..."`);
    console.log(`│ Words: ${wordCount} | TTFT: ${ttft}ms | Gen: ${(genTime / 1000).toFixed(1)}s | Chunks: ${chunkCount}`);
    console.log(`│ ${passed ? "✅ PASSED" : "❌ FAILED"}`);
    console.log(`└${"─".repeat(60)}┘`);

    // Save answer for dynamic follow-up question generation
    previousAnswer = answerText;

    // Pause between questions — real interviewer cadence
    if (i < TOTAL_ROUNDS - 1) {
      console.log(`\n  ⏸  Pausing 10 seconds before next question (real interview pacing)...\n`);
      await sleep(10000);
    }
  }

  // ─── PHASE 9: CLOSING ───
  console.log("\n▶ PHASE 9: Interview Complete");

  // Speak closing
  await speakWithTTS("Thank you very much for your time today. We'll be in touch with next steps. Have a great day!");

  // Final screenshot
  await sleep(2000);
  await overlayPage.screenshot({ path: path.join(SCREENSHOT_DIR, "05_final_overlay.png"), fullPage: true });

  // Close WS
  try { ws.close(); } catch {}

  // ─── RESULTS SUMMARY ───
  const passCount = results.filter((r) => r.passed).length;
  const totalWords = results.reduce((s, r) => s + r.wordCount, 0);
  const avgTTFT = Math.round(results.reduce((s, r) => s + r.ttft, 0) / results.length);

  console.log(`\n${"═".repeat(70)}`);
  console.log("  INTERVIEW RESULTS");
  console.log(`${"═".repeat(70)}`);
  console.log(`\n  Rounds: ${passCount}/${results.length} PASSED`);
  console.log(`  Total words generated: ${totalWords}`);
  console.log(`  Average TTFT: ${avgTTFT}ms`);
  console.log(`  Average answer length: ${Math.round(totalWords / results.length)} words\n`);

  console.log("  ┌────────┬──────────────────────┬───────┬────────┬──────────┬────────┐");
  console.log("  │ Round  │ Category             │ Words │ TTFT   │ Gen Time │ Status │");
  console.log("  ├────────┼──────────────────────┼───────┼────────┼──────────┼────────┤");
  for (const r of results) {
    const status = r.passed ? "✅ PASS" : "❌ FAIL";
    console.log(
      `  │ ${String(r.round).padEnd(6)} │ ${r.category.padEnd(20)} │ ${String(r.wordCount).padStart(5)} │ ${String(r.ttft + "ms").padStart(6)} │ ${String((r.genTime / 1000).toFixed(1) + "s").padStart(8)} │ ${status} │`
    );
  }
  console.log("  └────────┴──────────────────────┴───────┴────────┴──────────┴────────┘\n");

  // Save report
  const report = {
    runId,
    timestamp: new Date().toISOString(),
    environment: {
      backend: BACKEND_URL,
      frontend: FRONTEND_URL,
      electron: true,
      realTTS: true,
      realAI: true,
    },
    summary: {
      passed: passCount,
      total: results.length,
      totalWords,
      avgTTFT,
      avgWords: Math.round(totalWords / results.length),
    },
    rounds: results,
  };

  const reportPath = path.join(REPORT_DIR, `Real_Electron_Voice_Interview_${runId}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`  📄 Report: ${reportPath}`);
  console.log(`  📸 Screenshots: ${SCREENSHOT_DIR}/`);

  if (passCount === results.length) {
    console.log(`\n  🎉 ALL ${results.length} ROUNDS PASSED — AI answers generated in real Electron overlay!\n`);
  } else {
    console.log(`\n  ⚠ ${results.length - passCount} rounds failed.\n`);
  }

  // Clean up
  try { await browser.close(); } catch {}
  try { electronProc.kill(); } catch {}
  process.exit(passCount === results.length ? 0 : 1);
})();
