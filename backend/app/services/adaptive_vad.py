"""
Adaptive VAD Threshold Engine

Dynamically adjusts VAD thresholds based on session-level conditions:
- Noise level detection
- Speaker confidence stability
- Utterance length patterns
- Historical trigger accuracy

Why This Matters:
- A quiet room can use aggressive (fast) thresholds
- A noisy room needs conservative (safe) thresholds
- Indian accents may have lower baseline confidence
- Fast speakers need shorter silence windows

The engine learns from each session and adapts in real-time.
"""

import logging
import time
import statistics
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Tuple
from enum import Enum
import os

logger = logging.getLogger("adaptive_vad")


class SessionQuality(str, Enum):
    """Detected session quality level"""
    EXCELLENT = "excellent"  # Low noise, high confidence
    GOOD = "good"  # Normal conditions
    FAIR = "fair"  # Some noise or accent challenges
    POOR = "poor"  # High noise, low confidence
    DEGRADED = "degraded"  # Serious issues


@dataclass
class VADThresholds:
    """Current VAD threshold configuration"""
    min_confidence: float = 0.70  # Minimum confidence to trigger
    partial_confidence: float = 0.90  # Confidence for partial VAD
    silence_fast_sec: float = 0.3  # Fast silence threshold
    silence_normal_sec: float = 0.5  # Normal silence threshold
    silence_slow_sec: float = 1.0  # Slow silence threshold
    stabilization_ms: float = 200  # Transcript stabilization window
    min_words: int = 4  # Minimum words for trigger
    
    def to_dict(self) -> dict:
        return {
            "min_confidence": self.min_confidence,
            "partial_confidence": self.partial_confidence,
            "silence_fast_sec": self.silence_fast_sec,
            "silence_normal_sec": self.silence_normal_sec,
            "silence_slow_sec": self.silence_slow_sec,
            "stabilization_ms": self.stabilization_ms,
            "min_words": self.min_words,
        }


@dataclass
class SessionSignals:
    """Collected signals for threshold adaptation"""
    confidence_samples: List[float] = field(default_factory=list)
    word_counts: List[int] = field(default_factory=list)
    silence_durations: List[float] = field(default_factory=list)
    trigger_successes: int = 0
    trigger_retries: int = 0  # User had to repeat
    false_triggers: int = 0  # Triggered on garbage
    total_utterances: int = 0
    noise_detections: int = 0  # Low-confidence bursts
    last_update: float = field(default_factory=time.time)
    
    def add_confidence(self, conf: float):
        self.confidence_samples.append(conf)
        # Keep last 50 samples
        if len(self.confidence_samples) > 50:
            self.confidence_samples.pop(0)
    
    def add_word_count(self, count: int):
        self.word_counts.append(count)
        if len(self.word_counts) > 30:
            self.word_counts.pop(0)
    
    def add_silence(self, duration: float):
        self.silence_durations.append(duration)
        if len(self.silence_durations) > 30:
            self.silence_durations.pop(0)
    
    @property
    def avg_confidence(self) -> float:
        return statistics.mean(self.confidence_samples) if self.confidence_samples else 0.0
    
    @property
    def confidence_std(self) -> float:
        if len(self.confidence_samples) < 3:
            return 0.0
        return statistics.stdev(self.confidence_samples)
    
    @property
    def avg_word_count(self) -> float:
        return statistics.mean(self.word_counts) if self.word_counts else 0.0
    
    @property
    def avg_silence(self) -> float:
        return statistics.mean(self.silence_durations) if self.silence_durations else 0.0
    
    @property
    def trigger_success_rate(self) -> float:
        total = self.trigger_successes + self.trigger_retries + self.false_triggers
        return self.trigger_successes / total if total > 0 else 1.0


# Threshold profiles for different quality levels
THRESHOLD_PROFILES: Dict[SessionQuality, VADThresholds] = {
    SessionQuality.EXCELLENT: VADThresholds(
        min_confidence=0.65,
        partial_confidence=0.85,
        silence_fast_sec=0.25,
        silence_normal_sec=0.4,
        silence_slow_sec=0.8,
        stabilization_ms=150,
        min_words=3,
    ),
    SessionQuality.GOOD: VADThresholds(
        min_confidence=0.70,
        partial_confidence=0.90,
        silence_fast_sec=0.3,
        silence_normal_sec=0.5,
        silence_slow_sec=1.0,
        stabilization_ms=200,
        min_words=4,
    ),
    SessionQuality.FAIR: VADThresholds(
        min_confidence=0.75,
        partial_confidence=0.92,
        silence_fast_sec=0.4,
        silence_normal_sec=0.6,
        silence_slow_sec=1.2,
        stabilization_ms=250,
        min_words=5,
    ),
    SessionQuality.POOR: VADThresholds(
        min_confidence=0.80,
        partial_confidence=0.95,
        silence_fast_sec=0.5,
        silence_normal_sec=0.8,
        silence_slow_sec=1.5,
        stabilization_ms=300,
        min_words=5,
    ),
    SessionQuality.DEGRADED: VADThresholds(
        min_confidence=0.85,
        partial_confidence=0.98,  # Almost never trigger partial VAD
        silence_fast_sec=0.7,
        silence_normal_sec=1.0,
        silence_slow_sec=2.0,
        stabilization_ms=400,
        min_words=6,
    ),
}


class AdaptiveVADEngine:
    """
    Dynamically adjusts VAD thresholds based on session conditions.
    
    Rate-Limited Tier Transitions:
    - Cannot change tier more than once every MIN_TIER_CHANGE_INTERVAL_SEC
    - Cannot change tier more than once every MIN_UTTERANCES_BETWEEN_CHANGES
    - Requires consistent quality readings (3+ of last 5)
    - This prevents "confidence bounce instability"
    
    Usage:
        engine = AdaptiveVADEngine(session_id="abc123")
        
        # Feed signals from each transcript
        engine.observe_transcript(confidence=0.87, word_count=8, is_final=True)
        
        # Get current thresholds
        thresholds = engine.get_thresholds()
        
        # Use in trigger logic
        if confidence >= thresholds.min_confidence:
            trigger()
    """
    
    # How often to recalculate (seconds)
    RECALC_INTERVAL_SEC = float(os.getenv("ADAPTIVE_VAD_RECALC_SEC", "5.0"))
    
    # Minimum samples before adapting
    MIN_SAMPLES_TO_ADAPT = int(os.getenv("ADAPTIVE_VAD_MIN_SAMPLES", "5"))
    
    # Rate limiting for tier changes
    MIN_TIER_CHANGE_INTERVAL_SEC = float(os.getenv("ADAPTIVE_VAD_MIN_TIER_INTERVAL", "15.0"))
    MIN_UTTERANCES_BETWEEN_CHANGES = int(os.getenv("ADAPTIVE_VAD_MIN_UTTERANCES", "3"))
    MAX_TIER_CHANGES_PER_SESSION = int(os.getenv("ADAPTIVE_VAD_MAX_CHANGES", "10"))
    
    def __init__(self, session_id: str = ""):
        self.session_id = session_id
        self.signals = SessionSignals()
        self._current_quality = SessionQuality.GOOD
        self._current_thresholds = THRESHOLD_PROFILES[SessionQuality.GOOD]
        self._last_recalc = 0.0
        self._quality_history: List[SessionQuality] = []
        
        # Rate limiting state
        self._last_tier_change_ts = 0.0
        self._utterances_since_tier_change = 0
        self._total_tier_changes = 0
        self._tier_change_history: List[Tuple[float, SessionQuality, SessionQuality]] = []
    
    def observe_transcript(
        self,
        confidence: float,
        word_count: int,
        is_final: bool,
        speech_final: bool = False,
    ):
        """
        Observe a transcript event to update signals.
        
        Call this for every transcript received from Deepgram.
        """
        now = time.time()
        
        # Always track confidence
        if confidence > 0:
            self.signals.add_confidence(confidence)
        
        # Track word counts for finals
        if is_final and word_count > 0:
            self.signals.add_word_count(word_count)
            self.signals.total_utterances += 1
            self._utterances_since_tier_change += 1
        
        # Detect noise (very low confidence burst)
        if confidence > 0 and confidence < 0.50 and word_count < 3:
            self.signals.noise_detections += 1
        
        # Recalculate thresholds periodically
        if now - self._last_recalc >= self.RECALC_INTERVAL_SEC:
            self._recalculate_quality()
            self._last_recalc = now
    
    def observe_trigger(self, success: bool, was_retry: bool = False, was_false: bool = False):
        """
        Observe a trigger event outcome.
        
        Call this after a trigger to indicate if it was successful.
        """
        if success and not was_retry and not was_false:
            self.signals.trigger_successes += 1
        elif was_retry:
            self.signals.trigger_retries += 1
        elif was_false:
            self.signals.false_triggers += 1
        
        # Recalculate immediately on problems
        if was_retry or was_false:
            self._recalculate_quality()
    
    def observe_silence(self, duration_sec: float):
        """Observe silence duration before trigger"""
        self.signals.add_silence(duration_sec)
    
    def _can_change_tier(self) -> bool:
        """
        Check if tier change is allowed (rate limiting).
        
        Prevents oscillation instability from rapid tier changes.
        """
        now = time.time()
        
        # Check max changes per session
        if self._total_tier_changes >= self.MAX_TIER_CHANGES_PER_SESSION:
            logger.debug("Tier change blocked: max changes reached (%d)", self._total_tier_changes)
            return False
        
        # Check time since last change
        time_since_change = now - self._last_tier_change_ts
        if time_since_change < self.MIN_TIER_CHANGE_INTERVAL_SEC:
            logger.debug("Tier change blocked: too soon (%.1fs < %.1fs)",
                        time_since_change, self.MIN_TIER_CHANGE_INTERVAL_SEC)
            return False
        
        # Check utterances since last change
        if self._utterances_since_tier_change < self.MIN_UTTERANCES_BETWEEN_CHANGES:
            logger.debug("Tier change blocked: not enough utterances (%d < %d)",
                        self._utterances_since_tier_change, self.MIN_UTTERANCES_BETWEEN_CHANGES)
            return False
        
        return True
    
    def _recalculate_quality(self):
        """Recalculate session quality and update thresholds (rate-limited)"""
        if len(self.signals.confidence_samples) < self.MIN_SAMPLES_TO_ADAPT:
            return  # Not enough data
        
        # Calculate quality score (0-100)
        score = self._calculate_quality_score()
        
        # Map score to quality level
        if score >= 85:
            new_quality = SessionQuality.EXCELLENT
        elif score >= 70:
            new_quality = SessionQuality.GOOD
        elif score >= 55:
            new_quality = SessionQuality.FAIR
        elif score >= 40:
            new_quality = SessionQuality.POOR
        else:
            new_quality = SessionQuality.DEGRADED
        
        # Track quality history for stability
        self._quality_history.append(new_quality)
        if len(self._quality_history) > 10:
            self._quality_history.pop(0)
        
        # Only change quality if consistent (3+ readings)
        quality_counts = {}
        for q in self._quality_history[-5:]:
            quality_counts[q] = quality_counts.get(q, 0) + 1
        
        # Find most common recent quality
        most_common = max(quality_counts.items(), key=lambda x: x[1])
        if most_common[1] >= 3:  # At least 3 of last 5
            new_quality = most_common[0]
        
        # Update if changed AND rate limit allows
        if new_quality != self._current_quality:
            if not self._can_change_tier():
                logger.debug("ADAPTIVE_VAD tier change deferred | session=%s | %s -> %s (rate limited)",
                           self.session_id, self._current_quality.value, new_quality.value)
                return
            
            old_quality = self._current_quality
            self._current_quality = new_quality
            self._current_thresholds = THRESHOLD_PROFILES[new_quality]
            
            # Update rate limiting state
            now = time.time()
            self._last_tier_change_ts = now
            self._utterances_since_tier_change = 0
            self._total_tier_changes += 1
            self._tier_change_history.append((now, old_quality, new_quality))
            
            logger.info("ADAPTIVE_VAD quality changed | session=%s | %s -> %s | score=%.1f | change_count=%d",
                       self.session_id, old_quality.value, new_quality.value, score, self._total_tier_changes)
    
    def _calculate_quality_score(self) -> float:
        """
        Calculate session quality score (0-100).
        
        Factors:
        - Average confidence (40%)
        - Confidence stability (20%)
        - Trigger success rate (25%)
        - Noise ratio (15%)
        """
        score = 0.0
        
        # Average confidence contribution (0-40 points)
        avg_conf = self.signals.avg_confidence
        conf_score = min(40, (avg_conf - 0.50) * 80)  # 0.50->0, 1.0->40
        score += max(0, conf_score)
        
        # Confidence stability contribution (0-20 points)
        # Lower std = more stable = higher score
        conf_std = self.signals.confidence_std
        stability_score = max(0, 20 - (conf_std * 100))  # 0.0->20, 0.2->0
        score += stability_score
        
        # Trigger success rate contribution (0-25 points)
        success_rate = self.signals.trigger_success_rate
        success_score = success_rate * 25
        score += success_score
        
        # Noise ratio contribution (0-15 points)
        # Fewer noise detections = higher score
        total_samples = len(self.signals.confidence_samples)
        noise_ratio = self.signals.noise_detections / max(1, total_samples)
        noise_score = max(0, 15 - (noise_ratio * 150))  # 0%->15, 10%->0
        score += noise_score
        
        return min(100, max(0, score))
    
    def get_thresholds(self) -> VADThresholds:
        """Get current adaptive thresholds"""
        return self._current_thresholds
    
    def get_quality(self) -> SessionQuality:
        """Get current session quality assessment"""
        return self._current_quality
    
    def get_status(self) -> dict:
        """Get full status for debugging/monitoring"""
        now = time.time()
        return {
            "session_id": self.session_id,
            "quality": self._current_quality.value,
            "quality_score": self._calculate_quality_score() if len(self.signals.confidence_samples) >= self.MIN_SAMPLES_TO_ADAPT else None,
            "avg_confidence": round(self.signals.avg_confidence, 3),
            "confidence_std": round(self.signals.confidence_std, 3),
            "trigger_success_rate": round(self.signals.trigger_success_rate, 3),
            "noise_detections": self.signals.noise_detections,
            "total_utterances": self.signals.total_utterances,
            "thresholds": self._current_thresholds.to_dict(),
            # Rate limiting status
            "rate_limiting": {
                "total_tier_changes": self._total_tier_changes,
                "max_changes_allowed": self.MAX_TIER_CHANGES_PER_SESSION,
                "utterances_since_change": self._utterances_since_tier_change,
                "min_utterances_required": self.MIN_UTTERANCES_BETWEEN_CHANGES,
                "seconds_since_change": round(now - self._last_tier_change_ts, 1) if self._last_tier_change_ts > 0 else None,
                "min_seconds_required": self.MIN_TIER_CHANGE_INTERVAL_SEC,
                "can_change_now": self._can_change_tier(),
            },
            "tier_change_history": [
                {"ts": ts, "from": old.value, "to": new.value}
                for ts, old, new in self._tier_change_history[-5:]  # Last 5 changes
            ],
        }


# Factory function
def create_adaptive_vad(session_id: str = "") -> AdaptiveVADEngine:
    """Create a new adaptive VAD engine for a session"""
    return AdaptiveVADEngine(session_id=session_id)
