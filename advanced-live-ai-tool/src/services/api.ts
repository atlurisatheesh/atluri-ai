/**
 * InterviewGenius AI — Frontend API Service Layer
 * Connects React frontend to FastAPI backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// ─── Auth Token Management ──────────────────────────────────
let accessToken: string | null = localStorage.getItem('ig_token')

export function setToken(token: string) {
    accessToken = token
    localStorage.setItem('ig_token', token)
}

export function clearToken() {
    accessToken = null
    localStorage.removeItem('ig_token')
    localStorage.removeItem('ig_refresh')
    localStorage.removeItem('ig_user')
}

export function getToken() {
    return accessToken
}

// ─── Base Fetch Helper ──────────────────────────────────────
async function apiFetch<T = any>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    }
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    })

    if (res.status === 401) {
        clearToken()
        window.location.href = '/login'
        throw new Error('Unauthorized')
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Request failed' }))
        throw new Error(error.detail || `HTTP ${res.status}`)
    }

    return res.json()
}

// ─── Auth API ───────────────────────────────────────────────
export const authAPI = {
    async register(email: string, full_name: string, password: string) {
        const data = await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, full_name, password }),
        })
        setToken(data.access_token)
        localStorage.setItem('ig_refresh', data.refresh_token)
        localStorage.setItem('ig_user', JSON.stringify(data.user))
        return data
    },

    async login(email: string, password: string) {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        })
        setToken(data.access_token)
        localStorage.setItem('ig_refresh', data.refresh_token)
        localStorage.setItem('ig_user', JSON.stringify(data.user))
        return data
    },

    async getProfile() {
        return apiFetch('/auth/me')
    },

    async updateProfile(updates: { full_name?: string; avatar_url?: string }) {
        const params = new URLSearchParams()
        if (updates.full_name) params.set('full_name', updates.full_name)
        if (updates.avatar_url) params.set('avatar_url', updates.avatar_url)
        return apiFetch(`/auth/me?${params}`, { method: 'PUT' })
    },
}

// ─── NeuralWhisper™ AI API ──────────────────────────────────
export const aiAPI = {
    async transcribe(session_id: string, text?: string, audio_base64?: string) {
        return apiFetch('/ai/transcribe', {
            method: 'POST',
            body: JSON.stringify({ session_id, text, audio_base64 }),
        })
    },

    async generateResponse(session_id: string, question: string, context?: any) {
        return apiFetch('/ai/generate-response', {
            method: 'POST',
            body: JSON.stringify({ session_id, question, context }),
        })
    },

    async analyzeCode(problem: string, language: string, code?: string) {
        return apiFetch('/ai/code-analysis', {
            method: 'POST',
            body: JSON.stringify({ problem, language, code }),
        })
    },
}

// ─── Sessions API ───────────────────────────────────────────
export const sessionsAPI = {
    async create(title?: string, platform?: string, mode?: string) {
        return apiFetch('/sessions/', {
            method: 'POST',
            body: JSON.stringify({ title, platform, mode }),
        })
    },

    async list() {
        return apiFetch('/sessions/')
    },

    async end(session_id: string) {
        return apiFetch(`/sessions/${session_id}/end`, { method: 'POST' })
    },
}

// ─── DocuMind™ Documents API ────────────────────────────────
export const documentsAPI = {
    async upload(file: File, doc_type: string) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('doc_type', doc_type)

        const headers: Record<string, string> = {}
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

        const res = await fetch(`${API_BASE}/documents/upload?doc_type=${doc_type}`, {
            method: 'POST',
            headers,
            body: formData,
        })
        return res.json()
    },

    async list() {
        return apiFetch('/documents/')
    },

    async toggle(doc_id: string) {
        return apiFetch(`/documents/${doc_id}/toggle`, { method: 'PUT' })
    },

    async remove(doc_id: string) {
        return apiFetch(`/documents/${doc_id}`, { method: 'DELETE' })
    },
}

// ─── ProfileCraft™ Resume API ───────────────────────────────
export const resumeAPI = {
    async analyze(resume_text: string, job_description?: string) {
        return apiFetch('/resume/analyze', {
            method: 'POST',
            body: JSON.stringify({ resume_text, job_description }),
        })
    },

    async rewriteBullet(bullet: string, context?: string) {
        return apiFetch('/resume/rewrite-bullet', {
            method: 'POST',
            body: JSON.stringify({ bullet, context }),
        })
    },
}

// ─── SimuDrill™ Mock Interview API ──────────────────────────
export const mockAPI = {
    async start(interview_type: string, company?: string, difficulty?: string) {
        return apiFetch('/mock/start', {
            method: 'POST',
            body: JSON.stringify({ interview_type, company, difficulty }),
        })
    },

    async submitAnswer(mock_id: string, question_index: number, answer: string) {
        return apiFetch('/mock/answer', {
            method: 'POST',
            body: JSON.stringify({ mock_id, question_index, answer }),
        })
    },

    async complete(mock_id: string) {
        return apiFetch(`/mock/${mock_id}/complete`, { method: 'POST' })
    },
}

// ─── Billing API ────────────────────────────────────────────
export const billingAPI = {
    async getCredits() {
        return apiFetch('/billing/credits')
    },

    async getPacks() {
        return apiFetch('/billing/packs')
    },

    async purchase(pack_name: string) {
        return apiFetch('/billing/purchase', {
            method: 'POST',
            body: JSON.stringify({ pack_name }),
        })
    },

    async getTransactions() {
        return apiFetch('/billing/transactions')
    },
}

// ─── PrepVault™ Questions API ───────────────────────────────
export const questionsAPI = {
    async list(filters?: { category?: string; difficulty?: string; search?: string }) {
        const params = new URLSearchParams()
        if (filters?.category) params.set('category', filters.category)
        if (filters?.difficulty) params.set('difficulty', filters.difficulty)
        if (filters?.search) params.set('search', filters.search)
        return apiFetch(`/questions/?${params}`)
    },

    async save(question_id: string) {
        return apiFetch(`/questions/${question_id}/save`, { method: 'POST' })
    },

    async getSaved() {
        return apiFetch('/questions/saved')
    },

    async getDue() {
        return apiFetch('/questions/due')
    },
}

// ─── Analytics API ──────────────────────────────────────────
export const analyticsAPI = {
    async getOverview() {
        return apiFetch('/analytics/overview')
    },

    async getHistory(limit?: number) {
        return apiFetch(`/analytics/history?limit=${limit || 20}`)
    },
}

// ─── MentorLink™ Duo API ───────────────────────────────────
export const mentorAPI = {
    async createSession() {
        return apiFetch('/duo/create', { method: 'POST' })
    },

    async joinSession(session_code: string) {
        return apiFetch('/duo/join', {
            method: 'POST',
            body: JSON.stringify({ session_code }),
        })
    },

    async sendHint(session_code: string, hint: string) {
        return apiFetch('/duo/hint', {
            method: 'POST',
            body: JSON.stringify({ session_code, hint }),
        })
    },

    async endSession(session_code: string) {
        return apiFetch(`/duo/${session_code}/end`, { method: 'POST' })
    },
}
