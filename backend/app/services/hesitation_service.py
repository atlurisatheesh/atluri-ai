import time

FILLER_WORDS = {"um", "uh", "hmm", "like", "you know"}

class HesitationDetector:
    def __init__(self):
        self.last_speech_time = time.time()

    def analyze(self, transcript: str):
        now = time.time()
        silence = now - self.last_speech_time
        self.last_speech_time = now

        fillers = [
            w for w in transcript.lower().split()
            if w in FILLER_WORDS
        ]

        return {
            "silence_seconds": round(silence, 2),
            "filler_count": len(fillers),
            "hesitation": silence > 1.5 or len(fillers) > 0
        }
