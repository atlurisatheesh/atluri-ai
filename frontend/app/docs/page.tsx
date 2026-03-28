"use client";

import Link from "next/link";
import SignalPageShell, { SignalCard, SignalSection } from "@/components/marketing/SignalPageShell";

const docsBlocks = [
  {
    title: "Quickstart",
    body: "Install desktop client, connect workspace profile, and run your first simulation in under five minutes.",
    href: "/docs#quickstart",
  },
  {
    title: "Interview Engine",
    body: "Understand transcript parsing, answer generation, coaching channels, and follow-up prediction behavior.",
    href: "/docs#engine",
  },
  {
    title: "Stealth Runtime",
    body: "Read platform-specific notes for overlay visibility controls, process masking, and safety diagnostics.",
    href: "/docs#stealth",
  },
  {
    title: "SDK + API",
    body: "Wire external CRMs or dashboards into session events, score updates, and transcript checkpoints.",
    href: "/docs#api",
  },
];

export default function DocsPage() {
  return (
    <SignalPageShell
      eyebrow="Documentation"
      title="Operational Docs for Power Users"
      subtitle="Designed for speed: each guide answers one tactical question and links to exact implementation references."
      chips={["Quickstart", "SDK", "Stealth", "Troubleshooting"]}
      primaryCta={{ label: "Open App", href: "/app" }}
      secondaryCta={{ label: "Contact Support", href: "/contact" }}
      panelTitle="Docs Telemetry"
      panelRows={[
        { label: "Guides", value: "40+ tactical entries" },
        { label: "Median Read Time", value: "3.4 minutes" },
        { label: "Last Revision", value: "Continuously updated" },
      ]}
    >
      <SignalSection kicker="Map" title="Navigation by Mission">
        <div className="grid gap-4 md:grid-cols-2">
          {docsBlocks.map((block) => (
            <Link key={block.title} href={block.href} className="block">
              <SignalCard title={block.title} body={block.body} tone="cyan" />
            </Link>
          ))}
        </div>
      </SignalSection>

      <SignalSection kicker="Support" title="When Something Breaks">
        <div className="grid gap-4 md:grid-cols-3">
          <SignalCard title="Latency spikes" body="Switch to low-context mode and pin a single model route for deterministic response time." tone="amber" />
          <SignalCard title="Transcript drift" body="Calibrate microphone profile and use speaker lock when panel interviews overlap." tone="green" />
          <SignalCard title="Desktop setup issues" body="Run diagnostics bundle and attach export when contacting support." tone="purple" />
        </div>
      </SignalSection>
    </SignalPageShell>
  );
}
