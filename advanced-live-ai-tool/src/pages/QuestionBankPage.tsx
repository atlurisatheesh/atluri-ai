import { useState } from 'react'
import { Search, Filter, BookOpen, Star, Clock, Shuffle } from 'lucide-react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import GlassCard from '../components/ui/GlassCard'
import NeonButton from '../components/ui/NeonButton'
import StatusBadge from '../components/ui/StatusBadge'

const questions = [
    { id: 1, text: 'Two Sum', category: 'Coding', company: 'Google', difficulty: 'Easy', tags: ['Array', 'Hash Map'] },
    { id: 2, text: 'Tell me about a time you led a cross-functional project', category: 'Behavioral', company: 'Amazon', difficulty: 'Medium', tags: ['Leadership'] },
    { id: 3, text: 'Design a URL shortener', category: 'System Design', company: 'Meta', difficulty: 'Medium', tags: ['System Design'] },
    { id: 4, text: 'What is the difference between TCP and UDP?', category: 'Technical', company: 'Microsoft', difficulty: 'Easy', tags: ['Networking'] },
    { id: 5, text: 'LRU Cache Implementation', category: 'Coding', company: 'Amazon', difficulty: 'Medium', tags: ['Hash Map', 'Linked List'] },
    { id: 6, text: 'Describe a time you failed and what you learned', category: 'Behavioral', company: 'Google', difficulty: 'Easy', tags: ['Growth'] },
    { id: 7, text: "Design a social media news feed", category: 'System Design', company: 'Meta', difficulty: 'Hard', tags: ['System Design'] },
    { id: 8, text: 'Merge K Sorted Lists', category: 'Coding', company: 'Apple', difficulty: 'Hard', tags: ['Heap', 'Linked List'] },
]

const modes = ['Flashcard', 'Timed', 'Mock', 'Written', 'Voice']

export default function QuestionBankPage() {
    const [filter, setFilter] = useState('All')
    const [saved, setSaved] = useState<number[]>([1, 3])

    const filtered = filter === 'All' ? questions : questions.filter(q => q.category === filter)

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-heading font-bold">📚 PrepVault™ — Question Bank</h1>
                    <StatusBadge variant="amber">3 due today</StatusBadge>
                </div>

                {/* Search + Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                        <input
                            type="text"
                            placeholder="Search 10,000+ questions..."
                            className="w-full bg-bg-card border border-white/[0.08] rounded-lg pl-10 pr-4 py-2.5 text-sm text-txt-primary placeholder-txt-muted focus:outline-none focus:border-brand-cyan/50"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['All', 'Coding', 'Behavioral', 'System Design', 'Technical'].map((f) => (
                            <button
                                key={f}
                                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filter === f ? 'bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30' : 'bg-white/[0.02] border border-white/[0.06] text-txt-secondary'
                                    }`}
                                onClick={() => setFilter(f)}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Practice Modes */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {modes.map((m) => (
                        <NeonButton key={m} size="sm" variant="secondary">
                            {m === 'Flashcard' ? '🎴' : m === 'Timed' ? '⏱️' : m === 'Mock' ? '🎭' : m === 'Written' ? '✏️' : '🎙️'} {m} Mode
                        </NeonButton>
                    ))}
                </div>

                {/* Questions List */}
                <div className="space-y-3">
                    {filtered.map((q) => (
                        <GlassCard key={q.id} className="p-4 flex items-center justify-between" hover={true}>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-sm text-txt-primary">{q.text}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <StatusBadge variant={q.difficulty === 'Easy' ? 'green' : q.difficulty === 'Medium' ? 'amber' : 'red'}>
                                        {q.difficulty}
                                    </StatusBadge>
                                    <span className="text-xs text-txt-muted">{q.category}</span>
                                    <span className="text-xs text-txt-muted">🏢 {q.company}</span>
                                    {q.tags.map((t) => (
                                        <span key={t} className="text-[10px] bg-white/[0.04] px-2 py-0.5 rounded text-txt-muted">{t}</span>
                                    ))}
                                </div>
                            </div>
                            <button
                                className={`p-2 cursor-pointer transition-colors ${saved.includes(q.id) ? 'text-brand-amber' : 'text-txt-muted hover:text-brand-amber'}`}
                                onClick={() => setSaved(saved.includes(q.id) ? saved.filter(s => s !== q.id) : [...saved, q.id])}
                            >
                                <Star className={`w-5 h-5 ${saved.includes(q.id) ? 'fill-brand-amber' : ''}`} />
                            </button>
                        </GlassCard>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    )
}
