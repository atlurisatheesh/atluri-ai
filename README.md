# linkedin-ai

## Frontend (from `frontend/`)

`npm run dev -- --port 3001`

Install dependencies:

- Reproducible install (lockfile): `./scripts/install-frontend-deps.ps1`
- Fallback install (updates lockfile): `./scripts/install-frontend-deps.ps1 -ForceInstall`

## Backend (from `backend/`)

`C:/Users/atlur/AppData/Local/Programs/Python/Python311/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 9010`

Install dependencies:

- Runtime only: `pip install -r backend/requirements.txt`
- Runtime + QA/dev tools: `pip install -r backend/requirements-dev.txt`

Optional (local transcription):

- Whisper is optional and not in `requirements.txt` (it’s large and pulls native deps).
- If you want to use `WhisperService`, install `openai-whisper` and ensure `ffmpeg` is available on PATH.

One-command installer (Windows PowerShell):

- Runtime only: `./scripts/install-backend-deps.ps1`
- Runtime + QA/dev tools: `./scripts/install-backend-deps.ps1 -Dev`

One-command full project dependency setup (Windows PowerShell):

- Default (backend runtime + frontend lockfile install): `./scripts/install-all-deps.ps1`
- Backend dev deps + frontend lockfile install: `./scripts/install-all-deps.ps1 -BackendDev`
- Backend dev deps + frontend fallback install: `./scripts/install-all-deps.ps1 -BackendDev -FrontendForceInstall`

## Backend env

- Copy `backend/.env.example` to `backend/.env`.
- Set `CORS_ALLOW_ORIGINS` to your frontend URL list.
- Example: `CORS_ALLOW_ORIGINS=http://localhost:3001,http://127.0.0.1:3001`
- Set at least one LLM provider key (most flows assume OpenAI):
	- `OPENAI_API_KEY` (recommended)
	- `ANTHROPIC_API_KEY` (optional)
	- `GEMINI_API_KEY` (optional)
- Optional model override: `MODEL_NAME` (default `gpt-4.1-mini`)
- For strict auth in development, keep `ALLOW_UNVERIFIED_JWT_DEV=false` (default).
- Basic API throttling is configurable via:
	- `RATE_LIMIT_ENABLED`
	- `RATE_LIMIT_WINDOW_SEC`
	- `RATE_LIMIT_MAX_REQUESTS`
- Distributed room state toggle:
	- `USE_REDIS_ROOM_STATE=false` (default local in-memory store)
	- `REDIS_URL=redis://localhost:6379/0` (required when enabled)
- Cross-instance websocket fanout toggle:
	- `ROOM_EVENT_BUS_ENABLED=false` (default local-only broadcasts)
	- `INSTANCE_ID=` (optional explicit instance id; auto-generated when empty)

## Audit report

- Full engineering audit: `AUDIT_FULLSTACK_2026-02-17.md`

## Architecture strategy docs

- Redis/Postgres migration blueprint: `backend/docs/REDIS_POSTGRES_MIGRATION_BLUEPRINT.md`
- Distributed WebSocket scaling strategy: `backend/docs/DISTRIBUTED_WEBSOCKET_SCALING_STRATEGY.md`
- System metrics contract: `backend/docs/SYSTEM_METRICS_CONTRACT.md`
- Investor technical narrative: `INVESTOR_TECHNICAL_NARRATIVE_2026-02-17.md`
- Category dominance playbook: `CATEGORY_DOMINANCE_PLAYBOOK_2026-02-17.md`
- Category execution board: `EXECUTION_BOARD_CATEGORY_DOMINANCE_2026-02-17.md`
- Growth cadence operating board: `docs/GROWTH_CADENCE_30D.md`
- Closed beta runbook (20–50): `docs/CLOSED_BETA_RUNBOOK_20_50.md`
- 2-minute dominance demo script: `docs/DOMINANCE_DEMO_2_MIN_SCRIPT.md`
- Transformation case-study loop: `docs/TRANSFORMATION_CASE_STUDY_LOOP.md`

## Distributed fanout smoke test

- Prereq: Redis running on `REDIS_URL` (default `redis://127.0.0.1:6379/0`)
- Run: `C:/Users/atlur/AppData/Local/Programs/Python/Python311/python.exe backend/qa/run_distributed_room_fanout_smoke.py`
- Report output: `backend/qa/reports/distributed_room_fanout_smoke_report.json`

## Offer Probability end-to-end smoke

- Script: `./scripts/run-offer-probability-smoke.ps1`
- With real auth token: `./scripts/run-offer-probability-smoke.ps1 -ApiBase http://127.0.0.1:9010 -AuthToken <JWT>`
- Dev-only unsigned mode (requires backend started with `ALLOW_UNVERIFIED_JWT_DEV=true`):
	- `./scripts/run-offer-probability-smoke.ps1 -ApiBase http://127.0.0.1:9011 -UseUnsignedDevToken`
- Output includes end-to-end checks for:
	- round completion
	- deterministic repeat probability
	- dashboard integration
	- share/public snapshot fields
	- export payload enrichment
	- trust-feedback capture + summary metrics

Offer probability trust-feedback API:

- `POST /api/user/offer-probability/feedback`
- `GET /api/user/offer-probability/feedback-summary`

## One-command local start/stop (Windows PowerShell)

- Start both backend and frontend: `./scripts/dev-start.ps1`
- Stop both backend and frontend: `./scripts/dev-stop.ps1`

Optional overrides:

- `BACKEND_PORT` (default `9010`)
- `FRONTEND_PORT` (default `3001`)
- `PYTHON_EXE` (default `C:/Users/atlur/AppData/Local/Programs/Python/Python311/python.exe`)