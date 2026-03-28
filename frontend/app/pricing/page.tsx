"use client";

import SignalPageShell, { SignalCard, SignalSection } from "@/components/marketing/SignalPageShell";

const plans = [
  {
    name: "Launch",
    price: "$0",
    note: "For first-time candidates",
    bullets: ["5 practice sessions", "Baseline transcript", "Community support"],
    tone: "cyan" as const,
  },
  {
    name: "Operator",
    price: "$29/mo",
    note: "For active interview cycles",
    bullets: ["Unlimited sessions", "Stealth overlay", "Company mode packs", "Offer probability telemetry"],
    tone: "green" as const,
  },
  {
    name: "Command",
    price: "$99/mo",
    note: "For high-stakes transitions",
    bullets: ["Everything in Operator", "Priority model routing", "1:1 strategy reviews", "Private deployment options"],
    tone: "purple" as const,
  },
];

export default function PricingPage() {
  return (
    <SignalPageShell
      eyebrow="Commercials"
      title="Pricing Built Around Interview Velocity"
      subtitle="Pick a plan by cycle intensity. If interviews are occasional, stay light. If you are in active loops, switch to Operator and run full telemetry."
      chips={["Monthly", "No Contracts", "Upgrade Anytime"]}
      primaryCta={{ label: "Start Free", href: "/signup?next=/app" }}
      secondaryCta={{ label: "Talk to Sales", href: "/contact" }}
      panelTitle="Billing Signal"
      panelRows={[
        { label: "Activation Time", value: "Under 3 minutes" },
        { label: "Cancelation", value: "One-click in settings" },
        { label: "Accepted", value: "Card, ACH, invoice" },
      ]}
    >
      <SignalSection kicker="Plans" title="Three Modes, Clear Tradeoffs">
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className="space-y-3 rounded-2xl border border-white/15 bg-black/30 p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-textMuted">{plan.name}</p>
              <p className="text-3xl font-heading font-bold text-textPrimary">{plan.price}</p>
              <p className="text-sm text-textSecondary">{plan.note}</p>
              <div className="space-y-2">
                {plan.bullets.map((bullet) => (
                  <SignalCard key={bullet} title={bullet} body="" tone={plan.tone} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </SignalSection>

      <SignalSection kicker="FAQ" title="Common Billing Questions">
        <div className="grid gap-4 md:grid-cols-2">
          <SignalCard title="Can I switch plans mid-cycle?" body="Yes. Upgrades prorate instantly. Downgrades apply on the next billing boundary." tone="amber" />
          <SignalCard title="Is there a student program?" body="Yes. Verified student email unlocks discounted Operator pricing." tone="cyan" />
          <SignalCard title="Do unused sessions roll over?" body="Launch sessions reset monthly. Paid plans are unlimited and do not need rollovers." tone="green" />
          <SignalCard title="Can teams share one workspace?" body="Command plan supports multi-seat workspaces with centralized analytics." tone="purple" />
        </div>
      </SignalSection>
    </SignalPageShell>
  );
}
