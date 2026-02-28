"""
All timing thresholds live here.
Changing these changes system behavior.
"""

# Silence thresholds (seconds)
NORMAL_SILENCE_MAX = 0.7
HESITATION_MIN = 0.7
HESITATION_MAX = 2.5
THOUGHT_COMPLETE_MIN = 2.5

# Speaker heuristics
SPEAKER_SWITCH_SILENCE = 1.2

# Defensive limits
MAX_PARTIAL_BUFFER_SECONDS = 10.0
