export type Thresholds = {
  latencyThresholdMs: number;
  errorThresholdPercent: number;
  memoryThresholdMb: number;
  memoryDeltaThresholdMb: number;
  wsConnectThresholdMs: number;
  wsRttP95ThresholdMs: number;
  wsDisconnectThreshold: number;
  offerComputeThresholdMs: number;
};

export function loadThresholdsFromEnv(): Thresholds {
  return {
    // Load tests exercise real backend work; answers can be AI-bound.
    latencyThresholdMs: Number(process.env.LATENCY_THRESHOLD_MS || 25000),
    errorThresholdPercent: Number(process.env.ERROR_THRESHOLD_PERCENT || 2),
    memoryThresholdMb: Number(process.env.MEMORY_THRESHOLD_MB || 900),
    memoryDeltaThresholdMb: Number(process.env.MEMORY_DELTA_THRESHOLD_MB || 250),
    wsConnectThresholdMs: Number(process.env.WS_CONNECT_THRESHOLD_MS || 2500),
    wsRttP95ThresholdMs: Number(process.env.WS_RTT_P95_THRESHOLD_MS || 800),
    wsDisconnectThreshold: Number(process.env.WS_DISCONNECT_THRESHOLD || 0),
    offerComputeThresholdMs: Number(process.env.OFFER_COMPUTE_THRESHOLD_MS || 2500),
  };
}
