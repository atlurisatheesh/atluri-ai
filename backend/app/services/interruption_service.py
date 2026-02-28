class InterruptionEngine:
    def should_interrupt(self, analysis, transcript_len):
        if analysis["silence_seconds"] > 2.0:
            return True, "long_pause"

        if transcript_len > 40:
            return True, "answer_complete"

        return False, None
