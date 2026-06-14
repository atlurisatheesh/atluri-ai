import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import NeonButton from '../ui/NeonButton'
import { FileText, Sparkles, BarChart3, Download } from 'lucide-react'

const steps = [
    { icon: <FileText className="w-6 h-6" />, label: 'Upload' },
    { icon: <Sparkles className="w-6 h-6" />, label: 'AI Analyzes' },
    { icon: <BarChart3 className="w-6 h-6" />, label: 'ATS Score' },
    { icon: <Download className="w-6 h-6" />, label: 'Download PDF' },
]

export default function ResumeCallout() {
    return (
        <section className="section-padding relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 via-bg-primary to-brand-cyan/5" />
            <div className="relative max-w-4xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                        AI Resume Builder — <span className="text-gradient">Get noticed. Get hired.</span>
                    </h2>
                    <p className="text-txt-secondary max-w-xl mx-auto mb-10">
                        Upload your resume → AI analyzes ATS compatibility → Rewrites weak bullets → Download a perfect, optimized PDF.
                    </p>

                    <div className="flex items-center justify-center gap-4 md:gap-8 mb-10">
                        {steps.map((step, i) => (
                            <motion.div
                                key={step.label}
                                className="flex flex-col items-center gap-2"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                            >
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-cyan/10 to-brand-purple/10 border border-white/[0.08] flex items-center justify-center text-brand-cyan">
                                    {step.icon}
                                </div>
                                <span className="text-xs text-txt-secondary font-semibold">{step.label}</span>
                                {i < steps.length - 1 && (
                                    <div className="hidden md:block absolute" style={{ left: `${25 + i * 25}%` }}>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>

                    <Link to="/resume">
                        <NeonButton size="lg">📄 Build My Resume Free</NeonButton>
                    </Link>
                </motion.div>
            </div>
        </section>
    )
}
