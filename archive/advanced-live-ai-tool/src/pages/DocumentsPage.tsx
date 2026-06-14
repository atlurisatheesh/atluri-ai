import { Upload, FileText, Eye, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import GlassCard from '../components/ui/GlassCard'
import NeonButton from '../components/ui/NeonButton'
import StatusBadge from '../components/ui/StatusBadge'

const documents = [
    { name: 'Resume_JohnDoe_2025.pdf', type: 'Resume', status: 'ready', active: true, date: 'Mar 1, 2025' },
    { name: 'Google_SWE_JD.pdf', type: 'Job Description', status: 'ready', active: true, date: 'Feb 28, 2025' },
    { name: 'Amazon_Leadership_Principles.pdf', type: 'Company Research', status: 'ready', active: false, date: 'Feb 25, 2025' },
    { name: 'Portfolio_Projects.docx', type: 'Portfolio', status: 'processing', active: false, date: 'Mar 1, 2025' },
]

export default function DocumentsPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-heading font-bold">📁 My Documents</h1>
                    <p className="text-sm text-txt-secondary">4 of 10 uploads used (Pro)</p>
                </div>

                {/* Upload Zone */}
                <GlassCard className="p-8 text-center border-2 border-dashed border-white/10" hover={false}>
                    <Upload className="w-10 h-10 mx-auto mb-3 text-brand-cyan" />
                    <h3 className="font-heading font-semibold mb-1">Upload Documents</h3>
                    <p className="text-sm text-txt-secondary mb-4">Resume, JD, company research, technical portfolio</p>
                    <p className="text-xs text-txt-muted mb-4">Supports PDF, DOCX, TXT · Max 10MB each</p>
                    <NeonButton size="sm">
                        <span className="flex items-center gap-2"><Upload className="w-4 h-4" /> Choose Files</span>
                    </NeonButton>
                </GlassCard>

                {/* Document List */}
                <div className="space-y-3">
                    {documents.map((doc) => (
                        <GlassCard key={doc.name} className="p-4 flex items-center justify-between" hover={true}>
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 rounded-lg bg-brand-purple/10 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-brand-purple" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-txt-primary truncate">{doc.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-txt-muted">{doc.type}</span>
                                        <span className="text-xs text-txt-muted">·</span>
                                        <span className="text-xs text-txt-muted">{doc.date}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <StatusBadge variant={doc.status === 'ready' ? 'green' : doc.status === 'processing' ? 'amber' : 'red'}>
                                    {doc.status === 'ready' && <CheckCircle className="w-3 h-3" />}
                                    {doc.status === 'processing' && <Clock className="w-3 h-3" />}
                                    {doc.status}
                                </StatusBadge>

                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <span className="text-xs text-txt-muted">{doc.active ? 'Active' : 'Inactive'}</span>
                                    <input type="checkbox" defaultChecked={doc.active} className="accent-brand-green" />
                                </label>

                                <button className="p-1.5 rounded-lg hover:bg-white/[0.04] text-txt-muted hover:text-brand-cyan cursor-pointer">
                                    <Eye className="w-4 h-4" />
                                </button>
                                <button className="p-1.5 rounded-lg hover:bg-white/[0.04] text-txt-muted hover:text-brand-red cursor-pointer">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </GlassCard>
                    ))}
                </div>

                {/* RAG Info */}
                <GlassCard className="p-5" hover={false}>
                    <h3 className="font-heading font-semibold text-sm mb-3">How Document Intelligence Works</h3>
                    <div className="grid grid-cols-4 gap-4 text-center text-xs text-txt-secondary">
                        {['Upload Document', 'Text Extraction', 'AI Embedding', 'RAG Context'].map((step, i) => (
                            <div key={step} className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-cyan/10 to-brand-purple/10 flex items-center justify-center text-brand-cyan font-bold">
                                    {i + 1}
                                </div>
                                <p>{step}</p>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>
        </DashboardLayout>
    )
}
