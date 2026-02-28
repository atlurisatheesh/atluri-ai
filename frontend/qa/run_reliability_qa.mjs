import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';

const REPORT_PATH = path.resolve('qa/qa_report.json');
const WS_QUERY = 'role=devops&jd=Senior%20DevOps%20Engineer.%20Must%20have%20Kubernetes%2C%20Terraform%2C%20AWS.%208%2B%20years%20experience%20required.&resume=Satheesh%20Atluri.%209%20years%20experience.%20Strong%20in%20AWS%2C%20Kubernetes%2C%20CI%2FCD.';

const scenarios = [
  {
    name: 'improving_candidate',
    lines: [
      'I used Kubernetes and Terraform.',
      'I automated deployments using Kubernetes and Terraform with CI CD.',
      'I led migration planning and coordinated with product for release windows.',
      'I designed multi region deployment with rollback and reduced deployment time by forty five percent.',
      'I handled incident triage and communicated mitigation updates to stakeholders.',
      'I optimized reliability and cost through autoscaling and observability tradeoffs.',
    ],
  },
  {
    name: 'declining_candidate',
    lines: [
      'I designed resilient deployment architecture with measurable impact.',
      'I worked on tasks.',
      'I did basic things.',
      'not sure',
      'maybe it worked',
      'I do not remember details',
    ],
  },
  {
    name: 'volatile_candidate',
    lines: [
      'I led migration and reduced latency by thirty percent.',
      'I worked on tasks.',
      'I designed rollback and failover runbooks for incidents.',
      'I am not sure about exact details.',
      'I coordinated with product and security teams during release risk review.',
      'I built it.',
    ],
  },
  {
    name: 'strong_senior_candidate',
    lines: [
      'I designed multi region Kubernetes architecture with Terraform and failover.',
      'I drove tradeoff decisions across consistency cost and reliability.',
      'I led incident triage in the first ten minutes and assigned clear ownership.',
      'I negotiated priorities with product and security under tight constraints.',
      'I reduced deployment time and outage risk using automated rollback.',
      'I mentored the team and established architecture review standards.',
    ],
  },
  {
    name: 'weak_leadership_senior_candidate',
    lines: [
      'I implemented Kubernetes scripts.',
      'I built Terraform modules.',
      'I fixed deployment bugs.',
      'I wrote configs.',
      'I ran commands.',
      'I made updates.',
    ],
  },
];

function validateAiDecisionSchema(decision) {
  const errors = [];
  if (!decision || typeof decision !== 'object') return ['decision is not object'];

  const expected = [
    ['confidence', 'number'],
    ['clarity_score', 'number'],
    ['depth_score', 'number'],
    ['structure_score', 'number'],
    ['alignment_score', 'number'],
    ['verdict', 'string'],
    ['leadership_score', 'number'],
    ['leadership_signals', 'object'],
    ['escalation_mode', 'string'],
    ['improvement_pct', 'number'],
    ['consistency_score', 'number'],
    ['jd_coverage_pct', 'number'],
  ];

  for (const [k, t] of expected) {
    const v = decision[k];
    if (t === 'object') {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) errors.push(`${k} type`);
    } else if (typeof v !== t) {
      errors.push(`${k} type`);
    }
  }

  if (typeof decision.leadership_score === 'number' && (decision.leadership_score < 0 || decision.leadership_score > 100)) {
    errors.push('leadership_score range');
  }

  return errors;
}

function difficultyToLevel(diff) {
  const d = String(diff || '').toLowerCase();
  if (d === 'easy') return 2;
  if (d === 'medium') return 3;
  if (d === 'hard') return 4;
  if (/^l\d+$/.test(d)) return Number(d.slice(1));
  return null;
}

function makeWsUrl(port) {
  return `ws://127.0.0.1:${port}/ws/voice?${WS_QUERY}`;
}

async function isPortFree(port) {
  return await new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(start = 9001, attempts = 20) {
  for (let i = 0; i < attempts; i += 1) {
    const port = start + i;
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(port)) return port;
  }
  throw new Error('Unable to find available port for QA backend');
}

async function waitForBackendReady(port, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(`http://127.0.0.1:${port}/docs`, { method: 'GET' });
      if (!res.ok) throw new Error('not-ready');
      return;
    } catch {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('QA backend did not become ready in time');
}

function startQaBackend(port) {
  const backendDir = path.resolve('..', 'backend');
  const pythonCmd = process.env.QA_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const child = spawn(
    pythonCmd,
    ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(port), '--log-level', 'info'],
    {
      cwd: backendDir,
      env: { ...process.env, QA_MODE: 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  const logOutPath = path.resolve('qa', 'qa_backend_stdout.log');
  const logErrPath = path.resolve('qa', 'qa_backend_stderr.log');
  const outStream = fs.createWriteStream(logOutPath, { flags: 'w' });
  const errStream = fs.createWriteStream(logErrPath, { flags: 'w' });

  child.stdout.pipe(outStream);
  child.stderr.pipe(errStream);

  return { child, logOutPath, logErrPath };
}

async function runScenarioInBrowser(page, scenario, wsUrl) {
  return await page.evaluate(async ({ wsUrlArg, lines }) => {
    const telemetry = {
      wsOpened: false,
      wsClosed: false,
      wsErrors: [],
      events: [],
      timeout: false,
      sendCount: 0,
    };

    await new Promise((resolve) => {
      const ws = new WebSocket(wsUrlArg);
      let lineIndex = 0;
      let done = false;

      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };

      const timer = setTimeout(() => {
        telemetry.timeout = true;
        try { ws.close(); } catch {}
        finish();
      }, 120000);

      const sendNext = () => {
        if (lineIndex >= lines.length) {
          ws.send(JSON.stringify({ type: 'stop' }));
          return;
        }
        ws.send(JSON.stringify({ type: 'qa_transcript', text: lines[lineIndex] }));
        telemetry.sendCount += 1;
        lineIndex += 1;
      };

      ws.onopen = () => {
        telemetry.wsOpened = true;
      };

      ws.onerror = (e) => {
        telemetry.wsErrors.push(String(e?.message || 'ws error'));
      };

      ws.onmessage = (evt) => {
        let data = null;
        try { data = JSON.parse(evt.data); } catch { return; }
        telemetry.events.push(data);

        if (data.type === 'question' && lineIndex === 0) {
          sendNext();
        } else if (data.type === 'next_question') {
          sendNext();
        } else if (data.type === 'final_summary') {
          clearTimeout(timer);
          try { ws.close(); } catch {}
          finish();
        }
      };

      ws.onclose = () => {
        telemetry.wsClosed = true;
        clearTimeout(timer);
        finish();
      };
    });

    return telemetry;
  }, { wsUrlArg: wsUrl, lines: scenario.lines });
}

function summarizeScenario(scenarioName, telemetry) {
  const byType = new Map();
  for (const e of telemetry.events) {
    const t = e?.type || 'unknown';
    byType.set(t, (byType.get(t) || 0) + 1);
  }

  const aiDecisions = telemetry.events.filter((e) => e.type === 'ai_decision' && e.decision);
  const nextQuestions = telemetry.events.filter((e) => e.type === 'next_question');
  const transcripts = telemetry.events.filter((e) => e.type === 'transcript');
  const partials = telemetry.events.filter((e) => e.type === 'partial_transcript');
  const coach = telemetry.events.filter((e) => e.type === 'live_coaching');
  const finalSummaries = telemetry.events.filter((e) => e.type === 'final_summary');

  const finalizeReasonDistribution = {};
  for (const e of telemetry.events) {
    const reason = e?.finalize_reason || e?.reason || e?.decision?.finalize_reason || e?.decision?.finalizeReason;
    if (!reason) continue;
    const key = String(reason);
    finalizeReasonDistribution[key] = (finalizeReasonDistribution[key] || 0) + 1;
  }

  const schemaErrors = [];
  for (const entry of aiDecisions) {
    const errs = validateAiDecisionSchema(entry.decision);
    schemaErrors.push(...errs);
  }

  const difficultyLevels = aiDecisions
    .map((d) => difficultyToLevel(d.decision?.difficulty))
    .filter((x) => Number.isFinite(x));

  let jumpViolation = 0;
  for (let i = 1; i < difficultyLevels.length; i++) {
    if (Math.abs(difficultyLevels[i] - difficultyLevels[i - 1]) > 1) jumpViolation += 1;
  }

  const seenTranscript = new Set();
  let duplicateTranscriptEvents = 0;
  for (const t of transcripts) {
    const key = String(t.text || '').trim().toLowerCase();
    if (!key) continue;
    if (seenTranscript.has(key)) duplicateTranscriptEvents += 1;
    seenTranscript.add(key);
  }

  const checks = {
    ws_opened: telemetry.wsOpened,
    transcript_seen: transcripts.length > 0,
    partial_or_transcript_seen: partials.length > 0 || transcripts.length > 0,
    ai_decision_seen: aiDecisions.length > 0,
    next_question_seen: nextQuestions.length > 0,
    live_coaching_seen: coach.length > 0,
    no_difficulty_jump_gt_1: jumpViolation === 0,
    no_duplicate_transcript_events: duplicateTranscriptEvents === 0,
    escalation_mode_present: aiDecisions.every((d) => typeof d.decision?.escalation_mode === 'string'),
    leadership_signals_present: aiDecisions.every((d) => d.decision && typeof d.decision.leadership_signals === 'object' && d.decision.leadership_signals !== null),
    analytics_fields_present: aiDecisions.every((d) => d.decision && typeof d.decision.improvement_pct === 'number' && typeof d.decision.consistency_score === 'number' && typeof d.decision.jd_coverage_pct === 'number'),
    event_contract_stable: byType.has('ai_decision') && byType.has('next_question') && byType.has('live_coaching'),
    no_duplicate_finalize_events: finalSummaries.length === 1,
    final_summary_seen: byType.has('final_summary'),
  };

  const failed_checks = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);

  const errors = [];
  if (telemetry.timeout) errors.push('scenario timeout');
  if (telemetry.wsErrors.length) errors.push(...telemetry.wsErrors);
  if (schemaErrors.length) errors.push(...schemaErrors.map((x) => `schema:${x}`));

  const pass = failed_checks.length === 0 && errors.length === 0;

  return {
    scenario: scenarioName,
    expected: 'QA_MODE deterministic transcript injection should drive full multi-turn event flow',
    steps_executed: [
      'Open browser context (Playwright)',
      'Open direct websocket to /ws/voice',
      'Inject qa_transcript lines per scenario',
      'Wait for transcript, ai_decision, next_question, live_coaching, final_summary',
      'Validate schema/contracts and behavioral constraints',
    ],
    event_counts: Object.fromEntries(byType.entries()),
    finalize_reason_distribution: finalizeReasonDistribution,
    checks,
    failed_checks,
    errors,
    pass,
  };
}

function parseFinalizeReasonsFromLog(logPath) {
  const distribution = {};
  if (!fs.existsSync(logPath)) return distribution;

  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/finalize_triggered\s+reason=([a-zA-Z0-9_\-]+)/);
    if (!match) continue;
    const reason = match[1];
    distribution[reason] = (distribution[reason] || 0) + 1;
  }
  return distribution;
}

(async () => {
  let browser;
  let context;
  let backendProc;
  let backendLogs;

  try {
    const backendPort = await findAvailablePort(9001, 20);
    const wsUrl = makeWsUrl(backendPort);
    backendLogs = startQaBackend(backendPort);
    backendProc = backendLogs.child;

    await waitForBackendReady(backendPort, 30000);

    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    const page = await context.newPage();

    const results = [];
    for (const scenario of scenarios) {
      // eslint-disable-next-line no-await-in-loop
      const telemetry = await runScenarioInBrowser(page, scenario, wsUrl);
      results.push(summarizeScenario(scenario.name, telemetry));
    }

    const report = {
      generated_at: new Date().toISOString(),
      qa_backend: {
        host: '127.0.0.1',
        port: backendPort,
        qa_mode: true,
        stdout_log: backendLogs.logOutPath,
        stderr_log: backendLogs.logErrPath,
      },
      finalize_reason_distribution_global: parseFinalizeReasonsFromLog(backendLogs.logErrPath),
      scenarios: results,
    };

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
    if (backendProc && !backendProc.killed) {
      backendProc.kill('SIGTERM');
      setTimeout(() => {
        if (!backendProc.killed) backendProc.kill('SIGKILL');
      }, 2000);
    }
  }
})();
