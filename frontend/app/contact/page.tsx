"use client";

import SignalPageShell, { SignalCard, SignalSection } from "@/components/marketing/SignalPageShell";

export default function ContactPage() {
  return (
    <SignalPageShell
      eyebrow="Contact"
      title="Open a Direct Line"
      subtitle="Sales questions, support escalations, or partnership opportunities - route them here and our team will respond quickly."
      chips={["Support", "Partnerships", "Enterprise"]}
      primaryCta={{ label: "Email Support", href: "mailto:support@atluriin.com" }}
      secondaryCta={{ label: "View Status", href: "/status" }}
      panelTitle="Response SLA"
      panelRows={[
        { label: "Technical Support", value: "< 24h" },
        { label: "Sales", value: "< 12h" },
        { label: "Critical Issues", value: "Priority escalation" },
      ]}
    >
      <SignalSection kicker="Channels" title="Best Way to Reach Us">
        <div className="grid gap-4 md:grid-cols-3">
          <SignalCard title="General" body="support@atluriin.com" tone="cyan" />
          <SignalCard title="Sales" body="sales@atluriin.com" tone="green" />
          <SignalCard title="Security" body="security@atluriin.com" tone="purple" />
        </div>
      </SignalSection>
    </SignalPageShell>
  );
}
