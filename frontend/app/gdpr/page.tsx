"use client";

import SignalPageShell, { SignalCard, SignalSection } from "@/components/marketing/SignalPageShell";

export default function GdprPage() {
  return (
    <SignalPageShell
      eyebrow="GDPR"
      title="GDPR Compliance"
      subtitle="For users in the EEA and UK, AtluriIn provides access, correction, export, and deletion controls aligned with GDPR requirements."
      chips={["Data Rights", "Lawful Basis", "DPO Contact"]}
      panelTitle="Compliance Snapshot"
      panelRows={[
        { label: "Controller", value: "AtluriIn" },
        { label: "User Rights", value: "Access, rectify, erase, port" },
        { label: "Contact", value: "privacy@atluriin.com" },
      ]}
    >
      <SignalSection kicker="Rights" title="Your GDPR Rights">
        <div className="grid gap-4 md:grid-cols-2">
          <SignalCard title="Access and portability" body="Request a copy of your personal data in a portable format." tone="cyan" />
          <SignalCard title="Rectification and erasure" body="Correct inaccurate data or request deletion where legally permitted." tone="green" />
          <SignalCard title="Restriction and objection" body="Limit processing or object to certain uses of your data." tone="purple" />
          <SignalCard title="Complaints" body="You may contact your local supervisory authority for unresolved concerns." tone="amber" />
        </div>
      </SignalSection>
    </SignalPageShell>
  );
}
