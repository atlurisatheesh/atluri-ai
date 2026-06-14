import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Menu, X, Zap } from 'lucide-react'
import NeonButton from '../ui/NeonButton'
import GhostButton from '../ui/GhostButton'

const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'PhantomVeil™', href: '#stealth' },
    { label: 'CodeForge™', href: '#coding' },
    { label: 'MentorLink™', href: '#duo' },
]

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 50)
        window.addEventListener('scroll', onScroll)
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <>
            <motion.nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
                    ? 'bg-bg-primary/80 backdrop-blur-xl border-b border-white/[0.06]'
                    : 'bg-transparent'
                    }`}
                initial={{ y: -80 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2.5 group">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center
                group-hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-shadow duration-300">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-heading font-bold text-txt-primary hidden sm:block">
                                Interview<span className="text-gradient">Genius</span> AI
                            </span>
                        </Link>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-8">
                            {navLinks.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    className="text-sm font-body text-txt-secondary hover:text-brand-cyan transition-colors duration-200 relative group"
                                >
                                    {link.label}
                                    <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-brand-cyan to-brand-purple group-hover:w-full transition-all duration-300" />
                                </a>
                            ))}
                        </div>

                        {/* Desktop CTAs */}
                        <div className="hidden md:flex items-center gap-3">
                            <Link to="/login">
                                <GhostButton size="sm">Log In</GhostButton>
                            </Link>
                            <Link to="/register">
                                <NeonButton size="sm">🚀 Start Free Trial</NeonButton>
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2 rounded-lg text-txt-primary hover:bg-white/[0.06] transition-colors cursor-pointer"
                            onClick={() => setMobileOpen(!mobileOpen)}
                        >
                            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </motion.nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        className="fixed inset-0 z-40 bg-bg-primary/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {navLinks.map((link, i) => (
                            <motion.a
                                key={link.label}
                                href={link.href}
                                className="text-2xl font-heading font-semibold text-txt-primary hover:text-brand-cyan transition-colors"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                onClick={() => setMobileOpen(false)}
                            >
                                {link.label}
                            </motion.a>
                        ))}
                        <div className="flex flex-col gap-3 mt-4">
                            <Link to="/login" onClick={() => setMobileOpen(false)}>
                                <GhostButton size="lg">Log In</GhostButton>
                            </Link>
                            <Link to="/register" onClick={() => setMobileOpen(false)}>
                                <NeonButton size="lg">🚀 Start Free Trial</NeonButton>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
