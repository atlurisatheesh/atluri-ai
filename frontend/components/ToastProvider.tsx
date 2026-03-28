"use client";

import { useEffect, useState } from "react";
import type { TestimonialPromptPayload, ToastPayload, ToastType } from "../lib/toast";

type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
};

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [testimonialPrompt, setTestimonialPrompt] = useState<{ message: string; cycleKey: string } | null>(null);

  useEffect(() => {
    const onToast = (event: Event) => {
      const custom = event as CustomEvent<ToastPayload>;
      const detail = custom.detail;
      if (!detail?.message) return;

      const id = Date.now() + Math.floor(Math.random() * 1000);
      const duration = Math.max(1200, detail.durationMs ?? 2600);

      setToasts((prev) => [...prev, { id, type: detail.type || "info", message: detail.message }]);

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, duration);
    };

    window.addEventListener("app-toast", onToast as EventListener);
    return () => window.removeEventListener("app-toast", onToast as EventListener);
  }, []);

  useEffect(() => {
    const onTestimonialPrompt = (event: Event) => {
      const custom = event as CustomEvent<TestimonialPromptPayload>;
      const detail = custom.detail;
      const message = String(detail?.message || "").trim();
      if (!message) return;
      const cycleKey = String(detail?.cycleKey || "default").trim() || "default";
      const dismissedKey = `atluriin.testimonial.dismissed.${cycleKey}`;
      try {
        if (window.sessionStorage.getItem(dismissedKey) === "1") {
          return;
        }
      } catch {
      }
      setTestimonialPrompt({ message, cycleKey });
    };

    window.addEventListener("app-testimonial-prompt", onTestimonialPrompt as EventListener);
    return () => window.removeEventListener("app-testimonial-prompt", onTestimonialPrompt as EventListener);
  }, []);

  const dismissTestimonialPrompt = () => {
    if (!testimonialPrompt) return;
    try {
      window.sessionStorage.setItem(`atluriin.testimonial.dismissed.${testimonialPrompt.cycleKey}`, "1");
    } catch {
    }
    setTestimonialPrompt(null);
  };

  const shareTestimonial = () => {
    try {
      window.open("https://www.linkedin.com/feed/?shareActive=true", "_blank", "noopener,noreferrer");
    } catch {
    }
    dismissTestimonialPrompt();
  };

  const toneClasses: Record<ToastType, string> = {
    success: "text-[#065f46] border-[#a7f3d0] bg-[#ecfdf5]",
    error: "text-[#991b1b] border-[#fecaca] bg-[#fef2f2]",
    info: "text-[#1d4ed8] border-[#bfdbfe] bg-[#eff6ff]",
  };

  return (
    <>
      {children}
      <div className="fixed top-3.5 right-3.5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className={`min-w-[240px] max-w-[360px] rounded-[10px] border py-2.5 px-3 text-[13px] font-semibold leading-[1.35] shadow-[0_6px_18px_rgba(15,23,42,0.12)] ${toneClasses[toast.type]}`}>
            {toast.message}
          </div>
        ))}
      </div>
      {testimonialPrompt ? (
        <div className="fixed right-3.5 bottom-3.5 w-80 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] shadow-[0_12px_26px_rgba(15,23,42,0.18)] p-3 z-[9999]">
          <div className="text-[#065f46] font-extrabold text-[13px]">Share your improvement</div>
          <div className="mt-1.5 text-[#065f46] text-xs leading-[1.45] font-semibold">{testimonialPrompt.message}</div>
          <div className="mt-2.5 flex justify-end gap-2">
            <button className="border border-[#86efac] bg-transparent text-[#166534] rounded-lg py-1.5 px-2.5 text-xs font-bold cursor-pointer" onClick={dismissTestimonialPrompt}>Later</button>
            <button className="border border-[#059669] bg-[#059669] text-[#ecfdf5] rounded-lg py-1.5 px-2.5 text-xs font-bold cursor-pointer" onClick={shareTestimonial}>I&apos;ll share</button>
          </div>
        </div>
      ) : null}
    </>
  );
}

