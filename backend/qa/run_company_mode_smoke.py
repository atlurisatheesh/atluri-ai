import json
import os
import sys
import time
from dataclasses import dataclass, asdict
from typing import Any
from urllib import error, request


DEFAULT_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:9010").rstrip("/")
DEFAULT_TOKEN = os.getenv("API_BEARER_TOKEN", "eyJhbGciOiJub25lIn0.eyJzdWIiOiJkZXYtdXNlciJ9.")
TIMEOUT_SECONDS = float(os.getenv("API_TIMEOUT_SECONDS", "30"))


@dataclass
class StepResult:
    name: str
    ok: bool
    detail: str


class HttpClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip("/")
        self.token = token

    def call(self, method: str, path: str, payload: dict[str, Any] | None = None) -> tuple[int, Any]:
        url = f"{self.base_url}{path}"
        body = json.dumps(payload).encode("utf-8") if payload is not None else None

        headers = {
            "Authorization": f"Bearer {self.token}",
        }
        if body is not None:
            headers["Content-Type"] = "application/json"

        req = request.Request(url=url, method=method.upper(), data=body, headers=headers)

        try:
            with request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
                raw = resp.read().decode("utf-8")
                status = int(resp.status)
        except error.HTTPError as exc:
            status = int(exc.code)
            raw = exc.read().decode("utf-8") if exc.fp else ""
        except Exception as exc:
            raise RuntimeError(f"Request failed for {method} {path}: {exc}") from exc

        data: Any
        try:
            data = json.loads(raw) if raw else {}
        except Exception:
            data = raw

        return status, data


def run_smoke(base_url: str, token: str) -> dict[str, Any]:
    started = time.time()
    client = HttpClient(base_url=base_url, token=token)
    results: list[StepResult] = []

    status, data = client.call("GET", "/api/context/company-modes")
    items = data.get("items") if isinstance(data, dict) else None
    has_items = isinstance(items, list) and len(items) >= 5
    first_is_general = bool(items and isinstance(items[0], dict) and items[0].get("id") == "general")
    modes_ok = status == 200 and has_items and first_is_general
    results.append(
        StepResult(
            name="company_modes_list",
            ok=modes_ok,
            detail=f"status={status}, count={(len(items) if isinstance(items, list) else 0)}, first={(items[0].get('id') if isinstance(items, list) and items else None)}",
        )
    )

    status, data = client.call("POST", "/api/context/company-mode", {"company_mode": "microsoft"})
    set_mode = data.get("company_mode") if isinstance(data, dict) else None
    results.append(
        StepResult(
            name="set_company_mode",
            ok=(status == 200 and set_mode == "microsoft"),
            detail=f"status={status}, mode={set_mode}",
        )
    )

    status, data = client.call("GET", "/api/context/company-mode")
    get_mode = data.get("company_mode") if isinstance(data, dict) else None
    results.append(
        StepResult(
            name="get_company_mode",
            ok=(status == 200 and get_mode == "microsoft"),
            detail=f"status={status}, mode={get_mode}",
        )
    )

    status, data = client.call("GET", "/api/dashboard/overview")
    persona_mode = None
    if isinstance(data, dict) and isinstance(data.get("persona"), dict):
        persona_mode = data["persona"].get("company_mode")
    results.append(
        StepResult(
            name="dashboard_persona_mode",
            ok=(status == 200 and persona_mode == "microsoft"),
            detail=f"status={status}, persona_mode={persona_mode}",
        )
    )

    status, data = client.call("POST", "/api/chat", {"message": "Give 3 bullets for backend interview prep"})
    reply = data.get("reply") if isinstance(data, dict) else ""
    first_line = str(reply).split("\n")[0].strip() if isinstance(reply, str) else ""
    results.append(
        StepResult(
            name="chat_response",
            ok=(status == 200 and bool(first_line) and first_line.startswith("- ")),
            detail=f"status={status}, first_line={first_line[:120]}",
        )
    )

    all_pass = all(item.ok for item in results)
    return {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "base_url": base_url,
        "duration_sec": round(time.time() - started, 2),
        "all_pass": all_pass,
        "steps": [asdict(item) for item in results],
    }


def main() -> None:
    base_url = DEFAULT_BASE_URL
    token = DEFAULT_TOKEN

    report = run_smoke(base_url=base_url, token=token)
    print(json.dumps(report, indent=2))

    if not report.get("all_pass", False):
        sys.exit(1)


if __name__ == "__main__":
    main()
