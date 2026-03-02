/**
 * API Service Layer — typed wrappers for all backend endpoints.
 * Uses the existing apiRequest + getAccessTokenOrThrow helpers.
 */
import { apiRequest } from "./api";
import { getAccessTokenOrThrow } from "./auth";

/* ── Helpers ─────────────────────────────────────────── */
async function authedGet<T>(path: string): Promise<T> {
  const authToken = await getAccessTokenOrThrow();
  return apiRequest<T>(path, { method: "GET", retries: 0, authToken });
}

async function authedPost<T>(path: string, body?: unknown): Promise<T> {
  const authToken = await getAccessTokenOrThrow();
  return apiRequest<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    retries: 0,
    authToken,
  });
}

async function authedPut<T>(path: string, body?: unknown): Promise<T> {
  const authToken = await getAccessTokenOrThrow();
  return apiRequest<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    retries: 0,
    authToken,
  });
}

async function authedDelete<T>(path: string): Promise<T> {
  const authToken = await getAccessTokenOrThrow();
  return apiRequest<T>(path, { method: "DELETE", retries: 0, authToken });
}

/* ── Types ───────────────────────────────────────────── */
// Auth
export type UserProfile = {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  plan: string;
  credits: number;
  created_at: string;
};

// Sessions
export type Session = {
  id: string;
  user_id: string;
  session_type: string;
  company_mode: string;
  status: string;
  score?: number;
  created_at: string;
  ended_at?: string;
};

// AI
export type TranscribeResult = { text: string; confidence: number; is_question: boolean };
export type AIResponseResult = { id: string; response_text: string; response_json: Record<string, unknown>; model: string };
export type CodeAnalysisResult = { analysis: string; complexity?: string; suggestions?: string[] };

// Documents
export type Document = {
  id: string;
  filename: string;
  file_type: string;
  size_bytes: number;
  is_active: boolean;
  chunk_count: number;
  created_at: string;
};

// Mock
export type MockQuestion = { question_id: string; question: string; category: string; time_limit: number };
export type MockStartResult = { mock_id: string; questions: MockQuestion[] };
export type MockCompleteResult = {
  mock_id: string;
  overall_score: number;
  communication_score: number;
  technical_score: number;
  problem_solving_score: number;
  confidence_score: number;
  time_management_score: number;
  feedback: string;
};

// Resume
export type ATSAnalysis = {
  ats_score: number;
  word_count: number;
  bullet_count: number;
  power_verb_ratio: number;
  metrics_count: number;
  has_contact: boolean;
  has_education: boolean;
  has_skills: boolean;
  keyword_match_score: number;
  recommendations: string[];
};

// Analytics
export type AnalyticsOverview = {
  total_sessions: number;
  avg_score: number;
  best_score: number;
  total_ai_responses: number;
  active_documents: number;
  credit_balance: number;
};

// Duo
export type DuoSession = { session_code: string; status: string; created_at: string };

/* ── API Methods ─────────────────────────────────────── */

// Auth
export const authService = {
  getMe: () => authedGet<UserProfile>("/api/auth/me"),
  updateProfile: (data: { display_name?: string; avatar_url?: string }) => authedPut<UserProfile>("/api/auth/me", data),
};

// Sessions
export const sessionService = {
  create: (data: { session_type?: string; company_mode?: string }) => authedPost<Session>("/api/sessions/", data),
  list: () => authedGet<Session[]>("/api/sessions/"),
  end: (sessionId: string) => authedPost<Session>(`/api/sessions/${sessionId}/end`),
};

// AI
export const aiService = {
  transcribe: (audioBase64: string) => authedPost<TranscribeResult>("/api/ai/transcribe", { audio_data: audioBase64 }),
  generateResponse: (data: { session_id: string; question: string; context?: string; mode?: string }) =>
    authedPost<AIResponseResult>("/api/ai/generate-response", data),
  codeAnalysis: (data: { code: string; language?: string; problem?: string }) =>
    authedPost<CodeAnalysisResult>("/api/ai/code-analysis", data),
};

// Documents
export const documentService = {
  upload: async (file: File) => {
    const authToken = await getAccessTokenOrThrow();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:9010"}/api/documents/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json() as Promise<Document>;
  },
  list: () => authedGet<Document[]>("/api/documents/"),
  toggle: (docId: string) => authedPut<Document>(`/api/documents/${docId}/toggle`),
  delete: (docId: string) => authedDelete<{ status: string }>(`/api/documents/${docId}`),
};

// Mock
export const mockService = {
  start: (data: { interview_type?: string; company?: string; duration_minutes?: number }) =>
    authedPost<MockStartResult>("/api/mock/start", data),
  answer: (data: { mock_id: string; question_id: string; answer_text: string }) =>
    authedPost<{ status: string; score: number; feedback: string }>("/api/mock/answer", data),
  complete: (mockId: string) => authedPost<MockCompleteResult>(`/api/mock/${mockId}/complete`),
};

// Resume
export const resumeService = {
  analyze: async (file: File, jobDescription?: string) => {
    const authToken = await getAccessTokenOrThrow();
    const formData = new FormData();
    formData.append("file", file);
    if (jobDescription) formData.append("job_description", jobDescription);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:9010"}/api/resume/analyze`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });
    if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
    return res.json() as Promise<ATSAnalysis>;
  },
  rewriteBullet: (data: { bullet: string; job_title?: string }) =>
    authedPost<{ original: string; improved: string }>("/api/resume/rewrite-bullet", data),
};

// Duo
export const duoService = {
  create: (data?: { session_type?: string }) => authedPost<DuoSession>("/api/duo/create", data),
  join: (sessionCode: string) => authedPost<DuoSession>("/api/duo/join", { session_code: sessionCode }),
  hint: (data: { session_code: string; hint_text: string }) => authedPost<{ status: string }>("/api/duo/hint", data),
  end: (sessionCode: string) => authedPost<{ status: string }>(`/api/duo/${sessionCode}/end`),
};

// Analytics
export const analyticsService = {
  overview: () => authedGet<AnalyticsOverview>("/api/analytics/overview"),
  history: (limit?: number) => authedGet<Session[]>(`/api/analytics/history${limit ? `?limit=${limit}` : ""}`),
};
