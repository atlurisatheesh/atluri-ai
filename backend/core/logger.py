import json
import logging
from typing import Any

logger = logging.getLogger("fastapi")


def _sanitize_value(key: str, value: Any) -> Any:
	normalized_key = str(key or "").lower()
	if normalized_key in {"text", "transcript", "transcript_text", "prompt", "suggestion"}:
		text = str(value or "")
		return {
			"redacted": True,
			"length": len(text),
		}
	if isinstance(value, (str, int, float, bool)) or value is None:
		return value
	if isinstance(value, dict):
		return {str(k): _sanitize_value(str(k), v) for k, v in value.items()}
	if isinstance(value, (list, tuple, set)):
		return [_sanitize_value(normalized_key, item) for item in value]
	return str(value)


def log_event(component: str, event: str, session_id: str, **kwargs) -> None:
	payload = {
		"component": str(component or "app"),
		"event": str(event or "unknown"),
		"session_id": str(session_id or ""),
	}
	payload.update({str(k): _sanitize_value(str(k), v) for k, v in kwargs.items()})
	logger.info(json.dumps(payload, ensure_ascii=False, default=str))
