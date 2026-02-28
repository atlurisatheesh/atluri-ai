import time

from app.session.registry import SessionRegistry


def test_session_registry_register_touch_inactive_cleanup():
    registry = SessionRegistry()

    registry.register("s1", session_engine=object(), session_controller=object())
    item = registry.get("s1")
    assert item is not None
    assert item["active"] is True

    before_touch = float(item["updated_at"])
    time.sleep(0.01)
    registry.touch("s1")
    after_touch = float(registry.get("s1")["updated_at"])
    assert after_touch >= before_touch

    registry.mark_inactive("s1")
    assert registry.get("s1")["active"] is False

    # ttl=0 clamps internally to >=30s; force old timestamp for deterministic cleanup
    registry._sessions["s1"]["updated_at"] = time.time() - 3600  # test-only direct mutation
    removed = registry.cleanup_inactive(ttl_sec=0)
    assert removed == 1
    assert registry.get("s1") is None
