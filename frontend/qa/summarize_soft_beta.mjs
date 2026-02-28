import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_INPUT = path.resolve('qa', 'soft_beta_scorecard_template.csv');

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const ch = line[index];

    if (ch === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  cells.push(current);
  return cells;
}

function parseCsv(content) {
  const rawLines = String(content || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (!rawLines.length) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(rawLines[0]).map((h) => h.trim());
  const rows = rawLines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = String(values[idx] || '').trim();
    });
    return row;
  });

  return { headers, rows };
}

function toBool(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'y' || normalized === 'yes' || normalized === 'true' || normalized === '1';
}

function toNum(value) {
  const raw = String(value ?? '').trim();
  if (!raw.length) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function average(nums) {
  const valid = nums.filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (!valid.length) return null;
  return valid.reduce((acc, cur) => acc + cur, 0) / valid.length;
}

function fmt(value, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'n/a';
  return Number(value).toFixed(digits);
}

function evaluateDecision(metrics) {
  const actionability = metrics.avgGoalActionability;
  const clarity = metrics.avgClarity;
  const deltaBelievability = metrics.avgDeltaBelievability;
  const motivation = metrics.avgMotivation;
  const stronglyJudgedCount = metrics.stronglyJudgedCount;

  const pass =
    actionability >= 4.0 &&
    clarity >= 4.0 &&
    deltaBelievability >= 3.8 &&
    motivation >= 3.8 &&
    stronglyJudgedCount <= 1;

  return {
    pass,
    reason: pass
      ? 'Meets rollout thresholds.'
      : 'Below one or more thresholds. Refine tone/copy before wider beta.',
  };
}

function main() {
  const input = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_INPUT;

  if (!fs.existsSync(input)) {
    console.error(`SOFT_BETA_ERROR: file not found: ${input}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(input, 'utf8');
  const { rows } = parseCsv(raw);

  const scoredRows = rows.filter((row) => {
    const fields = [
      'delta_believability_1_5',
      'goal_actionability_1_5',
      'motivation_1_5',
      'clarity_next_step_1_5',
      'emotional_tone_supportive_1_5',
    ];
    return fields.some((field) => toNum(row[field]) !== null);
  });

  const byUser = new Map();
  scoredRows.forEach((row) => {
    const id = String(row.tester_id || '').trim() || 'unknown';
    if (!byUser.has(id)) byUser.set(id, []);
    byUser.get(id).push(row);
  });

  const avgDeltaBelievability = average(scoredRows.map((r) => toNum(r.delta_believability_1_5)));
  const avgGoalActionability = average(scoredRows.map((r) => toNum(r.goal_actionability_1_5)));
  const avgMotivation = average(scoredRows.map((r) => toNum(r.motivation_1_5)));
  const avgClarity = average(scoredRows.map((r) => toNum(r.clarity_next_step_1_5)));
  const avgSupportiveTone = average(scoredRows.map((r) => toNum(r.emotional_tone_supportive_1_5)));

  const feltJudgedCount = scoredRows.filter((r) => toBool(r.felt_judged_yn)).length;
  const voluntaryRetryCount = scoredRows.filter((r) => toBool(r.voluntary_retry_yn)).length;
  const behaviorChangedCount = scoredRows.filter((r) => toBool(r.behavior_changed_from_goal_yn)).length;

  const stronglyJudgedCount = scoredRows.filter((r) => {
    const supportive = toNum(r.emotional_tone_supportive_1_5);
    return toBool(r.felt_judged_yn) && supportive !== null && supportive <= 2;
  }).length;

  const metrics = {
    totalRows: rows.length,
    scoredRows: scoredRows.length,
    uniqueUsers: byUser.size,
    avgDeltaBelievability,
    avgGoalActionability,
    avgMotivation,
    avgClarity,
    avgSupportiveTone,
    feltJudgedCount,
    voluntaryRetryCount,
    behaviorChangedCount,
    stronglyJudgedCount,
  };

  const decision = evaluateDecision(metrics);

  console.log('SOFT_BETA_SUMMARY');
  console.log(`input=${input}`);
  console.log(`users=${metrics.uniqueUsers}`);
  console.log(`rows_scored=${metrics.scoredRows}`);
  console.log(`avg_delta_believability=${fmt(metrics.avgDeltaBelievability)}`);
  console.log(`avg_goal_actionability=${fmt(metrics.avgGoalActionability)}`);
  console.log(`avg_motivation=${fmt(metrics.avgMotivation)}`);
  console.log(`avg_clarity_next_step=${fmt(metrics.avgClarity)}`);
  console.log(`avg_supportive_tone=${fmt(metrics.avgSupportiveTone)}`);
  console.log(`felt_judged_count=${metrics.feltJudgedCount}`);
  console.log(`strongly_judged_count=${metrics.stronglyJudgedCount}`);
  console.log(`voluntary_retry_count=${metrics.voluntaryRetryCount}`);
  console.log(`behavior_changed_count=${metrics.behaviorChangedCount}`);
  console.log(`go_no_go=${decision.pass ? 'GO' : 'NO_GO'}`);
  console.log(`decision_reason=${decision.reason}`);

  if (decision.pass) {
    process.exit(0);
  }

  process.exit(2);
}

main();
