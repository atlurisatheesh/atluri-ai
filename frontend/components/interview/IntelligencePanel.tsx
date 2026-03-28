/**
 * IntelligencePanel — Real-time interview intelligence overlay.
 * Displays question classification, key phrase, follow-up predictions,
 * speech coaching chips, and recovery assistance.
 * 
 * Design: Minimal, non-distracting. Auto-dismissing chips with
 * glass-morphism styling consistent with the interview page.
 */

'use client';

import React, { useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES (shared with useInterview)
// ═══════════════════════════════════════════════════════════════════════════

interface QuestionIntelligence {
  questionType: string;
  difficulty: string;
  framework: string;
  frameworkInstructions: Record<string, string>;
  maxAnswerSeconds: number;
  coachingNote: string;
}

interface KeyPhrase {
  keyPhrase: string;
  followWith: string;
}

interface FollowUpPrediction {
  question: string;
  likelihood: number;
  skeleton: string;
  framework: string;
}

interface SpeechCoaching {
  chips: string[];
  wpm: number;
  elapsedSeconds: number;
}

interface RecoveryAssist {
  trigger: string;
  bridgePhrase: string;
  redirect: string;
  buyTime: string;
}

interface IntelligencePanelProps {
  questionIntelligence: QuestionIntelligence | null;
  keyPhrase: KeyPhrase | null;
  followUpPredictions: FollowUpPrediction[];
  speechCoaching: SpeechCoaching | null;
  recoveryAssist: RecoveryAssist | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-green-400 bg-green-500/10 border-green-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  hard: 'text-red-400 bg-red-500/10 border-red-500/20',
  expert: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

const TYPE_LABELS: Record<string, string> = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  system_design: 'System Design',
  coding: 'Coding',
  situational: 'Situational',
  case_study: 'Case Study',
  estimation: 'Estimation',
  cultural_fit: 'Culture Fit',
  leadership: 'Leadership',
  brain_teaser: 'Brain Teaser',
  role_specific: 'Role-Specific',
  motivational: 'Motivational',
  general: 'General',
};

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function QuestionClassificationBadge({ intel }: { intel: QuestionIntelligence }) {
  const diffClass = DIFFICULTY_COLORS[intel.difficulty] || DIFFICULTY_COLORS.medium;
  const typeLabel = TYPE_LABELS[intel.questionType] || intel.questionType;

  return (
    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${diffClass}`}>
        {typeLabel}
      </span>
      <span className="text-xs text-neutral-400">
        Use <span className="text-cyan-400 font-medium">{intel.framework}</span>
      </span>
      <span className="text-xs text-neutral-500">
        · {Math.floor(intel.maxAnswerSeconds / 60)}:{String(intel.maxAnswerSeconds % 60).padStart(2, '0')} max
      </span>
    </div>
  );
}

function KeyPhraseHighlight({ keyPhrase }: { keyPhrase: KeyPhrase }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 15000); // Auto-hide after 15s
    return () => clearTimeout(timer);
  }, [keyPhrase.keyPhrase]);

  if (!visible) return null;

  return (
    <div className="animate-in fade-in slide-in-from-left-3 duration-500 
                    bg-gradient-to-r from-cyan-500/10 to-transparent 
                    border-l-2 border-cyan-400 px-3 py-2 rounded-r-lg">
      <p className="text-xs text-cyan-300/70 font-medium mb-0.5">SAY THIS FIRST</p>
      <p className="text-sm text-neutral-100 leading-relaxed">
        {keyPhrase.keyPhrase}
      </p>
      {keyPhrase.followWith && (
        <p className="text-xs text-neutral-500 mt-1">
          Then: {keyPhrase.followWith}
        </p>
      )}
    </div>
  );
}

function FollowUpList({ predictions }: { predictions: FollowUpPrediction[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!predictions.length) return null;

  const topPredictions = expanded ? predictions : predictions.slice(0, 2);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-300 
                   transition-colors mb-1.5"
      >
        <span className="text-amber-400">⚡</span>
        Likely follow-ups
        <span className="text-neutral-600">{expanded ? '▲' : '▼'}</span>
      </button>
      <div className="space-y-1">
        {topPredictions.map((p, i) => (
          <div
            key={i}
            className="flex items-start gap-2 text-xs text-neutral-300 
                       bg-white/[0.02] rounded px-2 py-1.5"
          >
            <span className="text-neutral-600 font-mono mt-0.5">
              {Math.round(p.likelihood * 100)}%
            </span>
            <span className="flex-1">{p.question}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpeechChips({ coaching }: { coaching: SpeechCoaching }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
  }, [coaching.chips.join(',')]);

  if (!visible || !coaching.chips.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 animate-in fade-in duration-200">
      {coaching.chips.map((chip, i) => (
        <span
          key={i}
          className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 
                     text-amber-300 border border-amber-500/20"
        >
          {chip}
        </span>
      ))}
      <span className="px-2 py-0.5 text-xs text-neutral-500">
        {coaching.wpm} WPM · {Math.floor(coaching.elapsedSeconds)}s
      </span>
    </div>
  );
}

function RecoveryBanner({ recovery }: { recovery: RecoveryAssist }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 12000);
    return () => clearTimeout(timer);
  }, [recovery.trigger]);

  if (!visible) return null;

  return (
    <div className="animate-in fade-in slide-in-from-top-3 duration-500 
                    bg-gradient-to-r from-purple-500/10 to-transparent 
                    border border-purple-500/20 rounded-lg px-3 py-2">
      <p className="text-xs text-purple-300/70 font-medium mb-1">
        RECOVERY ASSIST
      </p>
      <p className="text-sm text-neutral-100 mb-1">
        {recovery.bridgePhrase}
      </p>
      {recovery.redirect && (
        <p className="text-xs text-neutral-400">
          Redirect: {recovery.redirect}
        </p>
      )}
      {recovery.buyTime && (
        <p className="text-xs text-neutral-500 mt-1">
          Buy time: &ldquo;{recovery.buyTime}&rdquo;
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function IntelligencePanel({
  questionIntelligence,
  keyPhrase,
  followUpPredictions,
  speechCoaching,
  recoveryAssist,
}: IntelligencePanelProps) {
  const hasContent = questionIntelligence || keyPhrase || followUpPredictions.length > 0 ||
                     speechCoaching || recoveryAssist;

  if (!hasContent) return null;

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {/* Recovery takes top priority — show immediately */}
      {recoveryAssist && (
        <RecoveryBanner recovery={recoveryAssist} />
      )}

      {/* Key phrase — candidate should say this immediately */}
      {keyPhrase && (
        <KeyPhraseHighlight keyPhrase={keyPhrase} />
      )}

      {/* Question classification badge */}
      {questionIntelligence && (
        <QuestionClassificationBadge intel={questionIntelligence} />
      )}

      {/* Speech coaching chips */}
      {speechCoaching && (
        <SpeechChips coaching={speechCoaching} />
      )}

      {/* Follow-up predictions */}
      {followUpPredictions.length > 0 && (
        <FollowUpList predictions={followUpPredictions} />
      )}
    </div>
  );
}
