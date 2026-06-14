import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Star } from 'lucide-react'
import NeonButton from '../ui/NeonButton'
import GlassCard from '../ui/GlassCard'

const plans = [
    {
        name: 'Free',
        monthly: 0,
        yearly: 0,
        popular: false,
        features: [
            '10 AI responses/day',
            '1 mock interview/week',
            '30 min transcription/day',
            '2 document uploads',
            'Basic question bank',
        ],
    },
    {
        name: 'Pro',
        monthly: 4880,
        yearly: 3549,
        popular: true,
        features: [
            'Unlimited AI responses',
            'Full stealth mode',
            'All 30+ languages',
            'AI resume builder',
            '10 document uploads',
            'MentorLink™ access',
            'AI voice mode',
            'GPT-4o priority',
            'Priority support',
        ],
    },
    {
        name: 'Enterprise',
        monthly: 20000,
        yearly: 16000,
        popular: false,
        features: [
            'Everything in Pro',
            'Team accounts (10 users)',
            'Admin dashboard',
            'Custom AI personas',
            'API access',
            'SSO integration',
            'White-label option',
            'Dedicated support',
        ],
    },
]

const creditPacks = [
    { name: 'Starter', credits: 500, price: 730 },
    { name: 'Standard', credits: 2500, price: 2920 },
    { name: 'Pro', credits: 8000, price: 6730 },
    { name: 'Unlimited', credits: '∞ (3 months)', price: 20180 },
]

export default function Pricing() {
    const [yearly, setYearly] = useState(false)

    return (
        <section className="section-padding" id="pricing">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                        Simple, <span className="text-gradient">transparent pricing</span>
                    </h2>
                    <p className="text-txt-secondary max-w-xl mx-auto mb-8">
                        Start free, upgrade when you're ready. No hidden fees.
                    </p>

                    {/* Billing Toggle */}
                    <div className="inline-flex items-center gap-3 bg-bg-card rounded-xl p-1 border border-white/[0.08]">
                        <button
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${!yearly ? 'bg-brand-cyan/20 text-brand-cyan' : 'text-txt-secondary'
                                }`}
                            onClick={() => setYearly(false)}
                        >
                            Monthly
                        </button>
                        <button
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${yearly ? 'bg-brand-cyan/20 text-brand-cyan' : 'text-txt-secondary'
                                }`}
                            onClick={() => setYearly(true)}
                        >
                            Yearly
                            <span className="bg-brand-green/20 text-brand-green text-xs px-2 py-0.5 rounded-full">Save 40%</span>
                        </button>
                    </div>
                </motion.div>

                {/* Plan Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.15 }}
                        >
                            <GlassCard
                                className={`p-6 h-full relative ${plan.popular ? 'border-brand-cyan/30 shadow-[0_0_30px_rgba(0,212,255,0.1)]' : ''}`}
                                hover={false}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="bg-gradient-to-r from-brand-cyan to-brand-purple text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                                            <Star className="w-3 h-3" /> MOST POPULAR
                                        </span>
                                    </div>
                                )}

                                <h3 className="text-xl font-heading font-bold text-txt-primary mb-2">{plan.name}</h3>
                                <div className="mb-6">
                                    <motion.span
                                        key={yearly ? 'yearly' : 'monthly'}
                                        className="text-4xl font-heading font-extrabold text-txt-primary"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        ₹{(yearly ? plan.yearly : plan.monthly).toLocaleString()}
                                    </motion.span>
                                    <span className="text-txt-secondary text-sm">/mo</span>
                                </div>

                                <div className="space-y-3 mb-8">
                                    {plan.features.map((f) => (
                                        <div key={f} className="flex items-center gap-2 text-sm text-txt-secondary">
                                            <Check className="w-4 h-4 text-brand-green flex-shrink-0" />
                                            <span>{f}</span>
                                        </div>
                                    ))}
                                </div>

                                <NeonButton
                                    className="w-full"
                                    variant={plan.popular ? 'primary' : 'secondary'}
                                >
                                    {plan.monthly === 0 ? 'Get Started Free' : `Choose ${plan.name}`}
                                </NeonButton>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>

                {/* Credit Packs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h3 className="text-xl font-heading font-semibold text-center mb-6">
                        Credit Packs <span className="text-txt-secondary text-sm">(Never Expire)</span>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {creditPacks.map((pack) => (
                            <GlassCard key={pack.name} className="p-4 text-center">
                                <p className="text-sm font-semibold text-brand-cyan mb-1">{pack.name}</p>
                                <p className="text-2xl font-heading font-bold text-txt-primary mb-1">
                                    {typeof pack.credits === 'number' ? pack.credits.toLocaleString() : pack.credits}
                                </p>
                                <p className="text-sm text-txt-muted mb-3">credits</p>
                                <p className="text-lg font-heading font-semibold text-txt-primary">₹{pack.price.toLocaleString()}</p>
                            </GlassCard>
                        ))}
                    </div>
                    <p className="text-center text-xs text-txt-muted mt-4">
                        1 AI response = 1 credit · 1 mock session = 20 · 1 resume analysis = 10 · 1 doc upload = 5
                    </p>
                </motion.div>
            </div>
        </section>
    )
}
