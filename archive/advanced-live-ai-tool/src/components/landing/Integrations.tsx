import { motion } from 'framer-motion'
import GlassCard from '../ui/GlassCard'

const platforms = [
    'Zoom', 'Google Meet', 'Microsoft Teams', 'Webex',
    'Amazon Chime', 'Phone Screen', 'HackerRank', 'LeetCode',
    'CoderPad', 'Karat', 'Interviewing.io', 'TestGorilla',
]

export default function Integrations() {
    return (
        <section className="section-padding" id="integrations">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                        Works seamlessly with <span className="text-gradient">any interview platform</span>
                    </h2>
                    <p className="text-txt-secondary max-w-xl mx-auto">
                        From video calls to coding challenges — InterviewGenius integrates with every major platform.
                    </p>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {platforms.map((name, i) => (
                        <motion.div
                            key={name}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <GlassCard className="p-4 text-center cursor-default">
                                <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br from-brand-cyan/20 to-brand-purple/20 flex items-center justify-center">
                                    <span className="text-lg">🔗</span>
                                </div>
                                <p className="text-xs font-semibold text-txt-secondary">{name}</p>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
