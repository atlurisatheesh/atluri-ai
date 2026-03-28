"use client";

import SignalPageShell, { SignalCard, SignalSection } from "@/components/marketing/SignalPageShell";

export default function PressPage() {
  return (
    <SignalPageShell
      eyebrow="Press"
      title="Media Kit and Company Facts"
      subtitle="Everything required for coverage: positioning, product context, and contact channels in one place."
      chips={["Brand Assets", "Fact Sheet", "Media Contact"]}
      primaryCta={{ label: "Request Interview", href: "/contact" }}
      secondaryCta={{ label: "Read Blog", href: "/blog" }}
      panelTitle="Press Resources"
      panelRows={[
        { label: "Logo Packs", value: "SVG + PNG" },
        { label: "Founders Available", value: "Yes" },
        { label: "Review Access", value: "On request" },
      ]}
    >
      <SignalSection kicker="Assets" title="What We Provide">
        <div className="grid gap-4 md:grid-cols-2">
          <SignalCard title="Brand Kit" body="Primary and inverse logos, icon marks, color tokens, and usage guidance." tone="cyan" />
          <SignalCard title="Product Screens" body="High-resolution screenshots of stealth overlay, coaching interface, and analytics views." tone="green" />
          <SignalCard title="Fact Sheet" body="Company timeline, mission statement, and product milestone history." tone="purple" />
          <SignalCard title="Media Contact" body="press@atluriin.com" tone="amber" />
        </div>
      </SignalSection>
    </SignalPageShell>
  );
}
