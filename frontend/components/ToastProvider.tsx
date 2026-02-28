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

  return (
    <>
      {children}
      <div style={styles.stack}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{ ...styles.item, ...toneStyles[toast.type] }}>
            {toast.message}
          </div>
        ))}
      </div>
      {testimonialPrompt ? (
        <div style={styles.promptWrap}>
          <div style={styles.promptTitle}>Share your improvement</div>
          <div style={styles.promptBody}>{testimonialPrompt.message}</div>
          <div style={styles.promptActions}>
            <button style={styles.promptGhostButton} onClick={dismissTestimonialPrompt}>Later</button>
            <button style={styles.promptPrimaryButton} onClick={shareTestimonial}>I’ll share</button>
          </div>
        </div>
      ) : null}
    </>
  );
}

const styles: any = {
  stack: {
    position: "fixed",
    top: 14,
    right: 14,
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    pointerEvents: "none",
  },
  item: {
    minWidth: 240,
    maxWidth: 360,
    borderRadius: 10,
    border: "1px solid",
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.35,
    boxShadow: "0 6px 18px rgba(15,23,42,0.12)",
    background: "#fff",
  },
  promptWrap: {
    position: "fixed",
    right: 14,
    bottom: 14,
    width: 320,
    borderRadius: 12,
    border: "1px solid #a7f3d0",
    background: "#ecfdf5",
    boxShadow: "0 12px 26px rgba(15, 23, 42, 0.18)",
    padding: "12px 12px",
    zIndex: 9999,
  },
  promptTitle: {
    color: "#065f46",
    fontWeight: 800,
    fontSize: 13,
  },
  promptBody: {
    marginTop: 6,
    color: "#065f46",
    fontSize: 12,
    lineHeight: 1.45,
    fontWeight: 600,
  },
  promptActions: {
    marginTop: 10,
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
  promptGhostButton: {
    border: "1px solid #86efac",
    background: "transparent",
    color: "#166534",
    borderRadius: 8,
    padding: "6px 9px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  promptPrimaryButton: {
    border: "1px solid #059669",
    background: "#059669",
    color: "#ecfdf5",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
};

const toneStyles: Record<ToastType, any> = {
  success: {
    color: "#065f46",
    borderColor: "#a7f3d0",
    background: "#ecfdf5",
  },
  error: {
    color: "#991b1b",
    borderColor: "#fecaca",
    background: "#fef2f2",
  },
  info: {
    color: "#1d4ed8",
    borderColor: "#bfdbfe",
    background: "#eff6ff",
  },
};
