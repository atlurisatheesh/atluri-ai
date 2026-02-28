/**
Chaos harness runner (client-side fault injection)

Purpose:
- Stress the system with controlled chaos from the client side.
- Validate that the app degrades gracefully (timeouts, aborts, WS churn) and still produces usable results.

Run:
  cd qa
  npx ts-node chaos/run-chaos.ts

Env:
  CHAOS_BACKEND_URL=http://127.0.0.1:9010
  CHAOS_FRONTEND_URL=http://127.0.0.1:3001
  CHAOS_USERS=20
  CHAOS_DURATION_SEC=90
  CHAOS_HTTP_ABORT_RATE=0.08
  CHAOS_WS_CHURN_RATE=0.05
  CHAOS_JITTER_MS=250
  CHAOS_HEADLESS=true

Auth:
- Prefers E2E bypass (unsigned dev JWT) when backend allows it.
- If your backend enforces strict JWT verification, set CHAOS_AUTH_TOKEN to a real Supabase access token.
*/

import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import WebSocket from "ws";

type ChaosConfig = {
  backendUrl: string;
  frontendUrl: string;
  users: number;
  durationSec: number;
  httpAbortRate: number;
  wsChurnRate: number;
  jitterMs: number;
  headless: boolean;
  authToken: string | null;
};

type ChaosEvent = {
  ts: string;
  user: string;
  kind: string;
  detail?: string;
};

type ChaosReport = {
  started_at: string;
  finished_at: string;
  config: ChaosConfig;
  summary: {
    ok: boolean;
    http_requests: number;
    http_failures: number;
    ws_connects: number;
    ws_disconnects: number;
    ws_errors: number;
    notes: string[];
  };
  events: ChaosEvent[];
};

function nowIso() {
  return new Date().toISOString();
}

function envNum(name: string, def: number) {
  const raw = process.env[name];
  if (raw == null || raw === "") return def;
  const n = Number(raw);
  return Number.isFinite(n) ? n : def;
}

function envBool(name: string, def: boolean) {
  const raw = String(process.env[name] ?? "").trim().toLowerCase();
  if (!raw) return def;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function b64url(raw: string): string {
  return Buffer.from(raw, "utf-8")
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function unsignedJwt(sub: string): string {
  // Uses existing dev convention; backend must allow ALLOW_UNVERIFIED_JWT_DEV.
  return `${b64url(JSON.stringify({ alg: "none", typ: "JWT" }))}.${b64url(JSON.stringify({ sub }))}.`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function rand() {
  return Math.random();
}

async function httpJson<T>(url: string, options: { method: string; headers?: Record<string, string>; body?: any; timeoutMs?: number; abortRate?: number }): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.max(500, options.timeoutMs ?? 10_000));

  // Chaos: probabilistically abort requests.
  if ((options.abortRate ?? 0) > 0 && rand() < (options.abortRate ?? 0)) {
    setTimeout(() => controller.abort(), Math.max(10, Math.floor(50 + rand() * 150)));
  }

  try {
    const res = await fetch(url, {
      method: options.method,
      headers: { ...(options.headers || {}) },
      body: options.body,
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runUser(config: ChaosConfig, userId: string, events: ChaosEvent[], counters: any) {
  const token = config.authToken || unsignedJwt(userId);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const startTs = Date.now();
  // Use a loose type here to avoid ts-node/ws typing edge cases under this repo's QA tsconfig.
  let ws: any = null;
  let wsOpen = false;

  const wsUrl = config.backendUrl.replace(/^http/i, "ws") + `/ws/voice?assist_intensity=2&room_id=${encodeURIComponent("chaos-" + userId)}&participant=candidate&role=behavioral`;

  const connectWs = async () => {
    counters.ws_connects += 1;
    return await new Promise<void>((resolve) => {
      ws = new WebSocket(wsUrl);
      ws.on("open", () => {
        wsOpen = true;
        events.push({ ts: nowIso(), user: userId, kind: "ws_open" });
        resolve();
      });
      ws.on("error", () => {
        counters.ws_errors += 1;
        events.push({ ts: nowIso(), user: userId, kind: "ws_error" });
        resolve();
      });
      ws.on("close", () => {
        wsOpen = false;
        counters.ws_disconnects += 1;
        events.push({ ts: nowIso(), user: userId, kind: "ws_close" });
      });
    });
  };

  await connectWs();

  while (Date.now() - startTs < config.durationSec * 1000) {
    // jitter
    if (config.jitterMs > 0) await sleep(Math.floor(rand() * config.jitterMs));

    // WS churn
    if (ws && wsOpen && config.wsChurnRate > 0 && rand() < config.wsChurnRate) {
      try { ws.close(); } catch {}
      ws = null;
      wsOpen = false;
      await sleep(100 + Math.floor(rand() * 250));
      await connectWs();
    }

    // Simple backend calls that exercise auth + offer computation
    try {
      counters.http_requests += 1;
      await httpJson<any>(`${config.backendUrl}/api/user/offer-probability?limit=10`, {
        method: "GET",
        headers,
        timeoutMs: 8000,
        abortRate: config.httpAbortRate,
      });
    } catch (e: any) {
      counters.http_failures += 1;
      events.push({ ts: nowIso(), user: userId, kind: "http_fail", detail: String(e?.message || e) });
    }

    // Optional: small UI ping (ensures frontend stays responsive)
    // (Playwright is heavy; keep it minimal by doing one shared browser outside user loops.)
  }

  try {
    if (ws && wsOpen) ws.close();
  } catch {}
}

async function main() {
  const config: ChaosConfig = {
    backendUrl: process.env.CHAOS_BACKEND_URL || "http://127.0.0.1:9010",
    frontendUrl: process.env.CHAOS_FRONTEND_URL || "http://127.0.0.1:3001",
    users: Math.max(1, Math.floor(envNum("CHAOS_USERS", 20))),
    durationSec: Math.max(10, Math.floor(envNum("CHAOS_DURATION_SEC", 90))),
    httpAbortRate: Math.max(0, Math.min(0.9, envNum("CHAOS_HTTP_ABORT_RATE", 0.08))),
    wsChurnRate: Math.max(0, Math.min(0.9, envNum("CHAOS_WS_CHURN_RATE", 0.05))),
    jitterMs: Math.max(0, Math.floor(envNum("CHAOS_JITTER_MS", 250))),
    headless: envBool("CHAOS_HEADLESS", true),
    authToken: (process.env.CHAOS_AUTH_TOKEN || "").trim() || null,
  };

  const events: ChaosEvent[] = [];
  const counters = {
    http_requests: 0,
    http_failures: 0,
    ws_connects: 0,
    ws_disconnects: 0,
    ws_errors: 0,
  };

  // Lightweight frontend sanity check (optional)
  try {
    const browser = await chromium.launch({ headless: config.headless });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    await page.goto(config.frontendUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    events.push({ ts: nowIso(), user: "system", kind: "frontend_ok" });
    await browser.close();
  } catch (e: any) {
    events.push({ ts: nowIso(), user: "system", kind: "frontend_fail", detail: String(e?.message || e) });
  }

  const started = nowIso();
  await Promise.all(
    Array.from({ length: config.users }).map((_, i) => runUser(config, `chaos-user-${i + 1}`, events, counters))
  );
  const finished = nowIso();

  const failureRate = counters.http_requests > 0 ? (counters.http_failures / counters.http_requests) : 0;
  const ok = failureRate < 0.15 && counters.ws_errors <= Math.max(2, Math.floor(config.users * 0.2));

  const report: ChaosReport = {
    started_at: started,
    finished_at: finished,
    config,
    summary: {
      ok,
      http_requests: counters.http_requests,
      http_failures: counters.http_failures,
      ws_connects: counters.ws_connects,
      ws_disconnects: counters.ws_disconnects,
      ws_errors: counters.ws_errors,
      notes: [
        ok ? "PASS (client-side chaos within tolerance)" : "FAIL (too many failures under chaos)",
        config.authToken ? "Used CHAOS_AUTH_TOKEN" : "Used unsigned dev JWT (requires ALLOW_UNVERIFIED_JWT_DEV or token bridging)" ,
      ],
    },
    events: events.slice(-1500),
  };

  const repoRoot = path.resolve(__dirname, "..", "..");
  const outDir = path.join(repoRoot, "qa", "reports");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `chaos_report_${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: report.summary.ok, report: outPath, summary: report.summary }, null, 2));
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
