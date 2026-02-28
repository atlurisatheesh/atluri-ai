import fs from "fs";
import path from "path";
import { computeStats, MetricsCollector, type WindowedBackendMetrics } from "./metrics-collector";
import type { Thresholds } from "./thresholds";

export type LoadBatchResult = {
  users: number;
  mode: "api" | "browser";
  durationMs: number;
  errors: number;
  opsAttempted: number;
  opsFailed: number;
  userFailures: number;
  metrics: Record<string, ReturnType<typeof computeStats>>;
  batchMemory?: {
    nodeStartRssMb: number;
    nodeEndRssMb: number;
    nodeDeltaMb: number;
    backendStartRssMb: number;
    backendEndRssMb: number;
    backendDeltaMb: number;
    backendPid: number | null;
  };
};

export type LoadTestReport = {
  generatedAtIso: string;
  environment: {
    backendUrl: string;
    frontendUrl: string;
    headless: boolean;
    nodeVersion: string;
    osPlatform: string;
  };
  config: {
    maxUsers: number;
    batchSizes: number[];
    answersPerUser: number;
    thresholds: Thresholds;
  };
  backendMetricsWindow?: {
    before: WindowedBackendMetrics;
    after: WindowedBackendMetrics;
    delta: {
      redisPublishAvgMs: number;
      fanoutDelayAvgMs: number;
      wsDisconnects: number;
    };
  };
  results: LoadBatchResult[];
  errorEvents: any[];
  graph: {
    users: number[];
    offerP95ms: number[];
    answerP95ms: number[];
    ttfqP95ms: number[];
    wsP95ms: number[];
    failedRequestRatePercent: number[];
    userFailureRatePercent: number[];
    offerDeterminismMaxDiff: number[];
    wsRttP95ms?: number[];
  };
  pass: boolean;
  failReasons: string[];
};

function nowIso() {
  return new Date().toISOString();
}

function toCsvRow(cols: (string | number)[]) {
  return cols.map((c) => {
    const s = String(c);
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }).join(",");
}

export function generateLoadReports(
  outDir: string,
  report: LoadTestReport
) {
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "Load_Report.json");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");

  const csvPath = path.join(outDir, "Load_Summary.csv");
  const lines: string[] = [];
  lines.push(toCsvRow(["users", "mode", "duration_ms", "errors", "failed_req_%", "ttfq_p95_ms", "answer_p95_ms", "offer_p95_ms", "ws_p95_ms", "ws_rtt_p95_ms", "node_rss_delta_mb", "backend_rss_delta_mb"]));
  for (const r of report.results) {
    const failedReqPct = r.opsAttempted > 0 ? (r.opsFailed / r.opsAttempted) * 100 : 0;
    lines.push(
      toCsvRow([
        r.users,
        r.mode,
        Math.round(r.durationMs),
        r.errors,
        Number(failedReqPct.toFixed(2)),
        Math.round(r.metrics.ttfq_ms?.p95 || 0),
        Math.round(r.metrics.answer_latency_ms?.p95 || 0),
        Math.round(r.metrics.offer_compute_ms?.p95 || 0),
        Math.round(r.metrics.ws_connect_ms?.p95 || 0),
        Math.round((r.metrics as any).ws_rtt_ms?.p95 || 0),
        Math.round(r.batchMemory?.nodeDeltaMb || 0),
        Math.round(r.batchMemory?.backendDeltaMb || 0),
      ])
    );
  }
  fs.writeFileSync(csvPath, lines.join("\n"), "utf-8");

  return { jsonPath, csvPath };
}

export function buildBatchResult(
  users: number,
  mode: "api" | "browser",
  durationMs: number,
  metrics: MetricsCollector
): LoadBatchResult {
  const snap = metrics.snapshot();
  const keys = ["ttfq_ms", "answer_latency_ms", "offer_compute_ms", "ws_connect_ms", "ws_rtt_ms", "ws_gap_ms", "ws_disconnect_flag"] as const;
  const stats: any = {};
  for (const k of keys) {
    stats[k] = computeStats(metrics.getValues(k as any, mode));
  }
  stats.offer_determinism_diff = computeStats(metrics.getValues("offer_determinism_diff" as any, mode));
  return {
    users,
    mode,
    durationMs,
    errors: snap.errors.filter((e) => e.scenario === mode).length,
    opsAttempted: snap.operations.attempts,
    opsFailed: snap.operations.failures,
    userFailures: snap.operations.userFailures,
    metrics: stats,
  };
}
