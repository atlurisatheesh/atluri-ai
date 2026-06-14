import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface NeonButtonProps {
    children: ReactNode
    className?: string
    onClick?: () => void
    variant?: 'primary' | 'secondary' | 'accent'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    type?: 'button' | 'submit'
}

const variants = {
    primary: 'bg-gradient-to-r from-brand-cyan to-brand-purple text-white',
    secondary: 'bg-gradient-to-r from-brand-purple to-brand-cyan text-white',
    accent: 'bg-gradient-to-r from-brand-orange to-brand-red text-white',
}

const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
}

export default function NeonButton({
    children,
    className = '',
    onClick,
    variant = 'primary',
    size = 'md',
    disabled = false,
    type = 'button',
}: NeonButtonProps) {
    return (
        <motion.button
            type={type}
            className={`
        relative font-heading font-semibold rounded-xl
        ${variants[variant]} ${sizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
            whileHover={!disabled ? {
                scale: 1.02,
                boxShadow: '0 0 30px rgba(0,212,255,0.4), 0 0 60px rgba(0,212,255,0.15)',
            } : undefined}
            whileTap={!disabled ? { scale: 0.98 } : undefined}
            transition={{ duration: 0.2 }}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </motion.button>
    )
}
