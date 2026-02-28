"use client";

import { useState } from "react";
import { apiRequest } from "../lib/api";
import { getAccessTokenOrThrow } from "../lib/auth";
import StatusBanner from "./StatusBanner";

type RewriteAction = "improve" | "quantify" | "leadership" | "reduce_fluff";

const actionLabels: Record<RewriteAction, string> = {
  improve: "Improve this bullet",
  quantify: "Quantify impact",
  leadership: "Leadership rewrite",
  reduce_fluff: "Reduce fluff",
};

const actionInstructions: Record<RewriteAction, string> = {
  improve: "Rewrite this resume bullet to be clearer, stronger, and interview-ready. Keep it concise and realistic.",
  quantify: "Rewrite this resume bullet to include measurable outcomes and realistic numbers where appropriate. If exact numbers are unknown, suggest placeholders.",
  leadership: "Rewrite this bullet to emphasize ownership, leadership, decision-making, and collaboration.",
  reduce_fluff: "Rewrite this bullet to remove fluff and vague claims. Make it concrete and credible.",
};

export default function ResumeRewriteAssistant() {
  const [bullet, setBullet] = useState("");
  const [rewritten, setRewritten] = useState("");
  const [loadingAction, setLoadingAction] = useState<RewriteAction | null>(null);
  const [status, setStatus] = useState<{ type: "error" | "success" | "info"; message: string }>({
    type: "info",
    message: "",
  });

  const runRewrite = async (action: RewriteAction) => {
    const source = bullet.trim();
    if (!source) {
      setStatus({ type: "error", message: "Paste a resume bullet first." });
      return;
    }

    try {
      setLoadingAction(action);
      setStatus({ type: "info", message: `${actionLabels[action]} in progress...` });

      const authToken = await getAccessTokenOrThrow();
      const prompt = [
        actionInstructions[action],
        "Output format:",
        "1) Rewritten bullet (single line)",
        "2) Why this is better (one short sentence)",
        "Original bullet:",
        source,
      ].join("\n");

      const data = await apiRequest<{ reply?: string }>("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
        retries: 1,
        timeoutMs: 20000,
        authToken,
      });

      const answer = String(data?.reply || "").trim();
      if (!answer) {
        throw new Error("No rewrite response received.");
      }

      setRewritten(answer);
      setStatus({ type: "success", message: "Rewrite ready." });
    } catch (error: any) {
      setStatus({ type: "error", message: `Rewrite failed: ${error?.message || "unknown error"}` });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>Resume Rewrite Assistant</div>
      <div style={styles.subheader}>Paste one bullet and choose a rewrite style.</div>

      <div style={styles.label}>Resume Bullet</div>

      <textarea
        value={bullet}
        onChange={(e) => setBullet(e.target.value)}
        placeholder="Example: Worked on API improvements for customer platform."
        style={styles.input}
      />

      <div style={styles.actions}>
        {(Object.keys(actionLabels) as RewriteAction[]).map((action) => (
          <button
            key={action}
            onClick={() => runRewrite(action)}
            disabled={Boolean(loadingAction)}
            style={loadingAction === action ? styles.actionButtonActive : styles.actionButton}
          >
            {loadingAction === action ? "Working..." : actionLabels[action]}
          </button>
        ))}
      </div>

      {rewritten && (
        <div style={styles.outputCard}>
          <div style={styles.outputTitle}>Suggested rewrite</div>
          <pre style={styles.outputText}>{rewritten}</pre>
        </div>
      )}

      <StatusBanner type={status.type} message={status.message} />
    </div>
  );
}

const styles: any = {
  card: {
    marginTop: 16,
    border: "1px solid #e4e7ec",
    borderRadius: 14,
    padding: 16,
    background: "#fff",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  header: {
    fontSize: 16,
    fontWeight: 800,
    color: "#0a66c2",
  },
  subheader: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 13,
    color: "#64748b",
  },
  label: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "#334155",
  },
  input: {
    width: "100%",
    minHeight: 90,
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    resize: "vertical" as const,
    outline: "none",
    background: "#fff",
  },
  actions: {
    marginTop: 10,
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
    marginBottom: 2,
  },
  actionButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#1f2937",
    borderRadius: 999,
    padding: "7px 11px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  actionButtonActive: {
    border: "1px solid #0a66c2",
    background: "#0a66c2",
    color: "#fff",
    borderRadius: 999,
    padding: "7px 11px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  outputCard: {
    marginTop: 12,
    border: "1px solid #dbeafe",
    borderRadius: 10,
    padding: "10px 11px",
    background: "#eff6ff",
  },
  outputTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: "#1e3a8a",
    marginBottom: 6,
  },
  outputText: {
    margin: 0,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
    fontSize: 13,
    lineHeight: 1.45,
    color: "#1f2937",
  },
};
