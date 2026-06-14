# Archive

Code kept for reference but **not part of the active product**. Nothing here is
built, deployed, or imported by `backend/`, `frontend/`, or `desktop/`.

## `advanced-live-ai-tool/`

A second, parallel implementation of the product (its own Vite + React frontend
and a separate FastAPI/SQLite/Stripe backend, branded "InterviewGenius AI").

It was archived on 2026-06-14 to remove the two-codebase split: the canonical
product is now **`frontend/` + `backend/` + `desktop/`**. Maintaining two stacks
doubled the work for every feature and split focus.

If you want something from it (e.g. the Stripe billing wiring or Celery task
setup), port it into the canonical `backend/` rather than reviving this tree.
Restore the whole thing with:

```bash
git mv archive/advanced-live-ai-tool advanced-live-ai-tool
```
