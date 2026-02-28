# backend/app/core/state.py

from enum import Enum

class VoiceSessionState(str, Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    LISTENING = "listening"
    TRANSCRIBING = "transcribing"
    AI_RESPONDING = "ai_responding"
    CLOSED = "closed"
