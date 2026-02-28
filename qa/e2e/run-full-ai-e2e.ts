/**
RUN INSTRUCTIONS

Recommended (works in this repo as-is):
1) cd qa
2) npm install
3) npx playwright install
4) npx ts-node e2e/run-full-ai-e2e.ts

As requested (requires running from repo root only if you have a root-level Node toolchain already installed):
1) npm install
2) npx playwright install
3) npx ts-node qa/e2e/run-full-ai-e2e.ts

Local URLs (defaults)
- Frontend: http://localhost:3001
- Backend:  http://localhost:9010

Config overrides (optional)
- E2E_FRONTEND_URL, E2E_BACKEND_URL
- E2E_HEADLESS=false
- E2E_TTFQ_MS=6000
- E2E_ANSWER_LAT_MS=6000
- E2E_DETERMINISM_VAR=0.01
- E2E_WS_MS=3000

This runner is fully automated: it sets localStorage['atluriin.e2e.bypass']='1'
and uses an unsigned JWT for backend dev auth.
*/

import fs from "fs";
import path from "path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import WebSocket from "ws";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { aiValidateText, type PhraseExpectation } from "./ai-validator";
import { generateDocxReport } from "./doc-generator";
import { PerformanceTracker } from "./performance-metrics";
import { captureScreenshot, ensureDir } from "./screenshot";
import { BrowserWebSocketMonitor } from "./ws-monitor";
import type {
  AiValidationRecord,
  ConsoleEvent,
  NetworkFailure,
  PerfRecord,
  RunReport,
  ScreenshotRecord,
  StepResult,
} from "./types";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const REPORTS_DIR = path.join(REPO_ROOT, "qa", "reports");

type HarnessConfig = {
  frontendUrl: string;
  backendUrl: string;
  headless: boolean;
  thresholds: {
    timeToFirstQuestionMs: number;
    interviewAnswerLatencyMs: number;
    determinismVariance: number;
    wsConnectMs: number;
  };
};

function nowIso(): string {
  return new Date().toISOString();
}

function b64url(raw: string): string {
  return Buffer.from(raw, "utf-8")
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function unsignedJwt(sub: string): string {
  return `${b64url(JSON.stringify({ alg: "none", typ: "JWT" }))}.${b64url(JSON.stringify({ sub }))}.`;
}

function seededProgressionItems(userId: string) {
  // Steady improvement (positive velocity)
  const baseTs = Date.now();
  const points = [
    { score: 32, ownership: 30, metric: 28, tradeoff: 25 },
    { score: 42, ownership: 40, metric: 38, tradeoff: 35 },
    { score: 55, ownership: 55, metric: 55, tradeoff: 50 },
    { score: 67, ownership: 65, metric: 68, tradeoff: 60 },
    { score: 80, ownership: 78, metric: 80, tradeoff: 75 },
  ];
  return points.map((p, idx) => ({
    session_id: `e2e_seed_prog_${userId}_${idx + 1}`,
    role: "behavioral",
    generated_at: (baseTs - (points.length - idx) * 60_000) / 1000,
    summary: {
      score: p.score,
      ownership_clarity_score: p.ownership,
      metric_usage_score: p.metric,
      tradeoff_depth_score: p.tradeoff,
      contradictions_detected: 0,
      drift_frequency: 0.05,
      confidence_drop_moments: 0,
      assist_high_severity_spikes: 0,
      metric_inflation_flags: 0,
    },
  }));
}

function seededPlateauItems(userId: string) {
  // High but flat performance (should trigger plateau logic)
  const baseTs = Date.now();
  const count = 9;
  return Array.from({ length: count }).map((_, idx) => ({
    session_id: `e2e_seed_plateau_${userId}_${idx + 1}`,
    role: "behavioral",
    generated_at: (baseTs - (count - idx) * 60_000) / 1000,
    summary: {
      score: 86,
      ownership_clarity_score: 84,
      metric_usage_score: 82,
      tradeoff_depth_score: 80,
      contradictions_detected: 0,
      drift_frequency: 0.03,
      confidence_drop_moments: 0,
      assist_high_severity_spikes: 0,
      metric_inflation_flags: 0,
    },
  }));
}

async function httpJson<T>(url: string, options: { method: string; headers?: Record<string, string>; body?: any; timeoutMs?: number }): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.max(1000, options.timeoutMs ?? 12000));
  try {
    const res = await fetch(url, {
      method: options.method,
      headers: {
        ...(options.headers || {}),
      },
      body: options.body,
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
    }
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function httpJsonWithRetry<T>(
  url: string,
  options: { method: string; headers?: Record<string, string>; body?: any; timeoutMs?: number },
  retries = 2,
  retryDelayMs = 400
): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await httpJson<T>(url, options);
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || err);
      const isAbort = /aborted|aborterror|timeout/i.test(msg);
      if (!isAbort || attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
  throw lastErr;
}

async function ensureSamplePdf(outPath: string): Promise<void> {
  if (fs.existsSync(outPath)) return;
  const pdf = await PDFDocument.create();
  const p = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  p.drawText("Sample Resume - AtluriIn E2E", { x: 72, y: 720, size: 20, font, color: rgb(0.1, 0.2, 0.35) });
  p.drawText("Name: E2E Candidate", { x: 72, y: 680, size: 12, font });
  p.drawText("Experience: latency 420ms→180ms; SLA 99.2→99.9; cost -18%.", { x: 72, y: 660, size: 12, font });
  const bytes = await pdf.save();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, bytes);
}

async function directWebSocketProbe(wsUrl: string, timeoutMs: number): Promise<{ passed: boolean; framesSent: number; framesReceived: number; notes: string }> {
  return await new Promise((resolve) => {
    let framesSent = 0;
    let framesReceived = 0;
    let done = false;

    const socket = new WebSocket(wsUrl);

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      try {
        socket.close();
      } catch {
      }
      resolve({ passed: false, framesSent, framesReceived, notes: `Timeout waiting for WS message (${timeoutMs}ms)` });
    }, timeoutMs);

    socket.on("open", () => {
      try {
        socket.send(JSON.stringify({ type: "sync_state_request" }));
        framesSent += 1;
      } catch {
      }
    });

    socket.on("message", () => {
      framesReceived += 1;
      if (framesReceived >= 1 && !done) {
        done = true;
        clearTimeout(timer);
        socket.close();
        resolve({ passed: true, framesSent, framesReceived, notes: "Received at least one server message." });
      }
    });

    socket.on("error", (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ passed: false, framesSent, framesReceived, notes: `WS error: ${String((err as any)?.message || err)}` });
    });

    socket.on("close", () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ passed: false, framesSent, framesReceived, notes: "WS closed before any messages were received." });
    });
  });
}

async function main(): Promise<void> {
  const config: HarnessConfig = {
    frontendUrl: (process.env.E2E_FRONTEND_URL || "http://localhost:3001").replace(/\/+$/g, ""),
    backendUrl: (process.env.E2E_BACKEND_URL || "http://localhost:9010").replace(/\/+$/g, ""),
    headless: process.env.E2E_HEADLESS !== "false",
    thresholds: {
      timeToFirstQuestionMs: Number(process.env.E2E_TTFQ_MS || 6000),
      interviewAnswerLatencyMs: Number(process.env.E2E_ANSWER_LAT_MS || 7000),
      determinismVariance: Number(process.env.E2E_DETERMINISM_VAR || 0.01),
      wsConnectMs: Number(process.env.E2E_WS_MS || 3000),
    },
  };

  ensureDir(REPORTS_DIR);
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const screenshotsDir = path.join(REPORTS_DIR, `screenshots_${runId}`);
  ensureDir(screenshotsDir);

  const reportJsonPath = path.join(REPORTS_DIR, "AtluriIn_E2E_Report.json");
  const reportDocxPath = path.join(REPORTS_DIR, "AtluriIn_E2E_Report.docx");

  const steps: StepResult[] = [];
  const consoleEvents: ConsoleEvent[] = [];
  const networkFailures: NetworkFailure[] = [];
  const performanceRecords: PerfRecord[] = [];
  const perf = new PerformanceTracker();

  const userId = `e2e-${Date.now()}`;
  const token = unsignedJwt(userId);
  const authHeaders = { Authorization: `Bearer ${token}` };

  const wsMonitor = new BrowserWebSocketMonitor();

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  let completedSessionId = "";

  let determinism: RunReport["determinism"] = {
    passed: false,
    offerProbability1: 0,
    offerProbability2: 0,
    variance: 0,
    threshold: config.thresholds.determinismVariance,
    notes: "",
  };

  let wsProbe: RunReport["webSockets"]["directProbe"] = {
    passed: false,
    url: "",
    framesSent: 0,
    framesReceived: 0,
    notes: "",
  };

  async function step(
    name: string,
    fn: (ctx: { page: Page }) => Promise<{ details?: string; screenshots?: ScreenshotRecord[]; ai?: AiValidationRecord[]; perf?: PerfRecord[] }>
  ): Promise<void> {
    const started = Date.now();
    const id = `step-${steps.length + 1}`;
    const result: StepResult = {
      id,
      name,
      status: "pass",
      startedAtIso: nowIso(),
      finishedAtIso: nowIso(),
      durationMs: 0,
      details: "",
      screenshots: [],
      ai: [],
      perf: [],
    };

    try {
      if (!page) throw new Error("Playwright page not initialized");
      const out = await fn({ page });
      result.details = out.details || "";
      result.screenshots = out.screenshots || [];
      result.ai = out.ai || [];
      result.perf = out.perf || [];

      if (result.ai.some((x) => !x.passed)) {
        result.status = "fail";
        result.details = `${result.details}\nAI validation failures: ${result.ai.filter((x) => !x.passed).map((x) => x.title).join(", ")}`.trim();
      }

      if (result.perf.some((x) => x.passed === false)) {
        result.status = "fail";
        result.details = `${result.details}\nPerformance threshold failures: ${result.perf.filter((x) => x.passed === false).map((x) => x.key).join(", ")}`.trim();
      }
    } catch (err: any) {
      result.status = "fail";
      result.details = `Error: ${String(err?.message || err)}`;
      try {
        if (page) {
          const shot = await captureScreenshot(page, { screenshotsDir, stepId: id, title: "exception" });
          result.screenshots.push(shot);
        }
      } catch {
      }
    } finally {
      result.finishedAtIso = nowIso();
      result.durationMs = Math.max(0, Date.now() - started);
      steps.push(result);
    }
  }

  try {
    // Reset backend context for test user.
    await httpJson(`${config.backendUrl}/api/context/reset`, { method: "POST", headers: authHeaders });

    browser = await chromium.launch({
      headless: config.headless,
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
    });
    context = await browser.newContext({
      baseURL: config.frontendUrl,
      viewport: { width: 1360, height: 860 },
    });
    await context.grantPermissions(["microphone", "clipboard-read", "clipboard-write"], { origin: config.frontendUrl });
    page = await context.newPage();
    wsMonitor.attach(page);

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleEvents.push({ kind: "console", level: msg.type(), message: msg.text(), tsIso: nowIso() });
      }
    });
    page.on("pageerror", (err) => {
      consoleEvents.push({ kind: "pageerror", message: String(err?.message || err), tsIso: nowIso() });
    });
    page.on("requestfailed", (req) => {
      const failureText = req.failure()?.errorText || "";
      // Navigation cancels often abort in-flight fetches; don't treat as failures.
      if (failureText.includes("net::ERR_ABORTED")) {
        return;
      }
      networkFailures.push({
        kind: "requestfailed",
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
        failureText,
        tsIso: nowIso(),
      });
    });
    page.on("response", (resp) => {
      const status = resp.status();
      if (status < 400) return;
      const url = resp.url();
      if (url.includes("/favicon") || url.includes("/_next/") || url.includes("/sockjs-node")) return;
      const req = resp.request();
      networkFailures.push({
        kind: "badstatus",
        url,
        status,
        method: req.method(),
        resourceType: req.resourceType(),
        tsIso: nowIso(),
      });
    });

    await page.addInitScript((payload) => {
      try {
        window.localStorage.setItem("atluriin.e2e.bypass", "1");
        window.localStorage.setItem("atluriin.e2e.user_id", payload.userId);
      } catch {
      }
    }, { userId });

    await step("Load landing page + validate hero", async ({ page }) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.getByText("AtluriIn AI").first().waitFor({ state: "visible" });

      const shot = await captureScreenshot(page, { screenshotsDir, stepId: "landing", title: "landing" });
      const text = await page.evaluate(() => document.body?.innerText || "");

      const expectations: PhraseExpectation[] = [
        { id: "hero_tag", title: "Hero Tag", anyOf: ["Interview Performance Operating System"] },
        { id: "hero_title", title: "Hero Title", anyOf: [/from practice to proof/i, /measurable interview performance/i] },
        { id: "brand", title: "Brand", anyOf: ["AtluriIn AI"] },
      ];
      const ai = aiValidateText({ id: "landing", title: "Landing", extractedText: text, expectations });
      return { screenshots: [shot], ai, details: "Landing page loaded and hero messaging is present." };
    });

    await step("Open /app + one-click onboarding visible", async ({ page }) => {
      await page.goto("/app", { waitUntil: "domcontentloaded" });
      await page.getByText("First Session Launch").waitFor({ state: "visible" });

      const shot = await captureScreenshot(page, { screenshotsDir, stepId: "app", title: "quickstart" });
      const text = await page.evaluate(() => document.body?.innerText || "");
      const ai = aiValidateText({
        id: "app",
        title: "App",
        extractedText: text,
        expectations: [
          { id: "quickstart", title: "QuickStart", anyOf: ["First Session Launch"] },
          { id: "cta", title: "Run First Pressure Round", anyOf: ["Run First Pressure Round (1-Click)"] },
        ],
      });
      return { screenshots: [shot], ai, details: "AppShell loaded with QuickStart panel." };
    });

    await step("Trigger one-click onboarding → interview starts", async ({ page }) => {
      perf.mark("click_run_first_round");
      await page.getByRole("button", { name: "Run First Pressure Round (1-Click)" }).first().click();
      await page.getByText("Live Pressure Round").waitFor({ state: "visible" });
      await page.getByText("Current Question").waitFor({ state: "visible" });
      perf.mark("first_question_visible");

      const ttfq = perf.measureMs("click_run_first_round", "first_question_visible");
      const perfRec: PerfRecord = {
        key: "time_to_first_question",
        valueMs: ttfq,
        thresholdMs: config.thresholds.timeToFirstQuestionMs,
        passed: ttfq <= config.thresholds.timeToFirstQuestionMs,
      };

      const shot = await captureScreenshot(page, { screenshotsDir, stepId: "interview", title: "started" });
      return { screenshots: [shot], perf: [perfRec], details: `Interview started. TTFQ=${ttfq}ms.` };
    });

    await step("Verify live perception meters + transcript tagging", async ({ page }) => {
      await page.getByText("Interviewer Perception Console").waitFor({ state: "visible" });
      for (const label of ["Credibility", "STAR Structure", "Confidence Stability", "Impact Strength", "Risk Drift"]) {
        await page.getByText(label).first().waitFor({ state: "visible" });
      }

      const textarea = page.getByPlaceholder("Type your answer with structure: context, action, impact, reflection...");
      await textarea.fill("When we hit a latency spike, I led cache redesign. I implemented read-through caching with staged rollout. Result: p95 420ms→180ms; cost -18%; SLA 99.2→99.9%. Reflection: documented trade-offs and guardrails.");
      await page.getByText("Live Transcript Signal Tagging").waitFor({ state: "visible" });

      const shot = await captureScreenshot(page, { screenshotsDir, stepId: "interview", title: "meters-tagging" });
      const text = await page.evaluate(() => document.body?.innerText || "");
      const ai = aiValidateText({
        id: "meters",
        title: "Interview",
        extractedText: text,
        expectations: [
          { id: "console", title: "Perception Console", anyOf: ["Interviewer Perception Console"] },
          { id: "tagging", title: "Transcript Tagging", anyOf: ["Live Transcript Signal Tagging"] },
        ],
      });
      return { screenshots: [shot], ai, details: "Live meters present and transcript tagging rendered." };
    });

    await step("Complete full interview round + validate session-end delta", async ({ page }) => {
      const stepPerf: PerfRecord[] = [];

      const readCurrentQuestion = async (): Promise<string> => {
        return await page.evaluate(() => {
          const nodes = Array.from(document.querySelectorAll("div"));
          const label = nodes.find((node) => (node.textContent || "").trim() === "Current Question");
          const card = label?.parentElement;
          if (!card) return "";
          const children = Array.from(card.querySelectorAll("div"));
          // [0] label, [1] text
          return String(children[1]?.textContent || "").trim();
        });
      };

      const answers = [
        "I owned migration planning, set rollout milestones, and aligned four teams to cut deployment lead time by 37%.",
        "I led cache and query optimization to reduce p95 from 420ms to 180ms and lower infra spend by 18%.",
        "I resolved a cross-team outage by driving incident command, restoring service in 22 minutes, and adding guardrails that prevented recurrence.",
        "I evaluated trade-offs between latency, correctness, and cost and validated choices with metrics.",
        "I aligned stakeholders on success metrics, wrote the design doc, and owned rollout checkpoints.",
      ];

      const maxAttempts = 10;
      for (let idx = 0; idx < maxAttempts; idx += 1) {
        const textarea = page.getByPlaceholder("Type your answer with structure: context, action, impact, reflection...");
        await textarea.fill(answers[idx] || "I made a clear decision, owned execution details, and measured impact with one concrete metric.");

        const previousQuestion = await readCurrentQuestion();
        perf.mark(`answer_${idx}_click`);
        await page.getByRole("button", { name: "Submit Answer" }).click();

        await Promise.race([
          page.getByText("Session-End Delta").waitFor({ state: "visible", timeout: 25000 }),
          page.getByText("Answer submitted.").waitFor({ state: "visible", timeout: 25000 }).catch(() => undefined),
        ]);

        // Deterministic progress wait: question changes OR interview completes.
        await page.waitForFunction(
          (prev) => {
            const bodyText = document.body?.innerText || "";
            if (bodyText.includes("Interview completed")) return true;
            const nodes = Array.from(document.querySelectorAll("div"));
            const label = nodes.find((node) => (node.textContent || "").trim() === "Current Question");
            const card = label?.parentElement;
            if (!card) return false;
            const children = Array.from(card.querySelectorAll("div"));
            const current = String(children[1]?.textContent || "").trim();
            return Boolean(current && current !== String(prev || "").trim());
          },
          previousQuestion,
          { timeout: 25000 }
        );

        perf.mark(`answer_${idx}_done`);
        const latency = perf.measureMs(`answer_${idx}_click`, `answer_${idx}_done`);
        const perfItem: PerfRecord = {
          key: `answer_latency_${idx + 1}`,
          valueMs: latency,
          thresholdMs: config.thresholds.interviewAnswerLatencyMs,
          passed: latency <= config.thresholds.interviewAnswerLatencyMs,
        };
        performanceRecords.push(perfItem);
        stepPerf.push(perfItem);

        if (await page.getByText("Interview completed").isVisible().catch(() => false)) {
          break;
        }
        if (await page.getByText("Session-End Delta").isVisible().catch(() => false)) {
          break;
        }
      }

      // Completion is required for downstream share/export.
      await page.getByText("Interview completed").waitFor({ state: "visible", timeout: 45000 });
      await page.getByText("Session-End Delta").waitFor({ state: "visible", timeout: 45000 });
      await page.getByText(/Velocity:/).first().waitFor({ state: "visible" });

      const offer = await httpJson<any>(`${config.backendUrl}/api/user/offer-probability?limit=40`, { method: "GET", headers: authHeaders });
      completedSessionId = String(offer.latest_session_id || "");
      if (!completedSessionId) throw new Error("Missing latest_session_id from offer probability");

      // UI visibility checks for key offer framing fields.
      const baselineHint = String(offer.baseline_range_hint || "").trim();
      if (baselineHint) {
        await page.getByText(baselineHint).first().waitFor({ state: "visible", timeout: 8000 });
      }
      const ladder = Array.isArray(offer.target_ladder) ? offer.target_ladder.map((x: any) => String(x || "").trim()).filter(Boolean) : [];
      if (ladder.length > 0) {
        // At minimum, the first ladder chip should be visible.
        await page.getByText(ladder[0]).first().waitFor({ state: "visible", timeout: 8000 });
      }
      const plateauNote = String(offer.plateau_note || "").trim();
      if (plateauNote) {
        await page.getByText(plateauNote).first().waitFor({ state: "visible", timeout: 8000 });
      }

      // Testimonial gating validation: prompt should appear only when criteria are met.
      const significantGain = Number(offer.delta_vs_last_session || 0) >= 5;
      const confidenceBand = String(offer.confidence_band || "low").toLowerCase();
      const confidenceQualified = confidenceBand === "medium" || confidenceBand === "high";
      const sessionQualified = Number(offer.session_count || 0) >= 3;
      const expectedPrompt = significantGain && confidenceQualified && sessionQualified;
      const promptTitle = page.getByText("Share your improvement");
      if (expectedPrompt) {
        await promptTitle.waitFor({ state: "visible", timeout: 12000 });
      } else {
        if (await promptTitle.isVisible().catch(() => false)) {
          throw new Error("Testimonial prompt displayed even though gating criteria were not met.");
        }
      }

      const text = await page.evaluate(() => document.body?.innerText || "");
      const expectations: PhraseExpectation[] = [
        { id: "offer", title: "Offer Probability", anyOf: ["Offer Probability"] },
        { id: "velocity", title: "Velocity", anyOf: [/Velocity:/] },
        { id: "target", title: "Target 70%+", anyOf: [/70%\+/i, /push toward 70%\+/i] },
      ];
      const ai = aiValidateText({ id: "delta", title: "Delta", extractedText: text, expectations });
      const shot = await captureScreenshot(page, { screenshotsDir, stepId: "interview", title: "session-end" });

      // Trust KPI prompt exists
      await page.getByText("Did this score feel accurate?").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Yes" }).click();

      const details = `Session completed: ${completedSessionId}. Offer fields: baseline=${Boolean(baselineHint)} ladder=${ladder.length > 0} velocity=${typeof offer.improvement_velocity_pp_per_session === "number"} plateau=${Boolean(plateauNote)} testimonial_expected=${expectedPrompt}.`;
      return { screenshots: [shot], ai, perf: stepPerf, details };
    });

    await step("Navigate to dashboard + validate KPI card", async ({ page }) => {
      await page.getByRole("button", { name: /More ▾/ }).click();
      await page.getByRole("button", { name: "Performance" }).click();
      await page.getByText("Offer Probability").first().waitFor({ state: "visible" });
      await page.getByText(/Velocity:/).first().waitFor({ state: "visible" });

      // UI share action coverage.
      const shareButton = page.getByRole("button", { name: "Share Improvement Snapshot" });
      if (await shareButton.isVisible().catch(() => false)) {
        await shareButton.click();
        await page.getByText(/Improvement snapshot link copied\.|Failed to create snapshot link\./).first().waitFor({ state: "visible", timeout: 12000 });
        const failed = await page.getByText("Failed to create snapshot link.").isVisible().catch(() => false);
        if (failed) {
          throw new Error("Share Improvement Snapshot UI action failed.");
        }
      }
      const shot = await captureScreenshot(page, { screenshotsDir, stepId: "dashboard", title: "dashboard" });
      const ai = aiValidateText({
        id: "dashboard",
        title: "Dashboard",
        extractedText: await page.evaluate(() => document.body?.innerText || ""),
        expectations: [
          { id: "offer", title: "Offer Probability", anyOf: ["Offer Probability"] },
          { id: "velocity", title: "Velocity", anyOf: [/Velocity:/] },
        ],
      });
      return { screenshots: [shot], ai, details: "Dashboard loaded." };
    });

    await step("Share snapshot + open public snapshot", async ({ page }) => {
      const share = await httpJson<{ share_path: string }>(`${config.backendUrl}/api/session/${encodeURIComponent(completedSessionId)}/share`, {
        method: "POST",
        headers: authHeaders,
      });
      const publicUrl = `${config.frontendUrl}${String(share.share_path || "")}`;
      await page.goto(publicUrl, { waitUntil: "domcontentloaded" });
      await page.getByText("Shared Interview Snapshot").waitFor({ state: "visible" });
      await page.getByText("What This Means").waitFor({ state: "visible" });
      const shot = await captureScreenshot(page, { screenshotsDir, stepId: "public", title: "public" });
      const ai = aiValidateText({
        id: "public",
        title: "Public",
        extractedText: await page.evaluate(() => document.body?.innerText || ""),
        expectations: [
          { id: "offer", title: "Offer Probability", anyOf: ["Offer Probability"] },
          { id: "meaning", title: "What This Means", anyOf: ["What This Means"] },
        ],
      });
      return { screenshots: [shot], ai, details: `Public snapshot loaded: ${publicUrl}` };
    });

    await step("Export endpoint", async () => {
      const exported = await httpJson<any>(`${config.backendUrl}/api/session/${encodeURIComponent(completedSessionId)}/export`, {
        method: "GET",
        headers: authHeaders,
        timeoutMs: 20000,
      });
      if (!exported.offer_probability_snapshot) throw new Error("Export missing offer_probability_snapshot");
      return { details: "Export includes offer_probability_snapshot." };
    });

    await step("Resume upload (PDF)", async ({ page }) => {
      await page.goto("/app", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: /More ▾/ }).click();
      await page.getByRole("button", { name: "Resume Tool" }).click();
      await page.getByRole("heading", { name: "Upload Resume" }).waitFor({ state: "visible" });

      const pdfPath = path.join(REPO_ROOT, "qa", "e2e", "sample-resume.pdf");
      await ensureSamplePdf(pdfPath);
      await page.locator('input[type="file"]').setInputFiles(pdfPath);
      await page.getByText("Resume uploaded successfully.").first().waitFor({ state: "visible", timeout: 30000 });
      const shot = await captureScreenshot(page, { screenshotsDir, stepId: "resume", title: "uploaded" });
      return { screenshots: [shot], details: "Resume uploaded." };
    });

    await step("Coding assistant", async ({ page }) => {
      await page.getByRole("button", { name: /More ▾|Coding ▾|Performance ▾|Resume Tool ▾|Job Tool ▾/ }).click();
      await page.getByRole("button", { name: "Coding" }).click();
      await page.getByText("Coding Copilot").waitFor({ state: "visible" });
      await page.getByPlaceholder(/Problem prompt/i).fill("Two Sum: indices of two numbers that add to target. Need O(n).");
      await page.getByRole("button", { name: "Hint Generator" }).click();
      await page.getByText("Coaching response ready.").waitFor({ state: "visible", timeout: 30000 });
      const shot = await captureScreenshot(page, { screenshotsDir, stepId: "coding", title: "coach" });
      return { screenshots: [shot], details: "Coding coach returned output." };
    });

    await step("Switch company mode", async ({ page }) => {
      await page.goto("/app", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Pressure Lab" }).click();

      const waitForModeResponse = page.waitForResponse((resp) => {
        const url = resp.url();
        return url.includes("/api/context/company-mode") && resp.request().method() === "POST" && resp.status() === 200;
      });
      await page.getByRole("button", { name: "Google Systems Mode" }).click();
      await waitForModeResponse;

      const snapshot = await httpJson<any>(`${config.backendUrl}/api/context/snapshot`, { method: "GET", headers: authHeaders });
      if (String(snapshot?.company_mode || "").toLowerCase() !== "google") {
        throw new Error(`Company mode did not persist (expected google, got ${snapshot?.company_mode})`);
      }
      const shot = await captureScreenshot(page, { screenshotsDir, stepId: "mode", title: "google" });
      return { screenshots: [shot], details: "Company mode switched to Google and persisted." };
    });

    await step("WebSocket validation", async ({ page }) => {
      const room = `e2e-room-${Date.now()}`;
      const wsUrl = config.backendUrl.replace(/^http/i, "ws") + `/ws/voice?assist_intensity=2&room_id=${encodeURIComponent(room)}&participant=candidate`;
      const probe = await directWebSocketProbe(wsUrl, config.thresholds.wsConnectMs);
      wsProbe = { url: wsUrl, ...probe };

      await page.goto("/interview", { waitUntil: "domcontentloaded" });
      await page.getByText("🎙 Live AI Interview").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Start" }).click();
      await page.getByText(/Connected|Listening/i).first().waitFor({ state: "visible", timeout: 12000 });
      const shot = await captureScreenshot(page, { screenshotsDir, stepId: "ws", title: "voice" });
      await page.getByRole("button", { name: "Stop" }).click();

      const ai = aiValidateText({
        id: "ws",
        title: "Voice",
        extractedText: await page.evaluate(() => document.body?.innerText || ""),
        expectations: [{ id: "live_status", title: "Live Status", anyOf: [/Connected/i, /Listening/i] }],
      });

      if (!wsProbe.passed) {
        throw new Error(`Direct WS probe failed: ${wsProbe.notes}`);
      }
      return { screenshots: [shot], ai, details: `WS probe PASS. ${wsProbe.notes}` };
    });

    await step("Offer Probability determinism (variance <= threshold)", async () => {
      const offer1 = await httpJsonWithRetry<any>(`${config.backendUrl}/api/user/offer-probability?limit=40`, { method: "GET", headers: authHeaders, timeoutMs: 20000 });
      const offer2 = await httpJsonWithRetry<any>(`${config.backendUrl}/api/user/offer-probability?limit=40`, { method: "GET", headers: authHeaders, timeoutMs: 20000 });
      const p1 = Number(offer1?.offer_probability || 0);
      const p2 = Number(offer2?.offer_probability || 0);
      const variance = Math.abs(p1 - p2);
      determinism = {
        passed: variance <= config.thresholds.determinismVariance,
        offerProbability1: p1,
        offerProbability2: p2,
        variance,
        threshold: config.thresholds.determinismVariance,
        notes: "Determinism is validated by repeating the offer endpoint call twice for the same user state.",
      };
      if (!determinism.passed) {
        throw new Error(`Variance ${variance} exceeds threshold ${config.thresholds.determinismVariance}`);
      }
      return { details: `Determinism PASS (variance=${variance.toFixed(4)}).` };
    });

    await step("Multi-session progression + velocity/plateau", async () => {
      // Important: run this step under a dedicated seed-only user so the seeded histories
      // do not mix with the earlier “real” interview session analytics.
      const seedUserId = `${userId}-seed`;
      const seedToken = unsignedJwt(seedUserId);
      const seedAuthHeaders = { Authorization: `Bearer ${seedToken}` };

      const resetUrl = `${config.backendUrl}/api/context/reset`;
      const seedUrl = `${config.backendUrl}/api/dev/seed-session-analytics`;
      const offerUrl = `${config.backendUrl}/api/user/offer-probability?limit=40`;

      // Subtest A: deterministic positive velocity from seeded progression history
      await httpJsonWithRetry(resetUrl, { method: "POST", headers: seedAuthHeaders, timeoutMs: 15000 });
      await httpJsonWithRetry(
        seedUrl,
        {
          method: "POST",
          headers: { ...seedAuthHeaders, "Content-Type": "application/json", "X-E2E-Seed": "true" },
          body: JSON.stringify({ items: seededProgressionItems(seedUserId) }),
          timeoutMs: 15000,
        },
        2
      );
      const prog = await httpJsonWithRetry<any>(offerUrl, { method: "GET", headers: seedAuthHeaders, timeoutMs: 20000 });
      const progVelocity = Number(prog?.improvement_velocity_pp_per_session ?? prog?.summary?.velocity ?? 0);
      if (!Number.isFinite(progVelocity) || progVelocity <= 0) {
        throw new Error(`Expected positive velocity after seeded progression, got ${progVelocity}`);
      }

      // Subtest B: deterministic plateau triggering from seeded plateau history
      await httpJsonWithRetry(resetUrl, { method: "POST", headers: seedAuthHeaders, timeoutMs: 15000 });
      await httpJsonWithRetry(
        seedUrl,
        {
          method: "POST",
          headers: { ...seedAuthHeaders, "Content-Type": "application/json", "X-E2E-Seed": "true" },
          body: JSON.stringify({ items: seededPlateauItems(seedUserId) }),
          timeoutMs: 15000,
        },
        2
      );
      const plat = await httpJsonWithRetry<any>(offerUrl, { method: "GET", headers: seedAuthHeaders, timeoutMs: 20000 });
      const plateauNote = String(plat?.plateau_note ?? plat?.summary?.plateau_note ?? "").trim();
      const plateauVelocity = Number(plat?.improvement_velocity_pp_per_session ?? plat?.summary?.velocity ?? 0);
      if (!plateauNote && (!Number.isFinite(plateauVelocity) || Math.abs(plateauVelocity) > 2.0)) {
        throw new Error(`Plateau did not trigger from seeded history (velocity=${plateauVelocity}, plateau_note='${plateauNote}')`);
      }

      return {
        details: `Seeded progression/plateau OK: velocity_prog=${progVelocity.toFixed(2)} velocity_plateau=${Number.isFinite(plateauVelocity) ? plateauVelocity.toFixed(2) : String(plateauVelocity)} plateau_note=${plateauNote ? "present" : "absent"}`,
      };
    });

  } finally {
    try { await page?.close(); } catch {}
    try { await context?.close(); } catch {}
    try { await browser?.close(); } catch {}
  }

  const stepsPassed = steps.filter((s) => s.status === "pass").length;
  const stepsFailed = steps.filter((s) => s.status === "fail").length;
  const stepsSkipped = steps.filter((s) => s.status === "skip").length;

  const websocketFailures = wsProbe.passed ? 0 : 1;
  const verdict: RunReport["verdict"] =
    stepsFailed > 0 || consoleEvents.length > 0 || networkFailures.length > 0 || websocketFailures > 0 || !determinism.passed ? "FAIL" : "PASS";

  const report: RunReport = {
    generatedAtIso: nowIso(),
    environment: {
      frontendUrl: config.frontendUrl,
      backendUrl: config.backendUrl,
      nodeVersion: process.version,
      osPlatform: process.platform,
      browserName: "chromium",
      browserVersion: browser?.version?.() || "unknown",
      headless: config.headless,
    },
    config,
    verdict,
    summary: {
      stepsTotal: steps.length,
      stepsPassed,
      stepsFailed,
      stepsSkipped,
      consoleErrors: consoleEvents.length,
      networkFailures: networkFailures.length,
      websocketFailures,
    },
    determinism,
    webSockets: {
      inBrowser: wsMonitor.snapshot(),
      directProbe: wsProbe,
    },
    performance: performanceRecords,
    console: consoleEvents,
    networkFailures,
    steps,
    artifacts: {
      reportJsonPath,
      reportDocxPath,
      screenshotsDir,
    },
  };

  fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), "utf-8");
  await generateDocxReport(report, reportDocxPath);

  if (verdict !== "PASS") {
    // eslint-disable-next-line no-console
    console.error(`E2E QA FAILED. Reports at: ${reportJsonPath} and ${reportDocxPath}`);
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log(`E2E QA PASS. Reports at: ${reportJsonPath} and ${reportDocxPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
