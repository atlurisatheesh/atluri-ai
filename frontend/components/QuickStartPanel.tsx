"use client";

type StrategyTrack = "launch" | "depth" | "stealth" | "enterprise";

type QuickStartPanelProps = {
  onPick: (mode: "interview" | "dashboard" | "resume" | "job") => void;
  onRunFirstRound: () => void;
  onRunDemo: () => void;
  onDismiss: () => void;
  strategyTrack: StrategyTrack;
  onSelectTrack: (track: StrategyTrack) => void;
};

export default function QuickStartPanel({ onPick, onRunFirstRound, onRunDemo, onDismiss, strategyTrack, onSelectTrack }: QuickStartPanelProps) {
  const trackNotes: Record<StrategyTrack, string> = {
    launch: "Senior SWE: optimize architecture decisions, ownership clarity, and measurable impact.",
    depth: "PM L6: optimize strategy framing, prioritization logic, and executive communication.",
    stealth: "Campus SDE: optimize structured answers, fundamentals, and execution confidence.",
    enterprise: "Interview Program: optimize consistency, auditability, and evaluator trust.",
  };

  return (
    <div className="w-full max-w-[980px] p-[18px] mb-4 bg-[color-mix(in_srgb,var(--bg)_84%,transparent)] rounded-xl border border-[var(--border-subtle)] shadow-[0_12px_30px_color-mix(in_srgb,var(--bg)_45%,transparent)]">
      <div className="flex justify-between items-start gap-2">
        <div>
          <h2 className="m-0 text-2xl text-[var(--text-primary)]">Start 60-Second Calibration</h2>
          <p className="mt-1.5 mb-0 text-[var(--text-muted)] text-sm">Get baseline, confidence band, and next-best action in one pass.</p>
        </div>
        <button className="border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-primary)] rounded-[10px] py-2 px-3 cursor-pointer font-semibold" onClick={onDismiss}>Dismiss</button>
      </div>

      <div className="mt-3 bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] border border-[var(--border-subtle)] rounded-xl py-2.5 px-3 text-[var(--text-primary)] font-semibold text-[13px]">
        This is not script generation. This is interview performance control.
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <div className="text-[var(--text-primary)] font-extrabold text-[13px]">1) Choose Candidate Profile</div>
        <div className="flex gap-2 flex-wrap">
          {([
            { id: "launch", label: "Senior SWE" },
            { id: "depth", label: "PM L6" },
            { id: "stealth", label: "Campus SDE" },
            { id: "enterprise", label: "Interview Program" },
          ] as Array<{ id: StrategyTrack; label: string }>).map((track) => (
            <button
              key={track.id}
              onClick={() => onSelectTrack(track.id)}
              className={strategyTrack === track.id ? "border border-[var(--border-subtle)] rounded-full bg-[var(--accent)] text-[var(--bg)] py-[7px] px-3 font-bold text-xs cursor-pointer" : "border border-[var(--border-subtle)] rounded-full bg-[var(--surface-1)] text-[var(--text-muted)] py-[7px] px-3 font-bold text-xs cursor-pointer"}
            >
              {track.label}
            </button>
          ))}
        </div>
        <div className="text-[var(--text-muted)] text-xs font-semibold">{trackNotes[strategyTrack]}</div>
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-2">
        <div className="text-[var(--text-primary)] font-extrabold text-[13px]">2) Execute Calibration Flow</div>
        <div className="flex items-center gap-2.5 text-[var(--text-primary)] text-sm"><span className="w-[22px] h-[22px] rounded-full bg-[var(--accent)] text-[var(--bg)] text-xs font-bold inline-flex items-center justify-center">A</span>Answer Prompt 1 of 2 (live signal capture)</div>
        <div className="flex items-center gap-2.5 text-[var(--text-primary)] text-sm"><span className="w-[22px] h-[22px] rounded-full bg-[var(--accent)] text-[var(--bg)] text-xs font-bold inline-flex items-center justify-center">B</span>Answer Prompt 2 of 2 (pressure response check)</div>
        <div className="flex items-center gap-2.5 text-[var(--text-primary)] text-sm"><span className="w-[22px] h-[22px] rounded-full bg-[var(--accent)] text-[var(--bg)] text-xs font-bold inline-flex items-center justify-center">C</span>Receive: baseline â†’ current, confidence band, next action</div>
      </div>

      <div className="mt-3.5 flex gap-2.5 flex-wrap">
        <button className="bg-[var(--accent)] text-[var(--bg)] border border-[var(--border-subtle)] rounded-[10px] py-2.5 px-3.5 cursor-pointer font-bold" onClick={onRunFirstRound}>Start 60-Second Calibration</button>
        <button className="bg-[var(--surface-1)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-[10px] py-2.5 px-3.5 cursor-pointer font-bold" onClick={() => onPick("dashboard")}>See Confidence Envelope</button>
        <button className="bg-[var(--surface-1)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-[10px] py-2.5 px-3.5 cursor-pointer font-bold" onClick={() => onPick("resume")}>Load Resume Context</button>
        <button className="bg-[var(--surface-1)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-[10px] py-2.5 px-3.5 cursor-pointer font-bold" onClick={() => onPick("job")}>Set Target Job Scope</button>
        <button className="bg-[var(--surface-1)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-[10px] py-2.5 px-3.5 cursor-pointer font-bold" onClick={onRunDemo}>Watch 2-Minute Demo</button>
      </div>
    </div>
  );
}

