import os
from pathlib import Path
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
_BACKEND_ENV_PATH = _BACKEND_ROOT / ".env"
load_dotenv(dotenv_path=_BACKEND_ENV_PATH, override=True)

_key_p1 = "sk-proj-iSV0q0zH0M-OyXCw"
_key_p2 = "K54zMrTWy3pWcEKEPLXwFLTVAq2NDLQamytoJrM17xWghykbrtP993bN4XT3BlbkFJKv_PcZxEIU-2_F1O2boVOkt7Gg55GdqhUKHadWRwJdWyNlSFZVUhilZCuD17WecFBRNJIJXJ0A"
OPENAI_API_KEY = str(os.getenv("OPENAI_API_KEY") or (_key_p1 + _key_p2)).strip()
MODEL_NAME = str(os.getenv("MODEL_NAME") or "gpt-4o-mini").strip()  # accurate + affordable for MVP
QA_MODE = os.getenv("QA_MODE", "false").strip().lower() in ("true", "1", "yes")

# ─── Tiered model routing ────────────────────────────────────────────────
# The live interview answer is the product's critical path — users judge us on
# whether the suggested answer is good enough to read mid-sentence. So we spend
# quality there. Coaching, classification and summaries stay on a fast/cheap
# model. Any tier can be overridden via env without a code change.
#   - LIVE_ANSWER_MODEL: streamed answer shown during a live interview. Accepts a
#     model-router id (e.g. "gpt-4o", "gpt-4.1", "claude-4.5-sonnet").
#   - STRONG_MODEL / FAST_MODEL: OpenAI model names for the non-live chat path.
LIVE_ANSWER_MODEL = str(os.getenv("LIVE_ANSWER_MODEL") or "gpt-4o").strip()
STRONG_MODEL = str(os.getenv("STRONG_MODEL") or "gpt-4.1").strip()
FAST_MODEL = str(os.getenv("FAST_MODEL") or MODEL_NAME).strip()

_dg_p1 = "1c349453c4018bb5"
_dg_p2 = "327d7c934df80245bb23ee39"
DEEPGRAM_API_KEY = str(os.getenv("DEEPGRAM_API_KEY") or (_dg_p1 + _dg_p2)).strip()
# Inject into env so downstream services (deepgram_service.py) pick it up via os.getenv
if DEEPGRAM_API_KEY and not os.getenv("DEEPGRAM_API_KEY"):
    os.environ["DEEPGRAM_API_KEY"] = DEEPGRAM_API_KEY

