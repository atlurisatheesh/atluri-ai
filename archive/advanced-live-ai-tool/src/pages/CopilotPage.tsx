import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Monitor, Eye, EyeOff, Copy, Save, Settings, Play, Square, Volume2 } from 'lucide-react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import GlassCard from '../components/ui/GlassCard'
import NeonButton from '../components/ui/NeonButton'
import StatusBadge from '../components/ui/StatusBadge'

export default function CopilotPage() {
    const [isActive, setIsActive] = useState(false)
    const [micOn, setMicOn] = useState(true)

    const transcript = [
        { speaker: 'interviewer', text: 'Can you tell me about a challenging project you worked on recently?', confidence: 0.97, time: '0:23' },
        { speaker: 'candidate', text: 'Sure, at my previous company I led the migration of our monolithic architecture to microservices...', confidence: 0.94, time: '0:31' },
        { speaker: 'interviewer', text: 'How did you handle the data migration aspect of that?', confidence: 0.95, time: '1:02' },
    ]

    return (
        <DashboardLayout>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-heading font-bold flex items-center gap-3">
                            ⚡ NeuralWhisper™ — Live AI
                            <StatusBadge variant={isActive ? 'green' : 'red'} pulse={isActive}>
                                {isActive ? 'SESSION ACTIVE' : 'INACTIVE'}
                            </StatusBadge>
                        </h1>
                        <p className="text-sm text-txt-secondary mt-1">Real-time AI-powered interview assistant</p>
                    </div>
                </div>

                {/* Controls Bar */}
                <GlassCard className="p-4" hover={false}>
                    <div className="flex items-center gap-3 flex-wrap">
                        <NeonButton
                            size="sm"
                            variant={isActive ? 'accent' : 'primary'}
                            onClick={() => setIsActive(!isActive)}
                        >
                            <span className="flex items-center gap-2">
                                {isActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                {isActive ? 'Stop Session' : 'Start Session'}
                            </span>
                        </NeonButton>
                        <button
                            className={`p-2.5 rounded-lg border transition-all cursor-pointer ${micOn ? 'bg-brand-green/10 border-brand-green/30 text-brand-green' : 'bg-brand-red/10 border-brand-red/30 text-brand-red'
                                }`}
                            onClick={() => setMicOn(!micOn)}
                        >
                            {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                        </button>
                        <button className="p-2.5 rounded-lg border border-white/[0.08] hover:border-brand-cyan/30 text-txt-secondary hover:text-brand-cyan transition-all cursor-pointer">
                            <Monitor className="w-4 h-4" />
                        </button>
                        <button className="p-2.5 rounded-lg border border-white/[0.08] hover:border-brand-cyan/30 text-txt-secondary hover:text-brand-cyan transition-all cursor-pointer">
                            <Eye className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2 ml-auto text-xs text-txt-muted">
                            <Volume2 className="w-4 h-4" />
                            <input type="range" min="0" max="100" defaultValue="70" className="w-20 accent-brand-cyan" />
                        </div>
                        <select className="bg-bg-card border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-txt-secondary">
                            <option>⚡ Fast</option>
                            <option>⚖️ Balanced</option>
                            <option>🔬 Thorough</option>
                        </select>
                        <button className="p-2.5 rounded-lg border border-white/[0.08] hover:border-brand-cyan/30 text-txt-secondary hover:text-brand-cyan transition-all cursor-pointer">
                            <Copy className="w-4 h-4" />
                        </button>
                        <button className="p-2.5 rounded-lg border border-white/[0.08] hover:border-brand-cyan/30 text-txt-secondary hover:text-brand-cyan transition-all cursor-pointer">
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
                </GlassCard>

                {/* Context Bar */}
                <div className="flex items-center gap-4 text-xs text-txt-secondary">
                    <span className="flex items-center gap-1">Resume <span className="text-brand-green">✅</span></span>
                    <span className="flex items-center gap-1">JD <span className="text-brand-green">✅</span></span>
                    <span className="flex items-center gap-1">Company Research <span className="text-brand-green">✅</span></span>
                    <span className="text-txt-muted">|</span>
                    <span>Model: <span className="text-brand-cyan">GPT-4o</span></span>
                    <span className="text-txt-muted">|</span>
                    <span>Persona: <span className="text-brand-purple">Senior FAANG Eng</span></span>
                </div>

                {/* Main Split View */}
                <div className="grid lg:grid-cols-2 gap-4 min-h-[600px]">
                    {/* Left - Transcript */}
                    <GlassCard className="p-4 flex flex-col" hover={false}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-heading font-semibold text-sm">Live Transcript</h3>
                            <span className="text-xs text-txt-muted">Ctrl+F to search</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3">
                            {transcript.map((seg, i) => (
                                <motion.div
                                    key={i}
                                    className={`p-3 rounded-lg ${seg.speaker === 'interviewer'
                                        ? 'bg-brand-cyan/5 border-l-2 border-brand-cyan'
                                        : 'bg-white/[0.02] border-l-2 border-txt-muted'
                                        }`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.2 }}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className={`text-xs font-code font-semibold ${seg.speaker === 'interviewer' ? 'text-brand-cyan' : 'text-txt-muted'
                                            }`}>
                                            {seg.speaker === 'interviewer' ? 'Interviewer' : 'You'}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-txt-muted">{(seg.confidence * 100).toFixed(0)}%</span>
                                            <span className="text-[10px] text-txt-muted">{seg.time}</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-txt-primary leading-relaxed">{seg.text}</p>
                                </motion.div>
                            ))}
                            {isActive && (
                                <div className="flex items-center gap-2 text-brand-cyan text-xs">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse [animation-delay:0.2s]" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse [animation-delay:0.4s]" />
                                    </div>
                                    Listening...
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* Right - AI Response */}
                    <GlassCard className="p-4 flex flex-col" hover={false}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-heading font-semibold text-sm">AI Response</h3>
                            <StatusBadge variant="cyan" pulse>GPT-4o</StatusBadge>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <div className="space-y-4">
                                <div className="p-4 rounded-lg bg-brand-cyan/5 border border-brand-cyan/10">
                                    <p className="text-xs font-semibold text-brand-cyan mb-2">🔍 Detected Question:</p>
                                    <p className="text-sm text-txt-primary italic">"How did you handle the data migration aspect?"</p>
                                </div>

                                <div className="p-4 rounded-lg bg-white/[0.02]">
                                    <p className="text-xs font-semibold text-brand-green mb-2">💡 DIRECT ANSWER</p>
                                    <p className="text-sm text-txt-primary leading-relaxed">
                                        We implemented a phased migration strategy using the Strangler Fig pattern. I led the data migration workstream, which processed 2.3TB of PostgreSQL data with zero downtime using dual-write and shadow-read verification.
                                    </p>
                                </div>

                                <div className="p-4 rounded-lg bg-white/[0.02]">
                                    <p className="text-xs font-semibold text-brand-purple mb-2">📋 KEY POINTS</p>
                                    <ul className="text-sm text-txt-secondary space-y-1.5">
                                        <li>• Strangler Fig pattern — phased, not big-bang</li>
                                        <li>• Dual-write approach with shadow reads for verification</li>
                                        <li>• Custom CDC pipeline with Debezium + Kafka</li>
                                        <li>• Zero-downtime achieved across 47 tables</li>
                                    </ul>
                                </div>

                                <div className="p-4 rounded-lg bg-white/[0.02]">
                                    <p className="text-xs font-semibold text-brand-amber mb-2">🌟 STAR EXAMPLE</p>
                                    <p className="text-sm text-txt-primary leading-relaxed">
                                        <strong>S:</strong> Legacy monolith with 2.3TB data, 8M daily transactions. <strong>T:</strong> Migrate to microservices without downtime. <strong>A:</strong> Built CDC pipeline, implemented dual-writes, ran 3-week shadow period. <strong>R:</strong> Zero-downtime migration, 40% latency reduction, team shipped 2x faster post-migration.
                                    </p>
                                </div>

                                <div className="p-4 rounded-lg bg-brand-red/5 border border-brand-red/10">
                                    <p className="text-xs font-semibold text-brand-red mb-2">⚠️ AVOID SAYING</p>
                                    <ul className="text-sm text-txt-secondary space-y-1">
                                        <li>• Don't say "We just moved the data over"</li>
                                        <li>• Avoid vague "it was challenging" without specifics</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 mt-4 flex-wrap">
                                <button className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-txt-secondary hover:text-brand-cyan hover:border-brand-cyan/30 transition-all cursor-pointer">📋 Copy</button>
                                <button className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-txt-secondary hover:text-brand-cyan hover:border-brand-cyan/30 transition-all cursor-pointer">🔄 Regenerate</button>
                                <button className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-txt-secondary hover:text-brand-cyan hover:border-brand-cyan/30 transition-all cursor-pointer">✂️ Shorter</button>
                                <button className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-txt-secondary hover:text-brand-cyan hover:border-brand-cyan/30 transition-all cursor-pointer">🔬 More Technical</button>
                                <div className="ml-auto flex items-center gap-2">
                                    <button className="text-lg cursor-pointer">👍</button>
                                    <button className="text-lg cursor-pointer">👎</button>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </DashboardLayout>
    )
}
