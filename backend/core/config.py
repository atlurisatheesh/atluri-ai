import os
from pathlib import Path
from dotenv import load_dotenv

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
_BACKEND_ENV_PATH = _BACKEND_ROOT / ".env"
load_dotenv(dotenv_path=_BACKEND_ENV_PATH, override=True)

OPENAI_API_KEY = str(os.getenv("OPENAI_API_KEY") or "").strip()
MODEL_NAME = str(os.getenv("MODEL_NAME") or "gpt-4.1-mini").strip()  # accurate + affordable for MVP
QA_MODE = os.getenv("QA_MODE", "false").lower() == "true"
