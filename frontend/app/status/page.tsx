"use client";

import SignalPageShell, { SignalCard, SignalSection } from "@/components/marketing/SignalPageShell";

const services = [
  { name: "API Gateway", uptime: "99.99%", note: "Global routing healthy", tone: "green" as const },
  { name: "Transcript Stream", uptime: "99.96%", note: "Latency nominal", tone: "cyan" as const },
  { name: "Model Router", uptime: "99.94%", note: "Fallback routes active", tone: "purple" as const },
  { name: "Desktop Installer", uptime: "99.90%", note: "Windows + macOS packages available", tone: "amber" as const },
];

export default function StatusPage() {
  return (
    <SignalPageShell
      eyebrow="System Status"
      title="Live Reliability Board"
      subtitle="A transparent view of runtime health for every critical service that powers interviews."
      chips={["Live", "Incident Logs", "Uptime History"]}
      primaryCta={{ label: "Subscribe to Alerts", href: "/status" }}
      secondaryCta={{ label: "Open Support", href: "/contact" }}
      panelTitle="Current State"
      panelRows={[
        { label: "Global Severity", value: "No active incidents" },
        { label: "Degraded Services", value: "0" },
        { label: "Last Incident", value: "11 days ago" },
      ]}
    >
      <SignalSection kicker="Services" title="Core Pipeline Health">
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <SignalCard key={service.name} title={`${service.name} - ${service.uptime}`} body={service.note} tone={service.tone} />
          ))}
        </div>
      </SignalSection>
    </SignalPageShell>
  );
}
