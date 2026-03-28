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
    <div className="w-full max-w-[900px] p-6 bg-white rounded-[14px] border border-[#e4e7ec] shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <h2 className="m-0 text-xl text-[#0a66c2]">Job Description</h2>
      <p className="mt-2 mb-3.5 text-[#4b5563] text-sm">Paste the role details so interview coaching can match the target job.</p>
      <textarea
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        className="w-full min-h-[180px] p-3 rounded-[10px] border border-[#d0d7de] box-border outline-none resize-y leading-[1.45]"
        placeholder="Paste job description here..."
      />
      <button onClick={submit} className="mt-3 bg-[#0a66c2] text-white border-none py-2.5 px-4 rounded-[10px] cursor-pointer font-semibold" disabled={saving}>
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

