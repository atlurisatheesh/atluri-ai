/**
Load test runner

Run:
  cd qa
  npx ts-node load/run-load-test.ts

Env overrides:
  LOAD_BACKEND_URL=http://localhost:9010
  LOAD_FRONTEND_URL=http://localhost:3001
  MAX_USERS=100
  BATCH_SIZES=10,25,50,100
  ANSWERS_PER_USER=4
  LOAD_HEADLESS=true
  LATENCY_THRESHOLD_MS=7000
  ERROR_THRESHOLD_PERCENT=2
  MEMORY_THRESHOLD_MB=900
  WS_CONNECT_THRESHOLD_MS=2500
  OFFER_COMPUTE_THRESHOLD_MS=2500

Notes:
- No fixed sleeps; uses deterministic waits and bounded timeouts.
- Browser mode is heavier; it runs true concurrent pages inside a single Chromium.
*/

import path from "path";
import fs from "fs";
import { MetricsCollector, type WindowedBackendMetrics, computeStats } from "./metrics-collector";
import { loadThresholdsFromEnv } from "./thresholds";
import { runApiUser } from "./api-sim";
import { runBrowserUsers } from "./browser-sim";
import { buildBatchResult, generateLoadReports, type LoadTestReport } from "./report-generator";
import { execSync } from "child_process";

type RunnerConfig = {
  backendUrl: string;
  frontendUrl: string;
  maxUsers: number;
  batchSizes: number[];
  answersPerUser: number;
  headless: boolean;
};

type ProcSample = { rssMb: number; cpuPercent: number | null };

function nodeProcSample(): ProcSample {
  return { rssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)), cpuPercent: null };
}

function backendProcSample(pid: number | null): ProcSample {
  if (!pid || pid <= 0) return { rssMb: 0, cpuPercent: null };
  try {
    if (process.platform === "win32") {
      const cmd = `powershell -NoProfile -Command "(Get-Process -Id ${pid} | Select-Object -First 1 WS,CPU | ConvertTo-Json)"`;
      const raw = execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString("utf-8");
      const parsed = JSON.parse(raw);
      const wsBytes = Number(parsed?.WS || 0);
      const cpuSec = parsed?.CPU == null ? null : Number(parsed.CPU);
      return { rssMb: Math.round(wsBytes / (1024 * 1024)), cpuPercent: cpuSec == null ? null : null };
    }
    const raw = execSync(`ps -p ${pid} -o rss=,pcpu=`, { stdio: ["ignore", "pipe", "ignore"] }).toString("utf-8").trim();
    const parts = raw.split(/\s+/).filter(Boolean);
    const rssKb = Number(parts[0] || 0);
    const pcpu = parts[1] == null ? null : Number(parts[1]);
    return { rssMb: Math.round(rssKb / 1024), cpuPercent: Number.isFinite(pcpu as any) ? (pcpu as any) : null };
  } catch {
    return { rssMb: 0, cpuPercent: null };
  }
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
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseBatchSizes(raw: string): number[] {
  const items = String(raw || "").split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
  return items.length ? items : [10, 25, 50, 100];
}

function nowIso() {
  return new Date().toISOString();
}

function clampBatchSizes(maxUsers: number, batchSizes: number[]) {
  return batchSizes.map((n) => Math.min(n, maxUsers)).filter((n) => n > 0);
}

function deltaBackendMetrics(before: any, after: any) {
  const redisMs = (Number(after.redis_publish_total_ms || 0) - Number(before.redis_publish_total_ms || 0));
  const redisSamples = (Number(after.redis_publish_samples || 0) - Number(before.redis_publish_samples || 0));
  const fanoutMs = (Number(after.fanout_delay_total_ms || 0) - Number(before.fanout_delay_total_ms || 0));
  const fanoutSamples = (Number(after.fanout_delay_samples || 0) - Number(before.fanout_delay_samples || 0));
  const wsDisc = (Number(after.ws_disconnects_total || 0) - Number(before.ws_disconnects_total || 0));

  const wsClientDisc = Number(after.ws_disconnect_client_disconnect || 0) - Number(before.ws_disconnect_client_disconnect || 0);
  const wsStop = Number(after.ws_disconnect_stop_command || 0) - Number(before.ws_disconnect_stop_command || 0);
  const wsAudio = Number(after.ws_disconnect_receive_audio_error || 0) - Number(before.ws_disconnect_receive_audio_error || 0);
  const wsDeepgram = Number(after.ws_disconnect_deepgram_error || 0) - Number(before.ws_disconnect_deepgram_error || 0);
  const wsSocketClosed = Number(after.ws_disconnect_socket_closed || 0) - Number(before.ws_disconnect_socket_closed || 0);
  const wsMaxTurns = Number(after.ws_disconnect_max_turns_reached || 0) - Number(before.ws_disconnect_max_turns_reached || 0);
  const wsOther = Number(after.ws_disconnect_other || 0) - Number(before.ws_disconnect_other || 0);
  const unexpected = Math.max(0, wsAudio + wsDeepgram + wsSocketClosed + wsMaxTurns + wsOther);

  return {
    redisPublishAvgMs: redisSamples > 0 ? redisMs / redisSamples : 0,
    fanoutDelayAvgMs: fanoutSamples > 0 ? fanoutMs / fanoutSamples : 0,
    wsDisconnects: wsDisc,
    wsDisconnectClient: wsClientDisc,
    wsDisconnectStop: wsStop,
    wsDisconnectUnexpected: unexpected,
  };
}

async function run(): Promise<void> {
  const thresholds = loadThresholdsFromEnv();
  const cfg: RunnerConfig = {
    backendUrl: (process.env.LOAD_BACKEND_URL || "http://localhost:9010").replace(/\/+$/g, ""),
    frontendUrl: (process.env.LOAD_FRONTEND_URL || "http://localhost:3001").replace(/\/+$/g, ""),
    maxUsers: Number(process.env.MAX_USERS || 100),
    batchSizes: parseBatchSizes(process.env.BATCH_SIZES || "10,25,50,100"),
    answersPerUser: Math.max(3, Math.min(5, Number(process.env.ANSWERS_PER_USER || 4))),
    headless: (process.env.LOAD_HEADLESS || "true").toLowerCase() !== "false",
  };
  cfg.batchSizes = clampBatchSizes(cfg.maxUsers, cfg.batchSizes);

  const repoRoot = path.resolve(__dirname, "..", "..");
  const outDir = path.join(repoRoot, "qa", "reports", `load_${nowIso().replace(/[:.]/g, "-")}`);
  fs.mkdirSync(outDir, { recursive: true });

  // Use existing E2E auth bypass approach: unsigned JWT accepted in dev.
  const seedUserId = `load-metrics-${Date.now()}`;
  const toB64Url = (s: string) => Buffer.from(s, "utf-8").toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const token = `${toB64Url('{"alg":"none","typ":"JWT"}')}.${toB64Url(JSON.stringify({ sub: seedUserId }))}.`;
  const authHeaders = { Authorization: `Bearer ${token}` };

  const backendBefore = await httpJson<WindowedBackendMetrics>(`${cfg.backendUrl}/api/system/metrics`, { method: "GET", headers: authHeaders, timeoutMs: 15000 });

  const backendPidResp = await httpJson<any>(`${cfg.backendUrl}/api/system/pid`, { method: "GET", headers: authHeaders, timeoutMs: 15000 }).catch(() => null);
  const backendPid = Number(backendPidResp?.pid || 0) || null;

  const results: any[] = [];
  const graph = {
    users: [] as number[],
    offerP95ms: [] as number[],
    answerP95ms: [] as number[],
    ttfqP95ms: [] as number[],
    wsP95ms: [] as number[],
    failedRequestRatePercent: [] as number[],
    userFailureRatePercent: [] as number[],
    offerDeterminismMaxDiff: [] as number[],
    wsRttP95ms: [] as number[],
  };

  const errorEvents: any[] = [];

  for (const users of cfg.batchSizes) {
    const batchStartNode = nodeProcSample();
    const batchStartBackend = backendProcSample(backendPid);

    // API sim: true concurrency = user count.
    const apiMetrics = new MetricsCollector();
    const apiStart = performance.now();
    const apiCfg = {
      backendUrl: cfg.backendUrl,
      frontendUrl: cfg.frontendUrl,
      answersPerUser: cfg.answersPerUser,
      wsConnectTimeoutMs: thresholds.wsConnectThresholdMs,
      wsStabilityDurationMs: Number(process.env.WS_STABILITY_DURATION_MS || 4000),
      wsStabilityIntervalMs: Number(process.env.WS_STABILITY_INTERVAL_MS || 600),
      offerComputeTimeoutMs: Math.max(1000, thresholds.offerComputeThresholdMs),
    };
    await Promise.all(
      Array.from({ length: users }).map((_, idx) =>
        runApiUser(idx + 1, apiCfg, apiMetrics).catch((err) => {
          apiMetrics.recordError({ userId: `load-api-${idx + 1}`, scenario: "api", step: "user_task", message: String(err?.message || err) });
          return { userId: `load-api-${idx + 1}`, latestSessionId: "" };
        })
      )
    );
    const apiDurationMs = Math.round(performance.now() - apiStart);
    apiMetrics.setBatchMeta({ nodeStartRssMb: batchStartNode.rssMb, backendStartRssMb: batchStartBackend.rssMb });
    const apiResult = buildBatchResult(users, "api", apiDurationMs, apiMetrics);
    results.push(apiResult);
    errorEvents.push(...apiMetrics.snapshot().errors);

    // Browser sim: concurrent pages inside one Chromium.
    // For 100 users this is heavy; still supported, but you may want to run in a powerful CI agent.
    const browserMetrics = new MetricsCollector();
    const browserStart = performance.now();
    const browserUserIds = Array.from({ length: users }).map((_, idx) => `load-browser-${Date.now()}-${users}-${idx + 1}`);
    await runBrowserUsers(browserUserIds, {
      backendUrl: cfg.backendUrl,
      frontendUrl: cfg.frontendUrl,
      answersPerUser: cfg.answersPerUser,
      headless: cfg.headless,
      wsConnectTimeoutMs: thresholds.wsConnectThresholdMs,
      wsStabilityDurationMs: Number(process.env.WS_STABILITY_DURATION_MS || 4000),
      wsStabilityIntervalMs: Number(process.env.WS_STABILITY_INTERVAL_MS || 600),
    }, browserMetrics);
    const browserDurationMs = Math.round(performance.now() - browserStart);
    browserMetrics.setBatchMeta({ nodeStartRssMb: batchStartNode.rssMb, backendStartRssMb: batchStartBackend.rssMb });
    const browserResult = buildBatchResult(users, "browser", browserDurationMs, browserMetrics);
    results.push(browserResult);
    errorEvents.push(...browserMetrics.snapshot().errors);

    const batchEndNode = nodeProcSample();
    const batchEndBackend = backendProcSample(backendPid);
    // Attach batch-end samples to both results for reporting.
    apiResult.batchMemory = {
      nodeStartRssMb: batchStartNode.rssMb,
      nodeEndRssMb: batchEndNode.rssMb,
      nodeDeltaMb: batchEndNode.rssMb - batchStartNode.rssMb,
      backendStartRssMb: batchStartBackend.rssMb,
      backendEndRssMb: batchEndBackend.rssMb,
      backendDeltaMb: batchEndBackend.rssMb - batchStartBackend.rssMb,
      backendPid,
    };
    browserResult.batchMemory = apiResult.batchMemory;

    // Graph points based on API results (more stable + closer to backend saturation metrics)
    const failedReqRate = apiResult.opsAttempted > 0 ? (apiResult.opsFailed / apiResult.opsAttempted) * 100 : 0;
    const userFailRate = users > 0 ? (apiResult.userFailures / users) * 100 : 0;
    const offerDetMax = Number(apiResult.metrics.offer_determinism_diff?.max || 0);
    const wsRttP95 = Number((apiResult.metrics as any).ws_rtt_ms?.p95 || 0);
    graph.users.push(users);
    graph.offerP95ms.push(Math.round(apiResult.metrics.offer_compute_ms?.p95 || 0));
    graph.answerP95ms.push(Math.round(apiResult.metrics.answer_latency_ms?.p95 || 0));
    graph.ttfqP95ms.push(Math.round(apiResult.metrics.ttfq_ms?.p95 || 0));
    graph.wsP95ms.push(Math.round(apiResult.metrics.ws_connect_ms?.p95 || 0));
    graph.failedRequestRatePercent.push(Number(failedReqRate.toFixed(2)));
    graph.userFailureRatePercent.push(Number(userFailRate.toFixed(2)));
    graph.offerDeterminismMaxDiff.push(Number(offerDetMax.toFixed(4)));
    graph.wsRttP95ms.push(Math.round(wsRttP95));
  }

  const backendAfter = await httpJson<WindowedBackendMetrics>(`${cfg.backendUrl}/api/system/metrics`, { method: "GET", headers: authHeaders, timeoutMs: 15000 });
  const backendDelta = deltaBackendMetrics(backendBefore as any, backendAfter as any);

  // PASS/FAIL
  const failReasons: string[] = [];
  const worstOfferP95 = Math.max(...graph.offerP95ms, 0);
  if (worstOfferP95 > thresholds.offerComputeThresholdMs) {
    failReasons.push(`Offer Probability p95 ${worstOfferP95}ms exceeds threshold ${thresholds.offerComputeThresholdMs}ms`);
  }
  const worstAnswerP95 = Math.max(...graph.answerP95ms, 0);
  if (worstAnswerP95 > thresholds.latencyThresholdMs) {
    failReasons.push(`Answer p95 ${worstAnswerP95}ms exceeds threshold ${thresholds.latencyThresholdMs}ms`);
  }
  // Also enforce p99 as a spike detector.
  const worstAnswerP99 = Math.max(
    ...results
      .filter((r: any) => r.mode === "api")
      .map((r: any) => Number(r.metrics.answer_latency_ms?.p99 || 0)),
    0
  );
  if (worstAnswerP99 > thresholds.latencyThresholdMs * 1.5) {
    failReasons.push(`Answer p99 ${Math.round(worstAnswerP99)}ms exceeds spike threshold ${Math.round(thresholds.latencyThresholdMs * 1.5)}ms`);
  }
  const worstWsP95 = Math.max(...graph.wsP95ms, 0);
  if (worstWsP95 > thresholds.wsConnectThresholdMs) {
    failReasons.push(`WS connect p95 ${worstWsP95}ms exceeds threshold ${thresholds.wsConnectThresholdMs}ms`);
  }

  // WS stability: RTT p95
  const wsRttP95 = Math.max(
    ...results
      .filter((r: any) => r.mode === "api")
      .map((r: any) => Number(r.metrics.ws_rtt_ms?.p95 || 0)),
    0
  );
  if (wsRttP95 > thresholds.wsRttP95ThresholdMs) {
    failReasons.push(`WS RTT p95 ${Math.round(wsRttP95)}ms exceeds threshold ${thresholds.wsRttP95ThresholdMs}ms`);
  }

  // WS unexpected disconnects observed by the probe (mid-window closures)
  const wsUnexpected = Math.max(
    ...results
      .filter((r: any) => r.mode === "api")
      .map((r: any) => Number((r.metrics.ws_disconnect_flag?.count || 0) > 0 ? r.metrics.ws_disconnect_flag.count : 0)),
    0
  );
  if (wsUnexpected > thresholds.wsDisconnectThreshold) {
    failReasons.push(`WS unexpected disconnect flags ${wsUnexpected} exceeds threshold ${thresholds.wsDisconnectThreshold}`);
  }
  const worstFailedReqRate = Math.max(...graph.failedRequestRatePercent, 0);
  if (worstFailedReqRate > thresholds.errorThresholdPercent) {
    failReasons.push(`Failed request rate ${worstFailedReqRate.toFixed(2)}% exceeds threshold ${thresholds.errorThresholdPercent}%`);
  }
  const worstDetDiff = Math.max(...graph.offerDeterminismMaxDiff, 0);
  if (worstDetDiff > 0.01) {
    failReasons.push(`Offer Probability nondeterminism detected (max diff=${worstDetDiff})`);
  }
  const rssMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
  if (rssMb > thresholds.memoryThresholdMb) {
    failReasons.push(`Node RSS ${rssMb}MB exceeds threshold ${thresholds.memoryThresholdMb}MB`);
  }

  const worstNodeDelta = Math.max(
    ...results.map((r: any) => Number(r.batchMemory?.nodeDeltaMb || 0)),
    0
  );
  if (worstNodeDelta > thresholds.memoryDeltaThresholdMb) {
    failReasons.push(`Node RSS growth ${worstNodeDelta}MB exceeds threshold ${thresholds.memoryDeltaThresholdMb}MB`);
  }

  const report: LoadTestReport = {
    generatedAtIso: nowIso(),
    environment: {
      backendUrl: cfg.backendUrl,
      frontendUrl: cfg.frontendUrl,
      headless: cfg.headless,
      nodeVersion: process.version,
      osPlatform: process.platform,
    },
    config: {
      maxUsers: cfg.maxUsers,
      batchSizes: cfg.batchSizes,
      answersPerUser: cfg.answersPerUser,
      thresholds,
    },
    backendMetricsWindow: {
      before: backendBefore,
      after: backendAfter,
      delta: backendDelta,
    },
    results,
    errorEvents,
    graph,
    pass: failReasons.length === 0,
    failReasons,
  };

  const { jsonPath, csvPath } = generateLoadReports(outDir, report);
  // eslint-disable-next-line no-console
  console.log(`Load test ${report.pass ? "PASS" : "FAIL"}`);
  // eslint-disable-next-line no-console
  console.log(`Reports: ${jsonPath}`);
  // eslint-disable-next-line no-console
  console.log(`Summary: ${csvPath}`);

  if (!report.pass) process.exit(1);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
