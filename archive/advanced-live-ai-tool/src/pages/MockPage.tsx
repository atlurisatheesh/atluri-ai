import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, Video, Clock, BookOpen, ChevronRight } from 'lucide-react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import GlassCard from '../components/ui/GlassCard'
import NeonButton from '../components/ui/NeonButton'
import StatusBadge from '../components/ui/StatusBadge'
import ProgressRing from '../components/ui/ProgressRing'

const interviewTypes = [
    'Technical', 'System Design', 'Behavioral (STAR)', 'HR / Culture Fit',
    'Product Manager', 'Data Science', 'Full Stack', 'Frontend', 'Backend',
]

const companies = [
    'Google', 'Meta', 'Amazon', 'Apple', 'Netflix', 'Microsoft',
    'Uber', 'Stripe', 'Airbnb', 'Shopify', 'Goldman Sachs', 'Custom',
]

export default function MockPage() {
    const [step, setStep] = useState(0)
    const [selectedType, setSelectedType] = useState('')
    const [selectedCompany, setSelectedCompany] = useState('')

    if (step === 3) {
        // Mock report view
        return (
            <DashboardLayout>
                <div className="space-y-6">
                    <h1 className="text-2xl font-heading font-bold">📊 SimuDrill™ Interview Report</h1>

                    <GlassCard className="p-6" hover={false}>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-heading font-bold">Technical Interview — {selectedCompany || 'Google'}</h2>
                                <p className="text-sm text-txt-secondary">Completed just now · 30 minutes</p>
                            </div>
                            <div className="text-center">
                                <ProgressRing progress={87} size={80} strokeWidth={5}>
                                    <span className="text-xl font-heading font-bold">87</span>
                                </ProgressRing>
                                <p className="text-xs text-txt-secondary mt-1">Overall Score</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                            {[
                                { label: 'Communication', score: 82 },
                                { label: 'Technical', score: 91 },
                                { label: 'Problem Solving', score: 85 },
                                { label: 'Confidence', score: 78 },
                                { label: 'Time Mgmt', score: 90 },
                            ].map((s) => (
                                <div key={s.label} className="text-center">
                                    <ProgressRing progress={s.score} size={56} strokeWidth={4} color={s.score >= 85 ? '#00FF88' : s.score >= 70 ? '#FFB800' : '#FF4466'}>
                                        <span className="text-xs font-code font-bold">{s.score}</span>
                                    </ProgressRing>
                                    <p className="text-[10px] text-txt-secondary mt-1">{s.label}</p>
                                </div>
                            ))}
                        </div>

                        <h3 className="font-heading font-semibold text-sm mb-3">Per-Question Breakdown</h3>
                        <div className="space-y-3">
                            {[
                                { q: 'Explain the differences between REST and GraphQL', score: 92, feedback: 'Excellent coverage of trade-offs' },
                                { q: 'Design a rate limiter', score: 85, feedback: 'Good approach, mention token bucket algorithm' },
                                { q: 'Tell me about a time you disagreed with your manager', score: 78, feedback: 'Add more specific metrics to STAR story' },
                            ].map((qr, i) => (
                                <div key={i} className="p-4 rounded-lg bg-white/[0.02] flex items-center justify-between">
                                    <div className="flex-1 mr-4">
                                        <p className="text-sm text-txt-primary font-medium">{qr.q}</p>
                                        <p className="text-xs text-txt-secondary mt-1">{qr.feedback}</p>
                                    </div>
                                    <StatusBadge variant={qr.score >= 85 ? 'green' : qr.score >= 70 ? 'amber' : 'red'}>
                                        {qr.score}/100
                                    </StatusBadge>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <NeonButton onClick={() => setStep(0)}>Practice Again</NeonButton>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-3xl mx-auto">
                <h1 className="text-2xl font-heading font-bold">🎭 SimuDrill™ — AI Mock Interview</h1>

                {/* Progress Bar */}
                <div className="flex items-center gap-2 mb-4">
                    {[0, 1, 2].map((s) => (
                        <div key={s} className="flex-1 flex items-center gap-2">
                            <div className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? 'bg-gradient-to-r from-brand-cyan to-brand-purple' : 'bg-white/[0.06]'}`} />
                        </div>
                    ))}
                </div>

                {step === 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <GlassCard className="p-6" hover={false}>
                            <h2 className="text-lg font-heading font-semibold mb-4">Step 1 — Interview Type</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {interviewTypes.map((type) => (
                                    <button
                                        key={type}
                                        className={`p-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${selectedType === type
                                            ? 'bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan'
                                            : 'bg-white/[0.02] border border-white/[0.06] text-txt-secondary hover:border-brand-cyan/20'
                                            }`}
                                        onClick={() => setSelectedType(type)}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-6 flex justify-end">
                                <NeonButton size="sm" onClick={() => setStep(1)}>
                                    <span className="flex items-center gap-1">Next <ChevronRight className="w-4 h-4" /></span>
                                </NeonButton>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {step === 1 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <GlassCard className="p-6" hover={false}>
                            <h2 className="text-lg font-heading font-semibold mb-4">Step 2 — Company Profile</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {companies.map((co) => (
                                    <button
                                        key={co}
                                        className={`p-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${selectedCompany === co
                                            ? 'bg-brand-purple/10 border border-brand-purple/30 text-brand-purple'
                                            : 'bg-white/[0.02] border border-white/[0.06] text-txt-secondary hover:border-brand-purple/20'
                                            }`}
                                        onClick={() => setSelectedCompany(co)}
                                    >
                                        {co}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-6 flex justify-between">
                                <button onClick={() => setStep(0)} className="text-sm text-txt-secondary hover:text-txt-primary cursor-pointer">← Back</button>
                                <NeonButton size="sm" onClick={() => setStep(2)}>
                                    <span className="flex items-center gap-1">Next <ChevronRight className="w-4 h-4" /></span>
                                </NeonButton>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <GlassCard className="p-6" hover={false}>
                            <h2 className="text-lg font-heading font-semibold mb-4">Step 3 — Configuration</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-txt-secondary mb-1.5 block">Difficulty</label>
                                    <select className="w-full bg-bg-card border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-txt-primary">
                                        <option>Intern</option><option>Junior</option><option>Mid-Level</option><option>Senior</option><option>Staff</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-txt-secondary mb-1.5 block">Duration</label>
                                    <div className="flex gap-3">
                                        {['20 min', '30 min', '45 min', '60 min'].map((d) => (
                                            <button key={d} className="flex-1 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-sm text-txt-secondary cursor-pointer hover:border-brand-cyan/20">
                                                <Clock className="w-3 h-3 inline mr-1" />{d}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 text-sm text-txt-secondary cursor-pointer">
                                        <input type="checkbox" className="accent-brand-cyan" /><Mic className="w-4 h-4" /> AI Voice
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-txt-secondary cursor-pointer">
                                        <input type="checkbox" className="accent-brand-cyan" /><Video className="w-4 h-4" /> Webcam
                                    </label>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-between">
                                <button onClick={() => setStep(1)} className="text-sm text-txt-secondary hover:text-txt-primary cursor-pointer">← Back</button>
                                <NeonButton size="lg" onClick={() => setStep(3)}>
                                    <span className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> Start Interview</span>
                                </NeonButton>
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </div>
        </DashboardLayout>
    )
}
