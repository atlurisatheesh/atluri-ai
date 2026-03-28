"use client";

import SignalPageShell, { SignalCard, SignalSection } from "@/components/marketing/SignalPageShell";

export default function CookiesPage() {
  return (
    <SignalPageShell
      eyebrow="Cookies"
      title="Cookie Policy"
      subtitle="Cookies help us authenticate sessions, maintain preferences, and understand usage quality. You can control cookie behavior in browser settings."
      chips={["Essential", "Analytics", "Control"]}
      panelTitle="Cookie Snapshot"
      panelRows={[
        { label: "Essential Cookies", value: "Required" },
        { label: "Analytics Cookies", value: "Optional where required" },
        { label: "Consent", value: "Region-specific" },
      ]}
    >
      <SignalSection kicker="Types" title="How Cookies Are Used">
        <div className="grid gap-4 md:grid-cols-3">
          <SignalCard title="Authentication" body="Keeps you signed in securely across application routes." tone="cyan" />
          <SignalCard title="Preferences" body="Stores UI and workflow choices for a stable user experience." tone="green" />
          <SignalCard title="Performance" body="Helps us understand reliability and optimize page and API response time." tone="purple" />
        </div>
      </SignalSection>
    </SignalPageShell>
  );
}
