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

// Scenarios
export type ScenarioItem = {
  id: string;
  label: string;
  category: string;
  description: string;
  tags: string[];
  focus_areas: string[];
  difficulty_modifier: number;
  question_count: number;
};

export type ScenarioCategory = {
  id: string;
  label: string;
  icon: string;
};

export const scenarioService = {
  list: () => authedGet<{ items: ScenarioItem[]; categories: ScenarioCategory[] }>("/api/scenarios"),
  get: (id: string) => authedGet<Record<string, unknown>>(`/api/scenarios/${id}`),
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

// ARIA Intelligence
export type AriaIntakeInput = {
  resume_text: string;
  job_description?: string;
  target_company?: string;
  current_title?: string;
  years_experience?: number;
  career_situation?: "standard" | "pivot" | "promotion" | "gap" | "executive" | "entry";
  company_culture?: string;
  tone_mode?: "corporate" | "conversational" | "technical" | "narrative";
  skills_and_tools?: string;
  education?: string;
  certifications?: string;
};

export type AriaIntakeResult = {
  analysis_id: string;
  intake: {
    job_signals: Record<string, unknown>;
    candidate_signals: Record<string, unknown>;
    gap_intelligence: Record<string, unknown>;
    format_intelligence: Record<string, unknown>;
    personality_layer: Record<string, unknown>;
  };
  status: string;
};

export type AriaScoreCard = {
  ats_score: number;
  ats_max: number;
  content_score: number;
  content_max: number;
  total_score: number;
  total_max: number;
  grade: string;
  meets_threshold: boolean;
  ats_checks: Array<{ id: string; name: string; passed: boolean; score: number; detail: string; fix: string | null }>;
  content_checks: Array<{ id: string; name: string; passed: boolean; score: number; detail: string; fix: string | null }>;
  failed_checks: Array<{ id: string; name: string; detail: string; fix: string | null }>;
  summary: string;
};

export type AriaKeywordMatrix = {
  matrix: Array<{ keyword: string; tier: number; locations: string[]; frequency: number; status: string }>;
  overall_match_pct: number;
  missing_critical: string[];
  suggestions: string[];
};

export type AriaGenerateResult = {
  analysis_id: string;
  resume: Record<string, unknown>;
  score_card: AriaScoreCard;
  keyword_matrix: AriaKeywordMatrix;
  gap_brief: Record<string, unknown>;
  precision_edits: Array<{
    priority: number; section: string; current_text: string;
    suggested_text: string; rationale: string; expected_impact: string;
  }>;
  status: string;
};

export type AriaBulletRewrite = {
  rewritten: string;
  context_component: string;
  action_component: string;
  magnitude_component: string;
  metric_prompt: string | null;
  improvement_notes: string;
};

export type AriaAnalysisSummary = {
  id: string;
  target_company: string | null;
  current_title: string | null;
  career_situation: string;
  ats_score: number | null;
  content_score: number | null;
  total_score: number | null;
  is_latest: boolean;
  version: number;
  created_at: string | null;
};

export const ariaService = {
  intake: (data: AriaIntakeInput) =>
    authedPost<AriaIntakeResult>("/api/resume/aria/intake", data),

  generate: (data: { analysis_id: string; tone_mode?: string }) =>
    authedPost<AriaGenerateResult>("/api/resume/aria/generate", data),

  score: (data: { analysis_id?: string; resume_json?: Record<string, unknown>; job_signals?: Record<string, unknown> }) =>
    authedPost<{ score_card: AriaScoreCard }>("/api/resume/aria/score", data),

  rewriteBullet: (data: { bullet: string; job_context?: Record<string, unknown> }) =>
    authedPost<AriaBulletRewrite>("/api/resume/aria/rewrite", data),

  keywords: (data: { analysis_id: string }) =>
    authedPost<{ keyword_matrix: AriaKeywordMatrix }>("/api/resume/aria/keywords", data),

  gaps: (data: { analysis_id: string }) =>
    authedPost<{ gap_brief: Record<string, unknown> }>("/api/resume/aria/gaps", data),

  edits: (data: { analysis_id: string }) =>
    authedPost<{ precision_edits: AriaGenerateResult["precision_edits"] }>("/api/resume/aria/edits", data),

  history: () =>
    authedGet<{ analyses: AriaAnalysisSummary[] }>("/api/resume/aria/history"),

  detail: (analysisId: string) =>
    authedGet<Record<string, unknown>>(`/api/resume/aria/${analysisId}`),
};

// ═══════════════════════════════════════════════════════════
// ARIA v2 — Cover Letters, ATS Platforms, Page Anatomy,
//            Tone Matrix, Bullet Variants, PDF Export
// ═══════════════════════════════════════════════════════════

/* ── v2 Types ─────────────────────────────────────────── */

// Cover Letter
export type CoverLetterVariant = {
  variant: "traditional" | "story" | "cold_email";
  content: string;
  word_count: number;
  tone: string;
  key_evidence: string[];
};

export type CoverLetterResult = {
  analysis_id: string;
  variants: CoverLetterVariant[];
  generation_notes: string;
};

// ATS Platform Simulation
export type ATSPlatformScore = {
  platform: string;
  display_name: string;
  score: number;
  max_score: number;
  grade: string;
  pass: boolean;
  warnings: string[];
  optimization_tips: string[];
  category_scores: Record<string, number>;
};

export type ATSPlatformResult = {
  analysis_id: string;
  platforms: ATSPlatformScore[];
  best_platform: string;
  worst_platform: string;
  average_score: number;
  universal_issues: string[];
};

export type ATSPlatformInfo = {
  id: string;
  name: string;
  description: string;
  strictness: string;
  market_share: string;
};

// Page Anatomy
export type AttentionZone = {
  zone: string;
  label: string;
  weight: number;
  description: string;
  optimal_content: string[];
  current_content: string[];
  impact_score: number;
};

export type PageAnatomyResult = {
  analysis_id: string;
  zones: AttentionZone[];
  pattern: "f_pattern" | "z_pattern";
  overall_placement_score: number;
  recommendations: string[];
  section_order: string[];
};

export type PageAnatomyZoneInfo = {
  zone: string;
  label: string;
  weight: number;
  description: string;
};

// Tone Matrix
export type IndustryToneProfile = {
  id: string;
  label: string;
  base_tone: string;
  formality: number;
  preferred_vocabulary: string[];
  avoid_vocabulary: string[];
  proof_style: string;
  proof_priorities: string[];
  culture_keywords: string[];
};

export type ToneMatrixResult = {
  analysis_id: string;
  selected_industry: string;
  profile: IndustryToneProfile;
  tone_adjustments: Array<{
    section: string;
    original_tone: string;
    suggested_tone: string;
    example: string;
  }>;
  vocabulary_swaps: Array<{
    original: string;
    replacement: string;
    reason: string;
  }>;
};

// Bullet Variants
export type BulletFrameworkInfo = {
  id: string;
  name: string;
  structure: string;
  example: string;
  best_for: string;
};

export type BulletVariantResult = {
  original: string;
  variants: Array<{
    framework: string;
    framework_name: string;
    rewritten: string;
    components: Record<string, string>;
    front_loaded: boolean;
    word_count: number;
  }>;
  recommendation: string;
};

export type BulletVariantsResponse = {
  analysis_id?: string;
  results: BulletVariantResult[];
};

// PDF Export
export type PDFExportInput = {
  analysis_id?: string;
  resume_json?: Record<string, unknown>;
  style?: "classic" | "modern" | "minimal" | "executive" | "tech";
  include_sections?: string[];
};

/* ── v2 Service Methods ───────────────────────────────── */
export const ariaV2Service = {
  // Cover Letters
  generateCoverLetters: (data: {
    analysis_id?: string;
    resume_text?: string;
    job_description?: string;
    company_name?: string;
    hiring_manager?: string;
    variants?: ("traditional" | "story" | "cold_email")[];
  }) => authedPost<CoverLetterResult>("/api/resume/v2/cover-letter", data),

  // ATS Platform Simulation
  simulateATSPlatforms: (data: {
    analysis_id?: string;
    resume_json?: Record<string, unknown>;
    job_signals?: Record<string, unknown>;
    platforms?: string[];
  }) => authedPost<ATSPlatformResult>("/api/resume/v2/ats-platforms", data),

  listATSPlatforms: () =>
    authedGet<{ platforms: ATSPlatformInfo[] }>("/api/resume/v2/ats-platforms/list"),

  // Page Anatomy
  analyzePageAnatomy: (data: {
    analysis_id?: string;
    resume_json?: Record<string, unknown>;
    career_situation?: string;
  }) => authedPost<PageAnatomyResult>("/api/resume/v2/page-anatomy", data),

  getPageAnatomyZones: () =>
    authedGet<{ zones: PageAnatomyZoneInfo[] }>("/api/resume/v2/page-anatomy/zones"),

  // Tone Matrix
  analyzeToneMatrix: (data: {
    analysis_id?: string;
    industry: string;
    resume_text?: string;
  }) => authedPost<ToneMatrixResult>("/api/resume/v2/tone-matrix", data),

  listIndustries: () =>
    authedGet<{ industries: IndustryToneProfile[] }>("/api/resume/v2/tone-matrix/industries"),

  // Bullet Variants
  generateBulletVariants: (data: {
    analysis_id?: string;
    bullets: string[];
    frameworks?: string[];
    job_context?: Record<string, unknown>;
  }) => authedPost<BulletVariantsResponse>("/api/resume/v2/bullet-variants", data),

  listBulletFrameworks: () =>
    authedGet<{ frameworks: BulletFrameworkInfo[] }>("/api/resume/v2/bullet-variants/frameworks"),

  // PDF Export
  exportPDF: async (data: PDFExportInput): Promise<Blob> => {
    const authToken = await getAccessTokenOrThrow();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:9010"}/api/resume/v2/export/pdf`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(data),
      }
    );
    if (!res.ok) throw new Error(`PDF export failed: ${res.status}`);
    return res.blob();
  },

  exportHTML: (data: PDFExportInput) =>
    authedPost<{ html: string }>("/api/resume/v2/export/html", data),
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
