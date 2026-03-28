"""
Desktop download manifest endpoint.
Serves latest.json from the desktop-releases directory so the
frontend landing page can show the correct download links.
"""

import json
import os
import logging
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/desktop", tags=["Desktop Downloads"])
logger = logging.getLogger("app.api.desktop_downloads")

# Walk up from backend/app/api/ to project root, then into desktop-releases/
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_RELEASES_DIR = _PROJECT_ROOT / "desktop-releases"


@router.get("/latest")
async def get_latest_release():
    """Return the latest desktop release manifest."""
    manifest_path = _RELEASES_DIR / "latest.json"
    if not manifest_path.exists():
        return JSONResponse(
            status_code=404,
            content={"error": "No desktop releases available yet"},
        )
    try:
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
        return data
    except Exception as e:
        logger.error("Failed to read release manifest: %s", e)
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to read release manifest"},
        )
