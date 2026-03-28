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
    <div className="w-full max-w-[900px] p-6 bg-white rounded-[14px] border border-[#e4e7ec] shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <h2 className="m-0 text-xl text-[#0a66c2]">Upload Resume</h2>
      <p className="mt-2 mb-4 text-[#4b5563] text-sm">Upload your PDF or DOCX resume to personalize responses.</p>
      <input
        type="file"
        accept=".pdf,.docx"
        title="Upload resume file"
        className="block w-full py-3 px-2.5 border border-[#d0d7de] rounded-[10px] bg-white"
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

