import tempfile
import os

class WhisperService:
    def __init__(self):
        try:
            import whisper  # type: ignore
        except Exception as exc:
            raise RuntimeError(
                "Whisper is not installed. Install the optional dependency 'openai-whisper' (and FFmpeg) to enable local transcription."
            ) from exc

        self.model = whisper.load_model("base")

    def transcribe(self, pcm_bytes: bytes):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
            f.write(pcm_bytes)
            path = f.name

        result = self.model.transcribe(path)
        os.unlink(path)
        return result["text"]
