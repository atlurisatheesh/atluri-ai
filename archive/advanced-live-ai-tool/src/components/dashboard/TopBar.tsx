import { useState } from 'react'
import { Search, Bell, ChevronDown, Coins } from 'lucide-react'
import AnimatedCounter from '../ui/AnimatedCounter'

export default function TopBar() {
    const [notifOpen, setNotifOpen] = useState(false)

    return (
        <header className="h-16 border-b border-white/[0.06] bg-bg-primary/80 backdrop-blur-xl flex items-center justify-between px-6">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                <input
                    type="text"
                    placeholder="Search sessions, questions, documents..."
                    className="w-full bg-bg-card border border-white/[0.08] rounded-lg pl-10 pr-4 py-2 text-sm text-txt-primary placeholder-txt-muted focus:outline-none focus:border-brand-cyan/50"
                />
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
                {/* Credits */}
                <div className="flex items-center gap-2 bg-brand-cyan/10 px-3 py-1.5 rounded-lg">
                    <Coins className="w-4 h-4 text-brand-cyan" />
                    <span className="text-sm font-code font-semibold text-brand-cyan">
                        <AnimatedCounter target={2450} />
                    </span>
                </div>

                {/* Notifications */}
                <div className="relative">
                    <button
                        className="relative p-2 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
                        onClick={() => setNotifOpen(!notifOpen)}
                    >
                        <Bell className="w-5 h-5 text-txt-secondary" />
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-red" />
                    </button>
                    {notifOpen && (
                        <div className="absolute right-0 top-12 w-80 glass-card p-4 rounded-xl shadow-2xl z-50">
                            <h4 className="text-sm font-heading font-semibold mb-3">Notifications</h4>
                            <div className="space-y-2">
                                <div className="p-3 rounded-lg bg-white/[0.02] text-sm">
                                    <p className="text-txt-primary">🔥 Your 7-day streak is alive!</p>
                                    <p className="text-xs text-txt-muted mt-1">2 hours ago</p>
                                </div>
                                <div className="p-3 rounded-lg bg-white/[0.02] text-sm">
                                    <p className="text-txt-primary">📊 Weekly report ready</p>
                                    <p className="text-xs text-txt-muted mt-1">1 day ago</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile */}
                <button className="flex items-center gap-2 hover:bg-white/[0.04] p-1.5 rounded-lg transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-cyan/50 to-brand-purple/50" />
                    <span className="text-sm text-txt-primary font-medium hidden md:block">John Doe</span>
                    <ChevronDown className="w-4 h-4 text-txt-muted" />
                </button>
            </div>
        </header>
    )
}
