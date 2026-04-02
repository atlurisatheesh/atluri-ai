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
  DemoVideos,
  FeatureDeepDive,
  ResumeCallout,
  Integrations,
  Pricing,
  Testimonials,
  FAQ,
  CreatorSection,
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

  const downloadStealthInstaller = () => {
    window.open(
      "https://github.com/atlurisatheesh/atluri-ai/releases/download/atluri-ai/AtluriIn.Practice-0.1.0-Setup.exe",
      "_blank",
    );
    showToast("Installer download started.", 2600);
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
          router.replace("/dashboard");
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
        <DemoVideos />
        <FeatureDeepDive />
        <ResumeCallout />
        <Integrations />
        <Pricing />
        <Testimonials />
        <FAQ />
        <CreatorSection />
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
