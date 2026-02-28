export type StepStatus = "pass" | "fail" | "skip";

export type ScreenshotRecord = {
  id: string;
  title: string;
  path: string;
  createdAtIso: string;
};

export type AiValidationRecord = {
  id: string;
  title: string;
  passed: boolean;
  confidence: number;
  expected: string[];
  found: string[];
  notes: string;
};

export type PerfRecord = {
  key: string;
  valueMs: number;
  thresholdMs?: number;
  passed?: boolean;
};

export type WebSocketRecord = {
  url: string;
  createdAtIso: string;
  closedAtIso?: string;
  framesSent: number;
  framesReceived: number;
  closeCode?: number;
  closeReason?: string;
};

export type NetworkFailure = {
  url: string;
  method?: string;
  resourceType?: string;
  failureText?: string;
  status?: number;
  kind: "requestfailed" | "badstatus";
  tsIso: string;
};

export type ConsoleEvent = {
  kind: "console" | "pageerror";
  level?: string;
  message: string;
  tsIso: string;
};

export type StepResult = {
  id: string;
  name: string;
  status: StepStatus;
  startedAtIso: string;
  finishedAtIso: string;
  durationMs: number;
  details: string;
  screenshots: ScreenshotRecord[];
  ai: AiValidationRecord[];
  perf: PerfRecord[];
};

export type RunReport = {
  generatedAtIso: string;
  environment: {
    frontendUrl: string;
    backendUrl: string;
    nodeVersion: string;
    osPlatform: string;
    browserName: string;
    browserVersion: string;
    headless: boolean;
  };
  config: Record<string, unknown>;
  verdict: "PASS" | "FAIL";
  summary: {
    stepsTotal: number;
    stepsPassed: number;
    stepsFailed: number;
    stepsSkipped: number;
    consoleErrors: number;
    networkFailures: number;
    websocketFailures: number;
  };
  determinism: {
    passed: boolean;
    offerProbability1: number;
    offerProbability2: number;
    variance: number;
    threshold: number;
    notes: string;
  };
  webSockets: {
    inBrowser: WebSocketRecord[];
    directProbe: {
      passed: boolean;
      url: string;
      framesSent: number;
      framesReceived: number;
      notes: string;
    };
  };
  performance: PerfRecord[];
  console: ConsoleEvent[];
  networkFailures: NetworkFailure[];
  steps: StepResult[];
  artifacts: {
    reportJsonPath: string;
    reportDocxPath: string;
    screenshotsDir: string;
  };
};
