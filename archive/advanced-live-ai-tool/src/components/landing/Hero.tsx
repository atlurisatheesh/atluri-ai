import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import NeonButton from '../ui/NeonButton'
import GhostButton from '../ui/GhostButton'
import StatusBadge from '../ui/StatusBadge'

const companyLogos = [
    'Microsoft', 'Google', 'Amazon', 'Meta', 'Tesla', 'Apple',
    'Netflix', 'Uber', 'Stripe', 'Airbnb', 'Spotify', 'Adobe',
]

const wordVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: 0.3 + i * 0.12, duration: 0.6, ease: 'easeOut' },
    }),
}

export default function Hero() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Animated particle grid background
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationId: number
        const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number }> = []

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = canvas.parentElement?.offsetHeight || 900
        }
        resize()
        window.addEventListener('resize', resize)

        // Create particles
        for (let i = 0; i < 60; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 2 + 0.5,
            })
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            particles.forEach((p, i) => {
                p.x += p.vx
                p.y += p.vy
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1

                ctx.beginPath()
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
                ctx.fillStyle = 'rgba(0, 212, 255, 0.15)'
                ctx.fill()

                // Draw connections
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = p.x - particles[j].x
                    const dy = p.y - particles[j].y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    if (dist < 150) {
                        ctx.beginPath()
                        ctx.moveTo(p.x, p.y)
                        ctx.lineTo(particles[j].x, particles[j].y)
                        ctx.strokeStyle = `rgba(0, 212, 255, ${0.06 * (1 - dist / 150)})`
                        ctx.lineWidth = 0.5
                        ctx.stroke()
                    }
                }
            })
            animationId = requestAnimationFrame(draw)
        }
        draw()

        return () => {
            cancelAnimationFrame(animationId)
            window.removeEventListener('resize', resize)
        }
    }, [])

    const heroWords = ['Your', 'Real-Time,', 'AI', 'Interview', 'Assistant']

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
            {/* Background layers */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#0D0A1F_0%,#050508_70%)]" />
            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

            {/* Gradient orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-cyan/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-purple/5 rounded-full blur-[100px]" />

            <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-8"
                >
                    <StatusBadge variant="cyan" pulse>
                        🏆 #1 AI Interview Assistant · Trusted by 100,000+ Engineers
                    </StatusBadge>
                </motion.div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-extrabold leading-[1.1] mb-6">
                    {heroWords.map((word, i) => (
                        <motion.span
                            key={i}
                            custom={i}
                            variants={wordVariants}
                            initial="hidden"
                            animate="visible"
                            className={`inline-block mr-3 ${word === 'AI' || word === 'Real-Time,' ? 'text-gradient' : ''
                                }`}
                        >
                            {word}
                        </motion.span>
                    ))}
                </h1>

                {/* Subheadline */}
                <motion.p
                    className="text-lg md:text-xl text-txt-secondary max-w-2xl mx-auto mb-10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.6 }}
                >
                    Works on Zoom, Teams, Google Meet — 100% Private & Undetectable.
                    Get structured answers, coding solutions, and interview coaching in real-time.
                </motion.p>

                {/* CTA Row */}
                <motion.div
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2, duration: 0.6 }}
                >
                    <Link to="/register">
                        <NeonButton size="lg">🚀 Start Free Trial</NeonButton>
                    </Link>
                    <GhostButton size="lg">▶ Watch Live Demo</GhostButton>
                </motion.div>

                {/* Social Proof */}
                <motion.div
                    className="flex items-center justify-center gap-3 mb-16"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                >
                    <div className="flex -space-x-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="w-8 h-8 rounded-full border-2 border-bg-primary bg-gradient-to-br from-brand-cyan/50 to-brand-purple/50"
                            />
                        ))}
                    </div>
                    <p className="text-sm text-txt-secondary">
                        Join <span className="text-brand-cyan font-semibold">100K+</span> engineers from Google, Meta, Amazon
                    </p>
                </motion.div>

                {/* Logo Ticker */}
                <motion.div
                    className="overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8 }}
                >
                    <div className="flex animate-ticker whitespace-nowrap">
                        {[...companyLogos, ...companyLogos].map((name, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-center mx-8 opacity-30 hover:opacity-60 transition-opacity"
                            >
                                <span className="text-lg font-heading font-bold text-txt-secondary whitespace-nowrap">{name}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
