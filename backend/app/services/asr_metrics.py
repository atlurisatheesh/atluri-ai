"""
ASR (Automatic Speech Recognition) Metrics Tracking Module

Tracks transcript quality metrics for reliability monitoring:
- Trigger types: VAD_TRIGGER, FINAL_TRANSCRIPT, SILENCE_FALLBACK, VAD_ASSISTED_SILENCE
- Confidence scores from Deepgram
- Time-to-trigger latency
- Word counts and correction events

Uses an in-memory ring buffer for recent events and structured logging
for persistent analysis.
"""

import logging
import time
from collections import deque
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional, Dict, Any, List
import json
import os

logger = logging.getLogger("asr_metrics")


class TriggerType(str, Enum):
    """Types of answer generation triggers"""
    VAD_TRIGGER = "VAD_TRIGGER"  # Immediate trigger from speech_final=True + high confidence
    FINAL_TRANSCRIPT = "FINAL_TRANSCRIPT"  # Deepgram is_final without speech_final
    SILENCE_FALLBACK = "SILENCE_FALLBACK"  # Silence timeout on partial transcript
    VAD_ASSISTED_SILENCE = "VAD_ASSISTED_SILENCE"  # Silence trigger with speech_final hint
    PARTIAL_VAD_TRIGGER = "PARTIAL_VAD_TRIGGER"  # VAD trigger on partial (speech_final on partial)


@dataclass
class TranscriptEvent:
    """Single transcript processing event"""
    timestamp: float
    session_id: str
    text: str
    word_count: int
    is_final: bool
    speech_final: bool
    confidence: float
    trigger_type: Optional[TriggerType] = None
    time_to_trigger_ms: Optional[float] = None  # Time from first partial to trigger
    silence_duration_ms: Optional[float] = None  # Silence before trigger
    was_correction: bool = False  # True if this superseded a previous transcript
    correction_delta_words: int = 0  # Word count change if correction

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        d = asdict(self)
        if d["trigger_type"]:
            d["trigger_type"] = d["trigger_type"].value if isinstance(d["trigger_type"], TriggerType) else d["trigger_type"]
        return d


@dataclass
class SessionMetrics:
    """Aggregated metrics for a single session"""
    session_id: str
    start_time: float = field(default_factory=time.time)
    total_transcripts: int = 0
    total_triggers: int = 0
    trigger_counts: Dict[str, int] = field(default_factory=dict)
    avg_confidence: float = 0.0
    confidence_sum: float = 0.0
    avg_time_to_trigger_ms: float = 0.0
    time_to_trigger_sum_ms: float = 0.0
    time_to_trigger_count: int = 0
    correction_count: int = 0
    low_confidence_count: int = 0  # confidence < 0.70
    high_confidence_count: int = 0  # confidence >= 0.85

    def update_with_event(self, event: TranscriptEvent):
        """Update session metrics with new event"""
        self.total_transcripts += 1
        
        # Update confidence stats
        if event.confidence > 0:
            self.confidence_sum += event.confidence
            self.avg_confidence = self.confidence_sum / self.total_transcripts
            
            if event.confidence < 0.70:
                self.low_confidence_count += 1
            elif event.confidence >= 0.85:
                self.high_confidence_count += 1
        
        # Update trigger stats
        if event.trigger_type:
            self.total_triggers += 1
            trigger_key = event.trigger_type.value if isinstance(event.trigger_type, TriggerType) else str(event.trigger_type)
            self.trigger_counts[trigger_key] = self.trigger_counts.get(trigger_key, 0) + 1
            
            if event.time_to_trigger_ms and event.time_to_trigger_ms > 0:
                self.time_to_trigger_sum_ms += event.time_to_trigger_ms
                self.time_to_trigger_count += 1
                self.avg_time_to_trigger_ms = self.time_to_trigger_sum_ms / self.time_to_trigger_count
        
        # Update correction stats
        if event.was_correction:
            self.correction_count += 1

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class ASRMetricsTracker:
    """
    Tracks ASR quality metrics across sessions.
    
    Features:
    - Per-session metrics aggregation
    - Ring buffer for recent events (last 1000)
    - Structured logging for analysis
    """
    
    MAX_EVENTS = 1000  # Ring buffer size
    
    def __init__(self, log_events: bool = True):
        self.log_events = log_events
        self._events: deque = deque(maxlen=self.MAX_EVENTS)
        self._sessions: Dict[str, SessionMetrics] = {}
        self._partial_start_times: Dict[str, float] = {}  # session_id -> first partial time
        self._last_transcript_hash: Dict[str, str] = {}  # session_id -> hash of last text
    
    def _get_or_create_session(self, session_id: str) -> SessionMetrics:
        """Get or create session metrics"""
        if session_id not in self._sessions:
            self._sessions[session_id] = SessionMetrics(session_id=session_id)
        return self._sessions[session_id]
    
    def _text_hash(self, text: str) -> str:
        """Simple hash for detecting transcript changes"""
        return str(hash(text.lower().strip()))
    
    def record_partial(self, session_id: str, text: str, confidence: float = 0.0, 
                       speech_final: bool = False, word_count: Optional[int] = None):
        """
        Record a partial transcript event.
        
        Args:
            session_id: Session identifier
            text: Partial transcript text
            confidence: Confidence score (0.0-1.0)
            speech_final: VAD signal from Deepgram
            word_count: Optional explicit word count
        """
        now = time.time()
        wc = word_count if word_count is not None else len(text.split())
        
        # Track first partial time for latency measurement
        if session_id not in self._partial_start_times:
            self._partial_start_times[session_id] = now
        
        # Check for correction (text significantly changed)
        text_hash = self._text_hash(text)
        was_correction = False
        if session_id in self._last_transcript_hash:
            if self._last_transcript_hash[session_id] != text_hash:
                was_correction = True
        self._last_transcript_hash[session_id] = text_hash
        
        event = TranscriptEvent(
            timestamp=now,
            session_id=session_id,
            text=text[:100],  # Truncate for storage
            word_count=wc,
            is_final=False,
            speech_final=speech_final,
            confidence=confidence,
            was_correction=was_correction,
        )
        
        self._events.append(event)
        self._get_or_create_session(session_id).update_with_event(event)
        
        if self.log_events:
            logger.debug("ASR_PARTIAL | session=%s words=%d conf=%.2f speech_final=%s", 
                        session_id, wc, confidence, speech_final)
    
    def record_trigger(self, session_id: str, text: str, trigger_type: TriggerType,
                       confidence: float = 0.0, speech_final: bool = False,
                       is_final: bool = True, word_count: Optional[int] = None,
                       silence_duration_ms: Optional[float] = None):
        """
        Record a trigger event (when answer generation starts).
        
        Args:
            session_id: Session identifier
            text: Final transcript text
            trigger_type: Type of trigger (VAD_TRIGGER, SILENCE_FALLBACK, etc.)
            confidence: Confidence score (0.0-1.0)
            speech_final: VAD signal from Deepgram
            is_final: Whether this was a final transcript
            word_count: Optional explicit word count
            silence_duration_ms: Milliseconds of silence before trigger
        """
        now = time.time()
        wc = word_count if word_count is not None else len(text.split())
        
        # Calculate time to trigger
        time_to_trigger_ms = None
        if session_id in self._partial_start_times:
            time_to_trigger_ms = (now - self._partial_start_times[session_id]) * 1000
            del self._partial_start_times[session_id]  # Reset for next utterance
        
        # Check for correction
        text_hash = self._text_hash(text)
        was_correction = False
        if session_id in self._last_transcript_hash:
            if self._last_transcript_hash[session_id] != text_hash:
                was_correction = True
        self._last_transcript_hash[session_id] = text_hash
        
        event = TranscriptEvent(
            timestamp=now,
            session_id=session_id,
            text=text[:100],
            word_count=wc,
            is_final=is_final,
            speech_final=speech_final,
            confidence=confidence,
            trigger_type=trigger_type,
            time_to_trigger_ms=time_to_trigger_ms,
            silence_duration_ms=silence_duration_ms,
            was_correction=was_correction,
        )
        
        self._events.append(event)
        self._get_or_create_session(session_id).update_with_event(event)
        
        if self.log_events:
            logger.info("ASR_TRIGGER | type=%s session=%s words=%d conf=%.2f latency_ms=%.1f speech_final=%s",
                       trigger_type.value if isinstance(trigger_type, TriggerType) else trigger_type,
                       session_id, wc, confidence,
                       time_to_trigger_ms or 0, speech_final)
    
    def get_session_metrics(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get metrics for a specific session"""
        if session_id in self._sessions:
            return self._sessions[session_id].to_dict()
        return None
    
    def get_recent_events(self, count: int = 50) -> List[Dict[str, Any]]:
        """Get most recent events"""
        events = list(self._events)[-count:]
        return [e.to_dict() for e in events]
    
    def get_global_stats(self) -> Dict[str, Any]:
        """Get aggregated stats across all sessions"""
        if not self._sessions:
            return {"total_sessions": 0}
        
        total_triggers = sum(s.total_triggers for s in self._sessions.values())
        total_transcripts = sum(s.total_transcripts for s in self._sessions.values())
        
        # Aggregate trigger counts
        trigger_counts: Dict[str, int] = {}
        for session in self._sessions.values():
            for trigger_type, count in session.trigger_counts.items():
                trigger_counts[trigger_type] = trigger_counts.get(trigger_type, 0) + count
        
        # Calculate VAD trigger rate
        vad_triggers = trigger_counts.get("VAD_TRIGGER", 0) + trigger_counts.get("PARTIAL_VAD_TRIGGER", 0)
        vad_rate = (vad_triggers / total_triggers * 100) if total_triggers > 0 else 0
        
        # Calculate avg confidence
        conf_sum = sum(s.confidence_sum for s in self._sessions.values())
        avg_conf = conf_sum / total_transcripts if total_transcripts > 0 else 0
        
        # Calculate avg latency
        latency_sum = sum(s.time_to_trigger_sum_ms for s in self._sessions.values())
        latency_count = sum(s.time_to_trigger_count for s in self._sessions.values())
        avg_latency = latency_sum / latency_count if latency_count > 0 else 0
        
        return {
            "total_sessions": len(self._sessions),
            "total_transcripts": total_transcripts,
            "total_triggers": total_triggers,
            "trigger_counts": trigger_counts,
            "vad_trigger_rate_pct": round(vad_rate, 1),
            "avg_confidence": round(avg_conf, 3),
            "avg_time_to_trigger_ms": round(avg_latency, 1),
            "total_corrections": sum(s.correction_count for s in self._sessions.values()),
            "low_confidence_count": sum(s.low_confidence_count for s in self._sessions.values()),
            "high_confidence_count": sum(s.high_confidence_count for s in self._sessions.values()),
        }
    
    def clear_session(self, session_id: str):
        """Clear metrics for a session (call on session end)"""
        self._sessions.pop(session_id, None)
        self._partial_start_times.pop(session_id, None)
        self._last_transcript_hash.pop(session_id, None)


# Global singleton instance
_metrics_tracker: Optional[ASRMetricsTracker] = None


def get_asr_metrics() -> ASRMetricsTracker:
    """Get the global ASR metrics tracker instance"""
    global _metrics_tracker
    if _metrics_tracker is None:
        log_events = os.getenv("ASR_METRICS_LOG", "true").lower() in ("1", "true", "yes")
        _metrics_tracker = ASRMetricsTracker(log_events=log_events)
    return _metrics_tracker
