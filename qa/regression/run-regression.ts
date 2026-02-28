/**
Behavioral regression runner

Run:
  cd qa
  npx ts-node regression/run-regression.ts

Baseline creation:
  $env:REGRESSION_BASELINE='1'; npx ts-node regression/run-regression.ts

Determinism:
- Uses dev-only /api/dev/seed-session-analytics to seed stable analytics snapshots.
- Avoids randomness and compares current output to qa/regression/baseline.json.
*/

import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { fingerprintPng } from "./screenshot-diff";
import { compareBaseline } from "./drift-checker";

type OfferSnapshot = {
  offer_probability: number;
  delta_vs_last_session: number;
  improvement_velocity_pp_per_session: number;
  confidence_band: string;
  drivers_positive: string[];
  drivers_negative: string[];
  what_to_fix_next: string[];
  beta_percentile?: number;
  beta_cohort_size?: number;
  baseline_range_hint?: string;
  target_ladder?: string[];
  plateau_note?: string | null;
  how_it_works?: string;
  latest_session_id?: string | null;
  session_count?: number;
};

function nowIso() {
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

async function httpJson<T>(url: string, options: { method: string; headers?: Record<string, string>; body?: any; timeoutMs?: number }): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.max(1000, options.timeoutMs ?? 15000));
  try {
    const res = await fetch(url, {
      method: options.method,
      headers: { ...(options.headers || {}) },
      body: options.body,
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 400)}`);
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

function seededStableHighPerformanceItems(userId: string) {
  const baseTs = Date.now();
  const count = 9;
  return Array.from({ length: count }).map((_, idx) => ({
    session_id: `reg_seed_plateau_${userId}_${idx + 1}`,
    role: "behavioral",
    generated_at: (baseTs - (count - idx) * 60_000) / 1000,
    summary: {
      score: 95,
      ownership_clarity_score: 92,
      metric_usage_score: 88,
      tradeoff_depth_score: 90,
      contradictions_detected: 0,
      drift_frequency: 0.02,
      confidence_drop_moments: 0,
      assist_high_severity_spikes: 0,
      metric_inflation_flags: 0,
    },
  }));
}

async function collectUiArtifacts(frontendUrl: string, userId: string, outDir: string) {
  const browser = await chromium.launch({ headless: process.env.REGRESSION_HEADLESS !== "false" });
  try {
    const ctx = await browser.newContext({ baseURL: frontendUrl, viewport: { width: 1360, height: 860 } });
    const page = await ctx.newPage();

    await page.addInitScript((payload) => {
      try {
        window.localStorage.setItem("atluriin.e2e.bypass", "1");
        window.localStorage.setItem("atluriin.e2e.user_id", payload.userId);
      } catch {
      }
    }, { userId });

    const shots: Record<string, { path: string; sha256: string; dhash64: string; bytes: number }> = {};
    const capture = async (key: string) => {
      const filePath = path.join(outDir, `${key}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      const h = fingerprintPng(filePath);
      shots[key] = { path: filePath, sha256: h.sha256, dhash64: h.dhash64, bytes: h.bytes };
    };

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByText("AtluriIn AI").first().waitFor({ state: "visible" });
    await capture("landing");

    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await page.getByText("First Session Launch").waitFor({ state: "visible" });
    await capture("app");

    await page.getByRole("button", { name: /More ▾/ }).click();
    await page.getByRole("button", { name: "Performance" }).click();
    await page.getByText("Offer Probability").first().waitFor({ state: "visible" });
    await page.getByText(/Velocity:/).first().waitFor({ state: "visible" });
    await capture("dashboard");

    const extractedText = await page.evaluate(() => document.body?.innerText || "");

    await page.close();
    await ctx.close();

    return {
      extractedText: String(extractedText || ""),
      screenshotHashes: Object.fromEntries(
        Object.entries(shots).map(([k, v]) => [k, { sha256: v.sha256, dhash64: (v as any).dhash64, bytes: v.bytes }])
      ),
    };
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const baselinePath = path.join(repoRoot, "qa", "regression", "baseline.json");
  const reportsDir = path.join(repoRoot, "qa", "reports", `regression_${nowIso().replace(/[:.]/g, "-")}`);
  fs.mkdirSync(reportsDir, { recursive: true });

  const backendUrl = (process.env.REGRESSION_BACKEND_URL || "http://localhost:9010").replace(/\/+$/g, "");
  const frontendUrl = (process.env.REGRESSION_FRONTEND_URL || "http://localhost:3001").replace(/\/+$/g, "");

  const userId = "regression-user-fixed";
  const token = unsignedJwt(userId);
  const authHeaders = { Authorization: `Bearer ${token}` };

  // Deterministic seed (dev-only) then compute offer snapshot.
  await httpJson(`${backendUrl}/api/context/reset`, { method: "POST", headers: authHeaders, timeoutMs: 15000 });
  await httpJson(`${backendUrl}/api/dev/seed-session-analytics`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json", "X-E2E-Seed": "true" },
    body: JSON.stringify({ items: seededStableHighPerformanceItems(userId) }),
    timeoutMs: 15000,
  });

  const offer = await httpJson<OfferSnapshot>(`${backendUrl}/api/user/offer-probability?limit=40`, {
    method: "GET",
    headers: authHeaders,
    timeoutMs: 20000,
  });

  // UI artifacts (screenshots + extracted text)
  const ui = await collectUiArtifacts(frontendUrl, userId, reportsDir);

  const snapshot = {
    generatedAtIso: nowIso(),
    environment: { backendUrl, frontendUrl, nodeVersion: process.version, osPlatform: process.platform },
    offer: {
      offer_probability: Number(offer.offer_probability || 0),
      delta_vs_last_session: Number(offer.delta_vs_last_session || 0),
      improvement_velocity_pp_per_session: Number(offer.improvement_velocity_pp_per_session || 0),
      confidence_band: String(offer.confidence_band || ""),
      drivers_positive: Array.isArray(offer.drivers_positive) ? offer.drivers_positive.map(String) : [],
      drivers_negative: Array.isArray(offer.drivers_negative) ? offer.drivers_negative.map(String) : [],
      what_to_fix_next: Array.isArray(offer.what_to_fix_next) ? offer.what_to_fix_next.map(String) : [],
      beta_percentile: typeof (offer as any).beta_percentile === "number" ? (offer as any).beta_percentile : undefined,
      beta_cohort_size: typeof (offer as any).beta_cohort_size === "number" ? (offer as any).beta_cohort_size : undefined,
      baseline_range_hint: String((offer as any).baseline_range_hint || ""),
      target_ladder: Array.isArray((offer as any).target_ladder) ? (offer as any).target_ladder.map(String) : [],
      plateau_note: (offer as any).plateau_note ?? null,
      how_it_works: String((offer as any).how_it_works || ""),
    },
    ui: {
      requiredPhrases: [
        "AtluriIn AI",
        "Offer Probability",
        "First Session Launch",
      ],
      extractedText: ui.extractedText,
      screenshotHashes: ui.screenshotHashes,
    },
  };

  const forceBaseline = String(process.env.REGRESSION_BASELINE || "").trim() === "1";
  const baselineExists = fs.existsSync(baselinePath) && fs.statSync(baselinePath).size > 5;
  const shouldWriteBaseline = forceBaseline || !baselineExists;

  if (shouldWriteBaseline) {
    fs.writeFileSync(baselinePath, JSON.stringify(snapshot, null, 2), "utf-8");
    // eslint-disable-next-line no-console
    console.log(`Baseline written: ${baselinePath}`);
    // eslint-disable-next-line no-console
    console.log(`Artifacts: ${reportsDir}`);
    return;
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));
  const drift = compareBaseline(baseline, snapshot, { probabilityDrift: 0.01, percentileDrift: 0.5 });
  const driftPath = path.join(reportsDir, "Drift_Report.json");
  fs.writeFileSync(driftPath, JSON.stringify(drift, null, 2), "utf-8");

  if (!drift.pass) {
    // eslint-disable-next-line no-console
    console.error(`REGRESSION FAIL. Drift report: ${driftPath}`);
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(`REGRESSION PASS. Drift report: ${driftPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
