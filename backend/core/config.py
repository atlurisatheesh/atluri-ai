import os
from pathlib import Path
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
_BACKEND_ENV_PATH = _BACKEND_ROOT / ".env"
load_dotenv(dotenv_path=_BACKEND_ENV_PATH, override=True)

OPENAI_API_KEY = str(os.getenv("OPENAI_API_KEY") or "").strip()
MODEL_NAME = str(os.getenv("MODEL_NAME") or "gpt-4o-mini").strip()
QA_MODE = os.getenv("QA_MODE", "false").strip().lower() in ("true", "1", "yes")

DEEPGRAM_API_KEY = str(os.getenv("DEEPGRAM_API_KEY") or "").strip()
if DEEPGRAM_API_KEY and not os.getenv("DEEPGRAM_API_KEY"):
    os.environ["DEEPGRAM_API_KEY"] = DEEPGRAM_API_KEY

