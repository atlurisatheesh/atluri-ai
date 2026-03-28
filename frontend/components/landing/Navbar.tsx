"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Menu, X, Shield } from "lucide-react";
import NeonButton from "../ui/NeonButton";
import GhostButton from "../ui/GhostButton";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Stealth", href: "/stealth", highlight: true },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tick, setTick] = useState(true);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // heartbeat for the live indicator
  useEffect(() => {
    const t = setInterval(() => setTick((v) => !v), 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-black/85 backdrop-blur-xl border-b border-white/[0.07]" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center shadow-[0_0_12px_rgba(0,212,255,0.3)]">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-textPrimary hidden sm:block tracking-tight">AtluriIn</span>
          {/* live status pill */}
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-brand-green/25 bg-brand-green/5 ml-1">
            <span className={`w-1.5 h-1.5 rounded-full bg-brand-green transition-opacity duration-700 ${tick ? "opacity-100" : "opacity-30"}`} />
            <span className="text-[9px] text-brand-green font-bold tracking-[0.15em] uppercase">Live</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) =>
            link.highlight ? (
              <Link
                key={link.label}
                href={link.href}
                className="flex items-center gap-1 text-sm text-brand-green font-medium hover:text-brand-green/80 transition-colors"
              >
                <Shield className="w-3.5 h-3.5" /> {link.label}
              </Link>
            ) : (
              <a key={link.label} href={link.href} className="relative text-sm text-textMuted hover:text-textPrimary transition-colors group">
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gradient-to-r from-brand-cyan to-brand-purple group-hover:w-full transition-all duration-300" />
              </a>
            )
          )}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login"><GhostButton size="sm">Log In</GhostButton></Link>
          <Link href="/signup?next=/app"><NeonButton size="sm">Deploy Free</NeonButton></Link>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden p-2 text-textPrimary cursor-pointer" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/[0.06]"
          >
            <div className="px-6 py-6 space-y-4">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`block text-lg ${link.highlight ? "text-brand-green" : "text-textMuted"} hover:text-textPrimary`}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.highlight && <Shield className="w-4 h-4 inline mr-1.5" />}{link.label}
                </motion.a>
              ))}
              <div className="flex gap-3 pt-4">
                <Link href="/login" className="flex-1"><GhostButton size="sm" className="w-full">Log In</GhostButton></Link>
                <Link href="/signup?next=/app" className="flex-1"><NeonButton size="sm" className="w-full">Deploy Free</NeonButton></Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
