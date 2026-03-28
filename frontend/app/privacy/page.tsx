"use client";

import SignalPageShell, { SignalCard, SignalSection } from "@/components/marketing/SignalPageShell";

export default function PrivacyPage() {
  return (
    <SignalPageShell
      eyebrow="Privacy"
      title="Privacy Policy"
      subtitle="We collect only what is required to run and improve your interview sessions. We avoid storing unnecessary sensitive data."
      chips={["Data Minimization", "Encryption", "User Controls"]}
      panelTitle="Policy Snapshot"
      panelRows={[
        { label: "Last Updated", value: "2026-03-26" },
        { label: "Data Retention", value: "Configurable by user" },
        { label: "Export/Delete", value: "Available in settings" },
      ]}
    >
      <SignalSection kicker="Collection" title="What We Collect">
        <div className="grid gap-4 md:grid-cols-2">
          <SignalCard title="Account Data" body="Name, email, authentication metadata, and billing information when paid plans are enabled." tone="cyan" />
          <SignalCard title="Session Data" body="Transcript snippets, model outputs, and performance telemetry used to deliver coaching." tone="green" />
        </div>
      </SignalSection>

      <SignalSection kicker="Usage" title="How Data Is Used">
        <div className="grid gap-4 md:grid-cols-2">
          <SignalCard title="Core Service" body="To generate answers, coaching prompts, and interview analytics." tone="purple" />
          <SignalCard title="Product Improvement" body="To evaluate quality trends and improve reliability of response systems." tone="amber" />
        </div>
      </SignalSection>
    </SignalPageShell>
  );
}
