/**
 * Failure State Components — Never panic, always reassure
 * 
 * Design Principle:
 * The user is in a high-stakes interview. They cannot afford to panic.
 * Every failure state must:
 * 1. Be subtle (no red backgrounds, no exclamation marks)
 * 2. Communicate "we're handling it"
 * 3. Disappear once resolved (no "success!" celebration)
 */

import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type FailureState = 
  | 'none'
  | 'slow_network'
  | 'stt_failover'
  | 'ai_timeout'
  | 'websocket_reconnecting'
  | 'audio_permission_denied'
  | 'microphone_error';

interface FailureBannerProps {
  state: FailureState;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// BANNER CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const FAILURE_CONFIG: Record<FailureState, { message: string; showSpinner: boolean } | null> = {
  none: null,
  
  slow_network: {
    message: 'Adjusting for network speed...',
    showSpinner: true,
  },
  
  stt_failover: {
    message: 'Using backup transcription...',
    showSpinner: true,
  },
  
  ai_timeout: {
    message: 'Taking a moment longer...',
    showSpinner: true,
  },
  
  websocket_reconnecting: {
    message: 'Reconnecting...',
    showSpinner: true,
  },
  
  audio_permission_denied: {
    message: 'Microphone access needed',
    showSpinner: false,
  },
  
  microphone_error: {
    message: 'Microphone temporarily unavailable',
    showSpinner: false,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// FAILURE BANNER — Subtle, non-alarming
// ═══════════════════════════════════════════════════════════════════════════

export function FailureBanner({ state, className = '' }: FailureBannerProps) {
  const config = FAILURE_CONFIG[state];
  
  if (!config) {
    return null;
  }

  return (
    <div 
      className={`
        flex items-center justify-center gap-2 py-2 px-4
        bg-neutral-900/80 backdrop-blur-sm
        text-xs text-neutral-400
        border-b border-neutral-800/30
        animate-in fade-in slide-in-from-top-1 duration-300
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      {config.showSpinner && (
        <SubtleSpinner />
      )}
      <span>{config.message}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBTLE SPINNER — Never flashy
// ═══════════════════════════════════════════════════════════════════════════

function SubtleSpinner() {
  return (
    <svg 
      className="w-3 h-3 animate-spin text-neutral-500" 
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle 
        className="opacity-20" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="3"
      />
      <path 
        className="opacity-60" 
        d="M12 2a10 10 0 0 1 10 10" 
        stroke="currentColor" 
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTION STATUS PILL — For persistent display in status bar
// ═══════════════════════════════════════════════════════════════════════════

interface ConnectionStatusPillProps {
  isConnected: boolean;
  isReconnecting: boolean;
}

export function ConnectionStatusPill({ isConnected, isReconnecting }: ConnectionStatusPillProps) {
  if (isConnected && !isReconnecting) {
    return null; // Don't show when everything is fine
  }

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">
      {isReconnecting ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70 animate-pulse" />
          <span>Reconnecting</span>
        </>
      ) : (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
          <span>Offline</span>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TOAST NOTIFICATION — For transient messages
// ═══════════════════════════════════════════════════════════════════════════

interface ToastProps {
  message: string;
  type?: 'info' | 'warning';
  onDismiss?: () => void;
}

export function Toast({ message, type = 'info', onDismiss }: ToastProps) {
  // Auto-dismiss after 4 seconds
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss?.();
    }, 4000);
    
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div 
      className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-2 py-2 px-4 rounded-lg
        bg-neutral-900/95 backdrop-blur-sm
        border border-neutral-800/50
        text-sm text-neutral-300
        shadow-xl
        animate-in fade-in slide-in-from-bottom-2 duration-300
      `}
      role="status"
      aria-live="polite"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${
        type === 'warning' ? 'bg-amber-500/70' : 'bg-neutral-500'
      }`} />
      <span>{message}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FULL-SCREEN RECOVERY — Only for catastrophic failures
// ═══════════════════════════════════════════════════════════════════════════

interface RecoveryOverlayProps {
  isVisible: boolean;
  onRetry?: () => void;
}

export function RecoveryOverlay({ isVisible, onRetry }: RecoveryOverlayProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="
        fixed inset-0 z-50
        flex flex-col items-center justify-center
        bg-neutral-950/95 backdrop-blur-sm
      "
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="recovery-title"
      aria-describedby="recovery-desc"
    >
      <div className="text-center max-w-sm px-6">
        {/* No alarming icon — just text */}
        <h2 
          id="recovery-title"
          className="text-lg font-medium text-neutral-200 mb-2"
        >
          Connection interrupted
        </h2>
        <p 
          id="recovery-desc"
          className="text-sm text-neutral-500 mb-6"
        >
          Your interview audio is unaffected. We're reconnecting to provide suggestions.
        </p>
        
        <button
          onClick={onRetry}
          className="
            px-5 py-2.5 rounded-lg
            bg-neutral-800 hover:bg-neutral-700
            text-sm text-neutral-200
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:ring-offset-2 focus:ring-offset-neutral-950
          "
        >
          Retry Connection
        </button>
        
        <p className="mt-6 text-xs text-neutral-700">
          Your transcript is saved locally
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export type { FailureState };
export default FailureBanner;
