"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Eye, List, Plus, Trash2, Upload, FileText,
  GripVertical, ChevronUp, ChevronDown, Check, AlertCircle,
} from "lucide-react";
import { GlassCard, NeonButton, StatusBadge } from "../ui";

// ─── Types ───────────────────────────────────────────────────
export interface QAPair {
  id: string;
  question: string;
  answer: string;
}

export interface ContextInjectorState {
  imageAnalysisContext: string;
  priorityQuestions: string[];
  qaPairs: QAPair[];
  resumeText: string;
}

export interface ContextInjectorProps {
  value: ContextInjectorState;
  onChange: (next: ContextInjectorState) => void;
  className?: string;
}

const DEFAULT_IMAGE_HINTS = [
  "Prioritize identifying the LeetCode problem statement. Ignore IDE chrome.",
  "Focus on whiteboard diagrams — capture entity names, arrows, and labels.",
  "Read code on screen; summarize algorithmic intent, not syntax detail.",
  "Detect company logo or platform (HireVue, CoderPad, etc.) to switch context.",
];

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Image Analysis Context ───────────────────────────────────
function ImageContextPanel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showHints, setShowHints] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-brand-purple" />
          <span className="text-sm font-semibold text-textPrimary">Image Analysis Context</span>
        </div>
        <button
          type="button"
          className="text-xs text-brand-cyan hover:underline cursor-pointer"
          onClick={() => setShowHints((h) => !h)}
        >
          {showHints ? "Hide hints" : "Show hints"}
        </button>
      </div>

      <p className="text-xs text-textMuted">
        Guides GPT-4o Vision on what to focus on during real-time screen captures.
        The more specific you are, the faster the AI zeros in.
      </p>

      <AnimatePresence>
        {showHints && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-hidden"
          >
            {DEFAULT_IMAGE_HINTS.map((hint, i) => (
              <button
                key={i} type="button"
                onClick={() => onChange(hint)}
                className="text-left text-xs px-3 py-2 rounded-lg bg-brand-purple/10 border border-brand-purple/20 text-textSecondary hover:bg-brand-purple/15 hover:border-brand-purple/40 transition-all cursor-pointer"
              >
                "{hint}"
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <textarea
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-textPrimary placeholder:text-textMuted outline-none focus:border-brand-purple/50 focus:bg-white/[0.06] transition-colors resize-none min-h-[100px] leading-relaxed"
        placeholder="Describe what the vision AI should focus on when it captures your screen…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ─── Priority Questions ───────────────────────────────────────
function PriorityQuestionsPanel({
  questions, onChange,
}: { questions: string[]; onChange: (qs: string[]) => void }) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...questions, trimmed]);
    setDraft("");
  };

  const remove = (i: number) => onChange(questions.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    const next = [...questions];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <List className="w-4 h-4 text-brand-cyan" />
        <span className="text-sm font-semibold text-textPrimary">Priority Questions</span>
        {questions.length > 0 && (
          <StatusBadge variant="cyan" className="ml-auto">{questions.length}</StatusBadge>
        )}
      </div>

      <p className="text-xs text-textMuted">
        Pre-load questions the AI should watch for and auto-route. Drag to reorder.
      </p>

      <AnimatePresence mode="popLayout">
        {questions.map((q, i) => (
          <motion.div
            key={q + i}
            layout
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
            className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] group"
          >
            <GripVertical className="w-4 h-4 text-textMuted mt-0.5 flex-shrink-0 cursor-grab" />
            <span className="flex-1 text-sm text-textSecondary">{q}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" title="Move up" onClick={() => move(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-white/10 cursor-pointer disabled:opacity-30">
                <ChevronUp className="w-3 h-3 text-textMuted" />
              </button>
              <button type="button" title="Move down" onClick={() => move(i, 1)} disabled={i === questions.length - 1} className="p-1 rounded hover:bg-white/10 cursor-pointer disabled:opacity-30">
                <ChevronDown className="w-3 h-3 text-textMuted" />
              </button>
              <button type="button" title="Remove question" onClick={() => remove(i)} className="p-1 rounded hover:bg-brand-red/20 cursor-pointer">
                <Trash2 className="w-3.5 h-3.5 text-brand-red" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="flex gap-2">
        <input
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-textPrimary placeholder:text-textMuted outline-none focus:border-brand-cyan/50 transition-colors"
          placeholder="Add a priority question…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <button
          type="button" onClick={add}
          className="px-4 py-2.5 rounded-xl bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan text-sm font-semibold flex items-center gap-1.5 hover:bg-brand-cyan/25 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
    </div>
  );
}

// ─── Q&A Prep Matrix ──────────────────────────────────────────
function QAMatrix({
  pairs, onChange,
}: { pairs: QAPair[]; onChange: (pairs: QAPair[]) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const add = () => {
    const newPair: QAPair = { id: uid(), question: "", answer: "" };
    onChange([...pairs, newPair]);
    setExpanded(newPair.id);
  };

  const update = useCallback((id: string, field: "question" | "answer", val: string) => {
    onChange(pairs.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  }, [pairs, onChange]);

  const remove = (id: string) => {
    onChange(pairs.filter((p) => p.id !== id));
    if (expanded === id) setExpanded(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-brand-amber" />
        <span className="text-sm font-semibold text-textPrimary">Q&A Prep Matrix</span>
        {pairs.length > 0 && (
          <StatusBadge variant="amber" className="ml-auto">{pairs.length} loaded</StatusBadge>
        )}
      </div>

      <p className="text-xs text-textMuted">
        Pre-cache question-answer pairs. The AI uses these to calibrate response style and pre-warm context.
      </p>

      <AnimatePresence mode="popLayout">
        {pairs.map((pair) => (
          <motion.div
            key={pair.id} layout
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
            className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden"
          >
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
              onClick={() => setExpanded(expanded === pair.id ? null : pair.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-textPrimary truncate">
                  {pair.question || <span className="text-textMuted italic">Untitled question</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {pair.question && pair.answer && (
                  <Check className="w-4 h-4 text-brand-green" />
                )}
                <button
                  type="button"
                  title="Remove Q&A pair"
                  onClick={(e) => { e.stopPropagation(); remove(pair.id); }}
                  className="p-1 rounded hover:bg-brand-red/20 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-brand-red" />
                </button>
                {expanded === pair.id
                  ? <ChevronUp className="w-4 h-4 text-textMuted" />
                  : <ChevronDown className="w-4 h-4 text-textMuted" />
                }
              </div>
            </div>
            <AnimatePresence>
              {expanded === pair.id && (
                <motion.div
                  initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                  className="overflow-hidden border-t border-white/[0.06]"
                >
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-textMuted uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" /> Question
                      </label>
                      <textarea
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-textPrimary outline-none focus:border-brand-amber/50 transition-colors resize-none min-h-[64px]"
                        placeholder="Enter the interview question…"
                        value={pair.question}
                        onChange={(e) => update(pair.id, "question", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-textMuted uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                        <Check className="w-3 h-3" /> Prepared Answer
                      </label>
                      <textarea
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-textPrimary outline-none focus:border-brand-amber/50 transition-colors resize-none min-h-[100px]"
                        placeholder="Your prepared answer or key bullet points…"
                        value={pair.answer}
                        onChange={(e) => update(pair.id, "answer", e.target.value)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>

      <button
        type="button" onClick={add}
        className="w-full py-2.5 rounded-xl border border-dashed border-white/[0.15] text-sm text-textMuted hover:text-textPrimary hover:border-brand-amber/40 hover:bg-brand-amber/5 transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add Q&A Pair
      </button>
    </div>
  );
}

// ─── Resume Drop Zone ─────────────────────────────────────────
function ResumeUploadZone({ resumeText, onChange }: { resumeText: string; onChange: (text: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => onChange(String(e.target?.result ?? ""));
    reader.readAsText(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-brand-green" />
        <span className="text-sm font-semibold text-textPrimary">Resume Context</span>
        {resumeText && <StatusBadge variant="green" className="ml-auto">Loaded</StatusBadge>}
      </div>
      <p className="text-xs text-textMuted">
        Drop your resume to pre-cache experiences. AI will use this to surface relevant examples in real time.
      </p>

      {!resumeText ? (
        <div
          className={`rounded-xl border-2 border-dashed p-8 flex flex-col items-center gap-3 transition-all cursor-pointer ${
            isDragging
              ? "border-brand-green/50 bg-brand-green/5"
              : "border-white/[0.1] hover:border-brand-green/30 hover:bg-white/[0.02]"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-textMuted" />
          <p className="text-sm text-textMuted text-center">Drag & drop resume (.txt, .md) or click to browse</p>
          <input
            ref={fileRef} type="file" accept=".txt,.md,.text" className="hidden"
            title="Upload resume file"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
          />
        </div>
      ) : (
        <div className="rounded-xl bg-brand-green/5 border border-brand-green/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-brand-green flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Resume loaded — {resumeText.length.toLocaleString()} chars
            </p>
            <button
              type="button" onClick={() => onChange("")}
              className="text-xs text-brand-red hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>
          <p className="text-[11px] text-textMuted line-clamp-3 font-mono">{resumeText.slice(0, 240)}…</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────
export default function ContextInjector({ value, onChange, className = "" }: ContextInjectorProps) {
  const set = useCallback(<K extends keyof ContextInjectorState>(key: K, val: ContextInjectorState[K]) => {
    onChange({ ...value, [key]: val });
  }, [value, onChange]);

  return (
    <GlassCard className={`p-6 space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-purple/20 to-brand-amber/10 border border-brand-purple/30 flex items-center justify-center">
          <Brain className="w-5 h-5 text-brand-purple" />
        </div>
        <div>
          <h2 className="text-base font-bold text-textPrimary">Context Injectors</h2>
          <p className="text-xs text-textMuted">Vision guidance, priority questions & Q&A pre-cache</p>
        </div>
      </div>

      <ImageContextPanel
        value={value.imageAnalysisContext}
        onChange={(v) => set("imageAnalysisContext", v)}
      />

      <div className="border-t border-white/[0.06]" />

      <PriorityQuestionsPanel
        questions={value.priorityQuestions}
        onChange={(qs) => set("priorityQuestions", qs)}
      />

      <div className="border-t border-white/[0.06]" />

      <QAMatrix
        pairs={value.qaPairs}
        onChange={(pairs) => set("qaPairs", pairs)}
      />

      <div className="border-t border-white/[0.06]" />

      <ResumeUploadZone
        resumeText={value.resumeText}
        onChange={(text) => set("resumeText", text)}
      />
    </GlassCard>
  );
}
