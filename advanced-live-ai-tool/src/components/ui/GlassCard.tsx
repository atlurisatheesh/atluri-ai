import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface GlassCardProps {
    children: ReactNode
    className?: string
    hover?: boolean
    glow?: boolean
    onClick?: () => void
}

export default function GlassCard({ children, className = '', hover = true, glow = false, onClick }: GlassCardProps) {
    return (
        <motion.div
            className={`
        relative overflow-hidden rounded-xl
        bg-gradient-to-br from-white/[0.05] to-white/[0.02]
        backdrop-blur-xl border border-white/[0.08]
        ${glow ? 'border-brand-cyan/30 shadow-[0_0_30px_rgba(0,212,255,0.15)]' : ''}
        ${className}
      `}
            whileHover={hover ? { y: -4, borderColor: 'rgba(0,212,255,0.3)', boxShadow: '0 0 30px rgba(0,212,255,0.15)' } : undefined}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={onClick}
        >
            {children}
        </motion.div>
    )
}
