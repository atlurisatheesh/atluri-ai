"""
Voice Personalization Engine — __init__

Makes AI-generated interview answers sound like the specific user,
not like generic GPT output.

Modules:
    voice_profiler.py      — Extract writing style from past answers
    vocabulary_analyzer.py — Build personal vocabulary map
    pattern_extractor.py   — STAR story patterns, filler detection
    style_injector.py      — Inject voice profile into LLM prompts
    profile_store.py       — Redis-backed voice profile persistence
"""
