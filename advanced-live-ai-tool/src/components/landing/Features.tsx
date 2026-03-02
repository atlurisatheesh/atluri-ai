import { motion } from 'framer-motion'
import { Zap, Target, Code2, Users, EyeOff, FileText } from 'lucide-react'
import GlassCard from '../ui/GlassCard'

const features = [
    {
        icon: <Zap className="w-6 h-6" />,
        title: 'NeuralWhisper™ Transcription',
        description: 'Our proprietary audio pipeline delivers <300ms transcription with speaker diarization. No word escapes.',
        color: 'text-brand-cyan',
        gradient: 'from-brand-cyan/20 to-brand-cyan/5',
    },
    {
        icon: <Target className="w-6 h-6" />,
        title: 'Genius Response Engine™',
        description: 'Contextual GPT-4o answers fused with your resume + JD + company data. STAR, key points, and avoid-saying — all auto-generated.',
        color: 'text-brand-green',
        gradient: 'from-brand-green/20 to-brand-green/5',
    },
    {
        icon: <Code2 className="w-6 h-6" />,
        title: 'CodeForge™ — Live Coding AI',
        description: 'Monaco editor, 30+ languages, Big-O analysis, progressive hints, edge case detection — built for DSA & system design.',
        color: 'text-brand-purple',
        gradient: 'from-brand-purple/20 to-brand-purple/5',
    },
    {
        icon: <Users className="w-6 h-6" />,
        title: 'MentorLink™ — Human + AI',
        description: 'Invite a remote mentor to watch your live screen and send stealth hints via encrypted WebRTC. Hire FAANG engineers on demand.',
        color: 'text-brand-amber',
        gradient: 'from-brand-amber/20 to-brand-amber/5',
    },
    {
        icon: <EyeOff className="w-6 h-6" />,
        title: 'PhantomVeil™ — Zero Trace',
        description: 'CPU-composited overlay invisible to all screen capture. Sub-millisecond panic hide. Passes all proctoring tests.',
        color: 'text-brand-red',
        gradient: 'from-brand-red/20 to-brand-red/5',
    },
    {
        icon: <FileText className="w-6 h-6" />,
        title: 'DocuMind™ — Smart Context',
        description: 'RAG-powered document intelligence. Upload resume, JD, company research — AI answers draw from YOUR experience.',
        color: 'text-brand-orange',
        gradient: 'from-brand-orange/20 to-brand-orange/5',
    },
]

export default function Features() {
    return (
        <section className="section-padding" id="features">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                        Everything you need to <span className="text-gradient">ace every interview</span>
                    </h2>
                    <p className="text-txt-secondary max-w-xl mx-auto">
                        Six powerful features that give you an unfair advantage in any interview scenario.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                        >
                            <GlassCard className="p-6 h-full">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 ${feature.color}`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-heading font-semibold text-txt-primary mb-2">{feature.title}</h3>
                                <p className="text-sm text-txt-secondary leading-relaxed">{feature.description}</p>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
