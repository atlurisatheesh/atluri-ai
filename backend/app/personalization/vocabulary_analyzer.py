"""
Vocabulary Analyzer — Personal Vocabulary Map

Analyzes a user's past answers to build a vocabulary signature:
- Top 200 words by frequency (excluding stop words)
- Unique words (used by this user but rare in general)
- Transition words preference (however, moreover, additionally, etc.)
- Average sentence length
- Filler word patterns
"""

import logging
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("vocabulary_analyzer")

# Common English stop words to exclude from vocabulary signature
_STOP_WORDS = frozenset({
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
    "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she",
    "her", "hers", "herself", "it", "its", "itself", "they", "them", "their",
    "theirs", "themselves", "what", "which", "who", "whom", "this", "that",
    "these", "those", "am", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an",
    "the", "and", "but", "if", "or", "because", "as", "until", "while", "of",
    "at", "by", "for", "with", "about", "against", "between", "through",
    "during", "before", "after", "above", "below", "to", "from", "up", "down",
    "in", "out", "on", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "both",
    "each", "few", "more", "most", "other", "some", "such", "no", "nor",
    "not", "only", "own", "same", "so", "than", "too", "very", "s", "t",
    "can", "will", "just", "don", "should", "now", "d", "ll", "m", "o",
    "re", "ve", "y", "ain", "aren", "couldn", "didn", "doesn", "hadn",
    "hasn", "haven", "isn", "ma", "mightn", "mustn", "needn", "shan",
    "shouldn", "wasn", "weren", "won", "wouldn",
})

# Known transition words/phrases
_TRANSITION_WORDS = frozenset({
    "however", "moreover", "furthermore", "additionally", "consequently",
    "therefore", "nevertheless", "meanwhile", "similarly", "likewise",
    "conversely", "alternatively", "specifically", "essentially", "ultimately",
    "effectively", "basically", "fundamentally", "interestingly", "importantly",
    "notably", "significantly", "particularly", "overall", "accordingly",
})

# Known filler patterns
_FILLER_PATTERNS = [
    r"\bum\b", r"\buh\b", r"\blike\b", r"\byou know\b", r"\bkind of\b",
    r"\bsort of\b", r"\bi mean\b", r"\bbasically\b", r"\bactually\b",
    r"\bhonestly\b", r"\bliterally\b", r"\bso yeah\b", r"\bright\b",
]


@dataclass
class VocabularySignature:
    """A user's vocabulary signature extracted from their answers."""
    top_words: list[tuple[str, int]] = field(default_factory=list)  # (word, count)
    unique_words: list[str] = field(default_factory=list)
    transition_preferences: list[tuple[str, int]] = field(default_factory=list)
    avg_sentence_length: float = 0.0
    avg_word_length: float = 0.0
    filler_patterns: dict[str, int] = field(default_factory=dict)  # pattern → count
    total_words_analyzed: int = 0
    total_sentences_analyzed: int = 0

    def to_dict(self) -> dict:
        return {
            "top_words": self.top_words[:50],  # Limit for storage
            "unique_words": self.unique_words[:30],
            "transition_preferences": self.transition_preferences,
            "avg_sentence_length": round(self.avg_sentence_length, 1),
            "avg_word_length": round(self.avg_word_length, 1),
            "filler_patterns": self.filler_patterns,
            "total_words_analyzed": self.total_words_analyzed,
            "total_sentences_analyzed": self.total_sentences_analyzed,
        }


def _tokenize(text: str) -> list[str]:
    """Simple word tokenization."""
    return re.findall(r'\b[a-zA-Z]+\b', text.lower())


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences."""
    sentences = re.split(r'[.!?]+', text)
    return [s.strip() for s in sentences if s.strip() and len(s.strip().split()) >= 3]


def analyze_vocabulary(texts: list[str]) -> VocabularySignature:
    """
    Analyze a collection of user answers to build their vocabulary signature.
    
    Args:
        texts: List of user's answer texts from past sessions.
        
    Returns:
        VocabularySignature with the user's language patterns.
    """
    if not texts:
        return VocabularySignature()

    all_text = " ".join(texts)
    words = _tokenize(all_text)
    sentences = _split_sentences(all_text)

    if not words:
        return VocabularySignature()

    # Word frequency (excluding stop words)
    word_counts = Counter(w for w in words if w not in _STOP_WORDS and len(w) > 2)
    top_words = word_counts.most_common(200)

    # Unique words (appear in user's text but are relatively uncommon)
    # Simple heuristic: words used 2-5 times (not too common, not one-off typos)
    unique_words = [w for w, c in word_counts.items() if 2 <= c <= 5 and len(w) > 4][:30]

    # Transition word preferences
    transition_counts = Counter()
    for word in words:
        if word in _TRANSITION_WORDS:
            transition_counts[word] += 1
    transition_preferences = transition_counts.most_common(10)

    # Sentence length stats
    sentence_lengths = [len(s.split()) for s in sentences]
    avg_sentence_length = sum(sentence_lengths) / len(sentence_lengths) if sentence_lengths else 0.0

    # Word length stats
    word_lengths = [len(w) for w in words]
    avg_word_length = sum(word_lengths) / len(word_lengths) if word_lengths else 0.0

    # Filler detection
    filler_counts = {}
    lower_text = all_text.lower()
    for pattern in _FILLER_PATTERNS:
        matches = re.findall(pattern, lower_text)
        if matches:
            clean_pattern = pattern.replace(r'\b', '').strip()
            filler_counts[clean_pattern] = len(matches)

    return VocabularySignature(
        top_words=top_words,
        unique_words=unique_words,
        transition_preferences=transition_preferences,
        avg_sentence_length=avg_sentence_length,
        avg_word_length=avg_word_length,
        filler_patterns=filler_counts,
        total_words_analyzed=len(words),
        total_sentences_analyzed=len(sentences),
    )
