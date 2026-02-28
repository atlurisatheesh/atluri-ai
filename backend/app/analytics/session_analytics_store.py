import json
from pathlib import Path
from threading import Lock
from typing import Any


_store_lock = Lock()
_store_path = Path(__file__).resolve().parents[2] / "data" / "session_analytics_store.json"
_analytics_by_session_id: dict[str, dict[str, Any]] = {}


def _load() -> None:
    global _analytics_by_session_id
    if not _store_path.exists():
        _analytics_by_session_id = {}
        return
    try:
        payload = json.loads(_store_path.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            _analytics_by_session_id = {
                str(key): value
                for key, value in payload.items()
                if isinstance(key, str) and isinstance(value, dict)
            }
        else:
            _analytics_by_session_id = {}
    except Exception:
        _analytics_by_session_id = {}


def _persist() -> None:
    _store_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = _store_path.with_suffix(".tmp")
    temp_path.write_text(json.dumps(_analytics_by_session_id, ensure_ascii=False), encoding="utf-8")
    temp_path.replace(_store_path)


def save_session_analytics(session_id: str, payload: dict[str, Any], user_id: str | None = None) -> None:
    sid = str(session_id or "").strip()
    if not sid:
        return
    with _store_lock:
        record = dict(payload or {})
        if user_id:
            record["user_id"] = str(user_id)
        _analytics_by_session_id[sid] = record
        _persist()


def get_session_analytics(session_id: str) -> dict[str, Any] | None:
    sid = str(session_id or "").strip()
    if not sid:
        return None
    with _store_lock:
        data = _analytics_by_session_id.get(sid)
        return dict(data) if isinstance(data, dict) else None


def list_user_session_analytics(user_id: str, limit: int = 50) -> list[dict[str, Any]]:
    uid = str(user_id or "").strip()
    if not uid:
        return []
    capped = max(1, min(int(limit or 50), 200))

    with _store_lock:
        rows = []
        for session_id, payload in _analytics_by_session_id.items():
            if not isinstance(payload, dict):
                continue
            if str(payload.get("user_id") or "") != uid:
                continue
            item = dict(payload)
            item.setdefault("session_id", session_id)
            rows.append(item)

    rows.sort(key=lambda item: float(item.get("generated_at") or 0.0))
    return rows[-capped:]


def list_all_user_ids() -> list[str]:
    with _store_lock:
        user_ids = {
            str(payload.get("user_id") or "").strip()
            for payload in _analytics_by_session_id.values()
            if isinstance(payload, dict) and str(payload.get("user_id") or "").strip()
        }
    return sorted(user_ids)


_load()
