"use client";
import { useState } from "react";
import { apiRequest } from "../lib/api";
import StatusBanner from "./StatusBanner";
import { showToast } from "../lib/toast";
import { getAccessTokenOrThrow } from "../lib/auth";
import ResumeRewriteAssistant from "./ResumeRewriteAssistant";

export default function ResumeUpload() {
  const [uploading, setUploading] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ type: "error" | "success" | "info"; message: string }>({
    type: "info",
    message: "",
  });

  const upload = async (file: File) => {
    if (!file) {
      setStatus({ type: "error", message: "Please choose a file first." });
      showToast({ type: "error", message: "Please choose a file first." });
      return;
    }

    setLastFile(file);
    const form = new FormData();
    form.append("file", file);

    try {
      setUploading(true);
      setStatus({ type: "info", message: "Uploading resume..." });
      const authToken = await getAccessTokenOrThrow();
      await apiRequest("/api/resume/upload", {
        method: "POST",
        body: form,
        timeoutMs: 30000,
        retries: 1,
        authToken,
      });

      window.dispatchEvent(new CustomEvent("context-updated"));
      setStatus({ type: "success", message: "Resume uploaded successfully." });
      showToast({ type: "success", message: "Resume uploaded successfully." });
    } catch (error: any) {
      const message = `Resume upload failed: ${error?.message || "unknown error"}`;
      setStatus({ type: "error", message });
      showToast({ type: "error", message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.box}>
      <h2 style={styles.title}>Upload Resume</h2>
      <p style={styles.subtitle}>Upload your PDF or DOCX resume to personalize responses.</p>
      <input
        type="file"
        accept=".pdf,.docx"
        style={styles.file}
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
      <StatusBanner
        type={status.type}
        message={status.message}
        actionLabel={status.type === "error" && lastFile ? "Retry" : undefined}
        onAction={status.type === "error" && lastFile ? () => upload(lastFile) : undefined}
      />

      <ResumeRewriteAssistant />
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
    marginBottom: 16,
    color: "#4b5563",
    fontSize: 14,
  },
  file: {
    display: "block",
    width: "100%",
    padding: "12px 10px",
    border: "1px solid #d0d7de",
    borderRadius: 10,
    background: "#fff",
  },
};
