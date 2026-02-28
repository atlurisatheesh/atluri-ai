import asyncio
import json
import os
import socket
import subprocess
import sys
import time
import uuid
from pathlib import Path

import websockets

ROOT = Path(__file__).resolve().parents[1]
HOST = "127.0.0.1"
PORT_A = 9111
PORT_B = 9112
REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
REPORT_DIR = ROOT / "qa" / "reports"
REPORT_PATH = REPORT_DIR / "distributed_room_fanout_smoke_report.json"


def _wait_port(host: str, port: int, timeout_sec: float = 20.0) -> bool:
    end_at = time.time() + timeout_sec
    while time.time() < end_at:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.5)
            if sock.connect_ex((host, port)) == 0:
                return True
        time.sleep(0.2)
    return False


def _start_backend_instance(port: int, instance_id: str) -> subprocess.Popen:
    env = dict(os.environ)
    env["QA_MODE"] = "true"
    env["ENV"] = "development"
    env["ALLOW_UNVERIFIED_JWT_DEV"] = "true"
    env["RATE_LIMIT_ENABLED"] = "false"
    env["USE_REDIS_ROOM_STATE"] = "true"
    env["ROOM_EVENT_BUS_ENABLED"] = "true"
    env["REDIS_URL"] = REDIS_URL
    env["INSTANCE_ID"] = instance_id

    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        HOST,
        "--port",
        str(port),
    ]
    return subprocess.Popen(
        cmd,
        cwd=str(ROOT),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


async def _recv_until(ws, wanted_types: set[str], timeout_sec: float = 12.0):
    end_at = asyncio.get_event_loop().time() + timeout_sec
    seen = []
    while asyncio.get_event_loop().time() < end_at:
        remaining = max(0.1, end_at - asyncio.get_event_loop().time())
        try:
            msg = await asyncio.wait_for(ws.recv(), timeout=remaining)
        except Exception:
            break
        data = json.loads(msg)
        event_type = str(data.get("type") or "")
        seen.append(event_type)
        if event_type in wanted_types:
            return data, seen
    return None, seen


async def _run_smoke() -> dict:
    room_id = str(uuid.uuid4())
    interviewer_url = f"ws://{HOST}:{PORT_A}/ws/voice?room_id={room_id}&participant=interviewer&assist_intensity=2"
    candidate_url = f"ws://{HOST}:{PORT_B}/ws/voice?room_id={room_id}&participant=candidate&assist_intensity=2"

    interviewer = await websockets.connect(interviewer_url)
    candidate = await websockets.connect(candidate_url)

    await asyncio.sleep(2.0)
    question = "Cross-instance fanout verification question"
    await interviewer.send(json.dumps({"type": "interviewer_question", "text": question}))

    candidate_event, candidate_seen = await _recv_until(candidate, {"interviewer_question"}, timeout_sec=12.0)

    ok = (
        candidate_event is not None
        and str(candidate_event.get("question") or "").strip() == question
        and str(candidate_event.get("room_id") or "").strip() == room_id
    )

    await interviewer.close()
    await candidate.close()

    return {
        "ok": ok,
        "room_id": room_id,
        "candidate_seen": candidate_seen,
        "received_event": candidate_event or {},
        "question": question,
    }


def _stop_process(proc: subprocess.Popen) -> None:
    if proc.poll() is not None:
        return
    proc.terminate()
    try:
        proc.wait(timeout=6)
    except subprocess.TimeoutExpired:
        proc.kill()


def main() -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    started = time.time()

    # Optional dependency check for redis client package
    try:
        redis_mod = __import__("redis")
    except Exception as exc:
        report = {
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "duration_sec": round(time.time() - started, 2),
            "all_pass": False,
            "error": f"redis package not installed: {exc}",
            "hint": "Install backend dependencies: pip install -r backend/requirements.txt",
        }
        REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report, indent=2))
        sys.exit(1)

    try:
        redis_client = redis_mod.Redis.from_url(REDIS_URL, decode_responses=True)
        redis_client.ping()
    except Exception as exc:
        report = {
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "duration_sec": round(time.time() - started, 2),
            "all_pass": False,
            "error": f"redis server unavailable at {REDIS_URL}: {exc}",
            "hint": "Start Redis and retry. Example: docker run --name redis-local -p 6379:6379 -d redis:7",
        }
        REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report, indent=2))
        sys.exit(1)

    proc_a = _start_backend_instance(PORT_A, "instance-a")
    proc_b = _start_backend_instance(PORT_B, "instance-b")

    try:
        ready_a = _wait_port(HOST, PORT_A, timeout_sec=25)
        ready_b = _wait_port(HOST, PORT_B, timeout_sec=25)

        if not (ready_a and ready_b):
            report = {
                "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "duration_sec": round(time.time() - started, 2),
                "all_pass": False,
                "error": "Backend instances did not become ready",
                "ready_a": ready_a,
                "ready_b": ready_b,
            }
            REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
            print(json.dumps(report, indent=2))
            sys.exit(1)

        result = asyncio.run(_run_smoke())

        report = {
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "duration_sec": round(time.time() - started, 2),
            "all_pass": bool(result.get("ok")),
            "result": result,
            "instance_a": {
                "port": PORT_A,
                "return_code": proc_a.poll(),
                "stderr_tail": "captured on failure only",
            },
            "instance_b": {
                "port": PORT_B,
                "return_code": proc_b.poll(),
                "stderr_tail": "captured on failure only",
            },
        }

        REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report, indent=2))

        if not report["all_pass"]:
            sys.exit(1)
    finally:
        _stop_process(proc_a)
        _stop_process(proc_b)


if __name__ == "__main__":
    main()
