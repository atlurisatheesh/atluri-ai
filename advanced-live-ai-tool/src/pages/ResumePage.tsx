import { useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, Sparkles, Download, BarChart3, Target } from 'lucide-react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import GlassCard from '../components/ui/GlassCard'
import NeonButton from '../components/ui/NeonButton'
import ProgressRing from '../components/ui/ProgressRing'
import StatusBadge from '../components/ui/StatusBadge'

const templates = [
    { name: 'Modern Dark', accent: '#00D4FF', bg: '#1a1a2e', headerStyle: 'gradient', popular: true },
    { name: 'Clean Minimal', accent: '#6C63FF', bg: '#ffffff', headerStyle: 'line', popular: false },
    { name: 'Two-Column', accent: '#FF6B6B', bg: '#fafafa', headerStyle: 'split', popular: true },
    { name: 'Sidebar Classic', accent: '#2ECC71', bg: '#f5f5f5', headerStyle: 'sidebar', popular: false },
    { name: 'ATS Optimized', accent: '#3498DB', bg: '#ffffff', headerStyle: 'simple', popular: true },
    { name: 'Executive', accent: '#C9A84C', bg: '#1c1c1c', headerStyle: 'elegant', popular: false },
    { name: 'Creative Portfolio', accent: '#E056A0', bg: '#fdf6ff', headerStyle: 'bold', popular: false },
    { name: 'Tech Focused', accent: '#00E676', bg: '#0d1117', headerStyle: 'terminal', popular: false },
]

type TemplateType = typeof templates[0]

function TemplatePreview({ template, isActive, onSelect }: { template: TemplateType; isActive: boolean; onSelect: () => void }) {
    const isDark = template.bg.startsWith('#1') || template.bg.startsWith('#0')

    return (
        <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSelect}
        >
            <GlassCard
                className={`p-3 cursor-pointer transition-all ${isActive ? 'ring-2 ring-brand-cyan shadow-[0_0_20px_rgba(0,212,255,0.2)]' : 'hover:border-white/20'}`}
            >
                <div
                    className="aspect-[3/4] rounded-lg mb-2.5 overflow-hidden relative"
                    style={{ backgroundColor: template.bg }}
                >
                    {template.headerStyle === 'gradient' && (
                        <div className="h-[22%] w-full" style={{ background: `linear-gradient(135deg, ${template.accent}, ${template.accent}88)` }}>
                            <div className="p-2">
                                <div className="h-2 w-[60%] rounded-full bg-white/80 mb-1" />
                                <div className="h-1 w-[40%] rounded-full bg-white/50" />
                            </div>
                        </div>
                    )}
                    {template.headerStyle === 'line' && (
                        <div className="p-3">
                            <div className="h-2.5 w-[55%] rounded bg-gray-800 mb-1.5" />
                            <div className="h-1 w-[70%] rounded bg-gray-300 mb-2" />
                            <div className="h-[2px] w-full" style={{ backgroundColor: template.accent }} />
                        </div>
                    )}
                    {template.headerStyle === 'split' && (
                        <div className="flex h-full">
                            <div className="w-[35%] h-full p-2" style={{ backgroundColor: `${template.accent}15` }}>
                                <div className="w-6 h-6 rounded-full mb-2 mx-auto" style={{ backgroundColor: template.accent }} />
                                <div className="h-1 w-full rounded bg-gray-300 mb-1" />
                                <div className="h-1 w-[70%] rounded bg-gray-200 mb-2" />
                                <div className="h-1 w-full rounded bg-gray-200 mb-0.5" />
                                <div className="h-1 w-[80%] rounded bg-gray-200 mb-0.5" />
                                <div className="h-1 w-[60%] rounded bg-gray-200" />
                            </div>
                            <div className="flex-1 p-2">
                                <div className="h-1.5 w-[80%] rounded bg-gray-400 mb-1.5" />
                                <div className="h-1 w-full rounded bg-gray-200 mb-0.5" />
                                <div className="h-1 w-[90%] rounded bg-gray-200 mb-0.5" />
                                <div className="h-1 w-[70%] rounded bg-gray-200 mb-2" />
                                <div className="h-1.5 w-[50%] rounded bg-gray-400 mb-1" />
                                <div className="h-1 w-full rounded bg-gray-200 mb-0.5" />
                                <div className="h-1 w-[85%] rounded bg-gray-200" />
                            </div>
                        </div>
                    )}
                    {template.headerStyle === 'sidebar' && (
                        <div className="flex h-full">
                            <div className="w-[30%] h-full" style={{ backgroundColor: template.accent }}>
                                <div className="p-1.5">
                                    <div className="w-5 h-5 rounded-full bg-white/30 mb-1.5 mx-auto" />
                                    <div className="h-0.5 w-full rounded bg-white/40 mb-0.5" />
                                    <div className="h-0.5 w-[70%] rounded bg-white/30 mb-1.5" />
                                    <div className="h-0.5 w-full rounded bg-white/20 mb-0.5" />
                                    <div className="h-0.5 w-[80%] rounded bg-white/20" />
                                </div>
                            </div>
                            <div className="flex-1 p-2">
                                <div className="h-2 w-[70%] rounded bg-gray-700 mb-1.5" />
                                <div className="h-1 w-full rounded bg-gray-200 mb-0.5" />
                                <div className="h-1 w-[90%] rounded bg-gray-200 mb-0.5" />
                                <div className="h-1 w-[75%] rounded bg-gray-200" />
                            </div>
                        </div>
                    )}
                    {template.headerStyle === 'simple' && (
                        <div className="p-3">
                            <div className="h-2.5 w-[50%] rounded bg-gray-800 mb-1" />
                            <div className="h-1 w-[80%] rounded bg-gray-400 mb-3" />
                            <div className="h-1.5 w-[35%] rounded mb-1.5" style={{ backgroundColor: template.accent }} />
                            <div className="h-1 w-full rounded bg-gray-200 mb-0.5" />
                            <div className="h-1 w-[95%] rounded bg-gray-200 mb-0.5" />
                            <div className="h-1 w-[85%] rounded bg-gray-200 mb-2" />
                            <div className="h-1.5 w-[40%] rounded mb-1.5" style={{ backgroundColor: template.accent }} />
                            <div className="h-1 w-full rounded bg-gray-200 mb-0.5" />
                            <div className="h-1 w-[90%] rounded bg-gray-200" />
                        </div>
                    )}
                    {template.headerStyle === 'elegant' && (
                        <div className="p-3">
                            <div className="text-center mb-2">
                                <div className="h-2 w-[45%] mx-auto rounded" style={{ backgroundColor: template.accent }} />
                                <div className="h-0.5 w-[60%] mx-auto rounded bg-gray-500 mt-1.5" />
                            </div>
                            <div className="h-[1px] w-full bg-gray-600 mb-2" />
                            <div className="h-1 w-full rounded bg-gray-600 mb-0.5" />
                            <div className="h-1 w-[90%] rounded bg-gray-600 mb-0.5" />
                            <div className="h-1 w-[75%] rounded bg-gray-600 mb-2" />
                            <div className="h-[1px] w-full bg-gray-600 mb-1.5" />
                            <div className="h-1 w-full rounded bg-gray-600 mb-0.5" />
                            <div className="h-1 w-[85%] rounded bg-gray-600" />
                        </div>
                    )}
                    {template.headerStyle === 'bold' && (
                        <div className="p-2">
                            <div className="h-[28%] rounded-lg mb-2 flex items-end p-2" style={{ background: `linear-gradient(135deg, ${template.accent}40, ${template.accent}15)` }}>
                                <div>
                                    <div className="h-2.5 w-20 rounded bg-gray-800 mb-1" />
                                    <div className="h-1 w-16 rounded" style={{ backgroundColor: template.accent }} />
                                </div>
                            </div>
                            <div className="h-1 w-full rounded bg-gray-300 mb-0.5" />
                            <div className="h-1 w-[90%] rounded bg-gray-200 mb-0.5" />
                            <div className="h-1 w-[70%] rounded bg-gray-200 mb-1.5" />
                            <div className="flex gap-1">
                                <div className="h-3 flex-1 rounded" style={{ backgroundColor: `${template.accent}20` }} />
                                <div className="h-3 flex-1 rounded" style={{ backgroundColor: `${template.accent}15` }} />
                                <div className="h-3 flex-1 rounded" style={{ backgroundColor: `${template.accent}10` }} />
                            </div>
                        </div>
                    )}
                    {template.headerStyle === 'terminal' && (
                        <div className="p-2 font-mono">
                            <div className="flex gap-1 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            </div>
                            <div className="h-1 w-[30%] rounded mb-1" style={{ backgroundColor: template.accent }} />
                            <div className="h-1 w-[50%] rounded bg-gray-500 mb-0.5" />
                            <div className="h-0.5 w-full rounded bg-gray-700 mb-0.5" />
                            <div className="h-0.5 w-[85%] rounded bg-gray-700 mb-0.5" />
                            <div className="h-0.5 w-[90%] rounded bg-gray-700 mb-1.5" />
                            <div className="h-1 w-[25%] rounded mb-1" style={{ backgroundColor: template.accent }} />
                            <div className="h-0.5 w-full rounded bg-gray-700 mb-0.5" />
                            <div className="h-0.5 w-[70%] rounded bg-gray-700" />
                        </div>
                    )}

                    {template.popular && (
                        <div className="absolute top-1 right-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: template.accent, color: isDark ? '#fff' : '#000' }}>
                            ★ POPULAR
                        </div>
                    )}
                    {isActive && (
                        <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-brand-cyan flex items-center justify-center">
                            <span className="text-[8px] text-white font-bold">✓</span>
                        </div>
                    )}
                </div>
                <p className={`text-xs font-semibold ${isActive ? 'text-brand-cyan' : 'text-txt-secondary'}`}>{template.name}</p>
            </GlassCard>
        </motion.div>
    )
}

export default function ResumePage() {
    const [uploaded, setUploaded] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState('Modern Dark')

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <h1 className="text-2xl font-heading font-bold">📄 ProfileCraft™ — AI Resume Builder</h1>

                {!uploaded ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <GlassCard className="p-12 text-center" hover={false}>
                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-brand-cyan/10 to-brand-purple/10 flex items-center justify-center border-2 border-dashed border-white/[0.15]">
                                <Upload className="w-10 h-10 text-brand-cyan" />
                            </div>
                            <h2 className="text-xl font-heading font-bold mb-2">Upload Your Resume</h2>
                            <p className="text-sm text-txt-secondary mb-6">Supports PDF, DOCX, and TXT · Max 10MB</p>
                            <NeonButton onClick={() => setUploaded(true)}>
                                <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Choose File</span>
                            </NeonButton>
                        </GlassCard>
                    </motion.div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Analysis Panel */}
                        <div className="space-y-4">
                            <GlassCard className="p-5" hover={false}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-heading font-semibold">ATS Score</h3>
                                    <ProgressRing progress={78} size={64} strokeWidth={4} color="#FFB800">
                                        <span className="text-lg font-heading font-bold text-brand-amber">78</span>
                                    </ProgressRing>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-brand-green"><span>✅</span> Strong action verbs detected</div>
                                    <div className="flex items-center gap-2 text-brand-green"><span>✅</span> Education section complete</div>
                                    <div className="flex items-center gap-2 text-brand-amber"><span>⚠️</span> Missing 3 JD keywords</div>
                                    <div className="flex items-center gap-2 text-brand-red"><span>❌</span> 2 bullet points lack metrics</div>
                                    <div className="flex items-center gap-2 text-brand-red"><span>❌</span> Summary too generic</div>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-5" hover={false}>
                                <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
                                    <Target className="w-4 h-4 text-brand-purple" /> JD Match
                                </h3>
                                <textarea
                                    className="w-full bg-bg-card border border-white/[0.08] rounded-lg p-3 text-xs text-txt-primary placeholder-txt-muted focus:outline-none focus:border-brand-cyan/50 resize-none h-24"
                                    placeholder="Paste job description here..."
                                />
                                <NeonButton size="sm" className="w-full mt-2" variant="secondary">
                                    <span className="flex items-center gap-2"><Sparkles className="w-3 h-3" /> Optimize for JD</span>
                                </NeonButton>
                            </GlassCard>
                        </div>

                        {/* Resume Editor Preview */}
                        <div className="lg:col-span-2">
                            <GlassCard className="p-5" hover={false}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-heading font-semibold">Resume Preview</h3>
                                    <div className="flex gap-2">
                                        <button className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-txt-secondary hover:border-brand-cyan/30 cursor-pointer">
                                            <Download className="w-3 h-3 inline mr-1" /> PDF
                                        </button>
                                        <button className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-txt-secondary hover:border-brand-cyan/30 cursor-pointer">
                                            <Download className="w-3 h-3 inline mr-1" /> DOCX
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg p-8 text-gray-900 text-sm min-h-[600px]">
                                    <h2 className="text-xl font-bold mb-1 text-gray-900">John Doe</h2>
                                    <p className="text-xs text-gray-500 mb-4">john.doe@email.com · +91 98765 43210 · linkedin.com/in/johndoe · github.com/johndoe</p>

                                    <div className="mb-4">
                                        <h3 className="font-bold text-xs uppercase text-gray-600 border-b border-gray-300 pb-1 mb-2">Summary</h3>
                                        <p className="text-xs text-gray-700">
                                            Full-stack engineer with 5+ years building scalable web applications. Led a team of 8 in migrating monolithic to microservices architecture, achieving 40% latency reduction.
                                        </p>
                                        <div className="flex gap-2 mt-1">
                                            <button className="text-[10px] text-blue-600 hover:underline cursor-pointer">✨ Make Stronger</button>
                                            <button className="text-[10px] text-blue-600 hover:underline cursor-pointer">📊 Add Metrics</button>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <h3 className="font-bold text-xs uppercase text-gray-600 border-b border-gray-300 pb-1 mb-2">Experience</h3>
                                        <div className="mb-3">
                                            <div className="flex justify-between">
                                                <p className="font-semibold text-xs">Senior Software Engineer — Razorpay</p>
                                                <p className="text-xs text-gray-500">2022–Present</p>
                                            </div>
                                            <ul className="text-xs text-gray-700 mt-1 space-y-1 list-disc ml-4">
                                                <li>Led migration of payment processing system to microservices, reducing latency by 40%</li>
                                                <li>Designed and implemented real-time fraud detection pipeline handling 2M+ daily transactions</li>
                                                <li>Mentored 4 junior engineers, improving team velocity by 25%</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-xs uppercase text-gray-600 border-b border-gray-300 pb-1 mb-2">Skills</h3>
                                        <p className="text-xs text-gray-700">Python · TypeScript · React · Node.js · PostgreSQL · Redis · Docker · Kubernetes · AWS · System Design</p>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                )}

                {/* Templates */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-heading font-semibold">Choose Template</h3>
                        <StatusBadge variant="cyan">{templates.length} templates</StatusBadge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {templates.map((t) => (
                            <TemplatePreview
                                key={t.name}
                                template={t}
                                isActive={selectedTemplate === t.name}
                                onSelect={() => setSelectedTemplate(t.name)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
