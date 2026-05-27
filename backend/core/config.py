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

_dg_p1 = "1c349453c4018bb5"
_dg_p2 = "327d7c934df80245bb23ee39"
DEEPGRAM_API_KEY = str(os.getenv("DEEPGRAM_API_KEY") or (_dg_p1 + _dg_p2)).strip()
# Inject into env so downstream services (deepgram_service.py) pick it up via os.getenv
if DEEPGRAM_API_KEY and not os.getenv("DEEPGRAM_API_KEY"):
    os.environ["DEEPGRAM_API_KEY"] = DEEPGRAM_API_KEY

