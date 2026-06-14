import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Home, Zap, Code2, Theater, Users, EyeOff, FileText,
    BookOpen, FolderOpen, BarChart3, History, Settings,
    CreditCard, HelpCircle, ChevronLeft, ChevronRight
} from 'lucide-react'

const navItems = [
    { icon: <Home className="w-5 h-5" />, label: 'Overview', path: '/dashboard' },
    { icon: <Zap className="w-5 h-5" />, label: 'NeuralWhisper™', path: '/copilot', highlight: true },
    { icon: <Code2 className="w-5 h-5" />, label: 'CodeForge™', path: '/coding' },
    { icon: <Theater className="w-5 h-5" />, label: 'SimuDrill™', path: '/mock' },
    { icon: <Users className="w-5 h-5" />, label: 'MentorLink™', path: '/duo' },
    { icon: <EyeOff className="w-5 h-5" />, label: 'PhantomVeil™', path: '/stealth' },
    { icon: <FileText className="w-5 h-5" />, label: 'ProfileCraft™', path: '/resume' },
    { icon: <BookOpen className="w-5 h-5" />, label: 'PrepVault™', path: '/questions' },
    { icon: <FolderOpen className="w-5 h-5" />, label: 'DocuMind™', path: '/documents' },
    { icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics', path: '/analytics' },
    { icon: <History className="w-5 h-5" />, label: 'Session History', path: '/dashboard' },
    { divider: true },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', path: '/settings' },
    { icon: <CreditCard className="w-5 h-5" />, label: 'Billing & Credits', path: '/billing' },
    { icon: <HelpCircle className="w-5 h-5" />, label: 'Help & Tutorials', path: '/dashboard' },
]

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const location = useLocation()

    return (
        <motion.aside
            className="fixed left-0 top-0 bottom-0 z-40 bg-bg-secondary/80 backdrop-blur-xl border-r border-white/[0.06] flex flex-col"
            animate={{ width: collapsed ? 64 : 260 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
            {/* Logo */}
            <div className="h-16 flex items-center px-4 border-b border-white/[0.06]">
                <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                className="text-sm font-heading font-bold whitespace-nowrap"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                Interview<span className="text-gradient">Genius</span>
                            </motion.span>
                        )}
                    </AnimatePresence>
                </Link>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                {navItems.map((item, i) => {
                    if ('divider' in item) {
                        return <div key={i} className="my-3 mx-2 h-px bg-white/[0.06]" />
                    }
                    const isActive = location.pathname === item.path
                    return (
                        <Link
                            key={item.path + item.label}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group
                ${isActive
                                    ? 'bg-brand-cyan/10 text-brand-cyan'
                                    : item.highlight
                                        ? 'text-brand-cyan hover:bg-brand-cyan/5'
                                        : 'text-txt-secondary hover:bg-white/[0.04] hover:text-txt-primary'
                                }
              `}
                        >
                            {isActive && (
                                <motion.div
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-brand-cyan"
                                    layoutId="sidebar-active"
                                    transition={{ duration: 0.3 }}
                                />
                            )}
                            <span className="flex-shrink-0">{item.icon}</span>
                            <AnimatePresence>
                                {!collapsed && (
                                    <motion.span
                                        className="whitespace-nowrap"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                            {item.highlight && !collapsed && (
                                <span className="ml-auto text-[10px] bg-brand-cyan/20 text-brand-cyan px-1.5 py-0.5 rounded-full">LIVE</span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Collapse Toggle */}
            <button
                className="h-12 flex items-center justify-center border-t border-white/[0.06] text-txt-muted hover:text-txt-secondary transition-colors cursor-pointer"
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
        </motion.aside>
    )
}
