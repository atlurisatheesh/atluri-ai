import { motion } from 'framer-motion'
import NeonButton from '../ui/NeonButton'
import AnimatedCounter from '../ui/AnimatedCounter'

export default function CreatorSection() {
    return (
        <section className="section-padding bg-bg-secondary/50">
            <div className="max-w-4xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <span className="text-brand-amber font-code text-sm font-semibold tracking-wider uppercase mb-4 block">
                        💰 Creator Program
                    </span>
                    <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                        Earn <span className="text-gradient">₹800–₹8,000/month</span> as an InterviewGenius Creator
                    </h2>
                    <p className="text-txt-secondary max-w-xl mx-auto mb-10">
                        Share your referral link, help others ace their interviews, and earn recurring commissions. Track your earnings in real-time.
                    </p>

                    <div className="grid grid-cols-3 gap-6 mb-10">
                        <div className="glass-card p-4 rounded-xl">
                            <p className="text-2xl font-heading font-bold text-brand-cyan">
                                <AnimatedCounter target={30} suffix="%" />
                            </p>
                            <p className="text-xs text-txt-secondary mt-1">Commission Rate</p>
                        </div>
                        <div className="glass-card p-4 rounded-xl">
                            <p className="text-2xl font-heading font-bold text-brand-green">
                                <AnimatedCounter target={12} prefix="₹" suffix="K" />
                            </p>
                            <p className="text-xs text-txt-secondary mt-1">Avg Creator Earnings</p>
                        </div>
                        <div className="glass-card p-4 rounded-xl">
                            <p className="text-2xl font-heading font-bold text-brand-purple">
                                <AnimatedCounter target={500} suffix="+" />
                            </p>
                            <p className="text-xs text-txt-secondary mt-1">Active Creators</p>
                        </div>
                    </div>

                    <NeonButton variant="accent" size="lg">🚀 Join Creator Program</NeonButton>
                </motion.div>
            </div>
        </section>
    )
}
