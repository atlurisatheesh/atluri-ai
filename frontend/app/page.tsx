"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import InlineToast from "../components/InlineToast";

import {
  Navbar,
  Hero,
  Features,
  HowItWorks,
  StealthShowcase,
  Integrations,
  Pricing,
  Testimonials,
  FAQ,
  CTABanner,
  Footer,
} from "../components/landing";
import { Modal } from "../components/ui";

export default function LandingPage() {
  const router = useRouter();
  const toastTimerRef = useRef<number | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [showStealthModal, setShowStealthModal] = useState(false);
  const [stealthDownloading, setStealthDownloading] = useState(false);

  const showToast = (message: string, durationMs = 1800) => {
    setToastMessage(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage("");
      toastTimerRef.current = null;
    }, durationMs);
  };

  const downloadStealthInstaller = async () => {
    if (stealthDownloading) return;
    try {
      setStealthDownloading(true);
      const response = await fetch("/api/desktop-installer");
      if (!response.ok) throw new Error(`installer_unavailable_${response.status}`);
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^\"]+)"?/i);
      const filename = filenameMatch?.[1] || "AtluriIn-Practice-Setup.exe";
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
      showToast("Installer download started.", 2600);
    } catch {
      showToast("Installer unavailable. Build desktop with npm run dist:win.", 4200);
    } finally {
      setStealthDownloading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 2500)
          ),
        ]);
        if (!mounted) return;
        if ((sessionResult as any)?.data?.session) {
          router.replace("/app");
        }
      } catch {}
    };
    run();
    return () => {
      mounted = false;
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-canvas text-textPrimary overflow-x-hidden">
      <Navbar />

      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <StealthShowcase />
        <Integrations />
        <Pricing />
        <Testimonials />
        <FAQ />
        <CTABanner />
      </main>

      <Footer />

      {/* Stealth installer modal — preserved from original */}
      <Modal
        isOpen={showStealthModal}
        onClose={() => setShowStealthModal(false)}
        title="Install Stealth Mode"
      >
        <p className="text-sm leading-relaxed text-textMuted mb-6">
          This will download the AtluriIn Desktop installer (.exe) for Windows.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowStealthModal(false)}
            disabled={stealthDownloading}
            className="rounded-lg bg-white/[0.04] border border-white/[0.08] px-4 py-2 text-sm text-textMuted hover:text-textPrimary transition cursor-pointer"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => {
              setShowStealthModal(false);
              void downloadStealthInstaller();
            }}
            disabled={stealthDownloading}
            className="rounded-lg bg-gradient-to-r from-brand-cyan to-brand-purple px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 cursor-pointer"
          >
            {stealthDownloading ? "Downloading\u2026" : "Download .exe"}
          </button>
        </div>
      </Modal>

      <InlineToast message={toastMessage} />
    </div>
  );
}
