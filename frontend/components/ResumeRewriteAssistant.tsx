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
    <div className="mt-4 border border-[#e4e7ec] rounded-[14px] p-4 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="text-base font-extrabold text-[#0a66c2]">Resume Rewrite Assistant</div>
      <div className="mt-1 mb-2.5 text-[13px] text-[#64748b]">Paste one bullet and choose a rewrite style.</div>

      <div className="mb-1.5 text-xs font-bold text-[#334155]">Resume Bullet</div>

      <textarea
        value={bullet}
        onChange={(e) => setBullet(e.target.value)}
        placeholder="Example: Worked on API improvements for customer platform."
        className="w-full min-h-[90px] border border-[#cbd5e1] rounded-[10px] py-2.5 px-3 text-[13px] resize-y outline-none bg-white"
      />

      <div className="mt-2.5 flex gap-2 flex-wrap mb-0.5">
        {(Object.keys(actionLabels) as RewriteAction[]).map((action) => (
          <button
            key={action}
            onClick={() => runRewrite(action)}
            disabled={Boolean(loadingAction)}
            className={loadingAction === action
              ? "border border-[#0a66c2] bg-[#0a66c2] text-white rounded-full py-[7px] px-[11px] text-xs font-extrabold cursor-pointer"
              : "border border-[#cbd5e1] bg-white text-[#1f2937] rounded-full py-[7px] px-[11px] text-xs font-bold cursor-pointer"
            }
          >
            {loadingAction === action ? "Working..." : actionLabels[action]}
          </button>
        ))}
      </div>

      {rewritten && (
        <div className="mt-3 border border-[#dbeafe] rounded-[10px] py-2.5 px-[11px] bg-[#eff6ff]">
          <div className="text-xs font-extrabold text-[#1e3a8a] mb-1.5">Suggested rewrite</div>
          <pre className="m-0 whitespace-pre-wrap break-words text-[13px] leading-[1.45] text-[#1f2937]">{rewritten}</pre>
        </div>
      )}

      <StatusBanner type={status.type} message={status.message} />
    </div>
  );
}

