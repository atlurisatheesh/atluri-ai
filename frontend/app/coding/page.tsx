"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Play, RotateCcw, ChevronRight, Lightbulb, Code2, Cpu,
  MessageSquare, Layout, CheckCircle, Clock, Zap, Copy,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { GlassCard, NeonButton, Tabs, StatusBadge } from "@/components/ui";

/* ── Mock data ──────────────────────────────────────────── */
const PROBLEM = {
  title: "Longest Substring Without Repeating Characters",
  difficulty: "Medium",
  tags: ["Sliding Window", "Hash Map", "String"],
  companies: ["Google", "Amazon", "Meta", "Microsoft", "Apple"],
  description: `Given a string s, find the length of the longest substring without repeating characters.

Example 1: Input: s = "abcabcbb" → Output: 3 ("abc")
Example 2: Input: s = "bbbbb" → Output: 1 ("b")
Example 3: Input: s = "pwwkew" → Output: 3 ("wke")`,
};

const CODE_SAMPLE = `def lengthOfLongestSubstring(s: str) -> int:
    char_set = set()
    left = 0
    max_len = 0

    for right in range(len(s)):
        while s[right] in char_set:
            char_set.remove(s[left])
            left += 1
        char_set.add(s[right])
        max_len = max(max_len, right - left + 1)

    return max_len`;

const TEST_RESULTS = [
  { input: '"abcabcbb"', expected: "3", got: "3", passed: true },
  { input: '"bbbbb"', expected: "1", got: "1", passed: true },
  { input: '"pwwkew"', expected: "3", got: "3", passed: true },
];

export default function CodingPage() {
  const [language, setLanguage] = useState("python");
  const [activeTab, setActiveTab] = useState("analysis");

  const tabs = [
    { id: "analysis", label: "Analysis", icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: "solution", label: "Solution", icon: <Code2 className="w-3.5 h-3.5" /> },
    { id: "hints", label: "Hints", icon: <Lightbulb className="w-3.5 h-3.5" /> },
    { id: "system", label: "System Design", icon: <Layout className="w-3.5 h-3.5" /> },
    { id: "communication", label: "Communication", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-green to-brand-cyan flex items-center justify-center">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-textPrimary">CodeForge™ — AI Coding Lab</h1>
            <p className="text-xs text-textMuted">Practice coding interviews with real-time AI assistance</p>
          </div>
        </div>

        {/* 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left — Problem Panel */}
          <GlassCard className="lg:col-span-3 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-textPrimary">{PROBLEM.title}</h2>
              <StatusBadge variant="amber">{PROBLEM.difficulty}</StatusBadge>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {PROBLEM.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 text-[10px] rounded-full bg-brand-cyan/10 text-brand-cyan">{t}</span>
              ))}
            </div>
            <pre className="text-sm text-textSecondary whitespace-pre-wrap leading-relaxed mb-4">{PROBLEM.description}</pre>
            <div className="pt-3 border-t border-white/[0.06]">
              <p className="text-xs text-textMuted mb-2">Asked at:</p>
              <div className="flex flex-wrap gap-1.5">
                {PROBLEM.companies.map((c) => (
                  <span key={c} className="px-2 py-0.5 text-[10px] rounded-full bg-white/5 text-textSecondary">{c}</span>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Center — Code Editor */}
          <GlassCard className="lg:col-span-5 p-0 overflow-hidden">
            {/* Editor toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="text-xs bg-transparent text-textSecondary outline-none cursor-pointer">
                {["python", "javascript", "typescript", "java", "cpp", "go"].map((l) => (
                  <option key={l} value={l} className="bg-canvas">{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <NeonButton className="!text-xs !px-3 !py-1.5"><Play className="w-3 h-3 mr-1" /> Run</NeonButton>
                <button className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-textMuted hover:text-textPrimary transition flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>
            </div>

            {/* Code area with line numbers */}
            <div className="flex">
              <div className="py-4 px-2 text-right select-none border-r border-white/[0.04]">
                {CODE_SAMPLE.split("\n").map((_, i) => (
                  <div key={i} className="text-[11px] leading-6 text-textMuted/40 font-mono">{i + 1}</div>
                ))}
              </div>
              <pre className="flex-1 p-4 text-sm font-mono text-textSecondary overflow-x-auto leading-6 whitespace-pre">{CODE_SAMPLE}</pre>
            </div>

            {/* Test Results */}
            <div className="border-t border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-textPrimary">Test Results</span>
                <span className="text-[10px] text-brand-green">3/3 Passed</span>
              </div>
              <div className="space-y-1.5">
                {TEST_RESULTS.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-green" />
                    <span className="text-textMuted font-mono">{t.input}</span>
                    <ChevronRight className="w-3 h-3 text-textMuted" />
                    <span className="text-textSecondary">{t.got}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-[10px] text-textMuted">
                <span>Runtime: <span className="text-brand-green">52ms</span> (beats 94%)</span>
                <span>Memory: <span className="text-brand-cyan">14.2MB</span> (beats 87%)</span>
              </div>
            </div>
          </GlassCard>

          {/* Right — AI Assistant */}
          <GlassCard className="lg:col-span-4 p-0 overflow-hidden">
            {/* Tab bar */}
            <div className="flex overflow-x-auto border-b border-white/[0.06] bg-white/[0.02]">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2.5 text-xs whitespace-nowrap transition border-b-2 ${activeTab === tab.id ? "border-brand-cyan text-brand-cyan" : "border-transparent text-textMuted hover:text-textSecondary"}`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4 overflow-y-auto max-h-[500px] custom-scrollbar">
              {activeTab === "analysis" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-brand-cyan mb-2">Pattern Detected</p>
                    <div className="p-3 rounded-lg bg-brand-cyan/5 border border-brand-cyan/10">
                      <p className="text-sm text-textPrimary font-medium">Sliding Window</p>
                      <p className="text-xs text-textMuted mt-1">Maintain a window of valid elements; expand right, contract left on violation.</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-purple mb-2">Complexity</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg bg-white/5 text-center"><span className="text-brand-green text-sm font-mono">O(n)</span><p className="text-[10px] text-textMuted mt-0.5">Time</p></div>
                      <div className="p-2.5 rounded-lg bg-white/5 text-center"><span className="text-brand-cyan text-sm font-mono">O(min(n,m))</span><p className="text-[10px] text-textMuted mt-0.5">Space</p></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-amber mb-2">Approach Tree</p>
                    {["Brute Force → O(n³)", "Better: Hash Set → O(n²)", "Optimal: Sliding Window → O(n)"].map((a, i) => (
                      <div key={i} className={`flex items-center gap-2 text-sm py-1.5 ${i === 2 ? "text-brand-green font-medium" : "text-textMuted"}`}>
                        <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px]">{i + 1}</span>
                        {a}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "solution" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <pre className="text-xs font-mono text-textSecondary bg-white/[0.02] p-3 rounded-lg overflow-x-auto whitespace-pre">{CODE_SAMPLE}</pre>
                  <div className="flex gap-2">
                    <GlassCard className="flex-1 p-3 text-center"><p className="text-brand-green text-sm font-mono font-bold">O(n)</p><p className="text-[10px] text-textMuted">Time</p></GlassCard>
                    <GlassCard className="flex-1 p-3 text-center"><p className="text-brand-cyan text-sm font-mono font-bold">O(k)</p><p className="text-[10px] text-textMuted">Space</p></GlassCard>
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 py-2 text-xs rounded-lg bg-white/5 text-textSecondary hover:bg-white/10 transition"><Copy className="w-3 h-3" /> Copy Solution</button>
                </motion.div>
              )}

              {activeTab === "hints" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  {[
                    { text: "Think about what information you need as you scan the string from left to right.", unlocked: true },
                    { text: "A hash map can track the last-seen position of each character, enabling O(1) duplicate checks.", unlocked: true },
                    { text: "When you find a duplicate, don't restart from scratch — just slide the left pointer past the previous occurrence.", unlocked: false },
                    { text: "The answer is the maximum window size seen across the entire scan.", unlocked: false },
                  ].map((h, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${h.unlocked ? "bg-white/[0.02] border-white/[0.06]" : "bg-white/[0.01] border-white/[0.03] blur-[2px]"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Lightbulb className={`w-3.5 h-3.5 ${h.unlocked ? "text-brand-amber" : "text-textMuted"}`} />
                        <span className="text-xs font-medium text-textPrimary">Hint {i + 1}</span>
                        {!h.unlocked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-textMuted ml-auto">🔒 Locked</span>}
                      </div>
                      <p className="text-sm text-textSecondary">{h.text}</p>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === "system" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <p className="text-xs text-textMuted">Paste a system design problem to get AI-generated architecture guidance.</p>
                  <textarea className="w-full h-32 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-textPrimary placeholder-textMuted outline-none resize-none focus:border-brand-cyan/30 transition" placeholder="e.g., Design a URL shortener that handles 100M URLs..." />
                  <NeonButton className="w-full"><Layout className="w-4 h-4 mr-1.5" /> Generate Architecture</NeonButton>
                </motion.div>
              )}

              {activeTab === "communication" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-brand-cyan mb-2">How to explain your approach</p>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-sm text-textSecondary leading-relaxed">
                      &ldquo;I&rsquo;ll use a sliding window approach. The key insight is that we maintain a window of unique characters. As we scan right, if we find a duplicate, we shrink from the left until the window is valid again. This gives us O(n) time since each character is added and removed at most once.&rdquo;
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-brand-amber mb-2">When you&rsquo;re stuck</p>
                    <ul className="space-y-2 text-sm text-textSecondary">
                      <li className="flex items-start gap-2"><Zap className="w-3.5 h-3.5 text-brand-amber flex-shrink-0 mt-0.5" /> &ldquo;Let me think about the brute force first, then optimize.&rdquo;</li>
                      <li className="flex items-start gap-2"><Zap className="w-3.5 h-3.5 text-brand-amber flex-shrink-0 mt-0.5" /> &ldquo;I notice this has a sliding window pattern because...&rdquo;</li>
                      <li className="flex items-start gap-2"><Zap className="w-3.5 h-3.5 text-brand-amber flex-shrink-0 mt-0.5" /> Ask clarifying questions about constraints and edge cases.</li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
