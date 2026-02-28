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
    <div style={styles.wrap}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Start 60-Second Calibration</h2>
          <p style={styles.subtitle}>Get baseline, confidence band, and next-best action in one pass.</p>
        </div>
        <button style={styles.skipButton} onClick={onDismiss}>Dismiss</button>
      </div>

      <div style={styles.positioning}>
        This is not script generation. This is interview performance control.
      </div>

      <div style={styles.trackSection}>
        <div style={styles.sectionTitle}>1) Choose Candidate Profile</div>
        <div style={styles.trackRow}>
          {([
            { id: "launch", label: "Senior SWE" },
            { id: "depth", label: "PM L6" },
            { id: "stealth", label: "Campus SDE" },
            { id: "enterprise", label: "Interview Program" },
          ] as Array<{ id: StrategyTrack; label: string }>).map((track) => (
            <button
              key={track.id}
              onClick={() => onSelectTrack(track.id)}
              style={strategyTrack === track.id ? styles.trackButtonActive : styles.trackButton}
            >
              {track.label}
            </button>
          ))}
        </div>
        <div style={styles.trackHint}>{trackNotes[strategyTrack]}</div>
      </div>

      <div style={styles.steps}>
        <div style={styles.sectionTitle}>2) Execute Calibration Flow</div>
        <div style={styles.step}><span style={styles.badge}>A</span>Answer Prompt 1 of 2 (live signal capture)</div>
        <div style={styles.step}><span style={styles.badge}>B</span>Answer Prompt 2 of 2 (pressure response check)</div>
        <div style={styles.step}><span style={styles.badge}>C</span>Receive: baseline → current, confidence band, next action</div>
      </div>

      <div style={styles.actions}>
        <button style={styles.primary} onClick={onRunFirstRound}>Start 60-Second Calibration</button>
        <button style={styles.secondary} onClick={() => onPick("dashboard")}>See Confidence Envelope</button>
        <button style={styles.secondary} onClick={() => onPick("resume")}>Load Resume Context</button>
        <button style={styles.secondary} onClick={() => onPick("job")}>Set Target Job Scope</button>
        <button style={styles.secondary} onClick={onRunDemo}>Watch 2-Minute Demo</button>
      </div>
    </div>
  );
}

const styles: any = {
  wrap: {
    width: "100%",
    maxWidth: 980,
    padding: 18,
    marginBottom: 16,
    background: "color-mix(in srgb, var(--bg) 84%, transparent)",
    borderRadius: 12,
    border: "1px solid var(--border-subtle)",
    boxShadow: "0 12px 30px color-mix(in srgb, var(--bg) 45%, transparent)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    margin: 0,
    fontSize: 24,
    color: "var(--text-primary)",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 0,
    color: "var(--text-muted)",
    fontSize: 14,
  },
  positioning: {
    marginTop: 12,
    background: "color-mix(in srgb, var(--accent) 14%, transparent)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 12,
    padding: "10px 12px",
    color: "var(--text-primary)",
    fontWeight: 600,
    fontSize: 13,
  },
  sectionTitle: {
    color: "var(--text-primary)",
    fontWeight: 800,
    fontSize: 13,
  },
  trackSection: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  trackRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  trackButton: {
    border: "1px solid var(--border-subtle)",
    borderRadius: 999,
    background: "var(--surface-1)",
    color: "var(--text-muted)",
    padding: "7px 12px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  },
  trackButtonActive: {
    border: "1px solid var(--border-subtle)",
    borderRadius: 999,
    background: "var(--accent)",
    color: "var(--bg)",
    padding: "7px 12px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  },
  trackHint: {
    color: "var(--text-muted)",
    fontSize: 12,
    fontWeight: 600,
  },
  skipButton: {
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-1)",
    color: "var(--text-primary)",
    borderRadius: 10,
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 600,
  },
  steps: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 8,
  },
  step: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "var(--text-primary)",
    fontSize: 14,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 999,
    background: "var(--accent)",
    color: "var(--bg)",
    fontSize: 12,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    marginTop: 14,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  primary: {
    background: "var(--accent)",
    color: "var(--bg)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  secondary: {
    background: "var(--surface-1)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
};
