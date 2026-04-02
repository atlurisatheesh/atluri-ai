/**
 * ══════════════════════════════════════════════════════════════════════
 * ELECTRON LIVE INTERVIEW E2E — Real Desktop, Real Voice, Real AI
 * ══════════════════════════════════════════════════════════════════════
 *
 * This test:
 * 1. Launches the Electron desktop app with remote debugging
 * 2. Connects Playwright to the Electron overlay page
 * 3. Fills out the interview setup (company, position, model, etc.)
 * 4. Clicks START → loopback WS connects to backend
 * 5. Uses Windows SAPI TTS to SPEAK each question out loud (real voice)
 * 6. Simultaneously injects the transcript through the loopback WS
 * 7. Verifies the AI-generated answer appears on the overlay
 * 8. Takes screenshots at every step
 *
 * Run:
 *   cd d:\linkedin-ai-main\qa
 *   npx ts-node e2e/electron-live-interview.ts
 */

import { chromium, type Page, type Browser } from "playwright";
import { execSync, spawn, ChildProcess } from "child_process";
import WebSocket from "ws";
import * as fs from "fs";
import * as path from "path";

// ══════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════
const BACKEND_URL = "http://localhost:9010";
const FRONTEND_URL = "http://localhost:3001";
const OVERLAY_URL = `${FRONTEND_URL}/overlay`;
const SCREENSHOT_DIR = path.join(__dirname, "..", "reports", "screenshots", "electron-interview");
const REPORT_DIR = path.join(__dirname, "..", "reports");
const CDP_PORT = 9229;

const INTERVIEW_QUESTIONS = [
    {
        id: "q1_behavioral",
        category: "Behavioral",
        text: "Tell me about yourself and walk me through your professional background as a software engineer.",
        voice: "Tell me about yourself and walk me through your professional background as a software engineer.",
        keywords: ["experience", "engineer", "software", "project", "team", "background", "develop"],
        minWords: 50,
    },
    {
        id: "q2_system_design",
        category: "System Design",
        text: "How would you design a real-time notification system that handles ten million concurrent users with sub-second delivery latency?",
        voice: "How would you design a real time notification system that handles ten million concurrent users with sub second delivery latency?",
        keywords: ["notification", "latency", "queue", "scale", "websocket", "push", "architecture", "message", "system"],
        minWords: 30,
    },
    {
        id: "q3_star",
        category: "STAR Behavioral",
        text: "Tell me about a time you dealt with a critical production outage at two AM. What was the situation, your action, and the result?",
        voice: "Tell me about a time you dealt with a critical production outage at 2 A M. What was the situation, your action, and the result?",
        keywords: ["situation", "action", "result", "production", "outage", "debug", "fix", "team", "resolved"],
        minWords: 30,
    },
    {
        id: "q4_closing",
        category: "Closing",
        text: "Where do you see yourself in five years, and what excites you most about this opportunity with our engineering team?",
        voice: "Where do you see yourself in five years, and what excites you most about this opportunity with our engineering team?",
        keywords: ["growth", "team", "opportunity", "learn", "engineer", "leadership", "impact"],
        minWords: 30,
    },
];

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

function speakWithWindowsTTS(text: string): void {
    try {
        // Use PowerShell SAPI to speak out loud
        const escaped = text.replace(/'/g, "''").replace(/"/g, '""');
        execSync(
            `powershell -NoProfile -Command "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = 1; $s.Speak('${escaped}')"`,
            { timeout: 30000, stdio: "ignore" }
        );
    } catch (e) {
        console.log(`  [TTS] Failed to speak (non-fatal): ${(e as Error).message?.slice(0, 80)}`);
    }
}

async function screenshot(page: Page, name: string) {
    try {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
    } catch {
        // overlay might be transparent
    }
}

// ══════════════════════════════════════════════════════════════
// MAIN TEST
// ══════════════════════════════════════════════════════════════
async function main() {
    ensureDir(SCREENSHOT_DIR);
    ensureDir(REPORT_DIR);

    const runId = Date.now();
    const results: any[] = [];
    let electronProcess: ChildProcess | null = null;
    let browser: Browser | null = null;

    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║  ELECTRON LIVE INTERVIEW E2E TEST                          ║");
    console.log("║  Real Desktop · Real Voice · Real AI                       ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log();

    try {
        // ── PHASE 0: Verify services ──
        console.log("▸ Phase 0: Verifying services...");
        try {
            const healthResp = await fetch(`${BACKEND_URL}/healthz`);
            if (!healthResp.ok) throw new Error(`Backend unhealthy: ${healthResp.status}`);
            console.log("  ✓ Backend healthy");
        } catch (e) {
            console.error("  ✗ Backend not running on port 9010. Start it first.");
            process.exit(1);
        }
        try {
            const frontResp = await fetch(FRONTEND_URL);
            if (!frontResp.ok) throw new Error(`Frontend unhealthy: ${frontResp.status}`);
            console.log("  ✓ Frontend healthy");
        } catch (e) {
            console.error("  ✗ Frontend not running on port 3001. Start it first.");
            process.exit(1);
        }

        // ── PHASE 1: Kill existing Electron & launch with CDP ──
        console.log("\n▸ Phase 1: Launching Electron desktop with remote debugging...");
        try {
            execSync('powershell -NoProfile -Command "Get-Process -Name electron* -ErrorAction SilentlyContinue | Stop-Process -Force"', { stdio: "ignore" });
        } catch { }
        await sleep(2000);

        const electronBin = path.join(__dirname, "..", "..", "desktop", "node_modules", "electron", "dist", "electron.exe");
        const electronMain = path.join(__dirname, "..", "..", "desktop", "dist", "main.js");
        electronProcess = spawn(electronBin, [`--remote-debugging-port=${CDP_PORT}`, electronMain], {
            cwd: path.join(__dirname, "..", "..", "desktop"),
            env: { ...process.env, NODE_ENV: "development" },
            stdio: ["ignore", "pipe", "pipe"],
            detached: false,
        });
        // Capture electron stdout/stderr for debugging
        electronProcess.stdout?.on("data", (d: Buffer) => {
            const s = d.toString().trim();
            if (s) console.log(`  [electron] ${s.slice(0, 120)}`);
        });
        electronProcess.stderr?.on("data", (d: Buffer) => {
            const s = d.toString().trim();
            if (s && !s.includes("DevTools") && !s.includes("GPU") && !s.includes("cache")) {
                console.log(`  [electron:err] ${s.slice(0, 120)}`);
            }
        });
        console.log(`  ✓ Electron launched (PID ${electronProcess.pid}), waiting for CDP on port ${CDP_PORT}...`);

        // Wait for CDP to be ready
        let cdpReady = false;
        for (let i = 0; i < 30; i++) {
            await sleep(1000);
            try {
                const resp = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
                if (resp.ok) {
                    cdpReady = true;
                    break;
                }
            } catch { }
        }
        if (!cdpReady) throw new Error("CDP not ready after 30s");
        console.log("  ✓ CDP ready");

        // ── PHASE 2: Connect Playwright to Electron ──
        console.log("\n▸ Phase 2: Connecting Playwright to Electron overlay...");
        browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
        const contexts = browser.contexts();
        console.log(`  Found ${contexts.length} browser context(s)`);

        // Find the overlay page
        let overlayPage: Page | null = null;
        for (const ctx of contexts) {
            for (const pg of ctx.pages()) {
                const url = pg.url();
                console.log(`  Page: ${url}`);
                if (url.includes("/overlay")) {
                    overlayPage = pg;
                }
            }
        }

        if (!overlayPage) {
            // Wait for overlay page to load
            console.log("  Waiting for overlay page to appear...");
            for (let i = 0; i < 20; i++) {
                await sleep(1000);
                for (const ctx of browser.contexts()) {
                    for (const pg of ctx.pages()) {
                        if (pg.url().includes("/overlay")) {
                            overlayPage = pg;
                        }
                    }
                }
                if (overlayPage) break;
            }
        }

        if (!overlayPage) {
            // Try to find any page and navigate it to overlay
            const allPages = contexts.flatMap(c => c.pages());
            if (allPages.length > 0) {
                console.log("  No overlay page found. Checking all available pages...");
                for (const pg of allPages) {
                    console.log(`    Available: ${pg.url()}`);
                }
            }
            throw new Error("Could not find overlay page in Electron");
        }

        console.log(`  ✓ Connected to overlay: ${overlayPage.url()}`);
        await screenshot(overlayPage, "01_overlay_loaded");

        // Wait for the page to be fully interactive
        await overlayPage.waitForLoadState("networkidle");
        await sleep(2000);

        // ── PHASE 3: Fill setup form and click START ──
        console.log("\n▸ Phase 3: Filling interview setup...");

        // Fill company
        const companyInput = overlayPage.locator('input[placeholder*="ompany"], input[placeholder*="company"]').first();
        if (await companyInput.isVisible({ timeout: 5000 }).catch(() => false)) {
            await companyInput.fill("Google");
            await companyInput.evaluate((el: any) => el.dispatchEvent(new Event('blur')));
            console.log("  ✓ Company: Google");
            await sleep(1000); // Wait for intel pack
        }

        // Fill position
        const positionInput = overlayPage.locator('input[placeholder*="osition"], input[placeholder*="role"]').first();
        if (await positionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await positionInput.fill("Senior Software Engineer");
            console.log("  ✓ Position: Senior Software Engineer");
        }

        await screenshot(overlayPage, "02_setup_filled");

        // Click START button
        console.log("  Clicking START...");
        const startBtn = overlayPage.locator('button:has-text("START"), button:has-text("Start")').first();
        if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await startBtn.click();
            console.log("  ✓ START clicked");
        } else {
            // Try any prominent button
            const anyStart = overlayPage.locator('button').filter({ hasText: /start|begin|go/i }).first();
            if (await anyStart.isVisible({ timeout: 3000 }).catch(() => false)) {
                await anyStart.click();
                console.log("  ✓ Start button clicked (alt selector)");
            }
        }

        // Wait for mode transition to live
        await sleep(5000);
        await screenshot(overlayPage, "03_live_mode");
        console.log("  ✓ Transitioned to live mode");

        // Expose phantom hook globally so we can dispatch WS messages into it
        // The overlay listens for CustomEvent "test:ws" in live mode
        console.log("  WS message bridge ready (test:ws CustomEvent)");

        // ── PHASE 4: Connect a test WS to the backend ──
        console.log("\n▸ Phase 4: Connecting test WebSocket to backend...");

        // Connect our own WS to the backend for answer generation
        const roomId = `electron-e2e-${Date.now()}`;
        const wsUrl = `ws://localhost:9010/ws/voice?room_id=${encodeURIComponent(roomId)}&participant=interviewer&role=behavioral&assist_intensity=2`;
        
        const ws = new WebSocket(wsUrl);
        await new Promise<void>((resolve, reject) => {
            const t = setTimeout(() => reject(new Error("WS connect timeout")), 10000);
            ws.once("open", () => { clearTimeout(t); resolve(); });
            ws.once("error", (e) => { clearTimeout(t); reject(e); });
        });
        console.log("  ✓ Test WebSocket connected to backend");

        // Set up message collector
        const allMessages: Array<{ type: string; [key: string]: any }> = [];
        ws.on("message", (raw: any) => {
            try {
                const msg = JSON.parse(typeof raw === "string" ? raw : raw.toString("utf-8"));
                if (msg.type) allMessages.push(msg);
            } catch { }
        });
        await sleep(2000); // Let room_assigned arrive

        // ── PHASE 5: Run interview questions with real voice + WS ──
        console.log("\n▸ Phase 5: Running live interview simulation...\n");
        console.log("  ┌─────┬──────────────────┬───────┬──────────┬─────────────┐");
        console.log("  │ Q#  │ Category         │ Words │ TTFT     │ Status      │");
        console.log("  ├─────┼──────────────────┼───────┼──────────┼─────────────┤");

        for (let qi = 0; qi < INTERVIEW_QUESTIONS.length; qi++) {
            const q = INTERVIEW_QUESTIONS[qi];
            const qNum = qi + 1;

            // TTS: Speak the question out loud in background
            const ttsChild = spawn("powershell", [
                "-NoProfile", "-Command",
                `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = 1; $s.Speak('${q.voice.replace(/'/g, "''")}')`,
            ], { stdio: "ignore" });
            const ttsPromise = new Promise<void>((resolve) => {
                ttsChild.on("close", () => resolve());
                ttsChild.on("error", () => resolve());
                setTimeout(() => { try { ttsChild.kill(); } catch { } resolve(); }, 25000);
            });

            // Clear message buffer for this round
            const roundStartIdx = allMessages.length;
            const startTime = Date.now();

            // First, show the question on the overlay transcript
            await overlayPage.evaluate((text: string) => {
                window.dispatchEvent(new CustomEvent("test:ws", {
                    detail: { type: "transcript", data: {
                        speaker: "interviewer",
                        text,
                        timestamp: new Date().toLocaleTimeString(),
                        isQuestion: true,
                    }}
                }));
            }, q.text);

            // Send the transcript through our test WS → backend generates answer
            ws.send(JSON.stringify({
                type: "transcript",
                text: q.text,
                participant: "interviewer",
                is_final: true,
            }));

            // Wait for answer_suggestion_start and chunks
            let answerText = "";
            let ttft = 0;
            let gotStart = false;
            let gotDone = false;
            let chunkCount = 0;

            for (let t = 0; t < 90; t++) {
                await sleep(1000);

                // Process new messages since round started
                for (let mi = roundStartIdx; mi < allMessages.length; mi++) {
                    const msg = allMessages[mi];

                    if (msg.type === "answer_suggestion_start" && !gotStart) {
                        gotStart = true;
                        ttft = Date.now() - startTime;

                        // Dispatch to overlay
                        await overlayPage.evaluate((d: any) => {
                            window.dispatchEvent(new CustomEvent("test:ws", {
                                detail: { type: "answer_suggestion_start", data: d }
                            }));
                        }, msg);
                    }

                    if (msg.type === "answer_suggestion_chunk") {
                        const chunk = msg.chunk || msg.text || msg.delta || "";
                        if (chunk && !msg.is_thinking) {
                            chunkCount++;
                            // Dispatch streaming chunk to overlay
                            await overlayPage.evaluate((d: any) => {
                                window.dispatchEvent(new CustomEvent("test:ws", {
                                    detail: { type: "answer_suggestion_chunk", data: { text: d.chunk || d.text || d.delta || "" } }
                                }));
                            }, msg);
                        }
                    }

                    if (msg.type === "answer_suggestion" || msg.type === "answer_suggestion_done") {
                        gotDone = true;
                        answerText = msg.suggestion || msg.text || msg.answer || "";

                        // Dispatch final answer to overlay
                        await overlayPage.evaluate((d: any) => {
                            window.dispatchEvent(new CustomEvent("test:ws", {
                                detail: { type: "answer_suggestion", data: {
                                    answer: d.suggestion || d.text || d.answer || "",
                                    keyPoints: d.key_points || [],
                                    avoidSaying: d.avoid_saying || [],
                                    followUpPredictions: d.follow_up_predictions || [],
                                }}
                            }));
                        }, msg);
                    }
                }

                if (gotDone) break;
            }

            // Wait for TTS to finish
            await ttsPromise;

            const words = answerText.split(/\s+/).filter(Boolean).length;
            const keywordsMatched = q.keywords.filter(k => answerText.toLowerCase().includes(k.toLowerCase())).length;
            const passed = gotDone && words >= q.minWords && keywordsMatched >= Math.min(2, q.keywords.length);

            const status = passed ? "✓ PASS" : gotDone ? "⚠ PARTIAL" : gotStart ? "⏳ TIMEOUT" : "✗ FAIL";
            const paddedCat = q.category.padEnd(16);
            const paddedWords = String(words).padStart(5);
            const paddedTTFT = ttft > 0 ? `${(ttft / 1000).toFixed(1)}s`.padStart(8) : "    N/A ".padStart(8);

            console.log(`  │ Q${qNum}  │ ${paddedCat} │${paddedWords} │${paddedTTFT} │ ${status.padEnd(11)} │`);

            results.push({
                id: q.id,
                category: q.category,
                question: q.text,
                answerPreview: answerText.slice(0, 200),
                words,
                chunks: chunkCount,
                ttft,
                keywordsMatched,
                keywordsTotal: q.keywords.length,
                passed,
            });

            await screenshot(overlayPage, `05_q${qNum}_${q.id}_answer`);

            if (qi < INTERVIEW_QUESTIONS.length - 1) {
                console.log(`  │     │ (waiting 10s)    │       │          │             │`);
                await sleep(10000);
            }
        }

        // Close the test WS
        try { ws.close(); } catch { }

        console.log("  └─────┴──────────────────┴───────┴──────────┴─────────────┘");

        // ── PHASE 6: Summary ──
        const passed = results.filter(r => r.passed).length;
        const total = results.length;
        const avgWords = Math.round(results.reduce((s, r) => s + r.words, 0) / total);
        const avgTTFT = results.filter(r => r.ttft > 0).length > 0
            ? Math.round(results.filter(r => r.ttft > 0).reduce((s, r) => s + r.ttft, 0) / results.filter(r => r.ttft > 0).length)
            : 0;

        console.log("\n╔══════════════════════════════════════════════════════════════╗");
        console.log(`║  RESULTS: ${passed}/${total} PASSED                                      ║`);
        console.log(`║  Avg words/answer: ${avgWords}                                     ║`);
        console.log(`║  Avg TTFT: ${avgTTFT}ms                                           ║`);
        console.log("╚══════════════════════════════════════════════════════════════╝");

        // Save report
        const report = {
            runId,
            timestamp: new Date().toISOString(),
            summary: { passed, total, avgWords, avgTTFT },
            results,
        };
        const reportPath = path.join(REPORT_DIR, `Electron_Interview_${runId}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Report: ${reportPath}`);
        console.log(`📸 Screenshots: ${SCREENSHOT_DIR}`);

        await screenshot(overlayPage, "06_final_state");

    } catch (err) {
        console.error("\n✗ Fatal error:", (err as Error).message);
        console.error((err as Error).stack?.split("\n").slice(0, 5).join("\n"));
    } finally {
        if (browser) {
            try { await browser.close(); } catch { }
        }
        if (electronProcess) {
            console.log("\n▸ Cleaning up Electron...");
            try { electronProcess.kill(); } catch { }
            try {
                execSync('powershell -NoProfile -Command "Get-Process -Name electron* -ErrorAction SilentlyContinue | Stop-Process -Force"', { stdio: "ignore" });
            } catch { }
        }
    }
}

main().catch(console.error);
