"""
═══════════════════════════════════════════════════════════════════════
  Uvicorn Multi-Worker Configuration

  Run with:
    uvicorn app.main:app --config uvicorn_config.py

  Or directly:
    python uvicorn_config.py

  Env vars:
    WORKERS      – number of worker processes  (default: 4)
    HOST         – bind host                    (default: 0.0.0.0)
    PORT         – bind port                    (default: 9010)
    LOG_LEVEL    – log level                    (default: info)
═══════════════════════════════════════════════════════════════════════
"""

import multiprocessing
import os

# ─── Worker count ─────────────────────────────────────────────────────
# Default: 4 workers, or CPU_COUNT if available.
# For WebSocket workloads, 2-4 workers per CPU core is typical
# because each worker blocks on I/O (OpenAI API, Deepgram, Redis).
_default_workers = min(max(2, multiprocessing.cpu_count()), 8)
workers = int(os.getenv("WORKERS", str(_default_workers)))

# ─── Bind ─────────────────────────────────────────────────────────────
host = os.getenv("HOST", "0.0.0.0")
port = int(os.getenv("PORT", "9010"))
bind = f"{host}:{port}"

# ─── Logging ──────────────────────────────────────────────────────────
loglevel = os.getenv("LOG_LEVEL", "info")
accesslog = "-"

# ─── Timeouts ─────────────────────────────────────────────────────────
# Keep-alive timeout (seconds) — longer for WebSocket clients
timeout_keep_alive = 120

# Graceful shutdown: give in-flight WS sessions 30s to complete
timeout_graceful_shutdown = 30

# ─── WebSocket ────────────────────────────────────────────────────────
# Use the auto loop policy for best Windows/Linux compat
loop = "auto"
ws = "auto"

# ─── ASGI app ─────────────────────────────────────────────────────────
app = "app.main:app"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        workers=workers,
        log_level=loglevel,
        timeout_keep_alive=timeout_keep_alive,
        timeout_graceful_shutdown=timeout_graceful_shutdown,
    )
