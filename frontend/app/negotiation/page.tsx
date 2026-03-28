"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Mail, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { GlassCard, NeonButton } from "@/components/ui";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9010";

const ROLE_CATEGORIES = [
  { value: "software_engineering", label: "Software Engineering" },
  { value: "data_science", label: "Data Science / ML" },
  { value: "product_management", label: "Product Management" },
  { value: "design", label: "Design (UX/UI)" },
  { value: "devops_infra", label: "DevOps / Infrastructure" },
];

const LEVELS = [
  { value: "junior", label: "Junior (0-2 yrs)" },
  { value: "mid", label: "Mid (2-5 yrs)" },
  { value: "senior", label: "Senior (5-8 yrs)" },
  { value: "staff", label: "Staff / Lead (8-12 yrs)" },
  { value: "principal", label: "Principal / Director (12+ yrs)" },
];

interface NegotiationPackage {
  benchmark: {
    role_category: string;
    level: string;
    location: string;
    base_range: { min: number; max: number };
    total_comp_range: { min: number; max: number };
    location_multiplier: number;
  };
  offer_analysis: {
    base_percentile: string;
    total_percentile: string;
    base_gap_to_median: number;
    is_lowball: boolean;
    lowball_severity: string | null;
    recommendations: string[];
  };
  counter_scripts: {
    verbal_script: string;
    email_template: string;
    key_points: string[];
    negotiation_tips: string[];
  };
}

export default function NegotiationPage() {
  const [roleCategory, setRoleCategory] = useState("software_engineering");
  const [level, setLevel] = useState("senior");
  const [location, setLocation] = useState("US Average");
  const [offeredBase, setOfferedBase] = useState("");
  const [offeredTotal, setOfferedTotal] = useState("");
  const [offeredEquity, setOfferedEquity] = useState("");
  const [company, setCompany] = useState("");
  const [competingOffers, setCompetingOffers] = useState(false);
  const [pkg, setPkg] = useState<NegotiationPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!offeredBase) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/career/negotiation-package`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_category: roleCategory,
          level,
          location,
          offered_base: parseFloat(offeredBase),
          offered_total: offeredTotal ? parseFloat(offeredTotal) : null,
          offered_equity: offeredEquity ? parseFloat(offeredEquity) : null,
          company: company || "the company",
          competing_offers: competingOffers,
        }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      setPkg(await res.json());
    } catch (err: any) {
      setError(err.message || "Failed to analyze");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-green-400" />
            Offer Negotiation Coach
          </h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Get market benchmarks, lowball analysis, and ready-to-use counter-offer scripts.
          </p>
        </div>

        {/* Input Form */}
        <GlassCard className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Role Category</label>
              <select value={roleCategory} onChange={e => setRoleCategory(e.target.value)} title="Role Category"
                className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none">
                {ROLE_CATEGORIES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Level</label>
              <select value={level} onChange={e => setLevel(e.target.value)} title="Level"
                className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none">
                {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Location</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, NYC, Remote"
                className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none placeholder-neutral-600" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Company (optional)</label>
              <input type="text" value={company} onChange={e => setCompany(e.target.value)}
                placeholder="e.g. Google, Meta, Startup"
                className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none placeholder-neutral-600" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Offered Base Salary ($)</label>
              <input type="number" value={offeredBase} onChange={e => setOfferedBase(e.target.value)}
                placeholder="e.g. 180000"
                className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none placeholder-neutral-600" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Offered Total Comp ($, optional)</label>
              <input type="number" value={offeredTotal} onChange={e => setOfferedTotal(e.target.value)}
                placeholder="e.g. 280000"
                className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none placeholder-neutral-600" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Annual Equity Value ($, optional)</label>
              <input type="number" value={offeredEquity} onChange={e => setOfferedEquity(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none placeholder-neutral-600" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                <input type="checkbox" checked={competingOffers} onChange={e => setCompetingOffers(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-cyan-500" />
                I have competing offers
              </label>
            </div>
          </div>

          <div className="flex justify-end mt-5">
            <NeonButton onClick={handleAnalyze} disabled={loading || !offeredBase}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                </span>
              ) : "Analyze & Generate Scripts"}
            </NeonButton>
          </div>
        </GlassCard>

        {error && (
          <div className="text-red-400 text-sm mb-4 px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}

        <AnimatePresence>
          {pkg && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Market Benchmark */}
              <GlassCard>
                <h2 className="text-sm font-medium text-neutral-300 flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Market Benchmark
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Base Salary Range</p>
                    <p className="text-lg font-semibold text-neutral-100">
                      {fmt(pkg.benchmark.base_range.min)} – {fmt(pkg.benchmark.base_range.max)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Total Comp Range</p>
                    <p className="text-lg font-semibold text-neutral-100">
                      {fmt(pkg.benchmark.total_comp_range.min)} – {fmt(pkg.benchmark.total_comp_range.max)}
                    </p>
                  </div>
                </div>
                {pkg.benchmark.location_multiplier !== 1.0 && (
                  <p className="text-xs text-neutral-500 mt-2">
                    Location multiplier: {pkg.benchmark.location_multiplier}x ({pkg.benchmark.location})
                  </p>
                )}
              </GlassCard>

              {/* Offer Analysis */}
              <GlassCard>
                <h2 className="text-sm font-medium text-neutral-300 flex items-center gap-2 mb-4">
                  {pkg.offer_analysis.is_lowball ? (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  )}
                  Offer Analysis
                </h2>

                {pkg.offer_analysis.is_lowball && (
                  <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm font-medium text-red-400">
                      Lowball Detected — {pkg.offer_analysis.lowball_severity} severity
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Base is {fmt(Math.abs(pkg.offer_analysis.base_gap_to_median))} below median
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-neutral-800/30 rounded-lg px-4 py-3">
                    <p className="text-xs text-neutral-500">Base Percentile</p>
                    <p className="text-xl font-bold text-neutral-100">{pkg.offer_analysis.base_percentile}</p>
                  </div>
                  <div className="bg-neutral-800/30 rounded-lg px-4 py-3">
                    <p className="text-xs text-neutral-500">Total Comp Percentile</p>
                    <p className="text-xl font-bold text-neutral-100">{pkg.offer_analysis.total_percentile}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-neutral-500 mb-2">Recommendations</p>
                  <ul className="space-y-1.5">
                    {pkg.offer_analysis.recommendations.map((r, i) => (
                      <li key={i} className="text-xs text-neutral-300 flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">→</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </GlassCard>

              {/* Counter Scripts */}
              <GlassCard>
                <h2 className="text-sm font-medium text-neutral-300 flex items-center gap-2 mb-4">
                  <Mail className="w-4 h-4 text-purple-400" />
                  Counter-Offer Scripts
                </h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-neutral-500 mb-2">Verbal Script (phone/call)</p>
                    <div className="bg-neutral-800/30 rounded-lg px-4 py-3 text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
                      {pkg.counter_scripts.verbal_script}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-neutral-500 mb-2">Email Template</p>
                    <div className="bg-neutral-800/30 rounded-lg px-4 py-3 text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap font-mono text-xs">
                      {pkg.counter_scripts.email_template}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-neutral-500 mb-2">Key Talking Points</p>
                      <ul className="space-y-1">
                        {pkg.counter_scripts.key_points.map((p, i) => (
                          <li key={i} className="text-xs text-neutral-300">• {p}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 mb-2">Negotiation Tips</p>
                      <ul className="space-y-1">
                        {pkg.counter_scripts.negotiation_tips.map((t, i) => (
                          <li key={i} className="text-xs text-neutral-400">• {t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
