"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Linkedin, Star, Target, Loader2, Copy, Check } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { GlassCard, NeonButton } from "@/components/ui";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9010";

interface LinkedInOptimization {
  headline: string;
  about_section: string;
  experience_bullets: string[];
  skills: string[];
  recruiter_search_terms: string[];
  profile_score: {
    overall: number;
    keyword_density: number;
    action_verbs: number;
    quantified_results: number;
    ats_friendly: number;
  };
  recommendations: string[];
}

export default function LinkedInOptimizerPage() {
  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [industry, setIndustry] = useState("Technology");
  const [level, setLevel] = useState("Senior");
  const [optimization, setOptimization] = useState<LinkedInOptimization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleOptimize = async () => {
    if (resumeText.trim().length < 20) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/career/optimize-linkedin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          target_role: targetRole,
          industry,
          level,
        }),
      });
      if (!res.ok) throw new Error("Optimization failed");
      setOptimization(await res.json());
    } catch (err: any) {
      setError(err.message || "Failed to optimize");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <button
      onClick={() => copyToClipboard(text, field)}
      className="p-1 rounded text-neutral-500 hover:text-neutral-300 transition-colors"
      title="Copy to clipboard"
    >
      {copiedField === field ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-3">
            <Linkedin className="w-6 h-6 text-blue-400" />
            LinkedIn Profile Optimizer
          </h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Optimize your LinkedIn headline, about section, and experience bullets for maximum recruiter visibility.
          </p>
        </div>

        {/* Input */}
        <GlassCard className="mb-6">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Target Role</label>
              <input type="text" value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g. Senior Software Engineer"
                className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none placeholder-neutral-600" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Industry</label>
              <input type="text" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. FinTech, SaaS, Healthcare"
                className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none placeholder-neutral-600" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Level</label>
              <select value={level} onChange={e => setLevel(e.target.value)} title="Level"
                className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 outline-none">
                <option value="Junior">Junior</option>
                <option value="Mid">Mid-Level</option>
                <option value="Senior">Senior</option>
                <option value="Staff">Staff / Lead</option>
                <option value="Principal">Principal / Director</option>
              </select>
            </div>
          </div>

          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume text here..."
            className="w-full h-40 bg-transparent text-neutral-200 placeholder-neutral-600 resize-none outline-none text-sm leading-relaxed"
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-neutral-600">
              {resumeText.split(/\s+/).filter(Boolean).length} words
            </span>
            <NeonButton onClick={handleOptimize} disabled={loading || resumeText.trim().length < 20}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Optimizing...
                </span>
              ) : "Optimize Profile"}
            </NeonButton>
          </div>
        </GlassCard>

        {error && (
          <div className="text-red-400 text-sm mb-4 px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}

        <AnimatePresence>
          {optimization && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Profile Score */}
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    Profile Score
                  </h2>
                  <span className={`text-3xl font-bold ${
                    optimization.profile_score.overall >= 80 ? "text-green-400" :
                    optimization.profile_score.overall >= 60 ? "text-amber-400" : "text-red-400"
                  }`}>
                    {optimization.profile_score.overall}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Keywords", score: optimization.profile_score.keyword_density },
                    { label: "Action Verbs", score: optimization.profile_score.action_verbs },
                    { label: "Quantified", score: optimization.profile_score.quantified_results },
                    { label: "ATS Friendly", score: optimization.profile_score.ats_friendly },
                  ].map(({ label, score }) => (
                    <div key={label} className="bg-neutral-800/30 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-neutral-500">{label}</p>
                      <p className="text-lg font-semibold text-neutral-200">{score}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Headline */}
              <GlassCard>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-neutral-300">Optimized Headline</h3>
                  <CopyButton text={optimization.headline} field="headline" />
                </div>
                <p className="text-lg text-neutral-100 bg-blue-500/5 border border-blue-500/10 rounded-lg px-4 py-3">
                  {optimization.headline}
                </p>
              </GlassCard>

              {/* About Section */}
              <GlassCard>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-neutral-300">Optimized About Section</h3>
                  <CopyButton text={optimization.about_section} field="about" />
                </div>
                <div className="bg-neutral-800/30 rounded-lg px-4 py-3 text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
                  {optimization.about_section}
                </div>
              </GlassCard>

              {/* Experience Bullets */}
              <GlassCard>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-neutral-300">Experience Bullet Points</h3>
                  <CopyButton text={optimization.experience_bullets.join("\n")} field="bullets" />
                </div>
                <ul className="space-y-2">
                  {optimization.experience_bullets.map((b, i) => (
                    <li key={i} className="text-sm text-neutral-300 flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </GlassCard>

              {/* Skills & Search Terms */}
              <div className="grid grid-cols-2 gap-4">
                <GlassCard>
                  <h3 className="text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-400" />
                    Recommended Skills
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {optimization.skills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {s}
                      </span>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard>
                  <h3 className="text-sm font-medium text-neutral-300 mb-3">Recruiter Search Terms</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {optimization.recruiter_search_terms.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {t}
                      </span>
                    ))}
                  </div>
                </GlassCard>
              </div>

              {/* Recommendations */}
              {optimization.recommendations.length > 0 && (
                <GlassCard>
                  <h3 className="text-sm font-medium text-neutral-300 mb-3">Additional Recommendations</h3>
                  <ul className="space-y-1.5">
                    {optimization.recommendations.map((r, i) => (
                      <li key={i} className="text-xs text-neutral-400 flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">→</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
