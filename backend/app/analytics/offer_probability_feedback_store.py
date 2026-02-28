import json
import time
from pathlib import Path
from threading import Lock
from typing import Any


_store_lock = Lock()
_store_path = Path(__file__).resolve().parents[2] / "data" / "offer_probability_feedback_store.json"
_feedback_by_user_id: dict[str, list[dict[str, Any]]] = {}


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _load() -> None:
    global _feedback_by_user_id
    if not _store_path.exists():
        _feedback_by_user_id = {}
        return

    try:
        payload = json.loads(_store_path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            _feedback_by_user_id = {}
            return

        normalized: dict[str, list[dict[str, Any]]] = {}
        for user_id, rows in payload.items():
            if not isinstance(user_id, str) or not user_id.strip() or not isinstance(rows, list):
                continue
            normalized[user_id] = [row for row in rows if isinstance(row, dict)][-300:]
        _feedback_by_user_id = normalized
    except Exception:
        _feedback_by_user_id = {}


def _persist() -> None:
    _store_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = _store_path.with_suffix(".tmp")
    temp_path.write_text(json.dumps(_feedback_by_user_id, ensure_ascii=False), encoding="utf-8")
    temp_path.replace(_store_path)


def save_offer_probability_feedback(user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    uid = str(user_id or "").strip()
    if not uid:
        raise ValueError("user_id is required")

    entry = dict(payload or {})
    entry["user_id"] = uid
    entry["created_at"] = _safe_float(entry.get("created_at"), time.time())

    with _store_lock:
        rows = _feedback_by_user_id.setdefault(uid, [])
        rows.append(entry)
        _feedback_by_user_id[uid] = rows[-300:]
        _persist()

    return dict(entry)


def list_offer_probability_feedback(user_id: str, limit: int = 50) -> list[dict[str, Any]]:
    uid = str(user_id or "").strip()
    if not uid:
        return []
    capped = max(1, min(int(limit or 50), 300))

    with _store_lock:
        rows = list(_feedback_by_user_id.get(uid) or [])

    rows.sort(key=lambda row: _safe_float(row.get("created_at"), 0.0), reverse=True)
    return [dict(item) for item in rows[:capped]]


def get_offer_probability_feedback_summary(user_id: str, limit: int = 200) -> dict[str, Any]:
    rows = list_offer_probability_feedback(user_id, limit=limit)
    total = len(rows)
    accurate_count = sum(1 for row in rows if bool(row.get("felt_accuracy", False)))
    inaccurate_count = max(0, total - accurate_count)
    accurate_rate = round((accurate_count / total) * 100.0, 2) if total else 0.0

    return {
        "total_feedback": total,
        "accurate_count": accurate_count,
        "inaccurate_count": inaccurate_count,
        "accurate_rate_pct": accurate_rate,
        "latest": rows[0] if rows else None,
    }


_load()
