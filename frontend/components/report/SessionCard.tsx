"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";

/* ────────────────────────────────────────────
   SessionCard — Viral shareable interview result card
   
   Renders a branded, visually striking card showing
   session performance. Users share on LinkedIn/Twitter
   for organic growth loops.
   
   Usage:
     <SessionCard
       sessionId="abc123"
       score={82}
       role="Senior SWE"
       company="Google"
       strengths={["Technical depth", "Communication clarity"]}
       questionsAnswered={8}
       duration="32 min"
       decision="Strong Hire"
     />
──────────────────────────────────────────── */

interface SessionCardProps {
  sessionId: string;
  score: number;
  role: string;
  company?: string;
  strengths: string[];
  questionsAnswered: number;
  duration: string;
  decision?: string;
  userName?: string;
  date?: string;
}

const SCORE_COLORS = {
  high: { ring: "#00FF88", glow: "rgba(0,255,136,0.3)", label: "Excellent" },
  mid: { ring: "#FFB800", glow: "rgba(255,184,0,0.3)", label: "Good" },
  low: { ring: "#FF4466", glow: "rgba(255,68,102,0.3)", label: "Needs Work" },
} as const;

function getScoreTier(score: number) {
  if (score >= 75) return SCORE_COLORS.high;
  if (score >= 50) return SCORE_COLORS.mid;
  return SCORE_COLORS.low;
}

function ScoreRing({ score }: { score: number }) {
  const tier = getScoreTier(score);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128">
        {/* Background ring */}
        <circle
          cx="64"
          cy="64"
          r="54"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />
        {/* Score arc */}
        <motion.circle
          cx="64"
          cy="64"
          r="54"
          fill="none"
          stroke={tier.ring}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          transform="rotate(-90 64 64)"
          className="drop-shadow-lg"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-display font-bold text-txt-primary"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          {score}
        </motion.span>
        <span
          className={`text-xs font-medium mt-0.5 ${score >= 75 ? "text-brand-green" : score >= 50 ? "text-brand-amber" : "text-brand-red"}`}
        >
          {tier.label}
        </span>
      </div>
    </div>
  );
}

const STRENGTH_ICONS: Record<string, string> = {
  "Technical depth": "🔧",
  "Communication clarity": "💬",
  "Metric-backed storytelling": "📊",
  "Strong ownership framing": "🎯",
  "Trade-off reasoning": "⚖️",
};

export default function SessionCard({
  sessionId,
  score,
  role,
  company,
  strengths,
  questionsAnswered,
  duration,
  decision,
  userName,
  date,
}: SessionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/interview/public/${sessionId}`
    : "";

  const shareText = `Just completed ${
    company ? `a ${company}` : "an"
  } interview prep session — scored ${score}/100! 🎯\n\nPracticed with @InterviewGenius AI\n\n${shareUrl}`;

  function handleCopyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleShareLinkedIn() {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
  }

  function handleShareTwitter() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=500");
  }

  return (
    <motion.div
      ref={cardRef}
      className="relative w-full max-w-md mx-auto overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0D0D14] to-[#12121F]"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ boxShadow: "0 4px 60px rgba(0,0,0,0.5)" }}
    >
      {/* Gradient accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-orange" />

      {/* Header */}
      <div className="px-6 pt-5 pb-2 flex items-start justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-txt-primary">
            Interview Session
          </h3>
          <p className="text-sm text-txt-secondary mt-0.5">
            {role}
            {company ? ` @ ${company}` : ""}
          </p>
          {date && (
            <p className="text-xs text-txt-muted mt-1">{date}</p>
          )}
        </div>
        {decision && (
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide ${
              decision.toLowerCase().includes("hire")
                ? "bg-brand-green/[0.12] text-brand-green"
                : "bg-brand-amber/[0.12] text-brand-amber"
            }`}
          >
            {decision}
          </span>
        )}
      </div>

      {/* Score */}
      <div className="flex justify-center py-4">
        <ScoreRing score={score} />
      </div>

      {/* Stats row */}
      <div className="px-6 grid grid-cols-2 gap-3 py-2">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-center">
          <p className="text-2xl font-display font-bold text-txt-primary">
            {questionsAnswered}
          </p>
          <p className="text-xs text-txt-secondary mt-0.5">Questions</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-center">
          <p className="text-2xl font-display font-bold text-txt-primary">
            {duration}
          </p>
          <p className="text-xs text-txt-secondary mt-0.5">Duration</p>
        </div>
      </div>

      {/* Strengths */}
      {strengths.length > 0 && (
        <div className="px-6 py-3">
          <p className="text-xs uppercase tracking-wider text-txt-muted mb-2">
            Top Strengths
          </p>
          <div className="flex flex-wrap gap-2">
            {strengths.slice(0, 4).map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-brand-cyan/[0.08] text-brand-cyan border border-brand-cyan/20"
              >
                <span>{STRENGTH_ICONS[s] || "✦"}</span>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Share buttons */}
      <div className="px-6 pt-3 pb-5 flex items-center gap-2">
        <button
          onClick={handleShareLinkedIn}
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-[#0A66C2]/20 border border-[#0A66C2]/30 text-[#0A66C2] text-sm font-medium hover:bg-[#0A66C2]/30 transition-colors"
        >
          <LinkedInIcon />
          Share
        </button>
        <button
          onClick={handleShareTwitter}
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-white/[0.05] border border-white/[0.1] text-txt-secondary text-sm font-medium hover:bg-white/[0.08] transition-colors"
        >
          <XIcon />
          Post
        </button>
        <button
          onClick={handleCopyLink}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.1] text-txt-secondary hover:bg-white/[0.08] transition-colors"
          title="Copy link"
        >
          {copied ? (
            <CheckIcon />
          ) : (
            <LinkIcon />
          )}
        </button>
      </div>

      {/* Branding footer */}
      <div className="border-t border-white/[0.06] px-6 py-3 flex items-center justify-between">
        <span className="text-xs text-txt-muted">
          Powered by{" "}
          <span className="text-brand-cyan font-semibold">
            InterviewGenius AI
          </span>
        </span>
        {userName && (
          <span className="text-xs text-txt-muted">{userName}</span>
        )}
      </div>
    </motion.div>
  );
}

/* ── Inline SVG Icons ── */

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
