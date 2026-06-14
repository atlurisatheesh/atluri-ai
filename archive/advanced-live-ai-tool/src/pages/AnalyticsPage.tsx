import { motion } from 'framer-motion'
import { TrendingUp, BarChart3, PieChart, Activity, Flame, Trophy, Target } from 'lucide-react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import GlassCard from '../components/ui/GlassCard'
import AnimatedCounter from '../components/ui/AnimatedCounter'
import ProgressRing from '../components/ui/ProgressRing'
import StatusBadge from '../components/ui/StatusBadge'

const achievements = [
    { emoji: '🎯', label: 'First Interview', unlocked: true },
    { emoji: '🔥', label: 'Week Streak', unlocked: true },
    { emoji: '💻', label: 'Code Master', unlocked: true },
    { emoji: '🌟', label: 'Behavioral Pro', unlocked: false },
    { emoji: '🏆', label: '100 Sessions', unlocked: false },
    { emoji: '🚀', label: 'FAANG Ready', unlocked: false },
    { emoji: '💎', label: 'Streak Legend', unlocked: false },
    { emoji: '👑', label: 'Perfect Score', unlocked: false },
]

const weeklyData = [
    { day: 'Mon', score: 72 },
    { day: 'Tue', score: 78 },
    { day: 'Wed', score: 85 },
    { day: 'Thu', score: 82 },
    { day: 'Fri', score: 88 },
    { day: 'Sat', score: 91 },
    { day: 'Sun', score: 87 },
]

export default function AnalyticsPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-heading font-bold">📊 Analytics & Progress</h1>

                {/* Top Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { icon: <TrendingUp className="w-5 h-5" />, label: 'Avg Score', value: 87, suffix: '/100', color: 'text-brand-green' },
                        { icon: <Activity className="w-5 h-5" />, label: 'Total Sessions', value: 43, color: 'text-brand-cyan' },
                        { icon: <Flame className="w-5 h-5" />, label: 'Current Streak', value: 7, suffix: ' days', color: 'text-brand-orange' },
                        { icon: <Trophy className="w-5 h-5" />, label: 'Badges Earned', value: 3, suffix: '/8', color: 'text-brand-purple' },
                    ].map((stat, i) => (
                        <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                            <GlassCard className="p-5">
                                <span className={stat.color}>{stat.icon}</span>
                                <p className="text-2xl font-heading font-bold mt-2">
                                    <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
                                </p>
                                <p className="text-xs text-txt-secondary mt-1">{stat.label}</p>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Performance Chart */}
                    <GlassCard className="p-5" hover={false}>
                        <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-brand-cyan" /> Weekly Performance
                        </h3>
                        <div className="flex items-end justify-between gap-2 h-40">
                            {weeklyData.map((d) => (
                                <div key={d.day} className="flex flex-col items-center gap-1 flex-1">
                                    <motion.div
                                        className="w-full rounded-t-lg bg-gradient-to-t from-brand-cyan/30 to-brand-cyan/60"
                                        initial={{ height: 0 }}
                                        animate={{ height: `${(d.score / 100) * 140}px` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                    />
                                    <span className="text-[10px] text-txt-muted">{d.day}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Skills Radar (simplified) */}
                    <GlassCard className="p-5" hover={false}>
                        <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
                            <Target className="w-4 h-4 text-brand-purple" /> Skills Breakdown
                        </h3>
                        <div className="space-y-3">
                            {[
                                { skill: 'Technical', score: 91, color: '#00D4FF' },
                                { skill: 'Communication', score: 82, color: '#7B2FFF' },
                                { skill: 'Problem Solving', score: 88, color: '#00FF88' },
                                { skill: 'Confidence', score: 75, color: '#FFB800' },
                                { skill: 'Time Management', score: 90, color: '#FF6B35' },
                            ].map((s) => (
                                <div key={s.skill} className="flex items-center gap-3">
                                    <span className="text-xs text-txt-secondary w-28">{s.skill}</span>
                                    <div className="flex-1 h-2 rounded-full bg-white/[0.06]">
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: s.color }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${s.score}%` }}
                                            transition={{ duration: 1, delay: 0.3 }}
                                        />
                                    </div>
                                    <span className="text-xs font-code text-txt-primary w-8 text-right">{s.score}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Category Breakdown */}
                    <GlassCard className="p-5" hover={false}>
                        <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-brand-amber" /> Question Categories
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { cat: 'Behavioral', pct: 35, color: 'bg-brand-cyan' },
                                { cat: 'Technical', pct: 30, color: 'bg-brand-purple' },
                                { cat: 'Coding', pct: 25, color: 'bg-brand-green' },
                                { cat: 'System Design', pct: 10, color: 'bg-brand-amber' },
                            ].map((c) => (
                                <div key={c.cat} className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${c.color}`} />
                                    <span className="text-xs text-txt-secondary">{c.cat}</span>
                                    <span className="text-xs font-code text-txt-primary ml-auto">{c.pct}%</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Achievements */}
                    <GlassCard className="p-5" hover={false}>
                        <h3 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-brand-green" /> Achievements
                        </h3>
                        <div className="grid grid-cols-4 gap-3">
                            {achievements.map((a) => (
                                <div
                                    key={a.label}
                                    className={`text-center p-2 rounded-lg ${a.unlocked ? 'bg-white/[0.04]' : 'bg-white/[0.01] opacity-40'}`}
                                >
                                    <span className="text-2xl">{a.emoji}</span>
                                    <p className="text-[10px] text-txt-secondary mt-1">{a.label}</p>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>

                {/* Activity Heatmap */}
                <GlassCard className="p-5" hover={false}>
                    <h3 className="font-heading font-semibold text-sm mb-4">🔥 Activity Heatmap</h3>
                    <div className="grid grid-cols-[repeat(52,1fr)] gap-1">
                        {Array.from({ length: 364 }, (_, i) => {
                            const intensity = Math.random()
                            return (
                                <div
                                    key={i}
                                    className="aspect-square rounded-sm"
                                    style={{
                                        backgroundColor: intensity > 0.7
                                            ? 'rgba(0,212,255,0.6)'
                                            : intensity > 0.4
                                                ? 'rgba(0,212,255,0.3)'
                                                : intensity > 0.2
                                                    ? 'rgba(0,212,255,0.1)'
                                                    : 'rgba(255,255,255,0.03)',
                                    }}
                                />
                            )
                        })}
                    </div>
                </GlassCard>
            </div>
        </DashboardLayout>
    )
}
