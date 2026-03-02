"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import InlineToast from "../components/InlineToast";

const coreOutcomeBullets = [
  "Know what to change before it counts.",
  "Walk in focused, not scattered.",
];

const mechanismSteps = [
  {
    title: "Practice",
    detail: "Run a focused mock round.",
  },
  {
    title: "Review",
    detail: "See one clear read of your performance.",
  },
  {
    title: "Adjust",
    detail: "Apply the next move and repeat.",
  },
];

const mutedLogos = ["ScaleUp", "Northgate", "Aster", "Meridian"];

export default function LandingPage() {
  const router = useRouter();
  const toastTimerRef = useRef<number | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [showStealthModal, setShowStealthModal] = useState(false);
  const [stealthDownloading, setStealthDownloading] = useState(false);
  const [isWindowsClient, setIsWindowsClient] = useState(true);

  const showCtaToast = () => {
    setToastMessage("Opening signup...");
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage("");
      toastTimerRef.current = null;
    }, 1400);
  };

  const showToast = (message: string, durationMs = 1800) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
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
      if (!response.ok) {
        throw new Error(`installer_unavailable_${response.status}`);
      }
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
    if (typeof navigator === "undefined") return;
    setIsWindowsClient(/Windows/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2500)),
        ]);
        if (!mounted) return;
        if ((sessionResult as any)?.data?.session) {
          router.replace("/app");
        }
      } catch {
      }
    };

    run();
    return () => {
      mounted = false;
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-transparent text-textPrimary">
      <header className="mx-auto flex w-full max-w-[1100px] items-center px-6 py-8 lg:px-8">
        <div className="text-base font-semibold tracking-[0.01em] text-textPrimary">AtluriIn</div>
      </header>

      <main className="mx-auto flex w-full max-w-[1100px] flex-col px-6 lg:px-8">
        <section className="grid gap-10 py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:py-32">
          <div className="space-y-9">
            <p className="text-sm text-textMuted">Interview Performance OS</p>
            <h1 className="max-w-[14ch] text-6xl font-semibold leading-[0.98] tracking-[-0.03em] text-textPrimary lg:text-7xl">
              Interviews feel hard
              <br />
              when feedback is vague.
            </h1>
            <p className="max-w-[44ch] text-lg leading-relaxed text-textMuted">
              You leave rounds guessing what landed.
              <br />
              AtluriIn gives you one clear next move.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/signup?next=/app" onClick={showCtaToast} className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-canvas transition duration-180 ease-calm hover:bg-accentHover">
                Start Free
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isWindowsClient) {
                      showToast("Stealth desktop is currently Windows only.", 3200);
                      return;
                    }
                    setShowStealthModal(true);
                  }}
                  className="text-sm text-textMuted transition duration-180 ease-calm hover:text-textPrimary"
                >
                  Install Stealth Desktop
                </button>
                <span className="text-xs text-textMuted/85">
                  {isWindowsClient ? "Windows only" : "Not available on this OS"}
                </span>
              </div>
            </div>
          </div>

          <div className="h-full rounded-md border border-borderSubtle bg-surface/70 p-8 backdrop-blur-sm">
            <div className="space-y-5">
              <p className="text-sm text-textMuted">Preview</p>
              <div className="h-px w-full bg-borderSubtle" />
              <div className="space-y-3">
                <p className="text-sm text-textPrimary">One round</p>
                <p className="text-sm text-textMuted">One read</p>
                <p className="text-sm text-textMuted">One next step</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-10 py-20 lg:grid-cols-[1fr_1fr] lg:items-start lg:py-28">
          <div className="space-y-6">
            <h2 className="text-4xl font-semibold tracking-[-0.02em] text-textPrimary">Know where you stand before it counts.</h2>
            <p className="max-w-[44ch] text-lg leading-relaxed text-textMuted">
              You prepare with direction, not noise.
            </p>
            <ul className="space-y-3 text-lg text-textSecondary">
              {coreOutcomeBullets.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-borderSubtle bg-surface/70 p-8 backdrop-blur-sm">
            <p className="text-sm text-textMuted">Visual</p>
            <p className="mt-4 max-w-[32ch] text-lg text-textSecondary">A clean timeline from first attempt to confident delivery.</p>
          </div>
        </section>

        <section className="grid gap-10 py-20 lg:grid-cols-[1fr_1fr] lg:items-start lg:py-28">
          <div className="space-y-6">
            <h2 className="text-4xl font-semibold tracking-[-0.02em] text-textPrimary">Practice. Review. Adjust.</h2>
            <p className="max-w-[44ch] text-lg leading-relaxed text-textMuted">Three steps. Repeat until it feels controlled.</p>
          </div>
          <ol className="space-y-6">
            {mechanismSteps.map((step, index) => (
              <li key={step.title} className="space-y-2">
                <p className="text-sm text-textMuted">0{index + 1}</p>
                <p className="text-lg font-medium text-textPrimary">{step.title}</p>
                <p className="text-lg text-textMuted">{step.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-10 py-20 lg:grid-cols-[1fr_1fr] lg:items-start lg:py-28">
          <div className="space-y-6">
            <h2 className="text-4xl font-semibold tracking-[-0.02em] text-textPrimary">Trusted by candidates who take prep seriously.</h2>
            <p className="max-w-[44ch] text-lg leading-relaxed text-textMuted">Quiet product. Serious outcomes.</p>
          </div>
          <div className="space-y-7">
            <blockquote className="max-w-[40ch] text-lg leading-relaxed text-textSecondary">
              “This is the first prep product that made me feel in control, not overwhelmed.”
            </blockquote>
            <p className="text-sm text-textMuted">Senior candidate</p>
            <div className="flex flex-wrap gap-6 text-sm text-textMuted/85">
              {mutedLogos.map((logo) => (
                <span key={logo}>{logo}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-8 py-20 lg:grid-cols-[1fr_auto] lg:items-end lg:py-28">
          <div className="space-y-4">
            <h2 className="text-4xl font-semibold tracking-[-0.02em] text-textPrimary">Start your first focused round.</h2>
            <p className="max-w-[40ch] text-lg leading-relaxed text-textMuted">Stop guessing. Start preparing with control.</p>
          </div>
          <Link href="/signup?next=/app" onClick={showCtaToast} className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-canvas transition duration-180 ease-calm hover:bg-accentHover">
            Start Free
          </Link>
        </section>
      </main>

      {showStealthModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-canvas/55 p-4"
          onClick={() => setShowStealthModal(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-xl border border-borderSubtle bg-surface/95 p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-base font-semibold text-textPrimary">Install Stealth Mode locally?</div>
            <p className="mt-2 text-sm leading-relaxed text-textMuted">
              This will download the AtluriIn Desktop installer (.exe) for Windows.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowStealthModal(false)}
                disabled={stealthDownloading}
                className="rounded-md bg-surface px-3 py-2 text-xs text-textMuted transition duration-180 ease-calm hover:text-textPrimary"
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
                className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-canvas transition duration-180 ease-calm hover:bg-accentHover"
              >
                {stealthDownloading ? "Downloading..." : "Download .exe"}
              </button>
            </div>
          </div>
        </div>
      )}

      <InlineToast message={toastMessage} />
    </div>
  );
}
