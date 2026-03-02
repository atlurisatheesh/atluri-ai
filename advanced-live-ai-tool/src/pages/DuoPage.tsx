import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Copy, Link2, Shield, MessageSquare } from 'lucide-react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import GlassCard from '../components/ui/GlassCard'
import NeonButton from '../components/ui/NeonButton'
import StatusBadge from '../components/ui/StatusBadge'

const quickHints = [
    { emoji: '🎯', text: 'Think about edge cases' },
    { emoji: '💬', text: 'Ask a clarifying question' },
    { emoji: '⏱️', text: 'Mention time complexity' },
    { emoji: '⭐', text: 'Use STAR format' },
    { emoji: '📈', text: 'Consider scalability' },
]

export default function DuoPage() {
    const [mode, setMode] = useState<'select' | 'candidate' | 'helper'>('select')
    const [sessionCode] = useState('847291')

    if (mode === 'select') {
        return (
            <DashboardLayout>
                <div className="space-y-6 max-w-2xl mx-auto">
                    <h1 className="text-2xl font-heading font-bold">🔗 MentorLink™</h1>
                    <p className="text-txt-secondary">Connect with a remote helper for real-time interview assistance via encrypted WebRTC.</p>

                    <div className="grid md:grid-cols-2 gap-4">
                        <GlassCard className="p-6 cursor-pointer" onClick={() => setMode('candidate')}>
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-cyan/20 to-brand-cyan/5 flex items-center justify-center">
                                    <Users className="w-8 h-8 text-brand-cyan" />
                                </div>
                                <h3 className="font-heading font-bold text-lg mb-2">I'm the Candidate</h3>
                                <p className="text-sm text-txt-secondary">Generate a session code and share it with your helper.</p>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-6 cursor-pointer" onClick={() => setMode('helper')}>
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-purple/20 to-brand-purple/5 flex items-center justify-center">
                                    <MessageSquare className="w-8 h-8 text-brand-purple" />
                                </div>
                                <h3 className="font-heading font-bold text-lg mb-2">I'm the Helper</h3>
                                <p className="text-sm text-txt-secondary">Enter a session code to connect and assist the candidate.</p>
                            </div>
                        </GlassCard>
                    </div>

                    <GlassCard className="p-6" hover={false}>
                        <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-5 h-5 text-brand-green" />
                            <h3 className="font-heading font-semibold">Security & Privacy</h3>
                        </div>
                        <ul className="text-sm text-txt-secondary space-y-1.5">
                            <li>• End-to-end encrypted (WebRTC DTLS-SRTP)</li>
                            <li>• Zero server-side screen storage</li>
                            <li>• Session codes expire after 30 min</li>
                            <li>• Auto-disconnect on app close</li>
                        </ul>
                    </GlassCard>
                </div>
            </DashboardLayout>
        )
    }

    if (mode === 'candidate') {
        return (
            <DashboardLayout>
                <div className="space-y-6 max-w-2xl mx-auto">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-heading font-bold">👥 Duo — Candidate</h1>
                        <StatusBadge variant="amber" pulse>Waiting for helper...</StatusBadge>
                    </div>

                    <GlassCard className="p-8 text-center" hover={false}>
                        <p className="text-sm text-txt-secondary mb-4">Share this code with your helper:</p>
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <span className="text-5xl font-code font-bold tracking-[0.3em] text-brand-cyan">{sessionCode}</span>
                            <button className="p-2 rounded-lg border border-white/[0.08] hover:border-brand-cyan/30 text-txt-secondary hover:text-brand-cyan cursor-pointer">
                                <Copy className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-txt-muted">Code expires in 30 minutes</p>
                    </GlassCard>

                    <div className="text-center">
                        <button onClick={() => setMode('select')} className="text-sm text-txt-secondary hover:text-txt-primary cursor-pointer">← Back to selection</button>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-heading font-bold">👥 Duo — Helper View</h1>
                    <StatusBadge variant="green" pulse>Connected</StatusBadge>
                </div>

                <div className="grid lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                        <GlassCard className="p-4 h-full" hover={false}>
                            <h3 className="font-heading font-semibold text-sm mb-3">Candidate's Screen</h3>
                            <div className="aspect-video bg-bg-primary rounded-lg flex items-center justify-center">
                                <p className="text-txt-muted text-sm">Live screen feed (WebRTC)</p>
                            </div>
                        </GlassCard>
                    </div>

                    <div className="space-y-4">
                        <GlassCard className="p-4" hover={false}>
                            <h3 className="font-heading font-semibold text-sm mb-3">Send Hint</h3>
                            <textarea
                                className="w-full bg-bg-card border border-white/[0.08] rounded-lg p-3 text-sm text-txt-primary placeholder-txt-muted focus:outline-none focus:border-brand-cyan/50 resize-none h-24"
                                placeholder="Type a hint for the candidate..."
                            />
                            <NeonButton size="sm" className="w-full mt-2">Send Hint</NeonButton>
                        </GlassCard>

                        <GlassCard className="p-4" hover={false}>
                            <h3 className="font-heading font-semibold text-sm mb-3">Quick Templates</h3>
                            <div className="space-y-2">
                                {quickHints.map((h, i) => (
                                    <button key={i} className="w-full text-left p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-sm text-txt-secondary hover:border-brand-purple/30 hover:text-txt-primary transition-all cursor-pointer">
                                        {h.emoji} {h.text}
                                    </button>
                                ))}
                            </div>
                        </GlassCard>
                    </div>
                </div>

                <div className="text-center">
                    <button onClick={() => setMode('select')} className="text-sm text-txt-secondary hover:text-txt-primary cursor-pointer">← Back to selection</button>
                </div>
            </div>
        </DashboardLayout>
    )
}
