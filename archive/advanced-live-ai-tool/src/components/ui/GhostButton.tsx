import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface GhostButtonProps {
    children: ReactNode
    className?: string
    onClick?: () => void
    size?: 'sm' | 'md' | 'lg'
}

const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
}

export default function GhostButton({ children, className = '', onClick, size = 'md' }: GhostButtonProps) {
    return (
        <motion.button
            className={`
        relative font-heading font-semibold rounded-xl cursor-pointer
        bg-transparent border border-white/20 text-txt-primary
        hover:border-brand-cyan/50 hover:text-brand-cyan
        transition-colors duration-300
        ${sizes[size]}
        ${className}
      `}
            whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(0,212,255,0.2)' }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
        >
            {children}
        </motion.button>
    )
}
