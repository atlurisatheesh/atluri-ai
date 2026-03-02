"""Deepgram real-time transcription integration for NeuralWhisper™."""
import httpx
from config import settings


async def transcribe_audio_deepgram(audio_bytes: bytes, mimetype: str = "audio/webm") -> dict:
    """Transcribe audio using Deepgram Nova-2 API."""
    if not settings.DEEPGRAM_API_KEY:
        return {"text": "", "confidence": 0, "error": "Deepgram API key not configured"}

    url = "https://api.deepgram.com/v1/listen"
    params = {
        "model": "nova-2",
        "smart_format": "true",
        "language": "en",
        "punctuate": "true",
        "diarize": "true",
        "utterances": "true",
    }
    headers = {
        "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
        "Content-Type": mimetype,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, params=params, headers=headers, content=audio_bytes)

    if response.status_code != 200:
        return {"text": "", "confidence": 0, "error": f"Deepgram error: {response.status_code}"}

    data = response.json()
    results = data.get("results", {})
    channels = results.get("channels", [{}])
    alt = channels[0].get("alternatives", [{}]) if channels else [{}]
    transcript = alt[0].get("transcript", "") if alt else ""
    confidence = alt[0].get("confidence", 0) if alt else 0

    # Extract utterances for speaker diarization
    utterances = results.get("utterances", [])
    speakers = [
        {
            "speaker": u.get("speaker", 0),
            "text": u.get("transcript", ""),
            "start": u.get("start", 0),
            "end": u.get("end", 0),
            "confidence": u.get("confidence", 0),
        }
        for u in utterances
    ]

    return {
        "text": transcript,
        "confidence": round(confidence, 4),
        "speakers": speakers,
        "language": "en",
    }


async def transcribe_audio_openai(audio_bytes: bytes) -> dict:
    """Fallback: Transcribe audio using OpenAI Whisper API."""
    if not settings.OPENAI_API_KEY:
        return {"text": "", "confidence": 0, "error": "OpenAI API key not configured"}

    from openai import AsyncOpenAI
    import io

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = "audio.webm"

    transcript = await client.audio.transcriptions.create(
        model=settings.WHISPER_MODEL,
        file=audio_file,
        response_format="verbose_json",
    )

    return {
        "text": transcript.text,
        "confidence": 0.95,
        "language": transcript.language or "en",
    }
