export type ToastType = "success" | "error" | "info";

export type ToastPayload = {
  type: ToastType;
  message: string;
  durationMs?: number;
};

export type TestimonialPromptPayload = {
  message: string;
  cycleKey?: string;
};

export function showToast(payload: ToastPayload): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastPayload>("app-toast", { detail: payload }));
}

export function triggerTestimonialPrompt(payload: TestimonialPromptPayload): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<TestimonialPromptPayload>("app-testimonial-prompt", { detail: payload }));
}
