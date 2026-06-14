import { motion } from 'framer-motion'
import GlassCard from '../ui/GlassCard'
import { Play } from 'lucide-react'

const demos = [
    { platform: 'Zoom Demo', icon: '📹' },
    { platform: 'Google Meet', icon: '🎥' },
    { platform: 'Microsoft Teams', icon: '💼' },
    { platform: 'Phone Screen', icon: '📱' },
    { platform: 'HackerRank', icon: '💻' },
    { platform: 'LeetCode', icon: '🧩' },
]

export default function DemoVideos() {
    return (
        <section className="section-padding bg-bg-secondary/30">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                        See it in <span className="text-gradient">action</span>
                    </h2>
                    <p className="text-txt-secondary">Watch how InterviewGenius works on every platform.</p>
                </motion.div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {demos.map((demo, i) => (
                        <motion.div
                            key={demo.platform}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <GlassCard className="group cursor-pointer overflow-hidden">
                                <div className="relative aspect-video bg-gradient-to-br from-bg-card to-bg-primary flex items-center justify-center">
                                    <span className="text-4xl mb-2">{demo.icon}</span>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                        <div className="w-14 h-14 rounded-full bg-brand-cyan/90 flex items-center justify-center shadow-[0_0_30px_rgba(0,212,255,0.5)]">
                                            <Play className="w-6 h-6 text-white ml-0.5" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <p className="font-heading font-semibold text-sm text-txt-primary">{demo.platform}</p>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
