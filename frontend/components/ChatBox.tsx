"use client";
import { useState, useEffect } from "react";
import { apiRequest, apiRequestRaw } from "../lib/api";
import { getAccessTokenOrThrow } from "../lib/auth";
import StatusBanner from "./StatusBanner";
import { showToast } from "../lib/toast";

type Msg = { role: "user" | "ai"; text: string };

export default function ChatBox() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: "error" | "success" | "info"; message: string }>({
    type: "info",
    message: "",
  });

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      setStatus({ type: "info", message: "Loading chat history..." });
      const authToken = await getAccessTokenOrThrow();
      const data = await apiRequest<{ items: any[] }>("/api/chat/history?limit=80", {
        method: "GET",
        retries: 0,
        authToken,
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      setMessages(
        items.map((m: any) => ({
          role: m.role === "assistant" ? "ai" : "user",
          text: String(m.message || ""),
        }))
      );
      setStatus({ type: "success", message: "History loaded." });
    } catch (error: any) {
      setStatus({ type: "error", message: `Failed to load history: ${error?.message || "unknown error"}` });
    } finally {
      setLoadingHistory(false);
    }
  };

  // ---------- Load Chat History ----------
  useEffect(() => {
    loadHistory();
  }, []);

  // ---------- Send Message (Streaming) ----------
  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const messageText = input;
    setMessages((m) => [...m, { role: "user", text: messageText }, { role: "ai", text: "" }]);
    setInput("");

    try {
      setSending(true);
      setStatus({ type: "info", message: "Generating answer..." });
      const authToken = await getAccessTokenOrThrow();

      const res = await apiRequestRaw("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        authToken,
        body: JSON.stringify({ message: messageText }),
        timeoutMs: 25000,
        retries: 1,
      });

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response stream received");
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        setMessages((m) => {
          const updated = [...m];
          updated[updated.length - 1].text += chunk;
          return updated;
        });
      }
      setStatus({ type: "success", message: "Reply received." });
    } catch (error: any) {
      const message = `Request failed: ${error?.message || "unknown error"}`;
      setMessages((m) => {
        const updated = [...m];
        updated[updated.length - 1].text = message;
        return updated;
      });
      setStatus({ type: "error", message });
      showToast({ type: "error", message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-[900px] flex justify-center items-stretch">
      <div className="w-full min-h-[calc(100vh-48px)] bg-[color-mix(in_srgb,var(--bg)_84%,transparent)] rounded-[14px] flex flex-col border border-[var(--border-subtle)] shadow-[0_14px_34px_color-mix(in_srgb,var(--bg)_45%,transparent)]">
        <div className="px-[18px] py-3.5 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]">
          <div className="text-[17px] font-extrabold text-[var(--text-primary)]">Interview Copilot</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">Live guidance grounded in your resume, job target, and performance context.</div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
          {loadingHistory && <div className="text-[var(--text-muted)] text-[13px]">Loading history...</div>}
          {!loadingHistory && messages.length === 0 && (
            <div className="rounded-[10px] border border-dashed border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg)_58%,transparent)] py-2.5 px-3 text-xs text-[var(--text-muted)]">Ask your first question to start simulation coaching.</div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "self-end bg-[var(--accent)] text-[var(--bg)] py-2.5 px-3.5 rounded-xl max-w-[75%] leading-[1.45] whitespace-pre-wrap" : "self-start bg-[var(--surface-2)] text-[var(--text-primary)] py-2.5 px-3.5 rounded-xl max-w-[75%] leading-[1.45] whitespace-pre-wrap"}>
              {m.text}
            </div>
          ))}
        </div>

        <div className="flex p-3 border-t border-[var(--border-subtle)] gap-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            className="flex-1 py-2.5 px-3 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-primary)] outline-none"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} className="bg-[var(--accent)] text-[var(--bg)] border border-[var(--border-subtle)] px-[18px] rounded-[10px] cursor-pointer font-extrabold">
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
        <div className="px-3 pb-3">
          <StatusBanner
            type={status.type}
            message={status.message}
            actionLabel={status.type === "error" ? "Retry" : undefined}
            onAction={status.type === "error" ? loadHistory : undefined}
          />
        </div>
      </div>
    </div>
  );
}

// ---------- Styles (UNCHANGED) ----------
