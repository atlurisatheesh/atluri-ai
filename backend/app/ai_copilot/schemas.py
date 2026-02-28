# COPILOT_RESPONSE_SCHEMA = {
#     "type": "object",
#     "properties": {
#         "intent": {"type": "string"},
#         "answer": {"type": "string"},
#         "bullets": {"type": "array", "items": {"type": "string"}},
#         "confidence": {"type": "number"}
#     },
#     "required": ["intent", "answer"]
# }



CODING_RESPONSE_SCHEMA = {
    "intent": "coding",

    # Core interview content (KEEP)
    "understanding": "string",
    "approach": "string",
    "pseudocode": "string",
    "code": "string",
    "time_complexity": "string",
    "space_complexity": "string",
    "edge_cases": ["string"],
    "verbal_explanation": "string",

    # NEW: Copilot & stealth features
    "mode": "full | whisper | bullets",
    "key_points": ["string"],
    "hints_only": ["string"],
    "confidence": "number"
}
