"use client";

import { Brain, Shield, Mic, Building2, BarChart3, Zap, Layers } from "lucide-react";
import SignalPageShell, { SignalCard, SignalSection } from "@/components/marketing/SignalPageShell";

const stacks = [
  {
    icon: Brain,
    title: "Response Intelligence",
    body: "Context-aware answers with STAR structure, proof points, and instant pivots when interview pressure changes.",
    tone: "cyan" as const,
  },
  {
    icon: Shield,
    title: "Stealth Runtime",
    body: "Desktop overlay architecture designed for invisibility across screen share, task switching, and recorder checks.",
    tone: "green" as const,
  },
  {
    icon: Mic,
    title: "Audio-to-Intent",
    body: "Low-latency transcription and semantic parsing to understand interviewer intent before the next sentence lands.",
    tone: "purple" as const,
  },
  {
    icon: Building2,
    title: "Company Pattern Packs",
    body: "Behavioral and technical expectations tuned for FAANG, fintech, consulting, and high-growth startup loops.",
    tone: "amber" as const,
  },
  {
    icon: BarChart3,
    title: "Signal Analytics",
    body: "Session telemetry tracks pacing quality, answer sharpness, story clarity, and trendlines over every rehearsal.",
    tone: "cyan" as const,
  },
  {
    icon: Zap,
    title: "Live Coaching Layer",
    body: "Micro-prompts for tone, confidence, and specificity while you continue speaking without breaking interview flow.",
    tone: "green" as const,
  },
];

const companyModes = [
  "Google", "Amazon", "Meta", "Apple", "Microsoft", "Netflix", "Stripe", "Databricks", "Snowflake", "Uber",
  "Airbnb", "LinkedIn", "Salesforce", "Oracle", "Deloitte", "McKinsey", "BCG", "Goldman Sachs", "JP Morgan", "Palantir",
];

export default function FeaturesPage() {
  return (
    <SignalPageShell
      eyebrow="Capabilities Grid"
      title="Feature Stack Built Like an Operations Console"
      subtitle="AtluriIn ships as a layered system, not a chat box: input capture, response intelligence, stealth transport, and coaching telemetry all running as one pipeline."
      chips={["Multi-LLM", "Stealth Overlay", "Company Modes", "Realtime Coaching"]}
      primaryCta={{ label: "Open Stealth View", href: "/stealth" }}
      secondaryCta={{ label: "See Pricing", href: "/pricing" }}
      panelTitle="Stack Health"
      panelRows={[
        { label: "Processing Latency", value: "< 350ms average" },
        { label: "Interview Profiles", value: "35+ calibrated modes" },
        { label: "Detection Watch", value: "Continuous signature scan" },
      ]}
    >
      <SignalSection kicker="Core Systems" title="Seven Runtime Layers">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stacks.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-brand-cyan">
                  <Icon className="h-4 w-4" />
                </div>
                <SignalCard title={item.title} body={item.body} tone={item.tone} />
              </div>
            );
          })}
        </div>
      </SignalSection>

      <SignalSection kicker="Coverage" title="Company Modes">
        <p className="mb-4 text-sm text-textSecondary">
          Prompt behavior and scoring emphasis are adapted for each organization style, from algorithm-heavy loops to stakeholder-heavy product rounds.
        </p>
        <div className="flex flex-wrap gap-2">
          {companyModes.map((mode) => (
            <span
              key={mode}
              className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.12em] text-textMuted"
            >
              {mode}
            </span>
          ))}
        </div>
      </SignalSection>

      <SignalSection kicker="Differentiator" title="Why This Feels Different">
        <div className="grid gap-4 md:grid-cols-3">
          <SignalCard title="Operator UX" body="Everything is optimized for high-pressure moments with fast retrieval and low cognitive load." tone="purple" />
          <SignalCard title="Signal Not Noise" body="Answers prioritize measurable impact and decision logic over verbose generic text." tone="green" />
          <SignalCard title="Desktop First" body="The stealth stack is architected where browser plugins cannot reach." tone="amber" />
        </div>
      </SignalSection>
    </SignalPageShell>
  );
}
