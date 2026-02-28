# System Metrics Contract

## Endpoint
- Method: `GET`
- Path: `/api/system/metrics`
- Auth: Bearer token required

## Purpose
Provides operational telemetry for backend runtime health, real-time websocket behavior, and distributed fanout performance.

## Response Shape
```json
{
  "generated_at": 1739771400.123,
  "ws_connections_active": 12,
  "ws_rooms_active": 5,
  "ws_disconnects_total": 44,
  "ws_disconnect_client_disconnect": 20,
  "ws_disconnect_stop_command": 8,
  "ws_disconnect_receive_audio_error": 4,
  "ws_disconnect_deepgram_error": 2,
  "ws_disconnect_socket_closed": 5,
  "ws_disconnect_max_turns_reached": 3,
  "ws_disconnect_other": 2,
  "answer_streams_started": 61,
  "answer_streams_cancelled": 11,
  "emotional_events_emitted": 37,
  "assist_hints_emitted": 94,
  "share_tokens_active": 3,
  "share_tokens_revoked": 14,
  "avg_stream_duration": 2.1432,
  "avg_latency_ms": 128.41,
  "avg_redis_publish_latency_ms": 2.71,
  "avg_fanout_delay_ms": 6.84,
  "share_token_ttl_sec": 86400
}
```

## Field Definitions
- `generated_at`: Unix timestamp for snapshot creation.
- `ws_connections_active`: Current open websocket connections.
- `ws_rooms_active`: Current active room count (rooms with >=1 local connection).
- `ws_disconnects_total`: Total websocket disconnect events observed.
- `ws_disconnect_client_disconnect`: Disconnects caused by client websocket disconnect.
- `ws_disconnect_stop_command`: Disconnects from explicit stop command.
- `ws_disconnect_receive_audio_error`: Disconnects due to receive-audio loop errors.
- `ws_disconnect_deepgram_error`: Disconnects due to transcript/deepgram errors.
- `ws_disconnect_socket_closed`: Disconnects because socket became unavailable.
- `ws_disconnect_max_turns_reached`: Disconnects after max turn completion.
- `ws_disconnect_other`: Disconnects that do not match known categories.
- `answer_streams_started`: Count of answer suggestion stream starts.
- `answer_streams_cancelled`: Count of answer suggestion streams cancelled.
- `emotional_events_emitted`: Count of emotional/tone pressure events emitted.
- `assist_hints_emitted`: Count of realtime assist hint events emitted.
- `share_tokens_active`: Number of active (unexpired, unrevoked) share tokens.
- `share_tokens_revoked`: Number of revoked share tokens.
- `avg_stream_duration`: Average answer stream duration in seconds.
- `avg_latency_ms`: Average turn finalization latency in milliseconds.
- `avg_redis_publish_latency_ms`: Average Redis publish latency in milliseconds for room fanout.
- `avg_fanout_delay_ms`: Average cross-instance fanout delay in milliseconds (publish to remote dispatch).
- `share_token_ttl_sec`: Configured share token TTL in seconds.

## Notes
- Metrics are process-local snapshots for the running backend instance.
- In multi-instance deployments, aggregate across instances in your monitoring stack.
- Latency averages are cumulative-process averages since process start.
