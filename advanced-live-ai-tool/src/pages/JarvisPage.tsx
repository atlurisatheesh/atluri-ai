import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Brain, Trash2, Zap, Bot, User, Loader2 } from 'lucide-react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import { getToken } from '../services/api'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const STORAGE_KEY = 'jarvis_conversation'
const MAX_STORED = 60

interface Message {
    role: 'user' | 'assistant'
    content: string
    ts: number
}

function loadHistory(): Message[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        return JSON.parse(raw) as Message[]
    } catch {
        return []
    }
}

function saveHistory(msgs: Message[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_STORED)))
    } catch {
        // localStorage quota — silently ignore
    }
}

export default function JarvisPage() {
    const [messages, setMessages] = useState<Message[]>(() => loadHistory())
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [memoryActive, setMemoryActive] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    const send = useCallback(async () => {
        const text = input.trim()
        if (!text || loading) return

        const userMsg: Message = { role: 'user', content: text, ts: Date.now() }
        const nextMessages = [...messages, userMsg]
        setMessages(nextMessages)
        saveHistory(nextMessages)
        setInput('')
        setLoading(true)
        setError(null)

        try {
            const token = getToken()
            const history = messages.slice(-20).map(m => ({
                role: m.role,
                content: m.content,
            }))

            const res = await fetch(`${API_BASE}/jarvis/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ message: text, history }),
            })

            if (!res.ok) throw new Error(`Server error ${res.status}`)

            const data = await res.json()
            setMemoryActive(data.memory_active ?? false)

            const assistantMsg: Message = {
                role: 'assistant',
                content: data.reply,
                ts: Date.now(),
            }
            const withReply = [...nextMessages, assistantMsg]
            setMessages(withReply)
            saveHistory(withReply)
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Try again.')
        } finally {
            setLoading(false)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [input, loading, messages])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send()
        }
    }

    const clearConversation = () => {
        setMessages([])
        localStorage.removeItem(STORAGE_KEY)
        setMemoryActive(false)
        setError(null)
    }

    return (
        <DashboardLayout>
            <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-heading font-bold text-base leading-none">
                                Jarvis
                            </h1>
                            <p className="text-xs text-txt-muted mt-0.5">
                                Personal AI · Siri + Alexa + Jarvis
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {memoryActive && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-1.5 text-xs text-brand-cyan bg-brand-cyan/10 border border-brand-cyan/20 px-2.5 py-1 rounded-full"
                            >
                                <Brain className="w-3 h-3" />
                                Memory Active
                            </motion.div>
                        )}
                        {messages.length > 0 && (
                            <button
                                onClick={clearConversation}
                                className="p-2 rounded-lg text-txt-muted hover:text-brand-red hover:bg-brand-red/10 transition-all cursor-pointer"
                                title="Clear conversation"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center gap-4 text-txt-muted">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-cyan/20 to-brand-purple/20 flex items-center justify-center">
                                <Zap className="w-8 h-8 text-brand-cyan" />
                            </div>
                            <div>
                                <p className="font-heading font-semibold text-txt-secondary mb-1">
                                    Hey, I'm Jarvis
                                </p>
                                <p className="text-sm">
                                    Ask me anything — coding, writing, research, planning, or just a chat.
                                    <br />I remember our conversations across sessions.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center mt-2">
                                {[
                                    'Help me write a cover letter',
                                    'Explain async/await in Python',
                                    'What should I learn next?',
                                    'Review my plan for today',
                                ].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setInput(s)}
                                        className="text-xs px-3 py-1.5 rounded-full border border-white/[0.08] hover:border-brand-cyan/30 hover:text-brand-cyan text-txt-muted transition-all cursor-pointer"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <AnimatePresence initial={false}>
                        {messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                        msg.role === 'user'
                                            ? 'bg-brand-cyan/15 border border-brand-cyan/20 text-txt-primary rounded-tr-sm'
                                            : 'bg-white/[0.04] border border-white/[0.07] text-txt-primary rounded-tl-sm'
                                    }`}
                                >
                                    {msg.content}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-7 h-7 rounded-lg bg-white/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <User className="w-4 h-4 text-txt-secondary" />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-3 justify-start"
                        >
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/[0.04] border border-white/[0.07] flex items-center gap-2">
                                <Loader2 className="w-4 h-4 text-brand-cyan animate-spin" />
                                <span className="text-xs text-txt-muted">Thinking...</span>
                            </div>
                        </motion.div>
                    )}

                    {error && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-brand-red text-center py-2"
                        >
                            {error}
                        </motion.div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-white/[0.06]">
                    <div className="flex gap-2 items-end">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask Jarvis anything... (Enter to send, Shift+Enter for newline)"
                            rows={1}
                            className="flex-1 bg-white/[0.04] border border-white/[0.08] focus:border-brand-cyan/40 rounded-xl px-4 py-3 text-sm text-txt-primary placeholder-txt-muted resize-none outline-none transition-colors"
                            style={{ maxHeight: '120px', overflowY: 'auto' }}
                            onInput={e => {
                                const t = e.currentTarget
                                t.style.height = 'auto'
                                t.style.height = `${Math.min(t.scrollHeight, 120)}px`
                            }}
                            disabled={loading}
                        />
                        <button
                            onClick={send}
                            disabled={!input.trim() || loading}
                            className="p-3 rounded-xl bg-brand-cyan disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-cyan/80 transition-all cursor-pointer flex-shrink-0"
                        >
                            <Send className="w-4 h-4 text-bg-primary" />
                        </button>
                    </div>
                    <p className="text-[10px] text-txt-muted mt-1.5 text-center">
                        Conversations are remembered across sessions via long-term memory
                    </p>
                </div>
            </div>
        </DashboardLayout>
    )
}
