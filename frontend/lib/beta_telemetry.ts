/**
 * Beta Session Telemetry
 * 
 * Drop-in instrumentation for 14-day closed beta.
 * Captures trust signals, not just latency.
 * 
 * Usage:
 *   import { BetaTelemetry } from './beta_telemetry';
 *   const telemetry = new BetaTelemetry(userId);
 *   telemetry.startSession();
 *   
 *   // Track events
 *   telemetry.trackSuggestionShown(suggestionId, latencyMs);
 *   telemetry.trackSuggestionClicked(suggestionId);
 *   telemetry.trackError('ws_disconnect', 'Connection lost');
 *   
 *   // End session
 *   const report = telemetry.endSession();
 */

interface TelemetryEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

interface SessionReport {
  sessionId: string;
  userId: string;
  startTime: number;
  endTime: number;
  durationSec: number;
  
  // Environment
  browser: string;
  screenWidth: number;
  connectionType: string;
  
  // Core Metrics
  suggestionsShown: number;
  suggestionsClicked: number;
  suggestionFollowRate: number;
  avgSuggestionLatencyMs: number;
  p95SuggestionLatencyMs: number;
  
  // Trust Signals
  userPausedForSuggestion: number;  // Times user waited
  userIgnoredSuggestion: number;
  sessionCompleted: boolean;
  
  // Reliability
  errorCount: number;
  wsReconnectCount: number;
  audioGapCount: number;
  freezeCount: number;
  
  // Raw Events
  events: TelemetryEvent[];
}

export class BetaTelemetry {
  private userId: string;
  private sessionId: string;
  private startTime: number = 0;
  private events: TelemetryEvent[] = [];
  
  // Counters
  private suggestionsShown: number = 0;
  private suggestionsClicked: number = 0;
  private suggestionLatencies: number[] = [];
  private userPausedForSuggestion: number = 0;
  private errorCount: number = 0;
  private wsReconnectCount: number = 0;
  private audioGapCount: number = 0;
  private freezeCount: number = 0;
  
  // State tracking
  private lastSpeechTimestamp: number = 0;
  private lastSuggestionTimestamp: number = 0;
  private pendingSuggestionIds: Set<string> = new Set();
  
  constructor(userId: string) {
    this.userId = userId;
    this.sessionId = this.generateSessionId();
  }
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // ============ Session Lifecycle ============
  
  startSession(): void {
    this.startTime = Date.now();
    this.logEvent('session_start', {
      browser: navigator.userAgent,
      screenWidth: window.innerWidth,
      connectionType: (navigator as any).connection?.effectiveType || 'unknown',
    });
    
    // Set up global error handler
    window.addEventListener('error', this.handleGlobalError.bind(this));
    
    console.log(`[Telemetry] Session started: ${this.sessionId}`);
  }
  
  endSession(): SessionReport {
    const endTime = Date.now();
    this.logEvent('session_end', {});
    
    const report = this.generateReport(endTime);
    
    // Send to backend
    this.sendReport(report);
    
    // Cleanup
    window.removeEventListener('error', this.handleGlobalError.bind(this));
    
    console.log(`[Telemetry] Session ended. Follow rate: ${report.suggestionFollowRate.toFixed(1)}%`);
    
    return report;
  }
  
  // ============ Suggestion Tracking ============
  
  trackSuggestionShown(suggestionId: string, latencyMs: number): void {
    this.suggestionsShown++;
    this.suggestionLatencies.push(latencyMs);
    this.lastSuggestionTimestamp = Date.now();
    this.pendingSuggestionIds.add(suggestionId);
    
    this.logEvent('suggestion_shown', {
      suggestionId,
      latencyMs,
      timeSinceLastSpeech: Date.now() - this.lastSpeechTimestamp,
    });
  }
  
  trackSuggestionClicked(suggestionId: string): void {
    this.suggestionsClicked++;
    this.pendingSuggestionIds.delete(suggestionId);
    
    // Check if user paused speaking to read suggestion
    const timeSinceSuggestion = Date.now() - this.lastSuggestionTimestamp;
    if (timeSinceSuggestion > 500 && timeSinceSuggestion < 5000) {
      this.userPausedForSuggestion++;
    }
    
    this.logEvent('suggestion_clicked', {
      suggestionId,
      timeSinceSuggestion,
      userPaused: timeSinceSuggestion > 500,
    });
  }
  
  trackSuggestionIgnored(suggestionId: string): void {
    this.pendingSuggestionIds.delete(suggestionId);
    
    this.logEvent('suggestion_ignored', {
      suggestionId,
    });
  }
  
  // ============ Audio/Speech Tracking ============
  
  trackSpeechDetected(): void {
    this.lastSpeechTimestamp = Date.now();
    this.logEvent('speech_detected', {});
  }
  
  trackAudioGap(durationMs: number): void {
    if (durationMs > 3000) {
      this.audioGapCount++;
      this.logEvent('audio_gap', { durationMs });
    }
  }
  
  trackMicPermission(status: 'granted' | 'denied' | 'prompt'): void {
    this.logEvent('mic_permission', { status });
  }
  
  // ============ Reliability Tracking ============
  
  trackError(type: string, message: string): void {
    this.errorCount++;
    this.logEvent('error', { type, message });
  }
  
  trackWsReconnect(reason: string): void {
    this.wsReconnectCount++;
    this.logEvent('ws_reconnect', { reason });
  }
  
  trackFreeze(durationMs: number): void {
    if (durationMs > 1000) {
      this.freezeCount++;
      this.logEvent('freeze', { durationMs });
    }
  }
  
  // ============ Trust Signals ============
  
  trackRageClick(): void {
    this.logEvent('rage_click', {});
  }
  
  trackSessionAbandon(reason: string): void {
    this.logEvent('session_abandon', { reason });
  }
  
  // ============ Internal Methods ============
  
  private logEvent(type: string, data: Record<string, unknown>): void {
    this.events.push({
      type,
      timestamp: Date.now(),
      data,
    });
  }
  
  private handleGlobalError(event: ErrorEvent): void {
    this.trackError('uncaught', event.message);
  }
  
  private generateReport(endTime: number): SessionReport {
    const durationSec = (endTime - this.startTime) / 1000;
    
    // Calculate latency percentiles
    const sortedLatencies = [...this.suggestionLatencies].sort((a, b) => a - b);
    const avgLatency = sortedLatencies.length > 0
      ? sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length
      : 0;
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p95Latency = sortedLatencies[p95Index] || 0;
    
    // Follow rate
    const followRate = this.suggestionsShown > 0
      ? (this.suggestionsClicked / this.suggestionsShown) * 100
      : 0;
    
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.startTime,
      endTime,
      durationSec,
      
      browser: navigator.userAgent,
      screenWidth: window.innerWidth,
      connectionType: (navigator as any).connection?.effectiveType || 'unknown',
      
      suggestionsShown: this.suggestionsShown,
      suggestionsClicked: this.suggestionsClicked,
      suggestionFollowRate: followRate,
      avgSuggestionLatencyMs: avgLatency,
      p95SuggestionLatencyMs: p95Latency,
      
      userPausedForSuggestion: this.userPausedForSuggestion,
      userIgnoredSuggestion: this.suggestionsShown - this.suggestionsClicked,
      sessionCompleted: durationSec > 300, // 5 min = completed
      
      errorCount: this.errorCount,
      wsReconnectCount: this.wsReconnectCount,
      audioGapCount: this.audioGapCount,
      freezeCount: this.freezeCount,
      
      events: this.events,
    };
  }
  
  private async sendReport(report: SessionReport): Promise<void> {
    try {
      // Store locally first
      localStorage.setItem(`beta_session_${report.sessionId}`, JSON.stringify(report));
      
      // Try to send to backend
      const response = await fetch('/api/v1/telemetry/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      
      if (response.ok) {
        localStorage.removeItem(`beta_session_${report.sessionId}`);
      }
    } catch (error) {
      console.warn('[Telemetry] Failed to send report, stored locally', error);
    }
  }
}

// ============ Freeze Detection ============

export class FreezeDetector {
  private telemetry: BetaTelemetry;
  private lastFrameTime: number = 0;
  private rafId: number = 0;
  
  constructor(telemetry: BetaTelemetry) {
    this.telemetry = telemetry;
  }
  
  start(): void {
    this.lastFrameTime = performance.now();
    this.checkFrame();
  }
  
  stop(): void {
    cancelAnimationFrame(this.rafId);
  }
  
  private checkFrame(): void {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    
    if (delta > 1000) {
      this.telemetry.trackFreeze(delta);
    }
    
    this.lastFrameTime = now;
    this.rafId = requestAnimationFrame(() => this.checkFrame());
  }
}

// ============ Rage Click Detection ============

export class RageClickDetector {
  private telemetry: BetaTelemetry;
  private clickTimes: number[] = [];
  
  constructor(telemetry: BetaTelemetry) {
    this.telemetry = telemetry;
  }
  
  start(): void {
    document.addEventListener('click', this.handleClick.bind(this));
  }
  
  stop(): void {
    document.removeEventListener('click', this.handleClick.bind(this));
  }
  
  private handleClick(): void {
    const now = Date.now();
    this.clickTimes.push(now);
    
    // Keep only last 1 second of clicks
    this.clickTimes = this.clickTimes.filter(t => now - t < 1000);
    
    if (this.clickTimes.length >= 4) {
      this.telemetry.trackRageClick();
      this.clickTimes = [];
    }
  }
}

// ============ Auto-Initialize for Beta ============

let globalTelemetry: BetaTelemetry | null = null;

export function initBetaTelemetry(userId: string): BetaTelemetry {
  if (globalTelemetry) {
    return globalTelemetry;
  }
  
  globalTelemetry = new BetaTelemetry(userId);
  globalTelemetry.startSession();
  
  // Start detectors
  const freezeDetector = new FreezeDetector(globalTelemetry);
  freezeDetector.start();
  
  const rageDetector = new RageClickDetector(globalTelemetry);
  rageDetector.start();
  
  // Handle page unload
  window.addEventListener('beforeunload', () => {
    if (globalTelemetry) {
      globalTelemetry.endSession();
    }
  });
  
  return globalTelemetry;
}

export function getBetaTelemetry(): BetaTelemetry | null {
  return globalTelemetry;
}
