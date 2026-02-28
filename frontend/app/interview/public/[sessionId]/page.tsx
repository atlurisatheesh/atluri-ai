"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiRequest } from "../../../../lib/api";

type PublicSnapshot = {
  session_id: string;
  role: string;
  generated_at: number;
  summary: {
    decision?: string;
    score?: number;
    integrity_score?: number;
    risk_explanation?: string;
    strengths?: string[];
    risk_flags?: string[];
    offer_probability?: number;
    offer_delta_vs_last_session?: number;
    offer_confidence_band?: string;
    drivers_negative?: string[];
    what_to_fix_next?: string[];
  };
};

export default function PublicSessionReportPage() {
  const params = useParams<{ sessionId: string }>();
  const search = useSearchParams();
  const sessionId = String(params?.sessionId || "");
  const token = String(search?.get("share") || "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<PublicSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const payload = await apiRequest<PublicSnapshot>(`/api/public/session/${encodeURIComponent(sessionId)}/snapshot?token=${encodeURIComponent(token)}`, {
          method: "GET",
          retries: 0,
        });
        if (!active) return;
        setData(payload);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Failed to load shared report");
      } finally {
        if (active) setLoading(false);
      }
    };

    if (sessionId && token) {
      load();
    } else {
      setLoading(false);
      setError("Invalid share link.");
    }

    return () => {
      active = false;
    };
  }, [sessionId, token]);

  const generatedLabel = useMemo(() => {
    if (!data?.generated_at) return "—";
    return new Date(Number(data.generated_at) * 1000).toLocaleString();
  }, [data]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">Loading shared report...</div>;
  }

  if (error || !data) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-rose-300">{error || "Report unavailable."}</div>;
  }

  const offerValue = Number(data.summary?.offer_probability ?? 0);
  const roundedOffer = Math.round(offerValue);
  const confidenceBandRaw = String(data.summary?.offer_confidence_band || "medium").toLowerCase();
  const spread = confidenceBandRaw === "high" ? 4 : confidenceBandRaw === "medium" ? 8 : 12;
  const bandLow = Math.max(0, roundedOffer - spread);
  const bandHigh = Math.min(100, roundedOffer + spread);
  const verdict = roundedOffer >= 70 ? "Likely" : roundedOffer >= 55 ? "Borderline" : "Unlikely";
  const roleText = String(data.role || "").toLowerCase();
  const icpLabel = roleText.includes("product") || roleText.includes("pm")
    ? "Product Manager"
    : roleText.includes("l6")
    ? "L6 Candidate"
    : roleText.includes("campus") || roleText.includes("intern") || roleText.includes("new grad")
    ? "Campus Hire"
    : "Senior SWE";
  const offerMeaning =
    roundedOffer >= 70
      ? "Likely to advance if execution remains consistent."
      : roundedOffer >= 55
      ? "Borderline: one stronger round can shift this into pass-range."
      : "Unlikely currently: core interview signal needs correction before major loops.";

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <section className="rounded-xl border border-zinc-300 bg-white p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Interview Performance Audit Snapshot</h1>
          <div className="mt-2 text-sm text-zinc-600">Session: {data.session_id}</div>
          <div className="text-sm text-zinc-600">Role: {data.role || "—"}</div>
          <div className="text-sm text-zinc-600">Generated: {generatedLabel}</div>
          <div className="mt-2 inline-flex rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700">Profile: {icpLabel}</div>
        </section>

        <section className="rounded-xl border border-zinc-300 bg-white p-8">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Verdict</div>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <div className="text-5xl font-semibold tracking-tight">{roundedOffer}%</div>
            <div className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold uppercase text-zinc-700">{verdict}</div>
          </div>
          <div className="mt-2 text-sm text-zinc-600">Confidence band: {bandLow}% – {bandHigh}%</div>
          <p className="mt-3 text-base leading-relaxed text-zinc-800">{offerMeaning}</p>
          <div className="mt-3 text-sm text-zinc-700">Decision: {data.summary?.decision || "—"}</div>
        </section>

        <section className="rounded-xl border border-zinc-300 bg-white p-6">
          <h2 className="text-lg font-semibold tracking-tight">Why</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-700">
            {(data.summary?.drivers_negative || data.summary?.risk_flags || []).slice(0, 3).map((item) => (
              <li key={item}>• {item}</li>
            ))}
            {(data.summary?.drivers_negative || data.summary?.risk_flags || []).length === 0 ? <li>No high-risk blockers detected.</li> : null}
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-300 bg-white p-6">
          <h2 className="text-lg font-semibold tracking-tight">What changed</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-700">
            <li>
              • Offer delta: {Number(data.summary?.offer_delta_vs_last_session ?? 0) >= 0 ? "+" : ""}
              {Math.round(Number(data.summary?.offer_delta_vs_last_session ?? 0))} points
            </li>
            <li>• Score: {Math.round(Number(data.summary?.score ?? 0))}</li>
            <li>• Integrity: {Math.round(Number(data.summary?.integrity_score ?? 0))}</li>
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-300 bg-white p-6">
          <h2 className="text-lg font-semibold tracking-tight">What to fix next</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-700">
            {(data.summary?.what_to_fix_next || []).map((item) => (
              <li key={item}>• {item}</li>
            ))}
            {(data.summary?.what_to_fix_next || []).length === 0 ? <li>No next actions listed.</li> : null}
          </ul>
          <p className="mt-4 text-xs uppercase tracking-wide text-zinc-500">Institutional Snapshot · Interview Performance OS</p>
        </section>
      </div>
    </div>
  );
}
