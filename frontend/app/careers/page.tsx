"use client";

import SignalPageShell, { SignalCard, SignalSection } from "@/components/marketing/SignalPageShell";

const openings = [
  { role: "Senior Frontend Engineer", summary: "Build high-velocity interfaces for live interview moments.", tone: "cyan" as const },
  { role: "Applied ML Engineer", summary: "Improve response quality, ranking, and personalization loops.", tone: "green" as const },
  { role: "Desktop Systems Engineer", summary: "Advance stealth runtime reliability across platforms.", tone: "purple" as const },
  { role: "Product Designer", summary: "Design differentiated interaction models beyond template SaaS patterns.", tone: "amber" as const },
];

export default function CareersPage() {
  return (
    <SignalPageShell
      eyebrow="Careers"
      title="Join the Team Building Career Infrastructure"
      subtitle="We are a small team with ambitious standards: fast shipping, direct feedback, and measurable product outcomes."
      chips={["Remote-first", "High ownership", "Mission-critical UX"]}
      primaryCta={{ label: "Apply Now", href: "/contact" }}
      secondaryCta={{ label: "Learn About Us", href: "/about" }}
      panelTitle="Hiring Signal"
      panelRows={[
        { label: "Open Roles", value: "4 active" },
        { label: "Interview Process", value: "2 rounds + practical" },
        { label: "Response Time", value: "Under 7 days" },
      ]}
    >
      <SignalSection kicker="Open Roles" title="Current Opportunities">
        <div className="grid gap-4 md:grid-cols-2">
          {openings.map((opening) => (
            <SignalCard key={opening.role} title={opening.role} body={opening.summary} tone={opening.tone} />
          ))}
        </div>
      </SignalSection>
    </SignalPageShell>
  );
}
