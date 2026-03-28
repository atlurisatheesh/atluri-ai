"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Radio } from "lucide-react";
import { Navbar, Footer } from "@/components/landing";

type CtaLink = {
  label: string;
  href: string;
};

type PanelRow = {
  label: string;
  value: string;
};

type SignalPageShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  chips?: string[];
  primaryCta?: CtaLink;
  secondaryCta?: CtaLink;
  panelTitle: string;
  panelRows: PanelRow[];
  children: ReactNode;
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.45, delay },
});

export default function SignalPageShell({
  eyebrow,
  title,
  subtitle,
  chips = [],
  primaryCta,
  secondaryCta,
  panelTitle,
  panelRows,
  children,
}: SignalPageShellProps) {
  return (
    <div className="min-h-screen bg-canvas text-textPrimary">
      <Navbar />

      <main className="relative overflow-hidden pt-28">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-cyan/20 blur-3xl" />
          <div className="absolute top-20 -left-24 h-80 w-80 rounded-full bg-brand-green/10 blur-3xl" />
          <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-brand-purple/15 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:42px_42px]" />
        </div>

        <section className="relative px-6 pb-14">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.25fr_0.9fr]">
            <motion.div {...fadeUp()}>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-brand-cyan">
                <Radio className="h-3.5 w-3.5" />
                {eyebrow}
              </p>
              <h1 className="mb-4 font-heading text-4xl font-bold leading-tight md:text-5xl">{title}</h1>
              <p className="max-w-2xl text-base leading-relaxed text-textSecondary">{subtitle}</p>

              {(primaryCta || secondaryCta) && (
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {primaryCta && (
                    <Link
                      href={primaryCta.href}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-green via-brand-cyan to-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-neon transition hover:scale-[1.02]"
                    >
                      {primaryCta.label}
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  )}
                  {secondaryCta && (
                    <Link
                      href={secondaryCta.href}
                      className="rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm text-textSecondary transition hover:text-textPrimary"
                    >
                      {secondaryCta.label}
                    </Link>
                  )}
                </div>
              )}

              {chips.length > 0 && (
                <div className="mt-7 flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-textMuted"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.aside
              {...fadeUp(0.05)}
              className="relative overflow-hidden rounded-3xl border border-white/15 bg-black/50 p-5 backdrop-blur-xl"
            >
              <div className="absolute right-4 top-4 h-28 w-28 rounded-full bg-brand-cyan/20 blur-2xl" />
              <p className="mb-4 text-xs uppercase tracking-[0.18em] text-brand-green">{panelTitle}</p>
              <div className="space-y-3">
                {panelRows.map((row) => (
                  <div key={row.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-textMuted">{row.label}</p>
                    <p className="mt-1 text-sm font-semibold text-textPrimary">{row.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/3 animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(0,212,255,0.8),transparent)] bg-[length:180%_100%]" />
              </div>
            </motion.aside>
          </div>
        </section>

        <div className="relative px-6 pb-24">
          <div className="mx-auto max-w-6xl space-y-10">{children}</div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

type SignalSectionProps = {
  kicker: string;
  title: string;
  children: ReactNode;
};

export function SignalSection({ kicker, title, children }: SignalSectionProps) {
  return (
    <motion.section {...fadeUp()} className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
      <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-brand-amber">{kicker}</p>
      <h2 className="mb-4 text-2xl font-bold font-heading">{title}</h2>
      {children}
    </motion.section>
  );
}

type SignalCardProps = {
  title: string;
  body: string;
  tone?: "cyan" | "green" | "purple" | "amber";
};

const toneClasses: Record<NonNullable<SignalCardProps["tone"]>, string> = {
  cyan: "border-brand-cyan/30",
  green: "border-brand-green/30",
  purple: "border-brand-purple/30",
  amber: "border-brand-amber/30",
};

export function SignalCard({ title, body, tone = "cyan" }: SignalCardProps) {
  return (
    <div className={`rounded-2xl border bg-black/30 p-4 ${toneClasses[tone]}`}>
      <h3 className="text-sm font-semibold text-textPrimary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-textSecondary">{body}</p>
    </div>
  );
}
