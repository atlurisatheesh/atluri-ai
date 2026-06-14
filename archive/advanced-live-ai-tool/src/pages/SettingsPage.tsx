import { User, Lock, Bell, Palette, Keyboard, Globe, Shield, Trash2 } from 'lucide-react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import GlassCard from '../components/ui/GlassCard'
import NeonButton from '../components/ui/NeonButton'

export default function SettingsPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-3xl">
                <h1 className="text-2xl font-heading font-bold">⚙️ Settings</h1>

                {/* Profile */}
                <GlassCard className="p-6" hover={false}>
                    <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Profile</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-cyan/50 to-brand-purple/50" />
                            <button className="text-sm text-brand-cyan hover:underline cursor-pointer">Change avatar</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-txt-secondary mb-1.5 block">Full Name</label>
                                <input defaultValue="John Doe" className="w-full bg-bg-card border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-txt-primary focus:outline-none focus:border-brand-cyan/50" />
                            </div>
                            <div>
                                <label className="text-xs text-txt-secondary mb-1.5 block">Email</label>
                                <input defaultValue="john@example.com" className="w-full bg-bg-card border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-txt-primary focus:outline-none focus:border-brand-cyan/50" />
                            </div>
                        </div>
                        <NeonButton size="sm">Save Changes</NeonButton>
                    </div>
                </GlassCard>

                {/* AI Preferences */}
                <GlassCard className="p-6" hover={false}>
                    <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><Palette className="w-4 h-4" /> AI Preferences</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-txt-secondary mb-1.5 block">Response Length</label>
                            <select className="w-full bg-bg-card border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-txt-primary">
                                <option>Short</option><option>Medium</option><option>Detailed</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-txt-secondary mb-1.5 block">AI Tone</label>
                            <select className="w-full bg-bg-card border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-txt-primary">
                                <option>Professional</option><option>Conversational</option><option>Technical</option><option>Casual</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-txt-secondary mb-1.5 block">Default Language</label>
                            <select className="w-full bg-bg-card border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-txt-primary">
                                <option>English (US)</option><option>English (UK)</option><option>Hindi</option><option>Spanish</option>
                            </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-txt-secondary cursor-pointer">
                            <input type="checkbox" defaultChecked className="accent-brand-cyan" /> Auto-start transcription on session
                        </label>
                    </div>
                </GlassCard>

                {/* Notifications */}
                <GlassCard className="p-6" hover={false}>
                    <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</h3>
                    <div className="space-y-3">
                        {['Email notifications', 'Push notifications', 'In-app notifications', 'Weekly reports', 'Streak reminders', 'Credits alerts'].map((n) => (
                            <label key={n} className="flex items-center justify-between cursor-pointer">
                                <span className="text-sm text-txt-secondary">{n}</span>
                                <input type="checkbox" defaultChecked className="accent-brand-cyan" />
                            </label>
                        ))}
                    </div>
                </GlassCard>

                {/* Security */}
                <GlassCard className="p-6" hover={false}>
                    <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><Shield className="w-4 h-4" /> Security</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                            <div>
                                <p className="text-sm text-txt-primary">Change Password</p>
                                <p className="text-xs text-txt-muted">Last changed 30 days ago</p>
                            </div>
                            <button className="text-xs text-brand-cyan hover:underline cursor-pointer">Change</button>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                            <div>
                                <p className="text-sm text-txt-primary">Two-Factor Authentication</p>
                                <p className="text-xs text-txt-muted">Not enabled</p>
                            </div>
                            <button className="text-xs text-brand-cyan hover:underline cursor-pointer">Enable</button>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                            <div>
                                <p className="text-sm text-txt-primary">Connected Accounts</p>
                                <p className="text-xs text-txt-muted">Google, GitHub</p>
                            </div>
                            <button className="text-xs text-brand-cyan hover:underline cursor-pointer">Manage</button>
                        </div>
                    </div>
                </GlassCard>

                {/* Danger Zone */}
                <GlassCard className="p-6 border-brand-red/20" hover={false}>
                    <h3 className="font-heading font-semibold mb-4 flex items-center gap-2 text-brand-red"><Trash2 className="w-4 h-4" /> Danger Zone</h3>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-txt-primary">Export all data (GDPR)</p>
                            <p className="text-xs text-txt-muted">Download all your data as JSON</p>
                        </div>
                        <button className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-xs text-txt-secondary hover:border-brand-cyan/30 cursor-pointer">Export</button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <div>
                            <p className="text-sm text-brand-red">Delete Account</p>
                            <p className="text-xs text-txt-muted">Permanently delete your account and all data</p>
                        </div>
                        <button className="px-3 py-1.5 rounded-lg border border-brand-red/30 text-xs text-brand-red hover:bg-brand-red/10 cursor-pointer">Delete</button>
                    </div>
                </GlassCard>
            </div>
        </DashboardLayout>
    )
}
