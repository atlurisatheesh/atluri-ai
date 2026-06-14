import { motion } from 'framer-motion'
import { Zap, Target, Flame, TrendingUp, Play, BookOpen, FileText } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import AnimatedCounter from '../ui/AnimatedCounter'
import ProgressRing from '../ui/ProgressRing'
import NeonButton from '../ui/NeonButton'
import { Link } from 'react-router-dom'

const statCards = [
    {
        label: 'Credits Remaining',
        value: 2450,
        suffix: '',
        icon: <Zap className="w-5 h-5" />,
        color: 'text-brand-cyan',
        ring: true,
        ringProgress: 61,
    },
    {
        label: 'Sessions This Week',
        value: 12,
        icon: <Target className="w-5 h-5" />,
        color: 'text-brand-purple',
    },
    {
        label: 'Average Score',
        value: 87,
        suffix: '/100',
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'text-brand-green',
    },
    {
        label: 'Prep Streak',
        value: 7,
        suffix: ' days',
        icon: <Flame className="w-5 h-5" />,
        color: 'text-brand-orange',
    },
]

const recentResponses = [
    { question: 'Tell me about a time you handled a conflict...', time: '2h ago' },
    { question: 'What is the time complexity of QuickSort?', time: '4h ago' },
    { question: 'Design a URL shortener system...', time: '1d ago' },
]

export default function Overview() {
    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Welcome */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-2xl font-heading font-bold mb-1">Welcome back, John 👋</h1>
                <p className="text-sm text-txt-secondary">Your interview prep dashboard. Let's crush it today. 🔥</p>
            </motion.div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <GlassCard className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className={`${stat.color}`}>{stat.icon}</span>
                                {stat.ring && (
                                    <ProgressRing progress={stat.ringProgress || 0} size={48} strokeWidth={4}>
                                        <span className="text-xs font-code text-brand-cyan font-semibold">{stat.ringProgress}%</span>
                                    </ProgressRing>
                                )}
                            </div>
                            <p className="text-2xl font-heading font-bold">
                                <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
                            </p>
                            <p className="text-xs text-txt-secondary mt-1">{stat.label}</p>
                        </GlassCard>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
                <Link to="/copilot">
                    <NeonButton size="sm">
                        <span className="flex items-center gap-2"><Play className="w-4 h-4" /> Start Session</span>
                    </NeonButton>
                </Link>
                <Link to="/mock">
                    <NeonButton size="sm" variant="secondary">
                        <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> Practice Now</span>
                    </NeonButton>
                </Link>
                <Link to="/resume">
                    <NeonButton size="sm" variant="accent">
                        <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Build Resume</span>
                    </NeonButton>
                </Link>
            </div>

            {/* Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-6">
                <GlassCard className="p-5" hover={false}>
                    <h3 className="font-heading font-semibold text-sm mb-4">Recent AI Responses</h3>
                    <div className="space-y-3">
                        {recentResponses.map((r, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer">
                                <p className="text-sm text-txt-primary truncate max-w-[80%]">{r.question}</p>
                                <span className="text-xs text-txt-muted">{r.time}</span>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                <GlassCard className="p-5" hover={false}>
                    <h3 className="font-heading font-semibold text-sm mb-4">Questions Due Today</h3>
                    <div className="space-y-3">
                        {['Explain React useCallback vs useMemo', 'What is a B-Tree index?', 'Describe microservices vs monolith'].map((q, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer">
                                <p className="text-sm text-txt-primary">{q}</p>
                                <span className="text-xs bg-brand-amber/20 text-brand-amber px-2 py-0.5 rounded-full">Due</span>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>
        </div>
    )
}
