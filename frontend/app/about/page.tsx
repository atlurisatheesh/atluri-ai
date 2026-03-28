"use client";

import SignalPageShell, { SignalCard, SignalSection } from "@/components/marketing/SignalPageShell";

export default function AboutPage() {
  return (
    <SignalPageShell
      eyebrow="About AtluriIn"
      title="We Build Interview Infrastructure"
      subtitle="AtluriIn was started to solve one problem: most candidates know the material but lose performance under pressure. We design systems that keep them sharp in real time."
      chips={["Research-led", "Operator-minded", "Candidate-first"]}
      primaryCta={{ label: "See Features", href: "/features" }}
      secondaryCta={{ label: "Join Careers", href: "/careers" }}
      panelTitle="Company Signal"
      panelRows={[
        { label: "Founded", value: "2024" },
        { label: "Mission", value: "Raise interview confidence globally" },
        { label: "Operating Model", value: "Build fast, measure honestly" },
      ]}
    >
      <SignalSection kicker="Values" title="How We Operate">
        <div className="grid gap-4 md:grid-cols-2">
          <SignalCard title="Clarity over hype" body="We publish what works, what failed, and why changes were made." tone="cyan" />
          <SignalCard title="Assistive by design" body="Our tooling augments candidate thinking instead of replacing it." tone="green" />
          <SignalCard title="Privacy first" body="Data minimization and controllable telemetry are product defaults." tone="purple" />
          <SignalCard title="Speed with discipline" body="Rapid release cycles backed by observability and rollback safety." tone="amber" />
        </div>
      </SignalSection>
    </SignalPageShell>
  );
}
