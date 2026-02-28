# Distributed WebSocket Scaling Strategy

## Goal
Enable multi-instance WebSocket operation with consistent room state, rejoin behavior, and event delivery.

## Current Model
- In-process room membership and runtime state.
- No cross-instance event fanout.
- Single-process reliability assumptions.

## Target Model
- Redis-backed room membership + state.
- Pub/sub fanout per room for message synchronization.
- Stateless app instances behind load balancer.

## Core Components
1. `RoomStateStore` adapter (already scaffolded)
   - local/in-memory adapter for dev
   - redis adapter for distributed mode
2. `RoomEventBus`
   - publish room events
   - subscribe and rebroadcast to local sockets
3. `ConnectionRegistry`
   - per-instance list of active websocket connections by room
4. Presence heartbeat
   - keepalive key with TTL per connection

## Event Contract (suggested)
- `room.question`
- `room.partial_transcript`
- `room.final_transcript`
- `room.coach_hint`
- `room.answer_stream_chunk`
- `room.answer_stream_done`
- `room.participant_joined`
- `room.participant_left`

## Failure Handling
- Idempotent event IDs to avoid duplicate emission.
- Last-write-wins timestamps for room state updates.
- Rejoin hydration endpoint backed by Redis room snapshot.

## Rollout Plan
1. Introduce adapter interfaces + feature flag.
2. Mirror writes to local + redis; compare room state parity.
3. Switch reads to redis in staging.
4. Run room hardening smokes against 2-instance deployment.
5. Enable in production gradually by tenant/traffic slice.

## Required Flags
- `USE_REDIS_ROOM_STATE`
- `REDIS_URL`
- `ROOM_EVENT_BUS_ENABLED`

## Validation Gates
- Rejoin consistency pass rate >= 99.5%.
- Duplicate finalization events == 0 in stress run.
- Room broadcast latency p95 under threshold target.
