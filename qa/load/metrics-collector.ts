import os from "os";

export type MetricKey =
  | "ttfq_ms"
  | "answer_latency_ms"
  | "offer_compute_ms"
  | "ws_connect_ms"
  | "ws_rtt_ms"
  | "ws_gap_ms"
  | "ws_disconnect_flag"
  | "redis_publish_ms"
  | "redis_fanout_ms"
  | "offer_determinism_diff";

export type MetricSample = {
  key: MetricKey;
  value: number;
  userId: string;
  scenario: "browser" | "api";
  atIso: string;
};

export type ErrorEvent = {
  userId: string;
  scenario: "browser" | "api";
  step: string;
  message: string;
  atIso: string;
};

export type WindowedBackendMetrics = {
  generated_at: number;
  redis_publish_total_ms: number;
  redis_publish_samples: number;
  fanout_delay_total_ms: number;
  fanout_delay_samples: number;
  ws_disconnects_total: number;
  ws_connections_active: number;
  ws_rooms_active: number;
};

export type Stats = {
  count: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
};

function nowIso() {
  return new Date().toISOString();
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] === undefined) return sorted[base];
  return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

export function computeStats(values: number[]): Stats {
  if (values.length === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sum / sorted.length,
    p50: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    p99: quantile(sorted, 0.99),
  };
}

export class MetricsCollector {
  private samples: MetricSample[] = [];
  private errors: ErrorEvent[] = [];
  private startedAtIso = nowIso();
  private opAttempts = 0;
  private opFailures = 0;
  private userFailures = 0;
  private userSuccesses = 0;
  private batchMeta: Record<string, any> = {};

  record(sample: Omit<MetricSample, "atIso">) {
    this.samples.push({ ...sample, atIso: nowIso() });
  }

  recordError(evt: Omit<ErrorEvent, "atIso">) {
    this.errors.push({ ...evt, atIso: nowIso() });
  }

  recordOpAttempt(count = 1) {
    this.opAttempts += Math.max(0, Number(count) || 0);
  }

  recordOpFailure(count = 1) {
    this.opFailures += Math.max(0, Number(count) || 0);
  }

  recordUserOutcome(ok: boolean) {
    if (ok) this.userSuccesses += 1;
    else this.userFailures += 1;
  }

  setBatchMeta(meta: Record<string, any>) {
    this.batchMeta = { ...meta };
  }

  snapshot() {
    return {
      startedAtIso: this.startedAtIso,
      finishedAtIso: nowIso(),
      samples: [...this.samples],
      errors: [...this.errors],
      operations: {
        attempts: this.opAttempts,
        failures: this.opFailures,
        userSuccesses: this.userSuccesses,
        userFailures: this.userFailures,
      },
      batchMeta: { ...this.batchMeta },
      node: {
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        cpuCount: os.cpus().length,
        memoryRssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      },
    };
  }

  errorsCount() {
    return this.errors.length;
  }

  getValues(key: MetricKey, scenario?: "browser" | "api") {
    return this.samples
      .filter((s) => s.key === key && (!scenario || s.scenario === scenario))
      .map((s) => s.value);
  }
}
