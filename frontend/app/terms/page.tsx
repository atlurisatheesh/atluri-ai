"use client";

import SignalPageShell, { SignalCard, SignalSection } from "@/components/marketing/SignalPageShell";

export default function TermsPage() {
  return (
    <SignalPageShell
      eyebrow="Terms"
      title="Terms of Service"
      subtitle="By using AtluriIn, you agree to operate responsibly and comply with applicable laws, platform policies, and professional standards."
      chips={["User Responsibilities", "Subscription Rules", "Limitations"]}
      panelTitle="Terms Snapshot"
      panelRows={[
        { label: "Last Updated", value: "2026-03-26" },
        { label: "Governing Law", value: "As stated in agreement" },
        { label: "Dispute Path", value: "Support -> Resolution" },
      ]}
    >
      <SignalSection kicker="Usage" title="Your Responsibilities">
        <div className="grid gap-4 md:grid-cols-2">
          <SignalCard title="Account Security" body="You are responsible for maintaining credentials and preventing unauthorized access." tone="cyan" />
          <SignalCard title="Lawful Use" body="You must use the service in compliance with local laws and applicable contractual obligations." tone="green" />
        </div>
      </SignalSection>

      <SignalSection kicker="Commercials" title="Billing and Access">
        <div className="grid gap-4 md:grid-cols-2">
          <SignalCard title="Subscriptions" body="Paid plans renew automatically until canceled from account settings." tone="purple" />
          <SignalCard title="Availability" body="Service may change over time; critical updates are announced in changelog and status channels." tone="amber" />
        </div>
      </SignalSection>
    </SignalPageShell>
  );
}
