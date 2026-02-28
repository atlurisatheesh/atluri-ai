import threading
import time
from typing import Any


_lock = threading.Lock()
_metrics: dict[str, float] = {
    "ws_connections_active": 0.0,
    "ws_rooms_active": 0.0,
    "ws_disconnects_total": 0.0,
    "ws_disconnect_client_disconnect": 0.0,
    "ws_disconnect_stop_command": 0.0,
    "ws_disconnect_receive_audio_error": 0.0,
    "ws_disconnect_deepgram_error": 0.0,
    "ws_disconnect_socket_closed": 0.0,
    "ws_disconnect_max_turns_reached": 0.0,
    "ws_disconnect_other": 0.0,
    "answer_streams_started": 0.0,
    "answer_streams_cancelled": 0.0,
    "emotional_events_emitted": 0.0,
    "assist_hints_emitted": 0.0,
    "share_tokens_active": 0.0,
    "share_tokens_revoked": 0.0,
    "stream_duration_total_sec": 0.0,
    "stream_duration_samples": 0.0,
    "latency_total_ms": 0.0,
    "latency_samples": 0.0,
    "redis_publish_total_ms": 0.0,
    "redis_publish_samples": 0.0,
    "fanout_delay_total_ms": 0.0,
    "fanout_delay_samples": 0.0,
}


def increment_metric(name: str, amount: float = 1.0) -> None:
    key = str(name or "").strip()
    if not key:
        return
    with _lock:
        _metrics[key] = float(_metrics.get(key, 0.0)) + float(amount)


def decrement_metric(name: str, amount: float = 1.0) -> None:
    key = str(name or "").strip()
    if not key:
        return
    with _lock:
        next_value = float(_metrics.get(key, 0.0)) - float(amount)
        _metrics[key] = max(0.0, next_value)


def set_metric(name: str, value: float) -> None:
    key = str(name or "").strip()
    if not key:
        return
    with _lock:
        _metrics[key] = max(0.0, float(value))


def observe_stream_duration(seconds: float) -> None:
    duration = max(0.0, float(seconds or 0.0))
    with _lock:
        _metrics["stream_duration_total_sec"] = float(_metrics.get("stream_duration_total_sec", 0.0)) + duration
        _metrics["stream_duration_samples"] = float(_metrics.get("stream_duration_samples", 0.0)) + 1.0


def observe_latency_ms(value_ms: float) -> None:
    latency = max(0.0, float(value_ms or 0.0))
    with _lock:
        _metrics["latency_total_ms"] = float(_metrics.get("latency_total_ms", 0.0)) + latency
        _metrics["latency_samples"] = float(_metrics.get("latency_samples", 0.0)) + 1.0


def observe_redis_publish_latency_ms(value_ms: float) -> None:
    latency = max(0.0, float(value_ms or 0.0))
    with _lock:
        _metrics["redis_publish_total_ms"] = float(_metrics.get("redis_publish_total_ms", 0.0)) + latency
        _metrics["redis_publish_samples"] = float(_metrics.get("redis_publish_samples", 0.0)) + 1.0


def observe_fanout_delay_ms(value_ms: float) -> None:
    delay = max(0.0, float(value_ms or 0.0))
    with _lock:
        _metrics["fanout_delay_total_ms"] = float(_metrics.get("fanout_delay_total_ms", 0.0)) + delay
        _metrics["fanout_delay_samples"] = float(_metrics.get("fanout_delay_samples", 0.0)) + 1.0


def record_ws_disconnect(reason: str) -> None:
    normalized = str(reason or "").strip().lower().replace(" ", "_").replace("-", "_")
    key_map = {
        "client_disconnect": "ws_disconnect_client_disconnect",
        "stop_command": "ws_disconnect_stop_command",
        "receive_audio_error": "ws_disconnect_receive_audio_error",
        "deepgram_error": "ws_disconnect_deepgram_error",
        "socket_closed": "ws_disconnect_socket_closed",
        "max_turns_reached": "ws_disconnect_max_turns_reached",
    }
    metric_key = key_map.get(normalized, "ws_disconnect_other")
    with _lock:
        _metrics["ws_disconnects_total"] = float(_metrics.get("ws_disconnects_total", 0.0)) + 1.0
        _metrics[metric_key] = float(_metrics.get(metric_key, 0.0)) + 1.0


def get_metrics_snapshot(extra: dict[str, Any] | None = None) -> dict[str, Any]:
    with _lock:
        data = dict(_metrics)

    stream_samples = max(1.0, float(data.get("stream_duration_samples") or 0.0))
    latency_samples = max(1.0, float(data.get("latency_samples") or 0.0))
    redis_publish_samples = max(1.0, float(data.get("redis_publish_samples") or 0.0))
    fanout_delay_samples = max(1.0, float(data.get("fanout_delay_samples") or 0.0))

    payload: dict[str, Any] = {
        "generated_at": time.time(),
        # Raw counters/totals (useful for computing deltas over a test window)
        "stream_duration_total_sec": float(data.get("stream_duration_total_sec") or 0.0),
        "stream_duration_samples": int(data.get("stream_duration_samples") or 0.0),
        "latency_total_ms": float(data.get("latency_total_ms") or 0.0),
        "latency_samples": int(data.get("latency_samples") or 0.0),
        "redis_publish_total_ms": float(data.get("redis_publish_total_ms") or 0.0),
        "redis_publish_samples": int(data.get("redis_publish_samples") or 0.0),
        "fanout_delay_total_ms": float(data.get("fanout_delay_total_ms") or 0.0),
        "fanout_delay_samples": int(data.get("fanout_delay_samples") or 0.0),
        "ws_connections_active": int(data.get("ws_connections_active") or 0.0),
        "ws_rooms_active": int(data.get("ws_rooms_active") or 0.0),
        "ws_disconnects_total": int(data.get("ws_disconnects_total") or 0.0),
        "ws_disconnect_client_disconnect": int(data.get("ws_disconnect_client_disconnect") or 0.0),
        "ws_disconnect_stop_command": int(data.get("ws_disconnect_stop_command") or 0.0),
        "ws_disconnect_receive_audio_error": int(data.get("ws_disconnect_receive_audio_error") or 0.0),
        "ws_disconnect_deepgram_error": int(data.get("ws_disconnect_deepgram_error") or 0.0),
        "ws_disconnect_socket_closed": int(data.get("ws_disconnect_socket_closed") or 0.0),
        "ws_disconnect_max_turns_reached": int(data.get("ws_disconnect_max_turns_reached") or 0.0),
        "ws_disconnect_other": int(data.get("ws_disconnect_other") or 0.0),
        "answer_streams_started": int(data.get("answer_streams_started") or 0.0),
        "answer_streams_cancelled": int(data.get("answer_streams_cancelled") or 0.0),
        "emotional_events_emitted": int(data.get("emotional_events_emitted") or 0.0),
        "assist_hints_emitted": int(data.get("assist_hints_emitted") or 0.0),
        "share_tokens_active": int(data.get("share_tokens_active") or 0.0),
        "share_tokens_revoked": int(data.get("share_tokens_revoked") or 0.0),
        "avg_stream_duration": round(float(data.get("stream_duration_total_sec") or 0.0) / stream_samples, 4),
        "avg_latency_ms": round(float(data.get("latency_total_ms") or 0.0) / latency_samples, 2),
        "avg_redis_publish_latency_ms": round(float(data.get("redis_publish_total_ms") or 0.0) / redis_publish_samples, 2),
        "avg_fanout_delay_ms": round(float(data.get("fanout_delay_total_ms") or 0.0) / fanout_delay_samples, 2),
    }

    if extra:
        payload.update(extra)
    return payload
