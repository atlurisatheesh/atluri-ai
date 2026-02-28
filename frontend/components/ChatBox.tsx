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
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerWrap}>
          <div style={styles.header}>Interview Copilot</div>
          <div style={styles.headerSub}>Live guidance grounded in your resume, job target, and performance context.</div>
        </div>

        <div style={styles.chat}>
          {loadingHistory && <div style={styles.loadingText}>Loading history...</div>}
          {!loadingHistory && messages.length === 0 && (
            <div style={styles.emptyState}>Ask your first question to start simulation coaching.</div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={m.role === "user" ? styles.user : styles.ai}>
              {m.text}
            </div>
          ))}
        </div>

        <div style={styles.inputBox}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            style={styles.input}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} style={styles.button}>
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
        <div style={{ padding: "0 12px 12px" }}>
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
const styles: any = {
  page: {
    width: "100%",
    maxWidth: 900,
    display: "flex",
    justifyContent: "center",
    alignItems: "stretch",
  },
  container: {
    width: "100%",
    minHeight: "calc(100vh - 48px)",
    background: "color-mix(in srgb, var(--bg) 84%, transparent)",
    borderRadius: 14,
    display: "flex",
    flexDirection: "column",
    border: "1px solid var(--border-subtle)",
    boxShadow: "0 14px 34px color-mix(in srgb, var(--bg) 45%, transparent)",
  },
  headerWrap: {
    padding: "14px 18px",
    borderBottom: "1px solid var(--border-subtle)",
    background: "color-mix(in srgb, var(--accent) 10%, transparent)",
  },
  header: {
    fontSize: 17,
    fontWeight: 800,
    color: "var(--text-primary)",
  },
  headerSub: {
    marginTop: 4,
    fontSize: 12,
    color: "var(--text-muted)",
  },
  chat: {
    flex: 1,
    padding: 16,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  emptyState: {
    borderRadius: 10,
    border: "1px dashed var(--border-subtle)",
    background: "color-mix(in srgb, var(--bg) 58%, transparent)",
    padding: "10px 12px",
    fontSize: 12,
    color: "var(--text-muted)",
  },
  loadingText: {
    color: "var(--text-muted)",
    fontSize: 13,
  },
  user: {
    alignSelf: "flex-end",
    background: "var(--accent)",
    color: "var(--bg)",
    padding: "10px 14px",
    borderRadius: 12,
    maxWidth: "75%",
    lineHeight: 1.45,
    whiteSpace: "pre-wrap",
  },
  ai: {
    alignSelf: "flex-start",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    padding: "10px 14px",
    borderRadius: 12,
    maxWidth: "75%",
    lineHeight: 1.45,
    whiteSpace: "pre-wrap",
  },
  inputBox: {
    display: "flex",
    padding: 12,
    borderTop: "1px solid var(--border-subtle)",
    gap: 10,
  },
  input: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-1)",
    color: "var(--text-primary)",
    outline: "none",
  },
  button: {
    background: "var(--accent)",
    color: "var(--bg)",
    border: "1px solid var(--border-subtle)",
    padding: "0 18px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 800,
  },
};
