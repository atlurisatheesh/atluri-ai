import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, RotateCcw, ChevronRight, Lightbulb, Code2, Cpu, MessageSquare, Layout } from 'lucide-react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import GlassCard from '../components/ui/GlassCard'
import NeonButton from '../components/ui/NeonButton'
import Tabs from '../components/ui/Tabs'
import StatusBadge from '../components/ui/StatusBadge'

export default function CodingPage() {
    const [language, setLanguage] = useState('python')

    const codingTabs = [
        {
            label: 'Analysis',
            icon: <Cpu className="w-4 h-4" />,
            content: (
                <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-brand-cyan/5">
                        <h4 className="text-sm font-semibold text-brand-cyan mb-2">🔍 Pattern Detected</h4>
                        <p className="text-sm text-txt-primary">Sliding Window + Hash Map</p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/[0.02]">
                        <h4 className="text-sm font-semibold text-brand-purple mb-2">📊 Problem Breakdown</h4>
                        <ul className="text-sm text-txt-secondary space-y-1.5">
                            <li>• Find longest substring without repeating characters</li>
                            <li>• Optimal: sliding window with character index tracking</li>
                            <li>• Edge: empty string, single char, all same chars</li>
                        </ul>
                    </div>
                    <div className="p-4 rounded-lg bg-white/[0.02]">
                        <h4 className="text-sm font-semibold mb-2">Approach Tree</h4>
                        <div className="text-sm text-txt-secondary space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-brand-red">Brute Force:</span> O(n³) — Check all substrings
                            </div>
                            <ChevronRight className="w-4 h-4 text-txt-muted mx-4" />
                            <div className="flex items-center gap-2">
                                <span className="text-brand-amber">Better:</span> O(n²) — Set + two pointers
                            </div>
                            <ChevronRight className="w-4 h-4 text-txt-muted mx-4" />
                            <div className="flex items-center gap-2">
                                <span className="text-brand-green">Optimal:</span> O(n) — Sliding window + hash map
                            </div>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            label: 'Solution',
            icon: <Code2 className="w-4 h-4" />,
            content: (
                <div className="space-y-4">
                    <pre className="p-4 rounded-lg bg-bg-primary font-code text-sm text-brand-green/80 overflow-x-auto whitespace-pre-wrap">{`def lengthOfLongestSubstring(s: str) -> int:
    char_index = {}  # char -> last seen index
    left = 0
    max_len = 0
    
    for right, char in enumerate(s):
        # If char seen and within window
        if char in char_index and char_index[char] >= left:
            left = char_index[char] + 1
        
        char_index[char] = right
        max_len = max(max_len, right - left + 1)
    
    return max_len`}</pre>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-brand-green/5 border border-brand-green/10">
                            <p className="text-xs text-brand-green font-semibold">⏱️ Time: O(n)</p>
                            <p className="text-xs text-txt-secondary mt-1">Single pass through string</p>
                        </div>
                        <div className="p-3 rounded-lg bg-brand-cyan/5 border border-brand-cyan/10">
                            <p className="text-xs text-brand-cyan font-semibold">💾 Space: O(min(n, m))</p>
                            <p className="text-xs text-txt-secondary mt-1">m = charset size</p>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            label: 'Hints',
            icon: <Lightbulb className="w-4 h-4" />,
            content: (
                <div className="space-y-3">
                    {[
                        { level: 1, hint: 'Think about what defines a valid substring without repeats.', unlocked: true },
                        { level: 2, hint: 'Can you use a window that expands and contracts?', unlocked: true },
                        { level: 3, hint: 'Use a hash map to track the last position of each character.', unlocked: false },
                        { level: 4, hint: 'Full solution available — click to reveal.', unlocked: false },
                    ].map((h) => (
                        <div key={h.level} className={`p-4 rounded-lg ${h.unlocked ? 'bg-white/[0.02]' : 'bg-white/[0.01] opacity-60'}`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-brand-amber">Hint {h.level}</span>
                                {!h.unlocked && <span className="text-xs text-txt-muted">🔒 Click to unlock</span>}
                            </div>
                            <p className="text-sm text-txt-primary">{h.unlocked ? h.hint : '••••••••••••••••••••'}</p>
                        </div>
                    ))}
                </div>
            ),
        },
        {
            label: 'System Design',
            icon: <Layout className="w-4 h-4" />,
            content: (
                <div className="space-y-4">
                    <p className="text-sm text-txt-secondary">Paste a system design problem to generate architecture diagrams and component breakdowns.</p>
                    <textarea
                        className="w-full h-32 bg-bg-card border border-white/[0.08] rounded-lg p-3 text-sm text-txt-primary placeholder-txt-muted focus:outline-none focus:border-brand-cyan/50 resize-none"
                        placeholder="e.g., Design a URL shortener like bit.ly..."
                    />
                    <NeonButton size="sm">Generate Architecture</NeonButton>
                </div>
            ),
        },
        {
            label: 'Communication',
            icon: <MessageSquare className="w-4 h-4" />,
            content: (
                <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-white/[0.02]">
                        <h4 className="text-xs font-semibold text-brand-cyan mb-2">How to verbalize:</h4>
                        <ul className="text-sm text-txt-secondary space-y-1.5">
                            <li>1. "I recognize this as a sliding window problem..."</li>
                            <li>2. "Let me start with the brute force approach, then optimize..."</li>
                            <li>3. "The key insight is tracking character positions in a hash map..."</li>
                            <li>4. "This gives us O(n) time and O(min(n,m)) space..."</li>
                        </ul>
                    </div>
                    <div className="p-4 rounded-lg bg-brand-amber/5 border border-brand-amber/10">
                        <h4 className="text-xs font-semibold text-brand-amber mb-2">When stuck:</h4>
                        <p className="text-sm text-txt-secondary">"Let me think about this for a moment—I want to consider the edge cases before coding."</p>
                    </div>
                </div>
            ),
        },
    ]

    return (
        <DashboardLayout>
            <div className="space-y-4">
                <h1 className="text-2xl font-heading font-bold">💻 CodeForge™ — Coding AI</h1>

                <div className="grid lg:grid-cols-3 gap-4 min-h-[700px]">
                    {/* Problem Panel */}
                    <GlassCard className="p-4" hover={false}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-heading font-semibold text-sm">Problem</h3>
                            <StatusBadge variant="amber">Medium</StatusBadge>
                        </div>
                        <h4 className="text-lg font-heading font-bold mb-2">Longest Substring Without Repeating Characters</h4>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xs bg-brand-purple/20 text-brand-purple px-2 py-0.5 rounded-full">Sliding Window</span>
                            <span className="text-xs bg-brand-cyan/20 text-brand-cyan px-2 py-0.5 rounded-full">Hash Map</span>
                        </div>
                        <p className="text-sm text-txt-secondary mb-4 leading-relaxed">
                            Given a string <code className="text-brand-cyan bg-brand-cyan/10 px-1 rounded">s</code>, find the length of the longest substring without repeating characters.
                        </p>
                        <div className="space-y-3">
                            <div className="p-3 rounded-lg bg-bg-primary font-code text-xs">
                                <p className="text-txt-muted mb-1">Example 1:</p>
                                <p className="text-txt-primary">Input: s = "abcabcbb"</p>
                                <p className="text-brand-green">Output: 3 ("abc")</p>
                            </div>
                            <div className="p-3 rounded-lg bg-bg-primary font-code text-xs">
                                <p className="text-txt-muted mb-1">Example 2:</p>
                                <p className="text-txt-primary">Input: s = "bbbbb"</p>
                                <p className="text-brand-green">Output: 1 ("b")</p>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <span className="text-xs bg-white/[0.04] px-2 py-1 rounded text-txt-muted">🏢 Google</span>
                            <span className="text-xs bg-white/[0.04] px-2 py-1 rounded text-txt-muted">🏢 Amazon</span>
                            <span className="text-xs bg-white/[0.04] px-2 py-1 rounded text-txt-muted">🏢 Meta</span>
                        </div>
                    </GlassCard>

                    {/* Code Editor */}
                    <GlassCard className="p-4 flex flex-col" hover={false}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <h3 className="font-heading font-semibold text-sm">Editor</h3>
                                <select
                                    className="bg-bg-card border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-txt-secondary"
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                >
                                    <option value="python">Python</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="typescript">TypeScript</option>
                                    <option value="java">Java</option>
                                    <option value="cpp">C++</option>
                                    <option value="go">Go</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <NeonButton size="sm" onClick={() => { }}>
                                    <span className="flex items-center gap-1"><Play className="w-3 h-3" /> Run</span>
                                </NeonButton>
                                <button className="p-1.5 rounded-lg border border-white/[0.08] hover:border-brand-cyan/30 text-txt-secondary cursor-pointer">
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-bg-primary rounded-lg p-4 font-code text-sm overflow-auto">
                            <div className="flex">
                                <div className="pr-4 text-txt-muted text-right select-none border-r border-white/[0.06] mr-4">
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <div key={i}>{i + 1}</div>
                                    ))}
                                </div>
                                <pre className="text-brand-green/80 whitespace-pre-wrap">{`def lengthOfLongestSubstring(s):
    char_index = {}
    left = 0
    max_len = 0
    
    for right, char in enumerate(s):
        if char in char_index:
            if char_index[char] >= left:
                left = char_index[char] + 1
        char_index[char] = right
        max_len = max(max_len, right - left + 1)
    return max_len`}</pre>
                            </div>
                        </div>

                        {/* Test Results */}
                        <div className="mt-3 p-3 rounded-lg bg-bg-primary">
                            <p className="text-xs font-semibold text-txt-secondary mb-2">Test Results</p>
                            <div className="space-y-1.5 text-xs font-code">
                                <div className="flex items-center gap-2"><span className="text-brand-green">✅</span> "abcabcbb" → 3</div>
                                <div className="flex items-center gap-2"><span className="text-brand-green">✅</span> "bbbbb" → 1</div>
                                <div className="flex items-center gap-2"><span className="text-brand-green">✅</span> "pwwkew" → 3</div>
                            </div>
                            <p className="text-[10px] text-txt-muted mt-2">Runtime: 3ms · Memory: 14.2MB</p>
                        </div>
                    </GlassCard>

                    {/* AI Assistant */}
                    <GlassCard className="p-4 flex flex-col" hover={false}>
                        <h3 className="font-heading font-semibold text-sm mb-4">AI Coding Assistant</h3>
                        <Tabs tabs={codingTabs} />
                    </GlassCard>
                </div>
            </div>
        </DashboardLayout>
    )
}
