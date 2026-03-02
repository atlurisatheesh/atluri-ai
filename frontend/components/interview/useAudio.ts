/**
 * useAudio — Microphone access and level monitoring
 * 
 * Principle: Silent failure. If mic doesn't work, don't alarm the user.
 * They're in an interview — they already know if their mic is working.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type AudioStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'error';

interface UseAudioOptions {
  enabled?: boolean;
  onAudioData?: (audioData: Float32Array) => void;
  onError?: (error: string) => void;
}

interface UseAudioReturn {
  status: AudioStatus;
  level: number; // 0-100
  requestPermission: () => Promise<boolean>;
  stop: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const LEVEL_UPDATE_INTERVAL = 50; // ms
const LEVEL_SMOOTHING = 0.8; // Exponential smoothing factor

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useAudio({
  enabled = true,
  onAudioData,
  onError,
}: UseAudioOptions = {}): UseAudioReturn {
  const [status, setStatus] = useState<AudioStatus>('idle');
  const [level, setLevel] = useState(0);

  // Refs
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const smoothedLevelRef = useRef(0);

  // ─────────────────────────────────────────────────────────────────────────
  // REQUEST PERMISSION
  // ─────────────────────────────────────────────────────────────────────────

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (status === 'active') {
      return true;
    }

    setStatus('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      streamRef.current = stream;

      // Set up audio analysis
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start level monitoring
      startLevelMonitoring();

      setStatus('active');
      return true;

    } catch (error: any) {
      console.error('[Audio] Permission error:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setStatus('denied');
      } else {
        setStatus('error');
        onError?.(error.message || 'Microphone error');
      }
      
      return false;
    }
  }, [status, onError]);

  // ─────────────────────────────────────────────────────────────────────────
  // LEVEL MONITORING
  // ─────────────────────────────────────────────────────────────────────────

  const startLevelMonitoring = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      
      // Normalize to 0-100
      const rawLevel = Math.min(100, (rms / 128) * 100);
      
      // Smooth the level
      smoothedLevelRef.current = 
        smoothedLevelRef.current * LEVEL_SMOOTHING + 
        rawLevel * (1 - LEVEL_SMOOTHING);
      
      setLevel(Math.round(smoothedLevelRef.current));

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // STOP
  // ─────────────────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    // Stop animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    analyserRef.current = null;
    smoothedLevelRef.current = 0;
    setLevel(0);
    setStatus('idle');
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // AUTO-START
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (enabled && status === 'idle') {
      requestPermission();
    }
  }, [enabled, status, requestPermission]);

  // ─────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // ─────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────

  return {
    status,
    level,
    requestPermission,
    stop,
  };
}

export default useAudio;
