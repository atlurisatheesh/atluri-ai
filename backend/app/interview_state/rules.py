"""
These rules are intentionally conservative.
We avoid guessing aggressively in v1.
"""

# Confidence scoring
MAX_HESITATIONS_PER_TURN = 3

# Interview phases
PHASE_BEHAVIORAL = "behavioral"
PHASE_TECHNICAL = "technical"
PHASE_SYSTEM_DESIGN = "system_design"

# Recommended actions
ACTION_NONE = "none"
ACTION_HINT = "hint"
ACTION_FULL_ANSWER = "full_answer"
ACTION_RECOVERY = "recovery"
