"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Search, Filter, Bookmark, BookmarkCheck,
  Tag, Building2, BarChart3, RefreshCw, Clock,
} from "lucide-react";
import { DashboardLayout } from "../../components/dashboard";
import { GlassCard, NeonButton, GhostButton, StatusBadge, Tabs } from "../../components/ui";
import { apiRequest } from "../../lib/api";
import { getAccessTokenOrThrow } from "../../lib/auth";

type Question = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  company: string;
  tags: string[];
  saved: boolean;
};

type BrowseResult = {
  items: Question[];
  total: number;
  categories: string[];
  difficulties: string[];
  companies: string[];
};

type ReviewItem = {
  question_id: string;
  title: string;
  next_review: string;
  interval_days: number;
};

const difficultyColor: Record<string, "green" | "amber" | "red" | "purple"> = {
  easy: "green",
  medium: "amber",
  hard: "red",
  expert: "purple",
};

function QuestionCard({
  q,
  onToggleSave,
}: {
  q: Question;
  onToggleSave: (id: string) => void;
}) {
  return (
    <GlassCard hover className="p-4 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-textPrimary mb-2 truncate">{q.title}</p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant={difficultyColor[q.difficulty] || "cyan"}>
            {q.difficulty}
          </StatusBadge>
          <span className="text-xs text-textMuted flex items-center gap-1">
            <Building2 className="w-3 h-3" /> {q.company}
          </span>
          <span className="text-xs text-textMuted flex items-center gap-1">
            <Tag className="w-3 h-3" /> {q.category}
          </span>
        </div>
        {q.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {q.tags.map((t) => (
              <span key={t} className="text-[10px] bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5 text-textMuted">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => onToggleSave(q.id)}
        className="flex-shrink-0 p-2 rounded-lg hover:bg-white/[0.04] transition text-textMuted hover:text-brand-cyan cursor-pointer"
      >
        {q.saved ? <BookmarkCheck className="w-5 h-5 text-brand-cyan" /> : <Bookmark className="w-5 h-5" />}
      </button>
    </GlassCard>
  );
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [savedQuestions, setSavedQuestions] = useState<Question[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [company, setCompany] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (difficulty) params.set("difficulty", difficulty);
      if (company) params.set("company", company);
      if (search) params.set("search", search);

      const data = await apiRequest<BrowseResult>(
        `/api/questions/browse?${params.toString()}`,
        { method: "GET", retries: 0 }
      );
      setQuestions(data.items);
      setCategories(data.categories);
      setDifficulties(data.difficulties);
      setCompanies(data.companies);
    } catch {} finally {
      setLoading(false);
    }
  }, [category, difficulty, company, search]);

  const loadSaved = useCallback(async () => {
    try {
      const data = await apiRequest<BrowseResult>("/api/questions/saved", { method: "GET", retries: 0 });
      setSavedQuestions(data.items);
    } catch {}
  }, []);

  const loadReview = useCallback(async () => {
    try {
      const data = await apiRequest<ReviewItem[]>("/api/questions/review", { method: "GET", retries: 0 });
      setReviewItems(data);
    } catch {}
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    loadSaved();
    loadReview();
  }, [loadSaved, loadReview]);

  const toggleSave = async (questionId: string) => {
    try {
      await apiRequest(`/api/questions/save/${questionId}`, { method: "POST", retries: 0 });
      // Update local state
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, saved: !q.saved } : q))
      );
      loadSaved();
      loadReview();
    } catch {}
  };

  const tabItems = [
    {
      label: `Browse (${questions.length})`,
      content: (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2 text-sm text-textPrimary placeholder:text-textMuted outline-none focus:border-brand-cyan/50 transition"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-textPrimary cursor-pointer outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-textPrimary cursor-pointer outline-none"
            >
              <option value="">All Difficulties</option>
              {difficulties.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-textPrimary cursor-pointer outline-none"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Question list */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-white/[0.02] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : questions.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <p className="text-textMuted">No questions match your filters.</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <QuestionCard q={q} onToggleSave={toggleSave} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      label: `Saved (${savedQuestions.length})`,
      content: (
        <div className="space-y-3">
          {savedQuestions.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <BookOpen className="w-8 h-8 text-textMuted mx-auto mb-3" />
              <p className="text-textMuted">No saved questions yet. Browse and bookmark questions to build your study list.</p>
            </GlassCard>
          ) : (
            savedQuestions.map((q, i) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <QuestionCard q={q} onToggleSave={toggleSave} />
              </motion.div>
            ))
          )}
        </div>
      ),
    },
    {
      label: `Review (${reviewItems.length})`,
      content: (
        <div className="space-y-3">
          {reviewItems.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Clock className="w-8 h-8 text-textMuted mx-auto mb-3" />
              <p className="text-textMuted">Save questions to start building your spaced-repetition review schedule.</p>
            </GlassCard>
          ) : (
            reviewItems.map((r, i) => (
              <motion.div
                key={r.question_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <GlassCard hover className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-textPrimary">{r.title}</p>
                    <p className="text-xs text-textMuted mt-1">
                      Next review: {new Date(r.next_review).toLocaleDateString()} · Interval: {r.interval_days}d
                    </p>
                  </div>
                  <NeonButton
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await apiRequest(`/api/questions/review/${r.question_id}/complete?quality=4`, { method: "POST", retries: 0 });
                      loadReview();
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" /> Done
                  </NeonButton>
                </GlassCard>
              </motion.div>
            ))
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-textPrimary mb-1">Question Bank</h1>
        <p className="text-sm text-textSecondary mb-6">Browse, save, and review interview questions with spaced repetition.</p>
      </motion.div>
      <Tabs tabs={tabItems} />
    </DashboardLayout>
  );
}
