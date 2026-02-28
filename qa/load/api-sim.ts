import WebSocket from "ws";
import { MetricsCollector } from "./metrics-collector";

type ApiSimConfig = {
  frontendUrl: string;
  backendUrl: string;
  answersPerUser: number;
  wsConnectTimeoutMs: number;
  wsStabilityDurationMs: number;
  wsStabilityIntervalMs: number;
  offerComputeTimeoutMs: number;
};

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

async function httpJson<T>(
  url: string,
  options: { method: string; headers?: Record<string, string>; body?: any; timeoutMs?: number }
): Promise<T> {
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
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function httpJsonWithRetry<T>(
  url: string,
  options: { method: string; headers?: Record<string, string>; body?: any; timeoutMs?: number },
  retries = 2,
  retryDelayMs = 350
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

async function directWebSocketProbe(wsUrl: string, timeoutMs: number) {
  return await new Promise<{ connectMs: number; ok: boolean; notes: string }>((resolve) => {
    const start = performance.now();
    let done = false;
    const socket = new WebSocket(wsUrl);
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      try { socket.close(); } catch {}
      resolve({ connectMs: Math.round(performance.now() - start), ok: false, notes: `Timeout (${timeoutMs}ms)` });
    }, timeoutMs);

    socket.on("open", () => {
      const ms = Math.round(performance.now() - start);
      try {
        socket.send(JSON.stringify({ type: "sync_state_request" }));
      } catch {}
      // Resolve on first server message if it arrives quickly; otherwise treat connect time only.
      const msgTimer = setTimeout(() => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { socket.close(); } catch {}
        resolve({ connectMs: ms, ok: true, notes: "Connected (no message observed within window)" });
      }, Math.min(800, timeoutMs));

      socket.on("message", () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        clearTimeout(msgTimer);
        try { socket.close(); } catch {}
        resolve({ connectMs: ms, ok: true, notes: "Connected + received message" });
      });
    });
    socket.on("error", (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ connectMs: Math.round(performance.now() - start), ok: false, notes: `WS error: ${String((err as any)?.message || err)}` });
    });
  });
}

async function wsStabilityProbe(
  wsUrl: string,
  opts: { hardTimeoutMs: number; durationMs: number; intervalMs: number }
): Promise<{ connected: boolean; disconnect: boolean; connectMs: number; rttsMs: number[]; gapsMs: number[]; notes: string }> {
  return await new Promise((resolve) => {
    const start = performance.now();
    const rttsMs: number[] = [];
    const gapsMs: number[] = [];
    let lastMsgAt = 0;
    let connected = false;
    let disconnect = false;
    let done = false;

    const socket = new WebSocket(wsUrl);
    const hardTimer = setTimeout(() => {
      if (done) return;
      done = true;
      disconnect = true;
      try { socket.close(); } catch {}
      resolve({ connected, disconnect, connectMs: Math.round(performance.now() - start), rttsMs, gapsMs, notes: `WS stability hard timeout (${opts.hardTimeoutMs}ms)` });
    }, opts.hardTimeoutMs);

    const finalize = (notes: string) => {
      if (done) return;
      done = true;
      clearTimeout(hardTimer);
      try { socket.close(); } catch {}
      resolve({ connected, disconnect, connectMs: connected ? Math.round((socket as any).__connectMs || 0) : Math.round(performance.now() - start), rttsMs, gapsMs, notes });
    };

    socket.on("open", () => {
      connected = true;
      (socket as any).__connectMs = Math.round(performance.now() - start);

      let pendingSentAt: number | null = null;

      const durationTimer = setTimeout(() => {
        finalize("WS stability window complete");
      }, Math.max(250, opts.durationMs));

      let seq = 0;
      const interval = setInterval(() => {
        if (done) return;
        seq += 1;
        const sentAt = performance.now();
        pendingSentAt = sentAt;
        try {
          socket.send(JSON.stringify({ type: "sync_state_request", client_sent_at_ms: sentAt, seq }));
        } catch {
        }
      }, Math.max(200, opts.intervalMs));

      socket.on("message", (data) => {
        const now = performance.now();
        if (lastMsgAt > 0) gapsMs.push(Math.max(0, Math.round(now - lastMsgAt)));
        lastMsgAt = now;

        if (pendingSentAt != null) {
          rttsMs.push(Math.max(0, Math.round(now - pendingSentAt)));
          pendingSentAt = null;
        }

        try {
          const parsed = JSON.parse(String(data || "{}"));
          const sent = Number(parsed?.client_sent_at_ms);
          if (Number.isFinite(sent) && sent > 0) {
            rttsMs.push(Math.max(0, Math.round(now - sent)));
          }
        } catch {
        }
      });

      socket.on("close", () => {
        disconnect = true;
        clearInterval(interval);
        clearTimeout(durationTimer);
        if (!done) finalize("WS closed during stability window");
      });
      socket.on("error", (err) => {
        disconnect = true;
        clearInterval(interval);
        clearTimeout(durationTimer);
        if (!done) finalize(`WS error during stability window: ${String((err as any)?.message || err)}`);
      });
    });

    socket.on("error", (err) => {
      if (done) return;
      done = true;
      clearTimeout(hardTimer);
      resolve({ connected, disconnect: true, connectMs: Math.round(performance.now() - start), rttsMs, gapsMs, notes: `WS error: ${String((err as any)?.message || err)}` });
    });
  });
}

export async function runApiUser(
  userIndex: number,
  cfg: ApiSimConfig,
  metrics: MetricsCollector
): Promise<{ userId: string; latestSessionId: string; ok: boolean; opsAttempted: number; opsFailed: number }>
{
  const userId = `load-api-${Date.now()}-${userIndex}`;
  const token = unsignedJwt(userId);
  const authHeaders = { Authorization: `Bearer ${token}` };

  let opsAttempted = 0;
  let opsFailed = 0;
  const op = async <T>(step: string, fn: () => Promise<T>): Promise<T | null> => {
    opsAttempted += 1;
    metrics.recordOpAttempt(1);
    try {
      return await fn();
    } catch (e) {
      opsFailed += 1;
      metrics.recordOpFailure(1);
      recordErr(step, e);
      return null;
    }
  };

  const recordErr = (step: string, err: any) => {
    metrics.recordError({ userId, scenario: "api", step, message: String(err?.message || err) });
  };

  await op("context_reset", () => httpJson(`${cfg.backendUrl}/api/context/reset`, { method: "POST", headers: authHeaders, timeoutMs: 15000 }));

  // Landing page load (frontend)
  await op("landing", async () => {
    const t0 = performance.now();
    const res = await fetch(`${cfg.frontendUrl}/`, { method: "GET" });
    await res.text();
    const ms = Math.round(performance.now() - t0);
    metrics.record({ key: "ttfq_ms", value: ms, userId, scenario: "api" });
    return true;
  });

  // WebSocket connect probe
  await op("ws_connect", async () => {
    const room = crypto.randomUUID();
    const wsUrl = cfg.backendUrl.replace(/^http/i, "ws") + `/ws/voice?assist_intensity=2&room_id=${encodeURIComponent(room)}&participant=candidate`;
    const hardTimeoutMs = Math.max(8000, cfg.wsConnectTimeoutMs * 3);
    const probe = await directWebSocketProbe(wsUrl, hardTimeoutMs);
    metrics.record({ key: "ws_connect_ms", value: probe.connectMs, userId, scenario: "api" });
    if (!probe.ok) throw new Error(probe.notes);
    return true;
  });

  // WebSocket stability (keepalive-ish) probe
  await op("ws_stability", async () => {
    const room = crypto.randomUUID();
    const wsUrl = cfg.backendUrl.replace(/^http/i, "ws") + `/ws/voice?assist_intensity=2&room_id=${encodeURIComponent(room)}&participant=candidate`;
    const hardTimeoutMs = Math.max(10_000, cfg.wsStabilityDurationMs + 4000);
    const result = await wsStabilityProbe(wsUrl, { hardTimeoutMs, durationMs: cfg.wsStabilityDurationMs, intervalMs: cfg.wsStabilityIntervalMs });
    for (const rtt of result.rttsMs) metrics.record({ key: "ws_rtt_ms", value: rtt, userId, scenario: "api" });
    for (const gap of result.gapsMs) metrics.record({ key: "ws_gap_ms", value: gap, userId, scenario: "api" });
    if (result.disconnect) metrics.record({ key: "ws_disconnect_flag", value: 1, userId, scenario: "api" });
    if (!result.connected) throw new Error(result.notes);
    return true;
  });

  let sessionId = "";
  const started = await op("interview_start", () =>
    httpJsonWithRetry<{ session_id: string }>(`${cfg.backendUrl}/api/interview/start`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "behavioral" }),
      timeoutMs: 45000,
    })
  );
  sessionId = String((started as any)?.session_id || "");
  if (!sessionId) {
    metrics.recordUserOutcome(false);
    return { userId, latestSessionId: "", ok: false, opsAttempted, opsFailed };
  }

  const answers = [
    "I led cache and query optimization to reduce p95 from 420ms to 180ms and lower infra spend by 18%.",
    "I owned rollout planning across teams and cut deployment lead time by 37%.",
    "I drove incident command, restored service in 22 minutes, and added guardrails to prevent recurrence.",
    "I set success metrics, wrote the design doc, and owned staged rollout checkpoints.",
    "I evaluated latency vs correctness vs cost and validated decisions with metrics.",
  ];

  let done = false;
  const maxExtraAnswers = 3;
  const maxTotalAnswers = cfg.answersPerUser + maxExtraAnswers;
  for (let i = 0; i < maxTotalAnswers; i += 1) {
    const t0 = performance.now();
    const resp = await op(`answer_${i + 1}`, () =>
      httpJsonWithRetry<any>(`${cfg.backendUrl}/api/interview/answer`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, answer: answers[i % answers.length] }),
        timeoutMs: 45000,
      })
    );
      const ms = Math.round(performance.now() - t0);
      metrics.record({ key: "answer_latency_ms", value: ms, userId, scenario: "api" });
      if ((resp as any)?.done) {
        done = true;
        break;
      }
      if (i + 1 >= cfg.answersPerUser && i + 1 < maxTotalAnswers) {
        // Still not done after the required 3–5 answers; continue a few extra times to enable downstream steps.
        continue;
      }
  }
  if (!done) {
    // Not ideal, but don't abort the whole user; downstream share may fail.
    metrics.recordError({ userId, scenario: "api", step: "session_incomplete", message: `Session not completed after ${maxTotalAnswers} answers` });
  }

  // Offer Probability compute latency
  const offer1 = await op("offer_probability", async () => {
    const t0 = performance.now();
    const v = await httpJsonWithRetry<any>(`${cfg.backendUrl}/api/user/offer-probability?limit=40`, {
      method: "GET",
      headers: authHeaders,
      timeoutMs: cfg.offerComputeTimeoutMs,
    });
    const ms = Math.round(performance.now() - t0);
    metrics.record({ key: "offer_compute_ms", value: ms, userId, scenario: "api" });
    return v;
  });
  const offer2 = await op("offer_probability_repeat", () =>
    httpJsonWithRetry<any>(`${cfg.backendUrl}/api/user/offer-probability?limit=40`, {
      method: "GET",
      headers: authHeaders,
      timeoutMs: cfg.offerComputeTimeoutMs,
    })
  );
  if (offer1 && offer2) {
    const p1 = Number((offer1 as any)?.offer_probability || 0);
    const p2 = Number((offer2 as any)?.offer_probability || 0);
    const diff = Math.abs(p1 - p2);
    metrics.record({ key: "offer_determinism_diff", value: diff, userId, scenario: "api" });
  }

  // Dashboard + Share + Public snapshot (direct API)
  let sharePath = "";
  await op("dashboard", () => httpJsonWithRetry<any>(`${cfg.backendUrl}/api/dashboard/overview`, { method: "GET", headers: authHeaders, timeoutMs: 20000 }));

  const share = await op("share_snapshot", () =>
    httpJsonWithRetry<{ share_path: string }>(`${cfg.backendUrl}/api/session/${encodeURIComponent(sessionId)}/share`, {
      method: "POST",
      headers: authHeaders,
      timeoutMs: 20000,
    })
  );
  sharePath = String((share as any)?.share_path || "");
  if (sharePath) {
    await op("public_snapshot", async () => {
      const res = await fetch(`${cfg.frontendUrl}${sharePath}`, { method: "GET" });
      await res.text();
      return true;
    });
  }

  const ok = opsFailed === 0;
  metrics.recordUserOutcome(ok);
  return { userId, latestSessionId: sessionId, ok, opsAttempted, opsFailed };
}
