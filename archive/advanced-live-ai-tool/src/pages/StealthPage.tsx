import { motion } from 'framer-motion'
import { EyeOff, Monitor, Keyboard, Shield, Gauge, MousePointer2 } from 'lucide-react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import GlassCard from '../components/ui/GlassCard'
import NeonButton from '../components/ui/NeonButton'
import StatusBadge from '../components/ui/StatusBadge'

export default function StealthPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-heading font-bold">🕵️ Stealth Settings</h1>
                    <StatusBadge variant="green" pulse>STEALTH ACTIVE</StatusBadge>
                </div>

                {/* Status Card */}
                <GlassCard className="p-6" hover={false} glow>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-heading font-bold text-brand-green mb-1">Stealth Mode: ON</h2>
                            <p className="text-sm text-txt-secondary">Overlay is invisible to screen capture software</p>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-brand-green animate-pulse" />
                        </div>
                    </div>
                    <div className="mt-4 p-3 rounded-lg bg-brand-cyan/5 text-sm text-brand-cyan">
                        Platform detected: <strong>Zoom Meeting</strong>
                    </div>
                </GlassCard>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Transparency Controls */}
                    <GlassCard className="p-6" hover={false}>
                        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-brand-cyan" /> Transparency
                        </h3>
                        <div className="mb-4">
                            <input type="range" min="0" max="100" defaultValue="80" className="w-full accent-brand-cyan" />
                            <div className="flex justify-between text-xs text-txt-muted mt-1">
                                <span>Ghost (0%)</span>
                                <span>80%</span>
                                <span>Full (100%)</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { label: 'Ghost', value: '20%' },
                                { label: 'Dim', value: '40%' },
                                { label: 'Semi', value: '70%' },
                                { label: 'Full', value: '100%' },
                            ].map((preset) => (
                                <button key={preset.label} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs text-txt-secondary hover:border-brand-cyan/30 cursor-pointer text-center">
                                    {preset.label}<br /><span className="text-[10px] text-txt-muted">{preset.value}</span>
                                </button>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Position Controls */}
                    <GlassCard className="p-6" hover={false}>
                        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                            <MousePointer2 className="w-4 h-4 text-brand-purple" /> Overlay Position
                        </h3>
                        <div className="aspect-video bg-bg-primary rounded-lg relative mb-3 border border-white/[0.06]">
                            <div className="absolute top-2 right-2 w-24 h-16 border-2 border-brand-cyan/50 rounded-lg bg-brand-cyan/5 flex items-center justify-center text-[10px] text-brand-cyan">
                                Overlay
                            </div>
                            <div className="absolute bottom-2 left-2 text-[10px] text-txt-muted">Click & drag to reposition</div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {['NW', 'NE', 'SW', 'SE'].map((corner) => (
                                <button key={corner} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs text-txt-secondary hover:border-brand-purple/30 cursor-pointer text-center">
                                    {corner}
                                </button>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Keyboard Shortcuts */}
                    <GlassCard className="p-6" hover={false}>
                        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                            <Keyboard className="w-4 h-4 text-brand-amber" /> Keyboard Shortcuts
                        </h3>
                        <div className="space-y-2">
                            {[
                                { keys: 'Ctrl+Shift+H', action: 'Toggle visibility (panic hide)' },
                                { keys: 'Ctrl+Shift+C', action: 'Copy last answer' },
                                { keys: 'Ctrl+Shift+R', action: 'Regenerate response' },
                                { keys: 'Ctrl+Shift+S', action: 'Start/Stop session' },
                                { keys: 'Ctrl+Shift+P', action: 'Panic button (<1ms hide)' },
                            ].map((s) => (
                                <div key={s.keys} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                                    <span className="text-xs text-txt-secondary">{s.action}</span>
                                    <kbd className="text-xs font-code bg-bg-card px-2 py-0.5 rounded border border-white/[0.08] text-brand-cyan">{s.keys}</kbd>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Anti-Detection */}
                    <GlassCard className="p-6" hover={false}>
                        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-brand-green" /> Anti-Detection
                        </h3>
                        <div className="space-y-3">
                            {[
                                { label: 'CPU compositing (avoid GPU detection)', enabled: true },
                                { label: 'Auto-hide on window focus change', enabled: true },
                                { label: 'Disable notifications during session', enabled: true },
                                { label: 'Hide from taskbar / Alt+Tab', enabled: true },
                                { label: 'Bypass proctoring tools', enabled: true },
                            ].map((f) => (
                                <label key={f.label} className="flex items-center justify-between cursor-pointer">
                                    <span className="text-sm text-txt-secondary">{f.label}</span>
                                    <input type="checkbox" defaultChecked={f.enabled} className="accent-brand-green" />
                                </label>
                            ))}
                        </div>
                    </GlassCard>
                </div>

                {/* Test Button */}
                <GlassCard className="p-6 text-center" hover={false}>
                    <h3 className="font-heading font-semibold mb-2">Test Your Stealth Setup</h3>
                    <p className="text-sm text-txt-secondary mb-4">Run an automated detection simulation to verify your overlay is invisible.</p>
                    <NeonButton>🔍 Test If I'm Invisible</NeonButton>
                </GlassCard>

                {/* Quick Profiles */}
                <div>
                    <h3 className="font-heading font-semibold mb-3">Quick Profiles</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['Zoom Setup', 'Phone Screen', 'In-Person', 'Take-Home'].map((p) => (
                            <GlassCard key={p} className="p-4 text-center cursor-pointer">
                                <p className="text-sm font-semibold text-txt-primary">{p}</p>
                                <p className="text-xs text-txt-muted mt-1">Pre-configured</p>
                            </GlassCard>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
