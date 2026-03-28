"use client";

import SignalPageShell, { SignalCard, SignalSection } from "@/components/marketing/SignalPageShell";

const posts = [
  {
    title: "Designing Interview Systems Like Reliability Systems",
    body: "Why response quality should be treated like uptime: observable, testable, and continuously improved.",
    tone: "cyan" as const,
  },
  {
    title: "Stealth UX: Reducing Cognitive Load Under Pressure",
    body: "How visual hierarchy, pacing cues, and compressed guidance improve real interview performance.",
    tone: "green" as const,
  },
  {
    title: "From Generic AI Replies to Decision-Grade Answers",
    body: "Prompt routing and metric weighting for answers that signal ownership and impact.",
    tone: "purple" as const,
  },
  {
    title: "Career Velocity Loops: Practice, Measure, Iterate",
    body: "A framework for tracking improvement across behavior rounds, coding rounds, and leadership loops.",
    tone: "amber" as const,
  },
];

export default function BlogPage() {
  return (
    <SignalPageShell
      eyebrow="Field Notes"
      title="The AtluriIn Signal Journal"
      subtitle="Essays and teardown posts from our engineering and interview science teams."
      chips={["Product", "Interview Science", "Stealth", "Career Ops"]}
      primaryCta={{ label: "Read Latest", href: "/blog" }}
      secondaryCta={{ label: "View Changelog", href: "/changelog" }}
      panelTitle="Editorial Stream"
      panelRows={[
        { label: "Publishing Cadence", value: "Weekly" },
        { label: "Contributors", value: "Product + ML + Research" },
        { label: "Audience", value: "Candidates and operators" },
      ]}
    >
      <SignalSection kicker="Recent" title="Latest Dispatches">
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((post) => (
            <SignalCard key={post.title} title={post.title} body={post.body} tone={post.tone} />
          ))}
        </div>
      </SignalSection>

      <SignalSection kicker="Subscribe" title="Get Updates Without Noise">
        <p className="text-sm text-textSecondary">
          We only send high-signal updates: product releases, interview strategy playbooks, and research notes.
        </p>
      </SignalSection>
    </SignalPageShell>
  );
}
