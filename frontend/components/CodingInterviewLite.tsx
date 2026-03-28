"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { getAccessTokenOrThrow } from "../lib/auth";
import StatusBanner from "./StatusBanner";

type CoachAction = "hint" | "complexity" | "structure" | "feedback";
type CoachActionExtended = CoachAction | "edge_cases" | "test_cases" | "optimal_code" | "rubric";
type StrategyTrack = "launch" | "depth" | "stealth" | "enterprise";

const labels: Record<CoachActionExtended, string> = {
  hint: "Hint Generator",
  complexity: "Time Complexity Coach",
  structure: "Structure Suggestions",
  feedback: "Post-code Feedback",
  edge_cases: "Edge Cases",
  test_cases: "Test Case Builder",
  optimal_code: "Optimal Code Draft",
  rubric: "Hiring Rubric",
};

export default function CodingInterviewLite({ strategyTrack = "launch" }: { strategyTrack?: StrategyTrack }) {
  const [problem, setProblem] = useState("");
  const [language, setLanguage] = useState("python");
  const [difficulty, setDifficulty] = useState("medium");
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState("");
  const [showAdvancedActions, setShowAdvancedActions] = useState(false);
  const [loading, setLoading] = useState<CoachActionExtended | null>(null);
  const [status, setStatus] = useState<{ type: "error" | "success" | "info"; message: string }>({
    type: "info",
    message: "",
  });
  const isStealth = strategyTrack === "stealth";
  const isEnterprise = strategyTrack === "enterprise";

  useEffect(() => {
    setShowAdvancedActions(strategyTrack === "enterprise" || strategyTrack === "depth");
  }, [strategyTrack]);

  const runCoach = async (action: CoachActionExtended) => {
    const promptProblem = problem.trim();
    if (!promptProblem) {
      setStatus({ type: "error", message: "Add a coding problem prompt first." });
      return;
    }

    try {
      setLoading(action);
      setStatus({ type: "info", message: `${labels[action]} running...` });

      const authToken = await getAccessTokenOrThrow();
      const instruction =
        action === "hint"
          ? "Give a progressive hint (not full solution first), then a concise optimal approach."
          : action === "complexity"
          ? "Analyze expected time/space complexity and suggest improvement opportunities."
          : action === "structure"
          ? "Suggest a clean interview answer structure: intuition, approach, edge-cases, complexity, test-cases."
          : action === "feedback"
          ? "Review the provided code/draft and give concise strengths, risks, and next fixes."
          : action === "edge_cases"
          ? "List tricky edge cases with expected outputs and explain why each case matters."
          : action === "test_cases"
          ? "Generate interview-ready test cases from basic to adversarial and include quick rationale."
          : action === "optimal_code"
          ? "Provide an optimal production-quality code draft with concise explanation and complexity analysis."
          : "Create a concise hiring rubric with pass, strong-pass, and risk signals for this problem and approach.";

      const prompt = [
        "You are a coding interview coach.",
        instruction,
        "Keep response concise and practical for interview performance.",
        `Language: ${language}`,
        `Difficulty: ${difficulty}`,
        "Problem:",
        promptProblem,
        draft.trim() ? `Candidate draft/code:\n${draft.trim()}` : "Candidate draft/code: (none)",
      ].join("\n\n");

      const data = await apiRequest<{ reply?: string }>("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
        retries: 1,
        timeoutMs: 25000,
        authToken,
      });

      const text = String(data?.reply || "").trim();
      if (!text) {
        throw new Error("No coaching response received.");
      }

      setResult(text);
      setStatus({ type: "success", message: "Coaching response ready." });
    } catch (error: any) {
      setStatus({ type: "error", message: `Coding coach failed: ${error?.message || "unknown error"}` });
    } finally {
      setLoading(null);
    }
  };

  const coreActions: CoachActionExtended[] = isStealth
    ? ["hint", "complexity", "feedback"]
    : ["hint", "complexity", "structure", "feedback"];
  const advancedActions: CoachActionExtended[] = ["edge_cases", "test_cases", "optimal_code", ...(isEnterprise ? ["rubric" as const] : [])];

  return (
    <div className="w-full max-w-[980px]">
      <div className="w-full min-h-[520px] bg-[color-mix(in_srgb,var(--bg)_84%,transparent)] rounded-[14px] border border-[var(--border-subtle)] shadow-[0_14px_34px_color-mix(in_srgb,var(--bg)_45%,transparent)] p-[22px] flex flex-col gap-3">
        <div className="text-[22px] font-black text-[var(--text-primary)]">Coding Copilot</div>
        <div className="-mt-1 text-[13px] text-[var(--text-muted)]">
          {isStealth
            ? "Rapid coding assist with compact guidance for high-pressure rounds."
            : isEnterprise
            ? "Governed coding calibration with rubric-ready coaching output."
            : "Problem prompt + complexity analysis + trade-off coaching + structured feedback."}
        </div>

        {isEnterprise && <div className="border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--text-primary)] rounded-[10px] py-2 px-2.5 text-xs font-bold">Enterprise mode includes hiring rubric output for reviewer alignment.</div>}

        <div className="mt-0.5 -mb-1 text-xs font-bold text-[var(--text-muted)]">Problem Prompt</div>
        <div className="grid grid-cols-[minmax(0,1fr)_160px_120px] gap-2.5">
          <input
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Problem prompt (e.g., Two Sum with constraints)"
            className="border border-[var(--border-subtle)] rounded-[10px] py-2.5 px-3 text-sm outline-none bg-[var(--surface-1)] text-[var(--text-primary)]"
          />
          <select value={language} onChange={(e) => setLanguage(e.target.value)} title="Programming language" className="border border-[var(--border-subtle)] rounded-[10px] py-2.5 px-3 text-sm outline-none bg-[var(--surface-1)] text-[var(--text-primary)]">
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="go">Go</option>
          </select>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} title="Difficulty level" className="border border-[var(--border-subtle)] rounded-[10px] py-2.5 px-3 text-sm outline-none bg-[var(--surface-1)] text-[var(--text-primary)]">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="mt-0.5 -mb-1 text-xs font-bold text-[var(--text-muted)]">Your Draft (Optional)</div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Optional: your draft approach or code"
          className="min-h-[170px] border border-[var(--border-subtle)] rounded-[10px] py-2.5 px-3 text-[13px] outline-none resize-y bg-[var(--surface-1)] text-[var(--text-primary)]"
        />

        <div className="flex flex-wrap gap-2">
          {coreActions.map((action) => (
            <button
              key={action}
              onClick={() => runCoach(action)}
              disabled={Boolean(loading)}
              className={loading === action ? "border border-[var(--border-subtle)] bg-[var(--accent)] text-[var(--bg)] rounded-full py-[7px] px-3 text-xs font-bold cursor-pointer shadow-[0_8px_20px_color-mix(in_srgb,var(--accent)_24%,transparent)]" : "border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-primary)] rounded-full py-[7px] px-3 text-xs font-bold cursor-pointer"}
            >
              {loading === action ? "Working..." : labels[action]}
            </button>
          ))}
        </div>

        {!isStealth && (
          <button className="-mt-0.5 w-fit border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-muted)] rounded-full py-1.5 px-[11px] text-xs font-bold cursor-pointer" onClick={() => setShowAdvancedActions((v) => !v)}>
            {showAdvancedActions ? "Hide Advanced Coding Actions" : "Show Advanced Coding Actions"}
          </button>
        )}

        {showAdvancedActions && !isStealth && (
          <div className="flex flex-wrap gap-2">
            {advancedActions.map((action) => (
              <button
                key={action}
                onClick={() => runCoach(action)}
                disabled={Boolean(loading)}
                className={loading === action ? "border border-[var(--border-subtle)] bg-[var(--accent)] text-[var(--bg)] rounded-full py-[7px] px-3 text-xs font-bold cursor-pointer shadow-[0_8px_20px_color-mix(in_srgb,var(--accent)_24%,transparent)]" : "border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-primary)] rounded-full py-[7px] px-3 text-xs font-bold cursor-pointer"}
              >
                {loading === action ? "Working..." : labels[action]}
              </button>
            ))}
          </div>
        )}

        {result && (
          <div className="border border-[var(--border-subtle)] rounded-[10px] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] py-[11px] px-3">
            <div className="text-xs font-extrabold text-[var(--text-muted)] mb-1.5">Coach Output</div>
            <pre className="m-0 whitespace-pre-wrap break-words leading-[1.5] text-[13px] text-[var(--text-primary)]">{result}</pre>
          </div>
        )}

        <StatusBanner type={status.type} message={status.message} />
      </div>
    </div>
  );
}

