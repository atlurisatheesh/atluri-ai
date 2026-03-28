"use client";

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
    const routes: Record<string, string> = { resume: "/resume", job: "/dashboard", interview: "/interview" };
    router.push(routes[targetMode] || "/dashboard");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] px-[clamp(14px,2.5vw,36px)] pt-5 pb-9">
      <div className="max-w-[980px] mx-auto flex flex-col gap-[18px]">
        <header className="flex justify-between items-center">
          <div className="text-xl font-bold">AtluriIn</div>
          <div className="flex gap-3">
            <Link href="/" className="no-underline text-[var(--text-muted)] text-[13px]">Home</Link>
            <Link href="/dashboard" className="no-underline text-[var(--text-muted)] text-[13px]">App</Link>
          </div>
        </header>

        <section className="pt-4 flex flex-col gap-2">
          <div className="text-xs uppercase tracking-[0.1em] text-[var(--text-muted)]">Two-Minute Simulation</div>
          <h1 className="m-0 text-[clamp(32px,6vw,58px)] leading-[1.03] tracking-[-0.8px]">Watch the decision engine work.</h1>
          <p className="m-0 text-[var(--text-muted)] text-[15px]">Question. Signal. Trajectory. Next move.</p>
          <div className="mt-1.5 flex gap-2.5">
            <button className="border-0 rounded-[9px] bg-[var(--surface-2)] text-[var(--text-primary)] py-2.5 px-[13px] cursor-pointer font-semibold" onClick={runDemo} disabled={running}>{running ? "Running" : "Start Demo"}</button>
            <button className="border-0 rounded-[9px] bg-[var(--surface-1)] text-[var(--text-muted)] py-2.5 px-[13px] cursor-pointer" onClick={resetDemo}>Reset</button>
          </div>
        </section>

        <section className="border-t border-b border-[var(--border-subtle)] py-2.5">
          {visibleEvents.length === 0 && <div className="text-[var(--text-muted)] text-[13px] py-2">Start demo to run the full signal loop.</div>}
          {visibleEvents.map((event) => (
            <div key={event.id} className="grid grid-cols-[110px_1fr] gap-2.5 py-[7px]">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">{event.type}</span>
              <span className="text-[13px] text-[var(--text-primary)]">{event.text}</span>
            </div>
          ))}
        </section>

        {complete && (
          <section className="bg-[var(--surface-1)] rounded-[10px] p-[13px] flex flex-col gap-2">
            <div className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Demo Verdict</div>
            <div className="text-sm leading-[1.45]">Signal improved through measurable ownership and tighter structure.</div>
            <div className="flex gap-2 flex-wrap">
              <button className="border-0 rounded-[9px] bg-[var(--surface-2)] text-[var(--text-primary)] py-2.5 px-[13px] cursor-pointer font-semibold" onClick={() => openRealFlow("resume")}>Upload Resume</button>
              <button className="border-0 rounded-[9px] bg-[var(--surface-1)] text-[var(--text-muted)] py-2.5 px-[13px] cursor-pointer" onClick={() => openRealFlow("job")}>Set Role</button>
              <button className="border-0 rounded-[9px] bg-[var(--surface-1)] text-[var(--text-muted)] py-2.5 px-[13px] cursor-pointer" onClick={() => openRealFlow("interview")}>Run Session</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

