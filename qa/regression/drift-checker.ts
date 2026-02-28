export type Drift = {
  path: string;
  kind: "missing" | "changed" | "drift";
  baseline: any;
  current: any;
  notes?: string;
};

export type DriftReport = {
  generatedAtIso: string;
  pass: boolean;
  tolerance: {
    probabilityDrift: number;
    percentileDrift: number;
  };
  drifts: Drift[];
};

function nowIso() {
  return new Date().toISOString();
}

function isNumber(x: any): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function get(obj: any, path: string): any {
  const parts = path.split(".").filter(Boolean);
  let cur: any = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

function addChanged(drifts: Drift[], path: string, baseline: any, current: any, notes?: string) {
  if (baseline === current) return;
  drifts.push({ path, kind: "changed", baseline, current, notes });
}

function addMissing(drifts: Drift[], path: string, baseline: any, current: any, notes?: string) {
  drifts.push({ path, kind: "missing", baseline, current, notes });
}

function addNumericDrift(drifts: Drift[], path: string, baseline: any, current: any, tolerance: number, notes?: string) {
  if (!isNumber(baseline) || !isNumber(current)) {
    drifts.push({ path, kind: "changed", baseline, current, notes: notes || "Not numeric" });
    return;
  }
  const diff = Math.abs(baseline - current);
  if (diff > tolerance) {
    drifts.push({ path, kind: "drift", baseline, current, notes: `${notes || "numeric drift"} (diff=${diff}, tol=${tolerance})` });
  }
}

function hammingHex(a: string, b: string): number {
  const aa = String(a || "").trim().toLowerCase();
  const bb = String(b || "").trim().toLowerCase();
  if (!aa || !bb || aa.length !== bb.length) return 64;
  let dist = 0;
  for (let i = 0; i < aa.length; i += 1) {
    const na = parseInt(aa[i], 16);
    const nb = parseInt(bb[i], 16);
    const x = (na ^ nb) & 0xf;
    dist += [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4][x] || 0;
  }
  return dist;
}

export function compareBaseline(
  baseline: any,
  current: any,
  opts: { probabilityDrift: number; percentileDrift: number }
): DriftReport {
  const drifts: Drift[] = [];

  // Offer engine invariants
  addNumericDrift(drifts, "offer.offer_probability", get(baseline, "offer.offer_probability"), get(current, "offer.offer_probability"), opts.probabilityDrift);
  addNumericDrift(drifts, "offer.delta_vs_last_session", get(baseline, "offer.delta_vs_last_session"), get(current, "offer.delta_vs_last_session"), 0.5);
  addNumericDrift(drifts, "offer.improvement_velocity_pp_per_session", get(baseline, "offer.improvement_velocity_pp_per_session"), get(current, "offer.improvement_velocity_pp_per_session"), 0.5);

  addNumericDrift(drifts, "offer.beta_percentile", get(baseline, "offer.beta_percentile"), get(current, "offer.beta_percentile"), opts.percentileDrift);
  addChanged(drifts, "offer.beta_cohort_size", get(baseline, "offer.beta_cohort_size"), get(current, "offer.beta_cohort_size"));
  addChanged(drifts, "offer.confidence_band", get(baseline, "offer.confidence_band"), get(current, "offer.confidence_band"));

  // Presence + exact text checks
  for (const key of ["baseline_range_hint", "how_it_works"]) {
    const b = get(baseline, `offer.${key}`);
    const c = get(current, `offer.${key}`);
    if (typeof b === "string" && typeof c === "string") addChanged(drifts, `offer.${key}`, b, c);
  }

  // Target ladder should be stable
  const bl = get(baseline, "offer.target_ladder");
  const cl = get(current, "offer.target_ladder");
  if (Array.isArray(bl) && Array.isArray(cl)) {
    addChanged(drifts, "offer.target_ladder", bl.join("|"), cl.join("|"));
  } else if (bl !== cl) {
    drifts.push({ path: "offer.target_ladder", kind: "changed", baseline: bl, current: cl });
  }

  // Drivers list should remain present
  for (const listKey of ["drivers_positive", "drivers_negative", "what_to_fix_next"]) {
    const b = get(baseline, `offer.${listKey}`);
    const c = get(current, `offer.${listKey}`);
    if (!Array.isArray(c) || c.length === 0) {
      addMissing(drifts, `offer.${listKey}`, b, c, "Missing/empty list");
    }
  }

  // UI required phrases (presence checks)
  const required: string[] = (get(baseline, "ui.requiredPhrases") || []) as any;
  const curText: string = String(get(current, "ui.extractedText") || "");
  for (const phrase of required) {
    if (phrase && !curText.includes(String(phrase))) {
      drifts.push({ path: `ui.requiredPhrases:${phrase}`, kind: "missing", baseline: true, current: false, notes: "Phrase missing from extracted UI text" });
    }
  }

  // Screenshot hash stability
  const bs = get(baseline, "ui.screenshotHashes") || {};
  const cs = get(current, "ui.screenshotHashes") || {};
  for (const [k, v] of Object.entries(bs)) {
    const cur = (cs as any)[k];
    if (!cur) {
      drifts.push({ path: `ui.screenshotHashes.${k}`, kind: "missing", baseline: v, current: cur });
      continue;
    }

    const bHash = String((v as any)?.dhash64 || "");
    const cHash = String((cur as any)?.dhash64 || "");
    const dist = hammingHex(bHash, cHash);
    const tol = 6;
    if (dist > tol) {
      drifts.push({
        path: `ui.screenshotHashes.${k}.dhash64`,
        kind: "changed",
        baseline: bHash,
        current: cHash,
        notes: `Perceptual screenshot hash drift (dHash64 hamming=${dist}, tol=${tol})`,
      });
    }
  }

  return {
    generatedAtIso: nowIso(),
    pass: drifts.length === 0,
    tolerance: { probabilityDrift: opts.probabilityDrift, percentileDrift: opts.percentileDrift },
    drifts,
  };
}
