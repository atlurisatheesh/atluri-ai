"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CreditCard, Zap, Package, History, Check, ArrowRight,
  Sparkles, TrendingUp, Clock, FileText, Download, Receipt,
} from "lucide-react";
import { DashboardLayout } from "../../components/dashboard";
import { GlassCard, NeonButton, GhostButton, AnimatedCounter, ProgressRing, Tabs, StatusBadge } from "../../components/ui";
import { apiRequest } from "../../lib/api";

type Balance = { credits: number; plan: string; plan_name: string };
type CreditPack = { id: string; name: string; credits: number; price_usd: number };
type Plan = { id: string; name: string; price_monthly: number; price_yearly: number; credits_monthly: number };
type Transaction = { id: string; type: string; credits: number; description: string; created_at: string };

export default function BillingPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [yearly, setYearly] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [bal, pk, pl, tx] = await Promise.all([
        apiRequest<Balance>("/api/billing/balance", { method: "GET", retries: 0 }),
        apiRequest<CreditPack[]>("/api/billing/packs", { method: "GET", retries: 0 }),
        apiRequest<Plan[]>("/api/billing/plans", { method: "GET", retries: 0 }),
        apiRequest<Transaction[]>("/api/billing/transactions", { method: "GET", retries: 0 }),
      ]);
      setBalance(bal);
      setPacks(pk);
      setPlans(pl);
      setTransactions(tx);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const purchasePack = async (packId: string) => {
    try {
      setPurchasing(packId);
      await apiRequest("/api/billing/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_id: packId }),
        retries: 0,
      });
      await load();
    } catch {} finally {
      setPurchasing(null);
    }
  };

  const planFeatures: Record<string, string[]> = {
    free: ["3 mock interviews/month", "Basic AI engine", "1 company mode", "Session transcripts"],
    pro: ["Unlimited interviews", "GPT-4o engine", "All 35+ company modes", "Stealth desktop app", "Performance analytics", "Priority support"],
    enterprise: ["Everything in Pro", "Team dashboard (50 seats)", "Custom company modes", "SSO/SAML", "Dedicated success manager", "API access"],
  };

  const tabItems = [
    {
      label: "Overview",
      content: (
        <div className="space-y-6">
          {/* Balance card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard className="p-6 md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-textMuted uppercase tracking-wider">Credit Balance</p>
                  <p className="text-4xl font-bold gradient-text mt-1">
                    {loading ? (
                      <span className="inline-block w-20 h-10 bg-white/[0.06] rounded animate-pulse" />
                    ) : (
                      <AnimatedCounter target={balance?.credits || 0} />
                    )}
                  </p>
                </div>
                <ProgressRing
                  progress={Math.min(100, ((balance?.credits || 0) / 500) * 100)}
                  size={64}
                  strokeWidth={5}
                >
                  <Zap className="w-5 h-5 text-brand-cyan" />
                </ProgressRing>
              </div>
              <p className="text-xs text-textMuted">
                ~{Math.floor((balance?.credits || 0) / 5)} sessions remaining at 5 credits/session
              </p>
            </GlassCard>

            <GlassCard className="p-6">
              <p className="text-xs text-textMuted uppercase tracking-wider mb-2">Current Plan</p>
              <p className="text-2xl font-bold text-textPrimary">{balance?.plan_name || "Free"}</p>
              <StatusBadge variant="cyan" className="mt-2">Active</StatusBadge>
            </GlassCard>
          </div>

          {/* Credit packs */}
          <div>
            <h3 className="text-lg font-semibold text-textPrimary mb-4">Buy Credits</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {packs.map((pack, i) => (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <GlassCard hover className="p-5 text-center">
                    <Package className="w-6 h-6 text-brand-amber mx-auto mb-2" />
                    <p className="text-xs text-textMuted uppercase tracking-wider">{pack.name}</p>
                    <p className="text-2xl font-bold gradient-text my-1">{pack.credits}</p>
                    <p className="text-xs text-textMuted mb-3">credits</p>
                    <p className="text-lg font-semibold text-textPrimary mb-3">${pack.price_usd}</p>
                    <NeonButton
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={() => purchasePack(pack.id)}
                      disabled={purchasing === pack.id}
                    >
                      {purchasing === pack.id ? "Processing..." : "Buy"}
                    </NeonButton>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      label: "Plans",
      content: (
        <div className="space-y-6">
          {/* Toggle */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-3 bg-white/[0.04] rounded-full p-1">
              <button onClick={() => setYearly(false)} className={`px-4 py-1.5 rounded-full text-sm transition-all cursor-pointer ${!yearly ? "bg-brand-cyan/20 text-brand-cyan" : "text-textMuted"}`}>Monthly</button>
              <button onClick={() => setYearly(true)} className={`px-4 py-1.5 rounded-full text-sm transition-all cursor-pointer ${yearly ? "bg-brand-cyan/20 text-brand-cyan" : "text-textMuted"}`}>
                Yearly <span className="text-brand-green text-xs ml-1">Save 17%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <GlassCard hover className={`p-6 h-full flex flex-col relative ${plan.id === "pro" ? "border-brand-cyan/30" : ""}`}>
                  {plan.id === "pro" && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-brand-cyan to-brand-purple text-white text-xs font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Popular
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-textPrimary mb-1">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold gradient-text">
                      ${yearly ? plan.price_yearly : plan.price_monthly}
                    </span>
                    <span className="text-textMuted text-sm ml-1">/{yearly ? "yr" : "mo"}</span>
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {(planFeatures[plan.id] || []).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-textSecondary">
                        <Check className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <NeonButton
                    className="w-full"
                    variant={plan.id === "pro" ? "primary" : "secondary"}
                    disabled={balance?.plan === plan.id}
                  >
                    {balance?.plan === plan.id ? "Current Plan" : `Upgrade to ${plan.name}`}
                  </NeonButton>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      ),
    },
    {
      label: "Transactions",
      content: (
        <div className="space-y-3">
          {transactions.length === 0 && !loading ? (
            <GlassCard className="p-8 text-center">
              <History className="w-8 h-8 text-textMuted mx-auto mb-3" />
              <p className="text-textMuted">No transactions yet.</p>
            </GlassCard>
          ) : (
            transactions.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <GlassCard className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tx.type === "purchase" ? "bg-brand-green/10" : tx.type === "usage" ? "bg-brand-red/10" : "bg-brand-amber/10"
                    }`}>
                      {tx.type === "purchase" ? (
                        <TrendingUp className="w-5 h-5 text-brand-green" />
                      ) : tx.type === "usage" ? (
                        <Zap className="w-5 h-5 text-brand-red" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-brand-amber" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-textPrimary font-medium">{tx.description}</p>
                      <p className="text-xs text-textMuted">{new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${tx.credits > 0 ? "text-brand-green" : "text-brand-red"}`}>
                    {tx.credits > 0 ? "+" : ""}{tx.credits}
                  </span>
                </GlassCard>
              </motion.div>
            ))
          )}
        </div>
      ),
    },
    {
      label: "Invoices",
      content: (
        <div className="space-y-3">
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-textPrimary mb-4 flex items-center gap-2"><Receipt className="w-4 h-4 text-brand-amber" /> Invoice History</h3>
            <div className="space-y-2">
              {[
                { id: "INV-2025-001", date: "2025-02-01", amount: "$29.00", plan: "Pro Monthly", status: "Paid" },
                { id: "INV-2025-002", date: "2025-02-15", amount: "$9.99", plan: "50 Credits", status: "Paid" },
                { id: "INV-2025-003", date: "2025-01-01", amount: "$29.00", plan: "Pro Monthly", status: "Paid" },
              ].map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-brand-cyan" />
                    <div>
                      <p className="text-sm text-textPrimary">{inv.id}</p>
                      <p className="text-[10px] text-textMuted">{inv.date} · {inv.plan}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-textPrimary">{inv.amount}</span>
                    <StatusBadge variant="green">{inv.status}</StatusBadge>
                    <button className="p-1.5 rounded-lg hover:bg-white/5 text-textMuted hover:text-brand-cyan transition"><Download className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-textPrimary mb-1">Billing & Credits</h1>
        <p className="text-sm text-textSecondary mb-6">Manage your subscription, credits, and transactions.</p>
      </motion.div>
      <Tabs tabs={tabItems} />
    </DashboardLayout>
  );
}
