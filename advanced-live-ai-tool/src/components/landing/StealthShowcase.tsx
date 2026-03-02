import { motion } from 'framer-motion'
import { Check, EyeOff, Shield, Monitor, Keyboard, Gauge, ShieldCheck } from 'lucide-react'

const stealthFeatures = [
    { icon: <EyeOff className="w-5 h-5" />, text: 'Invisible to screen share and recording software' },
    { icon: <Shield className="w-5 h-5" />, text: 'Undetectable by Honorlock, ProctorU, Respondus' },
    { icon: <Monitor className="w-5 h-5" />, text: 'No window in taskbar or Alt+Tab' },
    { icon: <ShieldCheck className="w-5 h-5" />, text: 'Works through any OS-level capture layer' },
    { icon: <Gauge className="w-5 h-5" />, text: 'Transparency slider from 10% ghost to 100% visible' },
    { icon: <Keyboard className="w-5 h-5" />, text: 'Instant panic button to hide everything in <1ms' },
]

export default function StealthShowcase() {
    return (
        <section className="section-padding relative overflow-hidden" id="stealth">
            {/* Dark gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-bg-primary via-[#0a0a18] to-bg-primary" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-purple/5 rounded-full blur-[120px]" />

            <div className="relative max-w-6xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left - Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="text-brand-red font-code text-sm font-semibold tracking-wider uppercase mb-4 block">
                            🕵️ PhantomVeil™ Technology
                        </span>
                        <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6 leading-tight">
                            100% Private and{' '}
                            <span className="text-gradient">Undetectable</span>
                        </h2>
                        <p className="text-txt-secondary mb-10 max-w-md leading-relaxed">
                            Our overlay operates at the browser compositor level. Screen capture software literally cannot see it. Your interview, your advantage, your secret.
                        </p>

                        <div className="space-y-4">
                            {stealthFeatures.map((feature, i) => (
                                <motion.div
                                    key={i}
                                    className="flex items-center gap-3"
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.3 + i * 0.1 }}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center text-brand-green">
                                        <Check className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm text-txt-primary">{feature.text}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Right - Visual Demo */}
                    <motion.div
                        className="relative"
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="glass-card p-6 relative">
                            {/* Simulated screen */}
                            <div className="bg-bg-primary rounded-lg p-4 mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-3 h-3 rounded-full bg-brand-red/60" />
                                    <div className="w-3 h-3 rounded-full bg-brand-amber/60" />
                                    <div className="w-3 h-3 rounded-full bg-brand-green/60" />
                                    <span className="text-xs text-txt-muted ml-2">Zoom Meeting</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-3 bg-white/[0.04] rounded w-full" />
                                    <div className="h-3 bg-white/[0.04] rounded w-3/4" />
                                    <div className="h-3 bg-white/[0.04] rounded w-5/6" />
                                </div>
                            </div>

                            {/* Floating stealth overlay indicator */}
                            <motion.div
                                className="absolute top-8 right-8 glass-card p-3 border border-brand-cyan/20"
                                animate={{
                                    opacity: [0.3, 1, 0.3],
                                    boxShadow: ['0 0 0 rgba(0,212,255,0)', '0 0 20px rgba(0,212,255,0.3)', '0 0 0 rgba(0,212,255,0)'],
                                }}
                                transition={{ duration: 3, repeat: Infinity }}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                                    <span className="text-xs text-brand-green font-code">STEALTH ACTIVE</span>
                                </div>
                            </motion.div>

                            <div className="text-center text-txt-muted text-sm mt-2">
                                <p>The AI overlay is invisible to the interviewer</p>
                                <p className="text-brand-cyan text-xs mt-1">Press Ctrl+Shift+H to toggle</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
