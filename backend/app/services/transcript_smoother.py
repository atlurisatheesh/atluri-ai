"""
Transcript Smoothing Layer

Removes filler words and normalizes transcript before sending to LLM.
This improves LLM response quality by providing cleaner input.

Features:
1. Remove filler words (uh, um, like, you know, etc.)
2. Remove repeated words
3. Normalize whitespace and punctuation
4. Handle multi-language fillers
5. Preserve semantic meaning
"""

import re
import logging
from dataclasses import dataclass
from typing import List, Set, Tuple, Optional
import os

logger = logging.getLogger("transcript_smoother")

# Filler words by language/category
ENGLISH_FILLERS = {
    # Hesitation markers
    "uh", "um", "er", "ah", "eh", "uhh", "umm", "uhm", "hmm", "hm",
    # Discourse markers
    "like", "basically", "actually", "literally", "honestly", "seriously",
    "obviously", "essentially", "definitely", "probably",
    # Hedging
    "sort of", "kind of", "i guess", "i mean", "i think",
    # Verbal tics
    "you know", "you see", "you understand", "right", "okay", "ok",
    # Transitions
    "so", "well", "anyway", "anyways", "alright",
}

# Phrase-level fillers (must match exactly)
PHRASE_FILLERS = [
    "you know what i mean",
    "do you know what i mean",
    "if you know what i mean",
    "you know what i'm saying",
    "what i'm trying to say is",
    "let me think",
    "let me see",
    "how do i put this",
    "how should i put this",
    "how do i say this",
    "i would say",
    "at the end of the day",
    "to be honest",
    "to be fair",
    "to be quite honest",
    "if i'm being honest",
    "in a sense",
    "in some sense",
]

# Indian English fillers
INDIAN_ENGLISH_FILLERS = {
    "actually", "basically", "only", "no", "na", "ya", "yaar",
    "means", "like that", "like this", "what to say",
    "you see", "see", "ok so", "so basically",
}

# Word repetition patterns
REPEAT_PATTERN = re.compile(r'\b(\w+)(\s+\1)+\b', re.IGNORECASE)


@dataclass
class SmoothingResult:
    """Result of transcript smoothing"""
    original: str
    smoothed: str
    fillers_removed: List[str]
    repetitions_removed: int
    confidence_boost: float  # How much confidence improved due to cleaning


class TranscriptSmoother:
    """
    Cleans and normalizes transcript text before LLM processing.
    
    Usage:
        smoother = TranscriptSmoother()
        result = smoother.smooth("uh what is um like leadership")
        # result.smoothed = "what is leadership"
    """
    
    def __init__(
        self,
        remove_fillers: bool = True,
        remove_repetitions: bool = True,
        normalize_whitespace: bool = True,
        preserve_questions: bool = True,
        custom_fillers: Optional[Set[str]] = None,
    ):
        self.remove_fillers = remove_fillers
        self.remove_repetitions = remove_repetitions
        self.normalize_whitespace = normalize_whitespace
        self.preserve_questions = preserve_questions
        
        # Build filler set
        self.fillers: Set[str] = set()
        if remove_fillers:
            self.fillers = ENGLISH_FILLERS | INDIAN_ENGLISH_FILLERS
            if custom_fillers:
                self.fillers |= custom_fillers
        
        # Build phrase patterns
        self.phrase_patterns = [
            (re.compile(r'\b' + re.escape(phrase) + r'\b', re.IGNORECASE), phrase)
            for phrase in PHRASE_FILLERS
        ]
        
        # Stats
        self._total_smoothed = 0
        self._total_fillers_removed = 0
    
    def smooth(self, text: str) -> SmoothingResult:
        """
        Smooth a transcript text.
        
        Args:
            text: Raw transcript text
            
        Returns:
            SmoothingResult with cleaned text and metadata
        """
        if not text or not text.strip():
            return SmoothingResult(
                original=text,
                smoothed=text,
                fillers_removed=[],
                repetitions_removed=0,
                confidence_boost=0.0,
            )
        
        original = text
        fillers_removed = []
        repetitions_removed = 0
        
        # Step 1: Remove phrase-level fillers first
        working_text = text
        for pattern, phrase in self.phrase_patterns:
            if pattern.search(working_text):
                working_text = pattern.sub('', working_text)
                fillers_removed.append(phrase)
        
        # Step 2: Remove word-level fillers
        if self.remove_fillers:
            words = working_text.split()
            cleaned_words = []
            i = 0
            while i < len(words):
                word = words[i].lower().strip('.,!?;:')
                
                # Check two-word fillers
                if i < len(words) - 1:
                    two_word = f"{word} {words[i+1].lower().strip('.,!?;:')}"
                    if two_word in self.fillers:
                        fillers_removed.append(two_word)
                        i += 2
                        continue
                
                # Check single-word fillers
                if word in self.fillers:
                    # Don't remove if it's the start of a question
                    if self.preserve_questions and i == 0 and word in {"so", "well", "ok", "okay"}:
                        # Check if next word makes it a question
                        if i < len(words) - 1:
                            next_word = words[i+1].lower().strip('.,!?;:')
                            if next_word in {"what", "how", "why", "when", "where", "who", "which", "can", "could", "would", "should", "do", "does", "did", "is", "are", "was", "were"}:
                                fillers_removed.append(word)
                                i += 1
                                continue
                    else:
                        fillers_removed.append(word)
                        i += 1
                        continue
                
                cleaned_words.append(words[i])
                i += 1
            
            working_text = ' '.join(cleaned_words)
        
        # Step 3: Remove word repetitions
        if self.remove_repetitions:
            before_len = len(working_text.split())
            working_text = REPEAT_PATTERN.sub(r'\1', working_text)
            after_len = len(working_text.split())
            repetitions_removed = before_len - after_len
        
        # Step 4: Normalize whitespace
        if self.normalize_whitespace:
            # Multiple spaces to single
            working_text = re.sub(r'\s+', ' ', working_text)
            # Fix punctuation spacing
            working_text = re.sub(r'\s+([.,!?;:])', r'\1', working_text)
            working_text = working_text.strip()
        
        # Calculate confidence boost
        # More fillers removed = cleaner transcript = small confidence boost
        total_removed = len(fillers_removed) + repetitions_removed
        original_word_count = len(original.split())
        if original_word_count > 0:
            removal_ratio = total_removed / original_word_count
            # Max boost of 0.05 for heavily filtered transcripts
            confidence_boost = min(0.05, removal_ratio * 0.1)
        else:
            confidence_boost = 0.0
        
        self._total_smoothed += 1
        self._total_fillers_removed += len(fillers_removed)
        
        result = SmoothingResult(
            original=original,
            smoothed=working_text,
            fillers_removed=fillers_removed,
            repetitions_removed=repetitions_removed,
            confidence_boost=confidence_boost,
        )
        
        if fillers_removed or repetitions_removed:
            logger.debug("SMOOTH | removed=%d fillers, %d reps | '%s' -> '%s'",
                        len(fillers_removed), repetitions_removed,
                        original[:50], working_text[:50])
        
        return result
    
    def smooth_for_llm(self, text: str) -> str:
        """
        Convenience method - just return smoothed text.
        
        Args:
            text: Raw transcript
            
        Returns:
            Cleaned text ready for LLM
        """
        return self.smooth(text).smoothed
    
    def get_stats(self) -> dict:
        """Get smoothing statistics"""
        return {
            "total_smoothed": self._total_smoothed,
            "total_fillers_removed": self._total_fillers_removed,
            "avg_fillers_per_transcript": (
                self._total_fillers_removed / self._total_smoothed
                if self._total_smoothed > 0 else 0
            ),
        }


# Global singleton
_smoother: Optional[TranscriptSmoother] = None


def get_transcript_smoother() -> TranscriptSmoother:
    """Get global transcript smoother instance"""
    global _smoother
    if _smoother is None:
        _smoother = TranscriptSmoother()
    return _smoother


def smooth_transcript(text: str) -> str:
    """Quick function to smooth a transcript"""
    return get_transcript_smoother().smooth_for_llm(text)
