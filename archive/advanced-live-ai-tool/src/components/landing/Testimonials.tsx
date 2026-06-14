import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'
import GlassCard from '../ui/GlassCard'

const testimonials = [
    {
        name: 'Priya Sharma',
        role: 'SDE II at Amazon',
        quote: 'Landed my Amazon L5 offer after just 2 weeks of using InterviewGenius. The real-time coding hints during my system design round were game-changing.',
        rating: 5,
    },
    {
        name: 'Alex Chen',
        role: 'Staff Engineer at Google',
        quote: 'The stealth mode is incredible. Used it on 5 consecutive interviews and nobody ever noticed. My answers were so much more structured.',
        rating: 5,
    },
    {
        name: 'Marcus Johnson',
        role: 'Senior SWE at Meta',
        quote: 'The mock interview simulator is scary accurate. It asked me the exact same follow-up questions my real Meta interviewer did.',
        rating: 5,
    },
    {
        name: 'Aisha Patel',
        role: 'Frontend Lead at Stripe',
        quote: 'MentorLink™ saved me. My IIT mentor could see my screen and send me hints in real time. It\'s like having a lifeline nobody can detect.',
        rating: 5,
    },
    {
        name: 'James Kim',
        role: 'ML Engineer at Netflix',
        quote: 'The resume optimizer found 14 issues my human reviewer missed. My ATS score went from 52 to 94. Got callbacks from 8 out of 10 applications.',
        rating: 5,
    },
    {
        name: 'Sarah Williams',
        role: 'DevOps at Microsoft',
        quote: 'The question bank with spaced repetition completely transformed my prep. I went from bombing behavioral rounds to scoring 90+ consistently.',
        rating: 5,
    },
]

export default function Testimonials() {
    const [current, setCurrent] = useState(0)
    const [auto, setAuto] = useState(true)

    useEffect(() => {
        if (!auto) return
        const timer = setInterval(() => {
            setCurrent((c) => (c + 1) % testimonials.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [auto])

    const next = () => { setCurrent((c) => (c + 1) % testimonials.length); setAuto(false) }
    const prev = () => { setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length); setAuto(false) }

    return (
        <section className="section-padding bg-bg-secondary/30">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                        Loved by <span className="text-gradient">100K+ engineers</span>
                    </h2>
                    <p className="text-txt-secondary">Real stories from real users who landed their dream jobs.</p>
                </motion.div>

                <div className="relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={current}
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.4 }}
                        >
                            <GlassCard className="p-8 md:p-10 text-center" hover={false}>
                                <div className="flex justify-center gap-1 mb-4">
                                    {Array.from({ length: testimonials[current].rating }).map((_, i) => (
                                        <Star key={i} className="w-5 h-5 text-brand-amber fill-brand-amber" />
                                    ))}
                                </div>
                                <blockquote className="text-lg md:text-xl text-txt-primary leading-relaxed mb-6 italic">
                                    "{testimonials[current].quote}"
                                </blockquote>
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-cyan/50 to-brand-purple/50" />
                                    <div className="text-left">
                                        <p className="font-heading font-semibold text-txt-primary text-sm">{testimonials[current].name}</p>
                                        <p className="text-xs text-txt-secondary">{testimonials[current].role}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    </AnimatePresence>

                    {/* Nav arrows */}
                    <button
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 p-2 rounded-full glass hover:border-brand-cyan/30 transition-colors cursor-pointer"
                        onClick={prev}
                    >
                        <ChevronLeft className="w-5 h-5 text-txt-secondary" />
                    </button>
                    <button
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 p-2 rounded-full glass hover:border-brand-cyan/30 transition-colors cursor-pointer"
                        onClick={next}
                    >
                        <ChevronRight className="w-5 h-5 text-txt-secondary" />
                    </button>
                </div>

                {/* Dots */}
                <div className="flex justify-center gap-2 mt-6">
                    {testimonials.map((_, i) => (
                        <button
                            key={i}
                            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${i === current ? 'bg-brand-cyan w-6' : 'bg-txt-muted'
                                }`}
                            onClick={() => { setCurrent(i); setAuto(false) }}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}
