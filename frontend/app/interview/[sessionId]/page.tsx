/**
 * /interview/[sessionId]/page.tsx
 * 
 * Production Interview Session Page
 * 
 * Features:
 * - WebSocket connection to backend
 * - Real-time transcript display
 * - AI suggestions with streaming
 * - Graceful failure handling
 * - Microphone level monitoring
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  InterviewPage,
  useInterview,
  useAudio,
  FailureBanner,
  RecoveryOverlay,
  type FailureState,
} from '@/components/interview/index';

// ═══════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function InterviewSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  // Get token from session storage (set during session creation)
  const token = typeof window !== 'undefined' 
    ? sessionStorage.getItem('interview_token') || 'dev_token'
    : 'dev_token';

  // State
  const [failureState, setFailureState] = useState<FailureState>('none');
  const [showRecovery, setShowRecovery] = useState(false);

  // Interview connection
  const interview = useInterview({
    sessionId,
    token,
    onError: useCallback((error: string) => {
      console.error('[Page] Interview error:', error);
      // Map errors to failure states
      if (error.includes('timeout')) {
        setFailureState('ai_timeout');
      } else if (error.includes('network') || error.includes('connection')) {
        setFailureState('slow_network');
      }
    }, []),
  });

  // Audio (microphone)
  const audio = useAudio({
    enabled: true,
    onError: useCallback(() => {
      setFailureState('microphone_error');
    }, []),
  });

  // Clear failure state after 3 seconds
  React.useEffect(() => {
    if (failureState !== 'none') {
      const timer = setTimeout(() => setFailureState('none'), 3000);
      return () => clearTimeout(timer);
    }
  }, [failureState]);

  // Handle disconnection
  React.useEffect(() => {
    if (interview.connectionStatus === 'disconnected') {
      // Show recovery after 10 seconds of being disconnected
      const timer = setTimeout(() => {
        setShowRecovery(true);
      }, 10000);
      return () => clearTimeout(timer);
    }
    setShowRecovery(false);
  }, [interview.connectionStatus]);

  // End session
  const handleEnd = useCallback(() => {
    if (window.confirm('Are you sure you want to end this session?')) {
      router.push('/dashboard');
    }
  }, [router]);

  // Retry connection
  const handleRetry = useCallback(() => {
    setShowRecovery(false);
    interview.reconnect();
  }, [interview]);

  return (
    <>
      {/* Failure Banner — Shows above main content */}
      <FailureBanner 
        state={interview.connectionStatus === 'reconnecting' ? 'websocket_reconnecting' : failureState} 
        className="fixed top-0 left-0 right-0 z-40"
      />

      {/* Main Interview UI */}
      <InterviewPage 
        sessionId={sessionId}
        onEnd={handleEnd}
      />

      {/* Recovery Overlay — Only for catastrophic failures */}
      <RecoveryOverlay 
        isVisible={showRecovery}
        onRetry={handleRetry}
      />
    </>
  );
}
