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
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.title}>Coding Copilot</div>
        <div style={styles.subtitle}>
          {isStealth
            ? "Rapid coding assist with compact guidance for high-pressure rounds."
            : isEnterprise
            ? "Governed coding calibration with rubric-ready coaching output."
            : "Problem prompt + complexity analysis + trade-off coaching + structured feedback."}
        </div>

        {isEnterprise && <div style={styles.enterpriseTag}>Enterprise mode includes hiring rubric output for reviewer alignment.</div>}

        <div style={styles.label}>Problem Prompt</div>
        <div style={styles.row}>
          <input
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Problem prompt (e.g., Two Sum with constraints)"
            style={styles.problemInput}
          />
          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={styles.select}>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="go">Go</option>
          </select>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={styles.select}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div style={styles.label}>Your Draft (Optional)</div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Optional: your draft approach or code"
          style={styles.draftInput}
        />

        <div style={styles.actions}>
          {coreActions.map((action) => (
            <button
              key={action}
              onClick={() => runCoach(action)}
              disabled={Boolean(loading)}
              style={loading === action ? styles.actionButtonActive : styles.actionButton}
            >
              {loading === action ? "Working..." : labels[action]}
            </button>
          ))}
        </div>

        {!isStealth && (
          <button style={styles.advancedToggle} onClick={() => setShowAdvancedActions((v) => !v)}>
            {showAdvancedActions ? "Hide Advanced Coding Actions" : "Show Advanced Coding Actions"}
          </button>
        )}

        {showAdvancedActions && !isStealth && (
          <div style={styles.actions}>
            {advancedActions.map((action) => (
              <button
                key={action}
                onClick={() => runCoach(action)}
                disabled={Boolean(loading)}
                style={loading === action ? styles.actionButtonActive : styles.actionButton}
              >
                {loading === action ? "Working..." : labels[action]}
              </button>
            ))}
          </div>
        )}

        {result && (
          <div style={styles.resultCard}>
            <div style={styles.resultTitle}>Coach Output</div>
            <pre style={styles.resultText}>{result}</pre>
          </div>
        )}

        <StatusBanner type={status.type} message={status.message} />
      </div>
    </div>
  );
}

const styles: any = {
  page: {
    width: "100%",
    maxWidth: 980,
  },
  card: {
    width: "100%",
    minHeight: 520,
    background: "color-mix(in srgb, var(--bg) 84%, transparent)",
    borderRadius: 14,
    border: "1px solid var(--border-subtle)",
    boxShadow: "0 14px 34px color-mix(in srgb, var(--bg) 45%, transparent)",
    padding: 22,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 900,
    color: "var(--text-primary)",
  },
  subtitle: {
    marginTop: -4,
    fontSize: 13,
    color: "var(--text-muted)",
  },
  enterpriseTag: {
    border: "1px solid var(--border-subtle)",
    background: "color-mix(in srgb, var(--accent) 12%, transparent)",
    color: "var(--text-primary)",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  label: {
    marginTop: 2,
    marginBottom: -4,
    fontSize: 12,
    fontWeight: 700,
    color: "var(--text-muted)",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 160px 120px",
    gap: 10,
  },
  problemInput: {
    border: "1px solid var(--border-subtle)",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    background: "var(--surface-1)",
    color: "var(--text-primary)",
  },
  select: {
    border: "1px solid var(--border-subtle)",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    background: "var(--surface-1)",
    color: "var(--text-primary)",
  },
  draftInput: {
    minHeight: 170,
    border: "1px solid var(--border-subtle)",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    outline: "none",
    resize: "vertical" as const,
    background: "var(--surface-1)",
    color: "var(--text-primary)",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 8,
  },
  actionButton: {
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-1)",
    color: "var(--text-primary)",
    borderRadius: 999,
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  actionButtonActive: {
    border: "1px solid var(--border-subtle)",
    background: "var(--accent)",
    color: "var(--bg)",
    borderRadius: 999,
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 20px color-mix(in srgb, var(--accent) 24%, transparent)",
  },
  advancedToggle: {
    marginTop: -2,
    width: "fit-content",
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-1)",
    color: "var(--text-muted)",
    borderRadius: 999,
    padding: "6px 11px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  resultCard: {
    border: "1px solid var(--border-subtle)",
    borderRadius: 10,
    background: "color-mix(in srgb, var(--accent) 12%, transparent)",
    padding: "11px 12px",
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: "var(--text-muted)",
    marginBottom: 6,
  },
  resultText: {
    margin: 0,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
    lineHeight: 1.5,
    fontSize: 13,
    color: "var(--text-primary)",
  },
};
