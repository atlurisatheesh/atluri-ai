import type { AiValidationRecord } from "./types";

export type PhraseExpectation = {
  id: string;
  title: string;
  anyOf: Array<string | RegExp>;
  minConfidence?: number;
};

function normalizeText(raw: string): string {
  return String(raw || "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(aRaw: string, bRaw: string): number {
  const a = aRaw;
  const b = bRaw;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j += 1) dp[j] = j;
  for (let i = 1; i <= m; i += 1) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n];
}

function similarity(a: string, b: string): number {
  const aa = normalizeText(a).toLowerCase();
  const bb = normalizeText(b).toLowerCase();
  if (!aa || !bb) return 0;
  if (aa === bb) return 1;
  const dist = levenshtein(aa, bb);
  return Math.max(0, 1 - dist / Math.max(aa.length, bb.length));
}

function findMatchConfidence(haystack: string, needle: string): number {
  const normalizedHaystack = normalizeText(haystack);
  const normalizedNeedle = normalizeText(needle);
  if (!normalizedHaystack || !normalizedNeedle) return 0;
  if (normalizedHaystack.toLowerCase().includes(normalizedNeedle.toLowerCase())) return 1;

  const h = normalizedHaystack.toLowerCase();
  const n = normalizedNeedle.toLowerCase();
  const window = Math.max(12, Math.min(140, n.length + 30));
  let best = 0;
  for (let i = 0; i < h.length; i += Math.max(1, Math.floor(window / 6))) {
    const slice = h.slice(i, Math.min(h.length, i + window));
    best = Math.max(best, similarity(slice, n));
    if (best >= 0.92) return best;
  }
  return best;
}

export function aiValidateText(
  params: {
    id: string;
    title: string;
    extractedText: string;
    expectations: PhraseExpectation[];
  }
): AiValidationRecord[] {
  const { id, title, extractedText, expectations } = params;
  const text = normalizeText(extractedText);
  const records: AiValidationRecord[] = [];

  for (const exp of expectations) {
    const minConfidence = exp.minConfidence ?? 0.86;
    let bestConfidence = 0;
    let bestNeedle = "";
    let matched = false;

    for (const candidate of exp.anyOf) {
      if (candidate instanceof RegExp) {
        const ok = candidate.test(text);
        if (ok) {
          matched = true;
          bestConfidence = Math.max(bestConfidence, 0.95);
          bestNeedle = candidate.toString();
          break;
        }
        continue;
      }
      const conf = findMatchConfidence(text, candidate);
      if (conf > bestConfidence) {
        bestConfidence = conf;
        bestNeedle = candidate;
      }
      if (conf >= minConfidence) {
        matched = true;
        break;
      }
    }

    records.push({
      id: `${id}:${exp.id}`,
      title: `${title} • ${exp.title}`,
      passed: matched,
      confidence: Math.round(bestConfidence * 100) / 100,
      expected: exp.anyOf.map((x) => (x instanceof RegExp ? x.toString() : x)),
      found: matched ? [String(bestNeedle || "match")] : [],
      notes: matched
        ? "Matched expected UI phrase (fuzzy validator)."
        : `Missing expected phrase (bestConfidence=${Math.round(bestConfidence * 100)}%).`,
    });
  }

  return records;
}
