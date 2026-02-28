# Redis + Postgres Migration Blueprint

## Objective
Move from process-local JSON persistence to production-safe shared persistence and distributed state.

## Current Constraints
- User/session analytics persisted in local JSON files.
- WebSocket room runtime state held in-memory per process.
- No cross-instance coordination for rooms/rejoins.

## Target Architecture
- Redis:
  - ephemeral room state (`room:{room_id}:state`)
  - room membership (`room:{room_id}:members`)
  - pub/sub for real-time fanout (`room:{room_id}:events`)
  - rate-limit counters
- Postgres:
  - durable session analytics
  - user context history
  - export/report queries

## Data Model (Postgres)
- `session_analytics`
  - `session_id` (pk)
  - `user_id` (indexed)
  - `generated_at`
  - `payload_jsonb`
- `user_context`
  - `user_id` (pk)
  - `company_mode`
  - `assist_intensity`
  - `resume_text`
  - `job_description`
  - `updated_at`
- `share_tokens`
  - `token_hash` (pk)
  - `session_id`
  - `user_id`
  - `expires_at`
  - `revoked`

## Incremental Rollout
1. Introduce storage interfaces with in-memory/json adapters preserved.
2. Add Redis adapter for room runtime state and fanout.
3. Dual-write analytics to JSON + Postgres, compare parity.
4. Switch reads to Postgres, keep JSON fallback for one release.
5. Remove JSON write path after parity confidence.

## Safety Controls
- Feature flags:
  - `USE_REDIS_ROOM_STATE`
  - `USE_POSTGRES_ANALYTICS`
- Structured migration logs for read/write parity mismatches.
- Backfill job for existing JSON artifacts.

## Acceptance Criteria
- Multi-instance room rejoin consistency validated.
- Session analytics readable across instances.
- No data loss during dual-write window.
- CI includes integration tests for adapters.
