"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type DemoEvent = {
  id: string;
  t: number;
  type: "question" | "stream" | "assist" | "emotion" | "score" | "report";
  text: string;
};

const DEMO_EVENTS: DemoEvent[] = [
  { id: "e1", t: 0, type: "question", text: "Interviewer: Tell me about a system you scaled under load." },
  { id: "e2", t: 1, type: "stream", text: "Answer stream: context and constraints." },
  { id: "e3", t: 2, type: "assist", text: "Assist: add measurable impact." },
  { id: "e4", t: 3, type: "emotion", text: "Pressure spike: trade-off and failure-mode challenge." },
  { id: "e5", t: 4, type: "stream", text: "Answer stream: ownership, metrics, decision." },
  { id: "e6", t: 5, type: "score", text: "Signal update: credibility up, drift down." },
  { id: "e7", t: 6, type: "report", text: "Report generated: trajectory and next move ready." },
];

export default function DemoPage() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [timer, setTimer] = useState<number | null>(null);

  const visibleEvents = useMemo(() => DEMO_EVENTS.filter((event) => event.t <= tick), [tick]);
  const complete = tick >= DEMO_EVENTS[DEMO_EVENTS.length - 1].t;

  const runDemo = () => {
    if (running) return;
    setRunning(true);
    setTick(0);

    const id = window.setInterval(() => {
      setTick((current) => {
        const next = current + 1;
        if (next >= DEMO_EVENTS[DEMO_EVENTS.length - 1].t) {
          window.clearInterval(id);
          setRunning(false);
          setTimer(null);
          return DEMO_EVENTS[DEMO_EVENTS.length - 1].t;
        }
        return next;
      });
    }, 1200);

    setTimer(id);
  };

  const resetDemo = () => {
    if (timer !== null) {
      window.clearInterval(timer);
      setTimer(null);
    }
    setRunning(false);
    setTick(0);
  };

  const openRealFlow = (targetMode: "resume" | "job" | "interview") => {
    router.push(`/app?mode=${encodeURIComponent(targetMode)}&from_demo=1`);
  };

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <header style={styles.header}>
          <div style={styles.brand}>AtluriIn</div>
          <div style={styles.links}>
            <Link href="/" style={styles.link}>Home</Link>
            <Link href="/app" style={styles.link}>App</Link>
          </div>
        </header>

        <section style={styles.hero}>
          <div style={styles.kicker}>Two-Minute Simulation</div>
          <h1 style={styles.title}>Watch the decision engine work.</h1>
          <p style={styles.subtitle}>Question. Signal. Trajectory. Next move.</p>
          <div style={styles.actions}>
            <button style={styles.primary} onClick={runDemo} disabled={running}>{running ? "Running" : "Start Demo"}</button>
            <button style={styles.secondary} onClick={resetDemo}>Reset</button>
          </div>
        </section>

        <section style={styles.timeline}>
          {visibleEvents.length === 0 && <div style={styles.empty}>Start demo to run the full signal loop.</div>}
          {visibleEvents.map((event) => (
            <div key={event.id} style={styles.eventRow}>
              <span style={styles.eventType}>{event.type}</span>
              <span style={styles.eventText}>{event.text}</span>
            </div>
          ))}
        </section>

        {complete && (
          <section style={styles.result}>
            <div style={styles.resultTitle}>Demo Verdict</div>
            <div style={styles.resultText}>Signal improved through measurable ownership and tighter structure.</div>
            <div style={styles.resultActions}>
              <button style={styles.primary} onClick={() => openRealFlow("resume")}>Upload Resume</button>
              <button style={styles.secondary} onClick={() => openRealFlow("job")}>Set Role</button>
              <button style={styles.secondary} onClick={() => openRealFlow("interview")}>Run Session</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text-primary)",
    padding: "20px clamp(14px, 2.5vw, 36px) 36px",
  },
  wrap: {
    maxWidth: 980,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    fontSize: 20,
    fontWeight: 700,
  },
  links: {
    display: "flex",
    gap: 12,
  },
  link: {
    textDecoration: "none",
    color: "var(--text-muted)",
    fontSize: 13,
  },
  hero: {
    paddingTop: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  kicker: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "var(--text-muted)",
  },
  title: {
    margin: 0,
    fontSize: "clamp(32px, 6vw, 58px)",
    lineHeight: 1.03,
    letterSpacing: -0.8,
  },
  subtitle: {
    margin: 0,
    color: "var(--text-muted)",
    fontSize: 15,
  },
  actions: {
    marginTop: 6,
    display: "flex",
    gap: 10,
  },
  primary: {
    border: 0,
    borderRadius: 9,
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    padding: "10px 13px",
    cursor: "pointer",
    fontWeight: 600,
  },
  secondary: {
    border: 0,
    borderRadius: 9,
    background: "var(--surface-1)",
    color: "var(--text-muted)",
    padding: "10px 13px",
    cursor: "pointer",
  },
  timeline: {
    borderTop: "1px solid var(--border-subtle)",
    borderBottom: "1px solid var(--border-subtle)",
    padding: "10px 0",
  },
  eventRow: {
    display: "grid",
    gridTemplateColumns: "110px 1fr",
    gap: 10,
    padding: "7px 0",
  },
  eventType: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-muted)",
  },
  eventText: {
    fontSize: 13,
    color: "var(--text-primary)",
  },
  empty: {
    color: "var(--text-muted)",
    fontSize: 13,
    padding: "8px 0",
  },
  result: {
    background: "var(--surface-1)",
    borderRadius: 10,
    padding: "13px 13px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  resultTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-muted)",
  },
  resultText: {
    fontSize: 14,
    lineHeight: 1.45,
  },
  resultActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
};
