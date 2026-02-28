"use client";
import { useState } from "react";
import { apiRequest } from "../lib/api";
import StatusBanner from "./StatusBanner";
import { showToast } from "../lib/toast";
import { getAccessTokenOrThrow } from "../lib/auth";

export default function JobInput() {
  const [jd, setJd] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "error" | "success" | "info"; message: string }>({
    type: "info",
    message: "",
  });

  const submit = async () => {
    if (!jd.trim()) {
      setStatus({ type: "error", message: "Please paste a job description before saving." });
      showToast({ type: "error", message: "Please paste a job description before saving." });
      return;
    }

    const form = new FormData();
    form.append("description", jd);

    try {
      setSaving(true);
      setStatus({ type: "info", message: "Saving job description..." });
      const authToken = await getAccessTokenOrThrow();
      await apiRequest("/api/job/set", {
        method: "POST",
        body: form,
        retries: 1,
        authToken,
      });

      window.dispatchEvent(new CustomEvent("context-updated"));
      setStatus({ type: "success", message: "Job description saved." });
      showToast({ type: "success", message: "Job description saved." });
    } catch (error: any) {
      const message = `Failed to save job description: ${error?.message || "unknown error"}`;
      setStatus({ type: "error", message });
      showToast({ type: "error", message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.box}>
      <h2 style={styles.title}>Job Description</h2>
      <p style={styles.subtitle}>Paste the role details so interview coaching can match the target job.</p>
      <textarea
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        style={styles.text}
        placeholder="Paste job description here..."
      />
      <button onClick={submit} style={styles.button} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </button>
      <StatusBanner
        type={status.type}
        message={status.message}
        actionLabel={status.type === "error" ? "Retry" : undefined}
        onAction={status.type === "error" ? submit : undefined}
      />
    </div>
  );
}

const styles: any = {
  box: {
    width: "100%",
    maxWidth: 900,
    padding: 24,
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e4e7ec",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  },
  title: {
    margin: 0,
    fontSize: 20,
    color: "#0a66c2",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 14,
    color: "#4b5563",
    fontSize: 14,
  },
  text: {
    width: "100%",
    minHeight: 180,
    padding: 12,
    borderRadius: 10,
    border: "1px solid #d0d7de",
    boxSizing: "border-box",
    outline: "none",
    resize: "vertical",
    lineHeight: 1.45,
  },
  button: {
    marginTop: 12,
    background: "#0a66c2",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
  },
};
