"use client";

import SignalPageShell, { SignalCard, SignalSection } from "@/components/marketing/SignalPageShell";

const releases = [
  { version: "v7.3", title: "Adaptive follow-up prediction", body: "Model now anticipates second-order interviewer probes using transcript momentum scoring.", tone: "green" as const },
  { version: "v7.2", title: "Stealth diagnostics panel", body: "Added runtime health panel with recorder alerts and response guidance.", tone: "cyan" as const },
  { version: "v7.1", title: "Company mode calibration", body: "Reweighted expectations for product leadership loops and consulting case rounds.", tone: "purple" as const },
  { version: "v7.0", title: "Signal UI system", body: "Introduced command-center visual language across all public pages.", tone: "amber" as const },
];

export default function ChangelogPage() {
  return (
    <SignalPageShell
      eyebrow="Release Notes"
      title="Product Evolution, Fully Logged"
      subtitle="Every meaningful product change is tracked here with intent, scope, and impact."
      chips={["Versioned", "Transparent", "Continuous Delivery"]}
      primaryCta={{ label: "Try Latest", href: "/signup?next=/app" }}
      secondaryCta={{ label: "Read Docs", href: "/docs" }}
      panelTitle="Release Velocity"
      panelRows={[
        { label: "Current Channel", value: "Stable v7.3" },
        { label: "Update Rhythm", value: "Biweekly" },
        { label: "Rollback Window", value: "Instant" },
      ]}
    >
      <SignalSection kicker="Timeline" title="Recent Shipments">
        <div className="space-y-4">
          {releases.map((release) => (
            <div key={release.version} className="rounded-2xl border border-white/15 bg-black/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.15em] text-brand-cyan">{release.version}</p>
              <SignalCard title={release.title} body={release.body} tone={release.tone} />
            </div>
          ))}
        </div>
      </SignalSection>
    </SignalPageShell>
  );
}
