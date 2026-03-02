"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Target, TrendingUp, Flame, Play, BookOpen, FileText, BarChart3, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import Link from "next/link";
import { GlassCard, AnimatedCounter, ProgressRing, NeonButton, StatusBadge } from "../ui";
import { apiRequest } from "../../lib/api";
import { getAccessTokenOrThrow } from "../../lib/auth";

type OverviewData = {
  sessions: { total: number; average_score: number };
  risk: { latest_risk_count: number };
  persona: { company_mode: string };
};

type OfferProb = {
  offer_probability: number;
  confidence_band: string;
  delta_vs_last_session: number;
  what_to_fix_next: string[];
  drivers_negative: string[];
};

type ProgressData = {
  summary: {
    latest_score: number;
    score_direction: string;
    metric_usage_direction: string;
    ownership_direction: string;
    pressure_response_direction: string;
  };
};

export default function Overview() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [offerProb, setOfferProb] = useState<OfferProb | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const authToken = await getAccessTokenOrThrow();
        const [ov, prog, offer] = await Promise.all([
          apiRequest<OverviewData>("/api/dashboard/overview", { method: "GET", retries: 0, authToken }),
          apiRequest<ProgressData>("/api/user/progress?limit=24", { method: "GET", retries: 0, authToken }),
          apiRequest<OfferProb>("/api/user/offer-probability?limit=40", { method: "GET", retries: 0, authToken }),
        ]);
        if (!active) return;
        setOverview(ov);
        setProgress(prog);
        setOfferProb(offer);
      } catch {} finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const offerValue = Math.round(Number(offerProb?.offer_probability || 0));
  const offerDelta = Math.round(Number(offerProb?.delta_vs_last_session || 0));
  const latestScore = Math.round(Number(progress?.summary?.latest_score || 0));
  const totalSessions = overview?.sessions?.total || 0;
  const avgScore = Math.round(Number(overview?.sessions?.average_score || 0));

  const statCards = [
    {
      label: "Offer Probability",
      value: offerValue,
      suffix: "%",
      icon: <Target className="w-5 h-5" />,
      color: "text-brand-cyan",
      ring: true,
      ringProgress: offerValue,
    },
    {
      label: "Latest Score",
      value: latestScore,
      suffix: "/100",
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-brand-green",
      delta: progress?.summary?.score_direction,
    },
    {
      label: "Total Sessions",
      value: totalSessions,
      suffix: "",
      icon: <Flame className="w-5 h-5" />,
      color: "text-brand-orange",
    },
    {
      label: "Avg Score",
      value: avgScore,
      suffix: "/100",
      icon: <BarChart3 className="w-5 h-5" />,
      color: "text-brand-purple",
    },
  ];

  const recentTips = offerProb?.what_to_fix_next?.slice(0, 3) || [
    "Tighten ownership language",
    "Add measurable impact metrics",
    "Improve pressure response timing",
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-textPrimary mb-1">Dashboard</h1>
        <p className="text-sm text-textSecondary">Your interview performance at a glance.</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard hover className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className={stat.color}>{stat.icon}</span>
                {stat.ring && (
                  <ProgressRing progress={stat.ringProgress || 0} size={48} strokeWidth={4}>
                    <span className="text-xs font-mono text-brand-cyan font-semibold">
                      {stat.ringProgress}%
                    </span>
                  </ProgressRing>
                )}
                {stat.delta && (
                  <span className={`flex items-center text-xs font-medium ${stat.delta === "up" ? "text-brand-green" : stat.delta === "down" ? "text-brand-red" : "text-textMuted"}`}>
                    {stat.delta === "up" ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : stat.delta === "down" ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : null}
                    {stat.delta}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-textPrimary">
                {loading ? (
                  <span className="inline-block w-16 h-7 bg-white/[0.06] rounded animate-pulse" />
                ) : (
                  <><AnimatedCounter target={stat.value} />{stat.suffix}</>
                )}
              </p>
              <p className="text-xs text-textMuted mt-1">{stat.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Quick actions + tips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-textPrimary mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href="/app?mode=interview">
                <NeonButton size="sm" className="w-full">
                  <Play className="w-4 h-4 mr-2" /> Start Session
                </NeonButton>
              </Link>
              <Link href="/interview">
                <NeonButton size="sm" variant="secondary" className="w-full">
                  <BookOpen className="w-4 h-4 mr-2" /> Mock Interview
                </NeonButton>
              </Link>
              <Link href="/app?mode=resume">
                <NeonButton size="sm" variant="accent" className="w-full">
                  <FileText className="w-4 h-4 mr-2" /> Build Resume
                </NeonButton>
              </Link>
            </div>
          </GlassCard>
        </motion.div>

        {/* Improvement Tips */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <GlassCard className="p-6 h-full">
            <h3 className="text-lg font-semibold text-textPrimary mb-4">Focus Areas</h3>
            <div className="space-y-3">
              {recentTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3">
                  <StatusBadge variant={i === 0 ? "red" : i === 1 ? "amber" : "green"} className="mt-0.5 flex-shrink-0">
                    P{i}
                  </StatusBadge>
                  <p className="text-sm text-textSecondary">{tip}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Offer delta */}
      {offerDelta !== 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <GlassCard className="p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-brand-amber" />
            <p className="text-sm text-textSecondary">
              Your offer probability changed by{" "}
              <span className={offerDelta > 0 ? "text-brand-green font-semibold" : "text-brand-red font-semibold"}>
                {offerDelta > 0 ? "+" : ""}{offerDelta}%
              </span>{" "}
              since your last session.
            </p>
          </GlassCard>
        </motion.div>
      )}

      {/* Blockers */}
      {(offerProb?.drivers_negative?.length ?? 0) > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <GlassCard className="p-4">
            <p className="text-xs text-textMuted uppercase tracking-wider mb-2">Current Blockers</p>
            <p className="text-sm text-textSecondary">{offerProb!.drivers_negative.slice(0, 2).join(" · ")}</p>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
