import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Zap, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import NeonButton from '../components/ui/NeonButton'

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0D0A1F_0%,#050508_70%)]" />
            <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-brand-cyan/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-brand-purple/5 rounded-full blur-[100px]" />

            <motion.div
                className="relative w-full max-w-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Logo */}
                <Link to="/" className="flex items-center justify-center gap-2.5 mb-8">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-heading font-bold">
                        Interview<span className="text-gradient">Genius</span> AI
                    </span>
                </Link>

                <div className="glass-card p-8">
                    <h1 className="text-2xl font-heading font-bold text-center mb-2">Welcome back</h1>
                    <p className="text-sm text-txt-secondary text-center mb-8">Sign in to your account</p>

                    {/* OAuth Buttons */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {['Google', 'GitHub', 'LinkedIn'].map((provider) => (
                            <button
                                key={provider}
                                className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-brand-cyan/30 transition-colors text-sm text-txt-secondary cursor-pointer"
                            >
                                {provider}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-px bg-white/[0.08]" />
                        <span className="text-xs text-txt-muted">or continue with email</span>
                        <div className="flex-1 h-px bg-white/[0.08]" />
                    </div>

                    <form className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-txt-secondary mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    className="w-full bg-bg-card border border-white/[0.08] rounded-lg pl-10 pr-4 py-2.5 text-sm text-txt-primary placeholder-txt-muted focus:outline-none focus:border-brand-cyan/50 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-sm font-semibold text-txt-secondary">Password</label>
                                <a href="#" className="text-xs text-brand-cyan hover:underline">Forgot password?</a>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="w-full bg-bg-card border border-white/[0.08] rounded-lg pl-10 pr-10 py-2.5 text-sm text-txt-primary placeholder-txt-muted focus:outline-none focus:border-brand-cyan/50 transition-colors"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-secondary cursor-pointer"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <NeonButton className="w-full" type="submit">Sign In</NeonButton>
                    </form>

                    <p className="text-center text-sm text-txt-secondary mt-6">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-brand-cyan hover:underline font-semibold">
                            Start free trial
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
