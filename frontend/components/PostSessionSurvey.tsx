/**
 * Post-Session Survey Component
 * 
 * Shows after each beta session to measure trust.
 * Takes 2 minutes max. Focuses on the core question:
 * "Would you trust this in a real interview?"
 */

'use client';

import React, { useState } from 'react';

interface SurveyResponse {
  sessionId: string;
  userId: string;
  timestamp: number;
  
  // Q1: Reliability
  freezeExperience: 'none' | 'minor' | 'noticeable' | 'unusable';
  
  // Q2: Quality
  suggestionQuality: 'all_good' | 'few_off' | 'several_wrong' | 'mostly_unhelpful';
  
  // Q3: Confidence
  confidenceImpact: 'much_more' | 'slightly_more' | 'no_change' | 'less' | 'much_less';
  
  // Q4: Trust (THE KEY METRIC)
  wouldUseInRealInterview: 'definitely_yes' | 'probably_yes' | 'unsure' | 'probably_not' | 'definitely_not';
  
  // Q5: Open feedback
  improvementSuggestion: string;
}

interface PostSessionSurveyProps {
  sessionId: string;
  userId: string;
  onComplete: (response: SurveyResponse) => void;
  onSkip: () => void;
}

export function PostSessionSurvey({ 
  sessionId, 
  userId, 
  onComplete, 
  onSkip 
}: PostSessionSurveyProps) {
  const [step, setStep] = useState(1);
  const [response, setResponse] = useState<Partial<SurveyResponse>>({
    sessionId,
    userId,
    timestamp: Date.now(),
  });

  const handleAnswer = (key: keyof SurveyResponse, value: string) => {
    setResponse(prev => ({ ...prev, [key]: value }));
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleSubmit = () => {
    if (response.wouldUseInRealInterview) {
      onComplete(response as SurveyResponse);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-white text-lg font-semibold">Quick Feedback</h2>
          <p className="text-blue-100 text-sm">2 minutes to help us improve</p>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div 
                key={i}
                className={`h-1 flex-1 rounded ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">Question {step} of 5</p>
        </div>

        {/* Questions */}
        <div className="px-6 py-6">
          {step === 1 && (
            <Question
              question="Did the app freeze or lag during your session?"
              options={[
                { value: 'none', label: 'No issues', emoji: '✅' },
                { value: 'minor', label: 'Minor lag (< 1 sec)', emoji: '🟡' },
                { value: 'noticeable', label: 'Noticeable delay (1-3 sec)', emoji: '🟠' },
                { value: 'unusable', label: 'Unusable (> 3 sec)', emoji: '🔴' },
              ]}
              onSelect={(v) => handleAnswer('freezeExperience', v)}
            />
          )}

          {step === 2 && (
            <Question
              question="Did any suggestion feel wrong or confusing?"
              options={[
                { value: 'all_good', label: 'No, all made sense', emoji: '✅' },
                { value: 'few_off', label: '1-2 felt off', emoji: '🟡' },
                { value: 'several_wrong', label: 'Several felt wrong', emoji: '🟠' },
                { value: 'mostly_unhelpful', label: 'Most were unhelpful', emoji: '🔴' },
              ]}
              onSelect={(v) => handleAnswer('suggestionQuality', v)}
            />
          )}

          {step === 3 && (
            <Question
              question="Did you feel MORE or LESS confident with the AI?"
              options={[
                { value: 'much_more', label: 'Much more confident', emoji: '🚀' },
                { value: 'slightly_more', label: 'Slightly more confident', emoji: '📈' },
                { value: 'no_change', label: 'No difference', emoji: '➡️' },
                { value: 'less', label: 'Less confident', emoji: '📉' },
                { value: 'much_less', label: 'Much less confident', emoji: '😰' },
              ]}
              onSelect={(v) => handleAnswer('confidenceImpact', v)}
            />
          )}

          {step === 4 && (
            <Question
              question="Would you use this in a REAL interview tomorrow?"
              highlight={true}
              options={[
                { value: 'definitely_yes', label: 'Definitely yes', emoji: '💯' },
                { value: 'probably_yes', label: 'Probably yes', emoji: '👍' },
                { value: 'unsure', label: 'Unsure', emoji: '🤔' },
                { value: 'probably_not', label: 'Probably not', emoji: '👎' },
                { value: 'definitely_not', label: 'Definitely not', emoji: '❌' },
              ]}
              onSelect={(v) => handleAnswer('wouldUseInRealInterview', v)}
            />
          )}

          {step === 5 && (
            <div>
              <h3 className="text-gray-900 font-medium mb-3">
                What's one thing that would make you trust it more?
              </h3>
              <textarea
                className="w-full border rounded-lg p-3 h-24 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your honest feedback helps us improve..."
                value={response.improvementSuggestion || ''}
                onChange={(e) => setResponse(prev => ({ 
                  ...prev, 
                  improvementSuggestion: e.target.value 
                }))}
              />
              <button
                onClick={handleSubmit}
                className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Submit Feedback
              </button>
            </div>
          )}
        </div>

        {/* Skip option */}
        <div className="px-6 pb-4">
          <button
            onClick={onSkip}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

interface QuestionProps {
  question: string;
  options: { value: string; label: string; emoji: string }[];
  onSelect: (value: string) => void;
  highlight?: boolean;
}

function Question({ question, options, onSelect, highlight }: QuestionProps) {
  return (
    <div>
      <h3 className={`font-medium mb-4 ${highlight ? 'text-blue-900 text-lg' : 'text-gray-900'}`}>
        {question}
      </h3>
      <div className="space-y-2">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition
              hover:border-blue-500 hover:bg-blue-50
              ${highlight ? 'border-gray-300' : 'border-gray-200'}
            `}
          >
            <span className="mr-2">{opt.emoji}</span>
            <span className="text-gray-700">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ Survey API ============

export async function submitSurveyResponse(response: SurveyResponse): Promise<void> {
  try {
    // Store locally first
    const key = `beta_survey_${response.sessionId}`;
    localStorage.setItem(key, JSON.stringify(response));
    
    // Send to backend
    const res = await fetch('/api/v1/telemetry/survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    });
    
    if (res.ok) {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('[Survey] Failed to submit, stored locally');
  }
}

// ============ Trust Score Calculation ============

export function calculateTrustScore(responses: SurveyResponse[]): number {
  if (responses.length === 0) return 0;
  
  let totalScore = 0;
  
  for (const r of responses) {
    let score = 0;
    
    // Would use in real interview (40% weight)
    const trustMap: Record<string, number> = {
      'definitely_yes': 100,
      'probably_yes': 75,
      'unsure': 50,
      'probably_not': 25,
      'definitely_not': 0,
    };
    score += (trustMap[r.wouldUseInRealInterview] || 0) * 0.4;
    
    // Confidence impact (30% weight)
    const confMap: Record<string, number> = {
      'much_more': 100,
      'slightly_more': 75,
      'no_change': 50,
      'less': 25,
      'much_less': 0,
    };
    score += (confMap[r.confidenceImpact] || 0) * 0.3;
    
    // Reliability (20% weight)
    const reliabilityMap: Record<string, number> = {
      'none': 100,
      'minor': 75,
      'noticeable': 40,
      'unusable': 0,
    };
    score += (reliabilityMap[r.freezeExperience] || 0) * 0.2;
    
    // Suggestion quality (10% weight)
    const qualityMap: Record<string, number> = {
      'all_good': 100,
      'few_off': 70,
      'several_wrong': 30,
      'mostly_unhelpful': 0,
    };
    score += (qualityMap[r.suggestionQuality] || 0) * 0.1;
    
    totalScore += score;
  }
  
  return totalScore / responses.length;
}
