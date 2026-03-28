"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, AlertTriangle, CheckCircle, Shield, Brain, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { GlassCard, NeonButton } from "@/components/ui";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9010";

interface JDSignal {
  pattern: string;
  match: string;
  interpretation: string;
  severity: string;
}

interface JDAnalysis {
  red_flags: JDSignal[];
  green_flags: JDSignal[];
  culture_signals: JDSignal[];
  hidden_requirements: string[];
  must_have_skills: string[];
  nice_to_have_skills: string[];
  estimated_seniority: string;
  salary_signals: JDSignal[];
  culture_profile: Record<string, string>;
  interview_format_prediction: string[];
  red_flag_score: number;
}

export default function JDAnalyzerPage() {
  const [jdText, setJdText] = useState("");
  const [analysis, setAnalysis] = useState<JDAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (jdText.trim().length < 20) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/intelligence/jd-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: jdText }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-3">
            <Search className="w-6 h-6 text-cyan-400" />
            JD Signal Decoder
          </h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Decode hidden cultural signals, red flags, and requirements from any job description.
          </p>
        </div>

        <GlassCard className="mb-6">
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the job description here..."
            className="w-full h-48 bg-transparent text-neutral-200 placeholder-neutral-600 resize-none outline-none text-sm leading-relaxed"
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-neutral-600">
              {jdText.split(/\s+/).filter(Boolean).length} words
            </span>
            <NeonButton onClick={handleAnalyze} disabled={loading || jdText.trim().length < 20}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                </span>
              ) : (
                "Analyze JD"
              )}
            </NeonButton>
          </div>
        </GlassCard>

        {error && (
          <div className="text-red-400 text-sm mb-4 px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}

        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Red Flag Score */}
              <GlassCard>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    Risk Assessment
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-32 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          analysis.red_flag_score <= 3 ? "bg-green-500" :
                          analysis.red_flag_score <= 6 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        ref={(el) => { if (el) el.style.width = `${analysis.red_flag_score * 10}%`; }}
                      />
                    </div>
                    <span className={`text-lg font-bold ${
                      analysis.red_flag_score <= 3 ? "text-green-400" :
                      analysis.red_flag_score <= 6 ? "text-amber-400" : "text-red-400"
                    }`}>
                      {analysis.red_flag_score}/10
                    </span>
                  </div>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Seniority: <span className="text-neutral-300">{analysis.estimated_seniority}</span>
                </p>
              </GlassCard>

              {/* Red & Green Flags */}
              <div className="grid grid-cols-2 gap-4">
                <GlassCard>
                  <h3 className="text-sm font-medium text-red-400 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    Red Flags ({analysis.red_flags.length})
                  </h3>
                  <div className="space-y-2">
                    {analysis.red_flags.map((f, i) => (
                      <div key={i} className="text-xs bg-red-500/5 border border-red-500/10 rounded px-3 py-2">
                        <span className="text-red-300 font-medium">&ldquo;{f.match}&rdquo;</span>
                        <p className="text-neutral-400 mt-0.5">{f.interpretation}</p>
                      </div>
                    ))}
                    {analysis.red_flags.length === 0 && (
                      <p className="text-xs text-neutral-600 italic">No red flags detected</p>
                    )}
                  </div>
                </GlassCard>

                <GlassCard>
                  <h3 className="text-sm font-medium text-green-400 flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4" />
                    Green Flags ({analysis.green_flags.length})
                  </h3>
                  <div className="space-y-2">
                    {analysis.green_flags.map((f, i) => (
                      <div key={i} className="text-xs bg-green-500/5 border border-green-500/10 rounded px-3 py-2">
                        <span className="text-green-300 font-medium">&ldquo;{f.match}&rdquo;</span>
                        <p className="text-neutral-400 mt-0.5">{f.interpretation}</p>
                      </div>
                    ))}
                    {analysis.green_flags.length === 0 && (
                      <p className="text-xs text-neutral-600 italic">No green flags detected</p>
                    )}
                  </div>
                </GlassCard>
              </div>

              {/* Skills */}
              <GlassCard>
                <h3 className="text-sm font-medium text-neutral-300 flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-purple-400" />
                  Extracted Skills
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-neutral-500 mb-2">Must-Have</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.must_have_skills.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 mb-2">Nice-to-Have</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.nice_to_have_skills.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-neutral-800 text-neutral-400">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Culture Profile & Interview Format */}
              <div className="grid grid-cols-2 gap-4">
                <GlassCard>
                  <h3 className="text-sm font-medium text-neutral-300 mb-3">Culture Profile</h3>
                  <div className="space-y-2">
                    {Object.entries(analysis.culture_profile).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-neutral-500 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-neutral-300">{val}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard>
                  <h3 className="text-sm font-medium text-neutral-300 mb-3">Predicted Interview Format</h3>
                  <div className="space-y-1.5">
                    {analysis.interview_format_prediction.map((f, i) => (
                      <div key={i} className="text-xs text-neutral-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        {f}
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
