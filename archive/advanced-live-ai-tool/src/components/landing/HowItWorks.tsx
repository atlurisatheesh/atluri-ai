import { motion } from 'framer-motion'
import { MonitorPlay, Brain, Trophy } from 'lucide-react'

const steps = [
    {
        icon: <MonitorPlay className="w-8 h-8" />,
        number: '01',
        title: 'Share Your Screen',
        description: 'WebRTC captures interview audio in real-time. Works with any platform — Zoom, Teams, Meet.',
        color: 'text-brand-cyan',
        bgColor: 'from-brand-cyan/20 to-brand-cyan/5',
    },
    {
        icon: <Brain className="w-8 h-8" />,
        number: '02',
        title: 'AI Listens & Thinks',
        description: 'Whisper transcribes every word. GPT-4o generates structured, context-aware answers instantly.',
        color: 'text-brand-purple',
        bgColor: 'from-brand-purple/20 to-brand-purple/5',
    },
    {
        icon: <Trophy className="w-8 h-8" />,
        number: '03',
        title: 'Ace Your Interview',
        description: 'Answers stream to your invisible overlay. Undetectable. Unforgettable. Unstoppable.',
        color: 'text-brand-green',
        bgColor: 'from-brand-green/20 to-brand-green/5',
    },
]

export default function HowItWorks() {
    return (
        <section className="section-padding bg-bg-secondary/50">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                        How it <span className="text-gradient">works</span>
                    </h2>
                    <p className="text-txt-secondary max-w-xl mx-auto">
                        Three simple steps to transform your interview performance.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8 relative">
                    {/* Connection line */}
                    <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-brand-cyan/30 via-brand-purple/30 to-brand-green/30" />

                    {steps.map((step, i) => (
                        <motion.div
                            key={step.title}
                            className="relative text-center"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.2, duration: 0.5 }}
                        >
                            <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${step.bgColor} flex items-center justify-center ${step.color} relative`}>
                                {step.icon}
                                <span className="absolute -top-2 -right-2 text-xs font-code font-bold text-txt-muted">{step.number}</span>
                            </div>
                            <h3 className="text-xl font-heading font-semibold text-txt-primary mb-3">{step.title}</h3>
                            <p className="text-sm text-txt-secondary leading-relaxed">{step.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
