from fastapi import APIRouter, HTTPException, Request

from app.dashboard.builder import CredibilitySnapshotBuilder
from app.session.registry import session_registry
from app.auth import get_user_id
from app.state import mark_credibility_snapshot

router = APIRouter()


@router.get("/session/{session_id}/credibility")
def get_credibility_snapshot(session_id: str, request: Request):
    user_id = get_user_id(request)
    item = session_registry.get(session_id)
    if not item:
        raise HTTPException(status_code=404, detail="Session not found")

    session_engine = item.get("session_engine")
    session_controller = item.get("session_controller")

    if session_engine is None or session_controller is None:
        raise HTTPException(status_code=404, detail="Session snapshot unavailable")

    builder = CredibilitySnapshotBuilder()
    snapshot = builder.build(
        session_id=session_id,
        session_engine=session_engine,
        session_controller=session_controller,
    )

    payload = snapshot.to_dict()
    payload["active"] = bool(item.get("active", False))
    payload["created_at"] = item.get("created_at")
    payload["updated_at"] = item.get("updated_at")
    mark_credibility_snapshot(user_id, payload)
    return payload
