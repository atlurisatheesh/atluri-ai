import { motion } from 'framer-motion'
import Tabs from '../ui/Tabs'
import { Mic, Brain, Code2, Users, FileText, BookOpen } from 'lucide-react'

const featureTabs = [
    {
        label: 'Transcription',
        icon: <Mic className="w-4 h-4" />,
        content: (
            <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="glass-card p-6 rounded-xl">
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-brand-cyan/5 border-l-2 border-brand-cyan">
                            <span className="text-xs text-brand-cyan font-code">Interviewer</span>
                            <p className="text-sm text-txt-primary">"Can you walk me through a time you led a cross-functional project?"</p>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border-l-2 border-txt-muted">
                            <span className="text-xs text-txt-muted font-code">You</span>
                            <p className="text-sm text-txt-secondary">"Absolutely, at my previous company..."</p>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-xl font-heading font-bold">Real-Time Transcription</h3>
                    <ul className="space-y-2 text-sm text-txt-secondary">
                        <li>• Whisper AI with &lt;300ms latency</li>
                        <li>• Speaker diarization (color-coded)</li>
                        <li>• Auto question detection with 95%+ accuracy</li>
                        <li>• 20+ languages supported</li>
                        <li>• Export as PDF, DOCX, or SRT</li>
                    </ul>
                </div>
            </div>
        ),
    },
    {
        label: 'AI Responses',
        icon: <Brain className="w-4 h-4" />,
        content: (
            <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="glass-card p-6 rounded-xl">
                    <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-brand-cyan/5">
                            <p className="text-xs text-brand-cyan font-semibold mb-1">💡 DIRECT ANSWER</p>
                            <p className="text-sm text-txt-primary">In my last role, I led a 12-person cross-functional team that shipped a payment microservice handling ₹2Cr daily transactions...</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/[0.02]">
                            <p className="text-xs text-brand-purple font-semibold mb-1">📋 KEY POINTS</p>
                            <ul className="text-sm text-txt-secondary space-y-1">
                                <li>• Led 12-person team across 3 departments</li>
                                <li>• Reduced deployment time by 40%</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-xl font-heading font-bold">Structured AI Responses</h3>
                    <ul className="space-y-2 text-sm text-txt-secondary">
                        <li>• Direct answer + key points + STAR example</li>
                        <li>• Personalized from your resume</li>
                        <li>• GPT-4o with RAG context injection</li>
                        <li>• One-click copy, regenerate, shorten</li>
                        <li>• Response history (last 10)</li>
                    </ul>
                </div>
            </div>
        ),
    },
    {
        label: 'Coding Mode',
        icon: <Code2 className="w-4 h-4" />,
        content: (
            <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="glass-card p-6 rounded-xl font-code text-sm">
                    <div className="flex items-center gap-2 mb-3 text-txt-muted text-xs">
                        <span className="w-3 h-3 rounded-full bg-brand-red/60" />
                        <span className="w-3 h-3 rounded-full bg-brand-amber/60" />
                        <span className="w-3 h-3 rounded-full bg-brand-green/60" />
                        <span>solution.py</span>
                    </div>
                    <pre className="text-brand-green/80 whitespace-pre-wrap">{`def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        comp = target - n
        if comp in seen:
            return [seen[comp], i]
        seen[n] = i`}</pre>
                    <div className="mt-3 pt-3 border-t border-white/[0.06] text-xs text-txt-muted">
                        ✅ Time: O(n) · Space: O(n) · All tests pass
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-xl font-heading font-bold">Full Coding Support</h3>
                    <ul className="space-y-2 text-sm text-txt-secondary">
                        <li>• Monaco Editor (VSCode engine)</li>
                        <li>• 30+ language support with execution</li>
                        <li>• Big-O analysis + edge case detection</li>
                        <li>• Progressive hints (no spoilers)</li>
                        <li>• System design diagrams</li>
                    </ul>
                </div>
            </div>
        ),
    },
    {
        label: 'MentorLink™',
        icon: <Users className="w-4 h-4" />,
        content: (
            <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                        <span className="text-sm text-brand-green font-semibold">Helper Connected</span>
                    </div>
                    <div className="space-y-2">
                        <div className="p-2 rounded-lg bg-brand-purple/10 text-sm text-txt-primary">💬 "Think about edge cases 🎯"</div>
                        <div className="p-2 rounded-lg bg-brand-purple/10 text-sm text-txt-primary">⏱️ "Mention time complexity"</div>
                        <div className="p-2 rounded-lg bg-brand-purple/10 text-sm text-txt-primary">⭐ "Use STAR format here"</div>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-xl font-heading font-bold">Real-Time Human Assist</h3>
                    <ul className="space-y-2 text-sm text-txt-secondary">
                        <li>• WebRTC peer-to-peer, E2E encrypted</li>
                        <li>• Helper sees your screen live</li>
                        <li>• Stealth-safe floating hints</li>
                        <li>• Quick template responses</li>
                        <li>• Helper marketplace (hire FAANG engineers)</li>
                    </ul>
                </div>
            </div>
        ),
    },
    {
        label: 'Resume Builder',
        icon: <FileText className="w-4 h-4" />,
        content: (
            <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-txt-primary">ATS Score</span>
                        <span className="text-2xl font-heading font-bold text-brand-green">94/100</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-green" style={{ width: '94%' }} />
                    </div>
                    <div className="mt-4 space-y-2 text-xs text-txt-secondary">
                        <p>✅ Strong action verbs detected</p>
                        <p>✅ Metrics in 8/10 bullet points</p>
                        <p>⚠️ Add 2 more JD keywords</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-xl font-heading font-bold">AI Resume Builder</h3>
                    <ul className="space-y-2 text-sm text-txt-secondary">
                        <li>• ATS compatibility scoring (0-100)</li>
                        <li>• JD keyword matching + gap analysis</li>
                        <li>• One-click bullet point rewriting</li>
                        <li>• 20+ premium templates</li>
                        <li>• Export: PDF, DOCX, LinkedIn format</li>
                    </ul>
                </div>
            </div>
        ),
    },
    {
        label: 'Document AI',
        icon: <BookOpen className="w-4 h-4" />,
        content: (
            <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="glass-card p-6 rounded-xl">
                    <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-brand-red/5 border border-brand-red/20">
                            <p className="text-xs text-brand-red font-semibold mb-1">Without Context</p>
                            <p className="text-xs text-txt-secondary">"I'm a software engineer with experience in various technologies..."</p>
                        </div>
                        <div className="p-3 rounded-lg bg-brand-green/5 border border-brand-green/20">
                            <p className="text-xs text-brand-green font-semibold mb-1">With Your Documents</p>
                            <p className="text-xs text-txt-primary">"I led the migration of a monolithic payment system to microservices at Razorpay, reducing latency by 60%..."</p>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-xl font-heading font-bold">Document Intelligence</h3>
                    <ul className="space-y-2 text-sm text-txt-secondary">
                        <li>• RAG-powered semantic search</li>
                        <li>• Upload resume, JD, company docs</li>
                        <li>• pgvector cosine similarity retrieval</li>
                        <li>• Hyper-personalized answers</li>
                        <li>• Before/after comparison</li>
                    </ul>
                </div>
            </div>
        ),
    },
]

export default function FeatureDeepDive() {
    return (
        <section className="section-padding">
            <div className="max-w-5xl mx-auto">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                        Deep dive into <span className="text-gradient">every feature</span>
                    </h2>
                    <p className="text-txt-secondary">Explore the powerful capabilities that set InterviewGenius apart.</p>
                </motion.div>

                <Tabs tabs={featureTabs} />
            </div>
        </section>
    )
}
