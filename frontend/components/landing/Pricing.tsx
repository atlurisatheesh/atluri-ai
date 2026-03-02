"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import GlassCard from "../ui/GlassCard";
import NeonButton from "../ui/NeonButton";
import GhostButton from "../ui/GhostButton";
import Link from "next/link";

const plans = [
  {
    name: "Free",
    monthly: 0,
    yearly: 0,
    badge: null,
    description: "Try the core experience risk-free.",
    features: [
      "3 mock interviews / month",
      "Basic AI answer engine",
      "1 company mode (Generic)",
      "Session transcript export",
    ],
    cta: "Start Free",
    href: "/signup?plan=free",
    variant: "secondary" as const,
  },
  {
    name: "Pro",
    monthly: 29,
    yearly: 290,
    badge: "Most Popular",
    description: "Unlimited power for active job seekers.",
    features: [
      "Unlimited mock interviews",
      "GPT-4o answer engine",
      "All 35+ company modes",
      "Stealth desktop app",
      "Performance analytics",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    href: "/signup?plan=pro",
    variant: "primary" as const,
  },
  {
    name: "Enterprise",
    monthly: 99,
    yearly: 990,
    badge: null,
    description: "For teams, bootcamps, and universities.",
    features: [
      "Everything in Pro",
      "Team dashboard (up to 50 seats)",
      "Custom company modes",
      "SSO / SAML integration",
      "Dedicated success manager",
      "API access & webhooks",
    ],
    cta: "Contact Sales",
    href: "/signup?plan=enterprise",
    variant: "accent" as const,
  },
];

const creditPacks = [
  { credits: 10, price: 5, label: "Starter" },
  { credits: 50, price: 20, label: "Power" },
  { credits: 200, price: 60, label: "Bulk" },
  { credits: 500, price: 120, label: "Max" },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="section-padding bg-transparent">
      <div className="max-w-6xl mx-auto px-6">
        {/* heading */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <span className="text-brand-amber text-sm font-semibold tracking-wider uppercase">Pricing</span>
          <h2 className="text-3xl md:text-4xl font-bold text-textPrimary mt-2 mb-4">Simple, Transparent Pricing</h2>
          <p className="text-textSecondary max-w-xl mx-auto mb-6">Start free. Upgrade when you're ready to go full stealth-mode.</p>

          {/* toggle */}
          <div className="inline-flex items-center gap-3 bg-white/[0.04] rounded-full p-1">
            <button onClick={() => setYearly(false)} className={`px-4 py-1.5 rounded-full text-sm transition-all cursor-pointer ${!yearly ? "bg-brand-cyan/20 text-brand-cyan" : "text-textMuted"}`}>Monthly</button>
            <button onClick={() => setYearly(true)} className={`px-4 py-1.5 rounded-full text-sm transition-all cursor-pointer ${yearly ? "bg-brand-cyan/20 text-brand-cyan" : "text-textMuted"}`}>
              Yearly <span className="text-brand-green text-xs ml-1">Save 17%</span>
            </button>
          </div>
        </motion.div>

        {/* plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan, i) => (
            <motion.div key={plan.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <GlassCard hover className={`p-6 h-full flex flex-col relative ${plan.badge ? "border-brand-cyan/30" : ""}`}>
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-brand-cyan to-brand-purple text-white text-xs font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {plan.badge}
                  </span>
                )}
                <h3 className="text-xl font-bold text-textPrimary mb-1">{plan.name}</h3>
                <p className="text-sm text-textMuted mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold gradient-text">${yearly ? plan.yearly : plan.monthly}</span>
                  <span className="text-textMuted text-sm ml-1">/ {yearly ? "year" : "mo"}</span>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-textSecondary">
                      <Check className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href} className="mt-auto">
                  {plan.variant === "primary" ? (
                    <NeonButton className="w-full">{plan.cta} <ArrowRight className="w-4 h-4 ml-2 inline" /></NeonButton>
                  ) : (
                    <GhostButton className="w-full">{plan.cta}</GhostButton>
                  )}
                </Link>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* credit packs */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
          <h3 className="text-xl font-semibold text-textPrimary mb-6">Or Buy Credit Packs</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {creditPacks.map((pack) => (
              <GlassCard key={pack.credits} hover className="p-4 text-center cursor-pointer">
                <p className="text-xs text-textMuted tracking-wider uppercase mb-1">{pack.label}</p>
                <p className="text-2xl font-bold gradient-text">{pack.credits}</p>
                <p className="text-xs text-textMuted mb-2">credits</p>
                <p className="text-sm text-textSecondary font-medium">${pack.price}</p>
              </GlassCard>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
