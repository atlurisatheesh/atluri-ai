/**
 * useInterview — WebSocket connection + state management
 * 
 * Golden Rule: Never show that something is broken.
 * Handle all failures gracefully. The user is in an interview.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
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

// ── Interview Intelligence Types ──
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

interface InterviewState {
  transcript: TranscriptEntry[];
  currentSuggestion: Suggestion | null;
  previousSuggestions: Suggestion[];
  connectionStatus: ConnectionStatus;
  isThinking: boolean;
  latencyMs: number | null;
  error: string | null;
  // ── Intelligence state ──
  questionIntelligence: QuestionIntelligence | null;
  keyPhrase: KeyPhrase | null;
  followUpPredictions: FollowUpPrediction[];
  speechCoaching: SpeechCoaching | null;
  recoveryAssist: RecoveryAssist | null;
}

interface UseInterviewOptions {
  sessionId: string;
  token: string;
  onError?: (error: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || (typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}` : 'ws://localhost:9010');
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000]; // Exponential backoff
const HEARTBEAT_INTERVAL = 30000;
const LATENCY_SAMPLE_SIZE = 5;

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useInterview({ sessionId, token, onError }: UseInterviewOptions) {
  // State
  const [state, setState] = useState<InterviewState>({
    transcript: [],
    currentSuggestion: null,
    previousSuggestions: [],
    connectionStatus: 'disconnected',
    isThinking: false,
    latencyMs: null,
    error: null,
    questionIntelligence: null,
    keyPhrase: null,
    followUpPredictions: [],
    speechCoaching: null,
    recoveryAssist: null,
  });

  // Refs for WebSocket management
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const latencySamplesRef = useRef<number[]>([]);
  const streamingTextRef = useRef<string>('');
  const lastPingRef = useRef<number>(0);

  // ─────────────────────────────────────────────────────────────────────────
  // CONNECT
  // ─────────────────────────────────────────────────────────────────────────
  
  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsUrl = `${WS_BASE_URL}/ws/voice?token=${token}&room_id=${sessionId}&participant=candidate`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Interview] WebSocket connected');
        reconnectAttemptRef.current = 0;
        setState(prev => ({ ...prev, connectionStatus: 'connected', error: null }));
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        handleMessage(event.data);
      };

      ws.onclose = (event) => {
        console.log('[Interview] WebSocket closed', event.code);
        stopHeartbeat();
        
        if (event.code !== 1000) { // Abnormal close
          scheduleReconnect();
        } else {
          setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
        }
      };

      ws.onerror = (error) => {
        console.error('[Interview] WebSocket error', error);
        // Don't update state here — onclose will handle it
      };

    } catch (error) {
      console.error('[Interview] Failed to create WebSocket', error);
      scheduleReconnect();
    }
  }, [sessionId, token]);

  // ─────────────────────────────────────────────────────────────────────────
  // MESSAGE HANDLING
  // ─────────────────────────────────────────────────────────────────────────

  const handleMessage = useCallback((raw: string) => {
    try {
      const msg = JSON.parse(raw);
      
      switch (msg.type) {
        case 'transcript':
          handleTranscript(msg);
          break;
          
        case 'suggestion_start':
          handleSuggestionStart(msg);
          break;
          
        case 'suggestion_chunk':
          handleSuggestionChunk(msg);
          break;
          
        case 'suggestion_complete':
          handleSuggestionComplete(msg);
          break;
          
        case 'thinking':
          setState(prev => ({ ...prev, isThinking: msg.active ?? true }));
          break;
          
        case 'pong':
          handlePong();
          break;
          
        case 'error':
          handleServerError(msg);
          break;
          
        // ── Interview Intelligence messages ──
        case 'question_intelligence':
          setState(prev => ({
            ...prev,
            questionIntelligence: {
              questionType: msg.question_type,
              difficulty: msg.difficulty,
              framework: msg.framework,
              frameworkInstructions: msg.framework_instructions || {},
              maxAnswerSeconds: msg.max_answer_seconds || 120,
              coachingNote: msg.coaching_note || '',
            },
            keyPhrase: null,
            followUpPredictions: [],
            recoveryAssist: null,
          }));
          break;
          
        case 'key_phrase':
          setState(prev => ({
            ...prev,
            keyPhrase: {
              keyPhrase: msg.key_phrase,
              followWith: msg.follow_with || '',
            },
          }));
          break;
          
        case 'followup_predictions':
          setState(prev => ({
            ...prev,
            followUpPredictions: (msg.predictions?.predictions || []).map((p: any) => ({
              question: p.question,
              likelihood: p.likelihood,
              skeleton: p.skeleton,
              framework: p.framework,
            })),
          }));
          break;
          
        case 'speech_coaching':
          setState(prev => ({
            ...prev,
            speechCoaching: {
              chips: msg.chips || [],
              wpm: msg.wpm || 0,
              elapsedSeconds: msg.elapsed_seconds || 0,
            },
          }));
          break;
          
        case 'recovery_assist':
          setState(prev => ({
            ...prev,
            recoveryAssist: {
              trigger: msg.trigger,
              bridgePhrase: msg.bridge_phrase,
              redirect: msg.redirect,
              buyTime: msg.buy_time,
            },
          }));
          break;
          
        default:
          // Unknown message type — ignore gracefully
          break;
      }
    } catch (error) {
      console.error('[Interview] Failed to parse message', error);
      // Never crash on bad messages
    }
  }, []);

  const handleTranscript = useCallback((msg: any) => {
    const entry: TranscriptEntry = {
      id: msg.id || crypto.randomUUID(),
      speaker: msg.speaker || 'interviewer',
      text: msg.text || '',
      timestamp: formatTime(new Date()),
      isFinal: msg.is_final ?? true,
    };

    setState(prev => {
      // If updating an existing entry (non-final → final)
      if (!entry.isFinal) {
        const existing = prev.transcript.find(t => t.id === entry.id);
        if (existing) {
          return {
            ...prev,
            transcript: prev.transcript.map(t => 
              t.id === entry.id ? { ...t, text: entry.text } : t
            ),
          };
        }
      }
      
      // Append new entry
      return {
        ...prev,
        transcript: [...prev.transcript.slice(-100), entry], // Keep last 100
      };
    });
  }, []);

  const handleSuggestionStart = useCallback((msg: any) => {
    streamingTextRef.current = '';
    
    setState(prev => {
      // Move current to previous (if exists)
      const previousSuggestions = prev.currentSuggestion
        ? [...prev.previousSuggestions.slice(-5), prev.currentSuggestion]
        : prev.previousSuggestions;

      // IMPORTANT: Carry forward the previous answer text as placeholder
      // so the UI never goes blank during the 2-3s OpenAI latency gap.
      // The text will be replaced once actual streaming chunks arrive.
      const previousText = prev.currentSuggestion?.text || '';

      const newSuggestion: Suggestion = {
        id: msg.id || crypto.randomUUID(),
        question: msg.question || '',
        text: previousText,
        keyPoints: [],
        isStreaming: true,
      };

      return {
        ...prev,
        currentSuggestion: newSuggestion,
        previousSuggestions,
        isThinking: false,
      };
    });
  }, []);

  const handleSuggestionChunk = useCallback((msg: any) => {
    const chunk = msg.text || msg.chunk || '';
    streamingTextRef.current += chunk;

    setState(prev => {
      if (!prev.currentSuggestion) return prev;

      return {
        ...prev,
        currentSuggestion: {
          ...prev.currentSuggestion,
          text: streamingTextRef.current,
          isStreaming: true,
        },
      };
    });
  }, []);

  const handleSuggestionComplete = useCallback((msg: any) => {
    setState(prev => {
      if (!prev.currentSuggestion) return prev;

      return {
        ...prev,
        currentSuggestion: {
          ...prev.currentSuggestion,
          text: msg.text || streamingTextRef.current,
          keyPoints: msg.key_points || [],
          isStreaming: false,
        },
        isThinking: false,
      };
    });

    streamingTextRef.current = '';
  }, []);

  const handleServerError = useCallback((msg: any) => {
    console.error('[Interview] Server error', msg);
    // Don't show errors to user — they're in an interview
    // Just log and continue
    onError?.(msg.message || 'Unknown error');
  }, [onError]);

  // ─────────────────────────────────────────────────────────────────────────
  // HEARTBEAT / LATENCY
  // ─────────────────────────────────────────────────────────────────────────

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        lastPingRef.current = performance.now();
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const handlePong = useCallback(() => {
    if (lastPingRef.current) {
      const latency = performance.now() - lastPingRef.current;
      latencySamplesRef.current = [
        ...latencySamplesRef.current.slice(-(LATENCY_SAMPLE_SIZE - 1)),
        latency,
      ];
      
      const avgLatency = Math.round(
        latencySamplesRef.current.reduce((a, b) => a + b, 0) / 
        latencySamplesRef.current.length
      );
      
      setState(prev => ({ ...prev, latencyMs: avgLatency }));
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RECONNECTION
  // ─────────────────────────────────────────────────────────────────────────

  const scheduleReconnect = useCallback(() => {
    setState(prev => ({ ...prev, connectionStatus: 'reconnecting' }));
    
    const attempt = reconnectAttemptRef.current;
    const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
    
    console.log(`[Interview] Reconnecting in ${delay}ms (attempt ${attempt + 1})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptRef.current++;
      connect();
    }, delay);
  }, [connect]);

  // ─────────────────────────────────────────────────────────────────────────
  // SEND MESSAGE
  // ─────────────────────────────────────────────────────────────────────────

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    connect();

    return () => {
      stopHeartbeat();
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect, stopHeartbeat]);

  // ─────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────

  return {
    ...state,
    send,
    reconnect: connect,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default useInterview;
