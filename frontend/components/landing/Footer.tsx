"use client";

import { Zap, Github, Twitter, Linkedin, Mail } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  Product: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Stealth Mode", href: "/stealth" },
    { label: "Company Modes", href: "/features#company-modes" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "Blog", href: "/blog" },
    { label: "Changelog", href: "/changelog" },
    { label: "Status Page", href: "/status" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
    { label: "Press Kit", href: "/press" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "GDPR", href: "/gdpr" },
  ],
};

const socials = [
  { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
  { icon: Github, href: "https://github.com", label: "GitHub" },
  { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
  { icon: Mail, href: "mailto:support@atluriin.com", label: "Email" },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-black/40">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:38px_38px]" />
      <div className="relative mx-auto max-w-7xl px-6 py-14">
        <div className="mb-10 rounded-2xl border border-white/15 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-green">Signal Footer</p>
          <p className="mt-2 text-sm text-textSecondary">Interview infrastructure for candidates who want operator-grade execution, not generic prep scripts.</p>
        </div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-green via-brand-cyan to-brand-purple">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-textPrimary">AtluriIn</span>
            </Link>
            <p className="mb-4 text-sm leading-relaxed text-textMuted">Built for high-stakes interviews where timing, signal, and confidence decide outcomes.</p>
            <div className="flex gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-textMuted transition hover:border-brand-cyan/40 hover:text-brand-cyan"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan">{heading}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-textMuted transition-colors hover:text-textPrimary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-7 md:flex-row">
          <p className="text-sm text-textMuted">&copy; {new Date().getFullYear()} AtluriIn. All rights reserved.</p>
          <p className="text-xs uppercase tracking-[0.14em] text-textMuted">Signal. Stealth. Execution.</p>
        </div>
      </div>
    </footer>
  );
}
