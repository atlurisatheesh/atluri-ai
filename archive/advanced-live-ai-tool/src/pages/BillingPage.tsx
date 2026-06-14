import { useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Coins, Check, Star, Download, ArrowUpRight } from 'lucide-react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import GlassCard from '../components/ui/GlassCard'
import NeonButton from '../components/ui/NeonButton'
import AnimatedCounter from '../components/ui/AnimatedCounter'

export default function BillingPage() {
    const [yearly, setYearly] = useState(false)

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-heading font-bold">💳 Billing & Credits</h1>

                {/* Current Plan */}
                <GlassCard className="p-6" hover={false} glow>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="font-heading font-bold text-lg">Pro Plan</h2>
                            <p className="text-sm text-txt-secondary">Your subscription renews on April 1, 2025</p>
                        </div>
                        <span className="bg-gradient-to-r from-brand-cyan to-brand-purple text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3" /> ACTIVE
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-4 rounded-lg bg-white/[0.02]">
                            <p className="text-xs text-txt-secondary mb-1">Credits</p>
                            <p className="text-xl font-heading font-bold text-brand-cyan"><AnimatedCounter target={2450} /></p>
                        </div>
                        <div className="p-4 rounded-lg bg-white/[0.02]">
                            <p className="text-xs text-txt-secondary mb-1">This Month Usage</p>
                            <p className="text-xl font-heading font-bold text-brand-purple"><AnimatedCounter target={847} /></p>
                        </div>
                        <div className="p-4 rounded-lg bg-white/[0.02]">
                            <p className="text-xs text-txt-secondary mb-1">Monthly Cost</p>
                            <p className="text-xl font-heading font-bold text-txt-primary">₹4,880</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <NeonButton size="sm" variant="secondary">Upgrade to Enterprise</NeonButton>
                        <button className="px-4 py-2 rounded-lg border border-white/[0.08] text-sm text-txt-secondary hover:border-brand-red/30 hover:text-brand-red transition-all cursor-pointer">
                            Cancel Subscription
                        </button>
                    </div>
                </GlassCard>

                {/* Credit Packs */}
                <div>
                    <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                        <Coins className="w-5 h-5 text-brand-amber" /> Buy Credit Packs
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { name: 'Starter', credits: 500, price: 730 },
                            { name: 'Standard', credits: 2500, price: 2920 },
                            { name: 'Pro', credits: 8000, price: 6730 },
                            { name: 'Unlimited', credits: '∞', price: 20180, note: '3 months' },
                        ].map((pack) => (
                            <GlassCard key={pack.name} className="p-5 text-center">
                                <p className="text-sm font-heading font-semibold text-brand-cyan mb-1">{pack.name}</p>
                                <p className="text-3xl font-heading font-bold text-txt-primary mb-0.5">
                                    {typeof pack.credits === 'number' ? pack.credits.toLocaleString() : pack.credits}
                                </p>
                                <p className="text-xs text-txt-muted mb-3">credits{pack.note ? ` · ${pack.note}` : ''}</p>
                                <NeonButton size="sm" className="w-full">₹{pack.price.toLocaleString()}</NeonButton>
                            </GlassCard>
                        ))}
                    </div>
                </div>

                {/* Transaction History */}
                <GlassCard className="p-5" hover={false}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-heading font-semibold text-sm">Transaction History</h3>
                        <button className="text-xs text-brand-cyan hover:underline cursor-pointer">View All</button>
                    </div>
                    <div className="space-y-2">
                        {[
                            { desc: 'Pro Plan — Monthly', amount: '-₹4,880', date: 'Mar 1, 2025', type: 'subscription' },
                            { desc: 'Standard Credit Pack', amount: '-₹2,920', date: 'Feb 15, 2025', type: 'credits' },
                            { desc: 'AI Response × 23', amount: '-23 credits', date: 'Today', type: 'usage' },
                            { desc: 'Mock Interview', amount: '-20 credits', date: 'Yesterday', type: 'usage' },
                        ].map((tx, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${tx.type === 'subscription' ? 'bg-brand-purple/10 text-brand-purple' :
                                            tx.type === 'credits' ? 'bg-brand-cyan/10 text-brand-cyan' :
                                                'bg-white/[0.04] text-txt-muted'
                                        }`}>
                                        {tx.type === 'subscription' ? <CreditCard className="w-4 h-4" /> :
                                            tx.type === 'credits' ? <Coins className="w-4 h-4" /> :
                                                <ArrowUpRight className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-sm text-txt-primary">{tx.desc}</p>
                                        <p className="text-xs text-txt-muted">{tx.date}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-code text-txt-secondary">{tx.amount}</span>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                {/* Invoices */}
                <GlassCard className="p-5" hover={false}>
                    <h3 className="font-heading font-semibold text-sm mb-4">Invoices</h3>
                    <div className="space-y-2">
                        {['March 2025', 'February 2025', 'January 2025'].map((month) => (
                            <div key={month} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                                <span className="text-sm text-txt-primary">{month}</span>
                                <button className="flex items-center gap-1 text-xs text-brand-cyan hover:underline cursor-pointer">
                                    <Download className="w-3 h-3" /> Download PDF
                                </button>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>
        </DashboardLayout>
    )
}
