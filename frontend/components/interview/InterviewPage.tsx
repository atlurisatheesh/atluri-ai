/**
 * Live Interview Page Layout
 * 
 * 30-Year Veteran Design Principles:
 * - Single focal point (suggestion)
 * - Fixed zones (nothing moves)
 * - Calm under pressure
 * - Zero cognitive overload
 */

'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import IntelligencePanel from './IntelligencePanel';
import PhantomOverlay from '@/components/stealth/PhantomOverlay';
import { usePhantomOverlay } from '@/lib/hooks/usePhantomOverlay';

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

interface TranscriptEntry {
  id: string;
  speaker: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
  isFinal: boolean;
}

interface Suggestion {
  id: string;
  question: string;
  text: string;
  keyPoints: string[];
  isStreaming: boolean;
}

type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

interface InterviewPageProps {
  sessionId: string;
  onEnd?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function InterviewPage({ sessionId, onEnd }: InterviewPageProps) {
  // State
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion | null>(null);
  const [previousSuggestions, setPreviousSuggestions] = useState<Suggestion[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const [micLevel, setMicLevel] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  
  // Intelligence state (populated via WebSocket messages)
  const [questionIntelligence, setQuestionIntelligence] = useState<any>(null);
  const [keyPhrase, setKeyPhrase] = useState<any>(null);
  const [followUpPredictions, setFollowUpPredictions] = useState<any[]>([]);
  const [speechCoaching, setSpeechCoaching] = useState<any>(null);
  const [recoveryAssist, setRecoveryAssist] = useState<any>(null);

  // ── PhantomVeil Stealth Overlay ──
  const phantom = usePhantomOverlay();
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [micOn, setMicOn] = useState(true);

  // Feed WebSocket messages to the overlay hook (called from your WS handler)
  const handleWSForOverlay = useCallback((type: string, data: any) => {
    phantom.handleWSMessage(type, data);
    // Also update InterviewPage's own state for the main UI
    if (type === 'partial_transcript' && data?.text) {
      const entry: TranscriptEntry = {
        id: `t-${Date.now()}`,
        speaker: data.speaker || 'interviewer',
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFinal: data.is_final ?? false,
      };
      setTranscript((prev) => [...prev, entry]);
    }
  }, [phantom]);

  return (
    <div className="h-screen w-screen bg-neutral-950 text-neutral-100 flex flex-col overflow-hidden select-none">

      {/* ── PhantomVeil Overlay ── */}
      <PhantomOverlay
        visible={overlayVisible}
        onClose={() => setOverlayVisible(false)}
        onToggleVisibility={() => setOverlayVisible((v) => !v)}
        transcript={phantom.transcript}
        aiResponse={phantom.aiResponse}
        coach={phantom.coach}
        isListening={micOn}
        onToggleMic={() => setMicOn((v) => !v)}
        opacity={phantom.settings.opacity}
        position={phantom.settings.position}
        size={phantom.settings.size}
        streamingText={phantom.streamingText}
        isStreaming={phantom.isStreaming}
        elapsedSeconds={phantom.elapsedSeconds}
        offerProbability={phantom.offerProbability}
        answerHistory={phantom.answerHistory}
        historyIndex={phantom.historyIndex}
        onNavigateHistory={phantom.navigateHistory}
        stealthHealth={phantom.stealthHealth}
        threatToast={phantom.threatToast}
        onUpdateSettings={phantom.updateSettings}
      />
      
      {/* ═══════════════════════════════════════════════════════════
          TOP BAR — Fixed, h-14, never moves
          ═══════════════════════════════════════════════════════════ */}
      <header className="h-14 min-h-[56px] max-h-[56px] flex-shrink-0 border-b border-neutral-800/50 px-6 flex items-center justify-between bg-neutral-950/95 backdrop-blur-sm">
        
        {/* Left: Brand (minimal) */}
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-medium text-neutral-500">Interview Copilot</span>
        </div>
        
        {/* Center: Session Status */}
        <SessionStatus status={connectionStatus} />
        
        {/* Right: End Button */}
        <button 
          onClick={onEnd}
          className="text-sm text-neutral-500 hover:text-red-400 transition-colors duration-150"
        >
          End Session
        </button>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT — Fixed split, no reflow
          ═══════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-h-0 flex">
        
        {/* ─────────────────────────────────────────────────────────
            LEFT: Transcript Panel (40% width)
            Visual weight: MEDIUM
            ───────────────────────────────────────────────────────── */}
        <section className="w-2/5 min-w-[300px] max-w-[480px] border-r border-neutral-800/50 flex flex-col bg-neutral-950">
          
          {/* Panel Header — Fixed */}
          <div className="h-11 min-h-[44px] px-4 flex items-center border-b border-neutral-800/30">
            <span className="text-[11px] font-medium text-neutral-600 uppercase tracking-widest">
              Transcript
            </span>
          </div>
          
          {/* Scrollable Transcript — Only area that scrolls */}
          <TranscriptPanel entries={transcript} />
        </section>

        {/* ─────────────────────────────────────────────────────────
            RIGHT: Suggestion Panel (60% width)
            Visual weight: HEAVY (primary focus)
            ───────────────────────────────────────────────────────── */}
        <section className="flex-1 flex flex-col bg-neutral-900/30">
          
          {/* Panel Header — Fixed */}
          <div className="h-11 min-h-[44px] px-6 flex items-center justify-between border-b border-neutral-800/30">
            <span className="text-[11px] font-medium text-neutral-600 uppercase tracking-widest">
              Suggestion
            </span>
            <ThinkingIndicator isActive={isThinking} />
          </div>
          
          {/* Suggestion Content — Fixed layout, no scroll */}
          <SuggestionPanel 
            current={currentSuggestion} 
            previous={previousSuggestions}
          />
          
          {/* Intelligence Overlay — Auto-dismissing chips */}
          <IntelligencePanel
            questionIntelligence={questionIntelligence}
            keyPhrase={keyPhrase}
            followUpPredictions={followUpPredictions}
            speechCoaching={speechCoaching}
            recoveryAssist={recoveryAssist}
          />
        </section>
      </main>

      {/* ═══════════════════════════════════════════════════════════
          STATUS BAR — Fixed, h-10, peripheral awareness only
          ═══════════════════════════════════════════════════════════ */}
      <footer className="h-10 min-h-[40px] max-h-[40px] flex-shrink-0 border-t border-neutral-800/50 px-6 flex items-center justify-between text-xs bg-neutral-950/95">
        
        {/* Left: Connection */}
        <ConnectionIndicator status={connectionStatus} />
        
        {/* Center: Latency (very subtle) */}
        <LatencyIndicator latencyMs={latencyMs} />
        
        {/* Right: Mic Level */}
        <MicLevelIndicator level={micLevel} />
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION STATUS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function SessionStatus({ status }: { status: ConnectionStatus }) {
  const isLive = status === 'connected';
  
  return (
    <div className="flex items-center gap-2">
      <span 
        className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
          isLive ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
        }`} 
      />
      <span className="text-xs text-neutral-500">
        {isLive ? 'Live' : 'Reconnecting...'}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// THINKING INDICATOR — Subtle, never alarming
// ═══════════════════════════════════════════════════════════════════════════

function ThinkingIndicator({ isActive }: { isActive: boolean }) {
  if (!isActive) return <div className="w-12" />; // Reserve space
  
  return (
    <div className="flex items-center gap-1 w-12 justify-end">
      {[0, 1, 2].map((i) => (
        <span 
          key={i}
          className={`w-1 h-1 rounded-full bg-neutral-500 animate-pulse ${i === 1 ? '[animation-delay:150ms]' : i === 2 ? '[animation-delay:300ms]' : ''}`}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSCRIPT PANEL — Scrollable, append-only
// ═══════════════════════════════════════════════════════════════════════════

function TranscriptPanel({ entries }: { entries: TranscriptEntry[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Track scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const threshold = 100;
      const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      setIsAtBottom(atBottom);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll only if user is at bottom
  useEffect(() => {
    if (isAtBottom && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries, isAtBottom]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 scroll-smooth"
      role="log"
      aria-live="polite"
      aria-label="Interview transcript"
    >
      {entries.length === 0 ? (
        <EmptyTranscript />
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <TranscriptEntry key={entry.id} entry={entry} />
          ))}
          <div ref={bottomRef} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function EmptyTranscript() {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-sm text-neutral-700">
        Waiting for interview to begin...
      </p>
    </div>
  );
}

function TranscriptEntry({ entry }: { entry: TranscriptEntry }) {
  const isInterviewer = entry.speaker === 'interviewer';
  
  return (
    <div className="group">
      {/* Header: Speaker + Time */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${
          isInterviewer ? 'text-blue-400/60' : 'text-emerald-400/60'
        }`}>
          {isInterviewer ? 'Question' : 'You'}
        </span>
        <span className="text-[10px] text-neutral-700">
          {entry.timestamp}
        </span>
      </div>
      
      {/* Text Content */}
      <p className={`text-sm leading-relaxed pl-0 ${
        isInterviewer ? 'text-neutral-300' : 'text-neutral-400'
      } ${!entry.isFinal ? 'opacity-70' : ''}`}>
        {entry.text}
        {!entry.isFinal && (
          <span className="inline-block w-0.5 h-3.5 bg-neutral-500 ml-0.5 animate-pulse" />
        )}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUGGESTION PANEL — Fixed height, NEVER scrolls
// ═══════════════════════════════════════════════════════════════════════════

function SuggestionPanel({ 
  current, 
  previous 
}: { 
  current: Suggestion | null;
  previous: Suggestion[];
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      
      {/* Primary Suggestion Area — Fixed, contains overflow */}
      <div className="flex-1 min-h-0 px-6 py-5 flex flex-col overflow-hidden">
        
        {/* Current Question Context */}
        {current?.question && (
          <div className="mb-4 flex-shrink-0">
            <p className="text-[10px] text-neutral-600 uppercase tracking-wide mb-1">
              Current question
            </p>
            <p className="text-sm text-neutral-500 line-clamp-2">
              {current.question}
            </p>
          </div>
        )}
        
        {/* Primary Suggestion — Main focus area */}
        <div 
          className="flex-1 min-h-[120px] overflow-hidden"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-label="AI suggestion"
        >
          {current ? (
            <PrimarySuggestion suggestion={current} />
          ) : (
            <EmptySuggestion />
          )}
        </div>
        
        {/* Key Points — Secondary */}
        {current?.keyPoints && current.keyPoints.length > 0 && (
          <div className="mt-5 pt-4 border-t border-neutral-800/30 flex-shrink-0">
            <KeyPoints points={current.keyPoints} />
          </div>
        )}
      </div>
      
      {/* Previous Suggestions — Collapsed, minimal */}
      {previous.length > 0 && (
        <div className="h-20 min-h-[80px] border-t border-neutral-800/30 px-6 py-3 flex-shrink-0 overflow-hidden bg-neutral-900/20">
          <PreviousSuggestions suggestions={previous} />
        </div>
      )}
    </div>
  );
}

function EmptySuggestion() {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-neutral-700 text-sm">
        Suggestions will appear here
      </p>
    </div>
  );
}

function PrimarySuggestion({ suggestion }: { suggestion: Suggestion }) {
  return (
    <div className="h-full">
      <p className="text-lg leading-relaxed text-neutral-100 whitespace-pre-wrap">
        {suggestion.text}
        {suggestion.isStreaming && (
          <span 
            className="inline-block w-0.5 h-5 bg-neutral-400 ml-1 animate-pulse" 
            aria-hidden="true"
          />
        )}
      </p>
    </div>
  );
}

function KeyPoints({ points }: { points: string[] }) {
  return (
    <div>
      <p className="text-[10px] text-neutral-600 uppercase tracking-wide mb-2">
        Key points
      </p>
      <ul className="space-y-1.5">
        {points.slice(0, 3).map((point, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-neutral-400">
            <span className="text-neutral-600 mt-1">•</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviousSuggestions({ suggestions }: { suggestions: Suggestion[] }) {
  const recentTwo = suggestions.slice(-2);
  
  return (
    <div>
      <p className="text-[10px] text-neutral-700 uppercase tracking-wide mb-2">
        Previous
      </p>
      <div className="space-y-1">
        {recentTwo.map((s) => (
          <p key={s.id} className="text-xs text-neutral-600 truncate">
            {s.text.substring(0, 80)}...
          </p>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS BAR COMPONENTS — Peripheral, never alarming
// ═══════════════════════════════════════════════════════════════════════════

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  const configs: Record<ConnectionStatus, { color: string; label: string }> = {
    connected: { color: 'bg-emerald-500', label: 'Connected' },
    reconnecting: { color: 'bg-amber-500 animate-pulse', label: 'Reconnecting...' },
    disconnected: { color: 'bg-red-500', label: 'Disconnected' },
  };
  
  const config = configs[status];
  
  return (
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
      <span className="text-neutral-600">{config.label}</span>
    </div>
  );
}

function LatencyIndicator({ latencyMs }: { latencyMs: number | null }) {
  if (latencyMs === null) return null;
  
  // Only show if concerning (>1000ms)
  if (latencyMs < 1000) return null;
  
  return (
    <span className="text-neutral-700">
      {latencyMs > 2000 ? 'Slow connection' : `${latencyMs}ms`}
    </span>
  );
}

function MicLevelIndicator({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-neutral-600">Mic</span>
      <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-emerald-500/60 transition-all duration-75 ease-out"
          ref={(el) => { if (el) el.style.width = `${Math.min(100, Math.max(0, level))}%`; }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default InterviewPage;
