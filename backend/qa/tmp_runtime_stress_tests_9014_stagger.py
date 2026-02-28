import asyncio
import json
import time
import uuid
import base64
import urllib.request
import subprocess
import sys
from statistics import mean

import websockets

BASE_HTTP = "http://127.0.0.1:9014"
BASE_WS = "ws://127.0.0.1:9014/ws/voice"


def build_dev_token(sub: str = "runtime-tester") -> str:
    enc = lambda obj: base64.urlsafe_b64encode(json.dumps(obj, separators=(",", ":")).encode()).decode().rstrip("=")
    return f"{enc({'alg':'none','typ':'JWT'})}.{enc({'sub':sub,'iat':0})}."


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def get_backend_pid(token: str) -> int:
    req = urllib.request.Request(f"{BASE_HTTP}/api/system/pid", headers=auth_headers(token), method="GET")
    with urllib.request.urlopen(req, timeout=5) as resp:
        payload = json.loads(resp.read().decode())
    return int(payload["pid"])


def sample_process(pid: int) -> tuple[float, int]:
    cmd = f"$p = Get-Process -Id {pid} -ErrorAction Stop; Write-Output $p.CPU; Write-Output $p.WorkingSet64"
    out = subprocess.check_output(["powershell", "-NoProfile", "-Command", cmd], text=True)
    lines = [ln.strip() for ln in out.splitlines() if ln.strip()]
    cpu = float(lines[0]) if lines else 0.0
    mem = int(float(lines[1])) if len(lines) > 1 else 0
    return cpu, mem


async def recv_until(ws, wanted: set[str], timeout: float = 20.0):
    end = time.time() + timeout
    seen = []
    while time.time() < end:
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=max(0.2, end - time.time()))
        except Exception:
            break
        data = json.loads(raw)
        seen.append(data)
        if data.get("type") in wanted:
            return data, seen
    return None, seen


async def test_single_session(token: str) -> dict:
    room_id = str(uuid.uuid4())
    ws_url = f"{BASE_WS}?room_id={room_id}&role=devops&participant=candidate&token={token}"
    async with websockets.connect(ws_url, max_size=2**20) as ws:
        seen2 = []
        for i in range(5):
            _, seen = await recv_until(ws, {"question", "next_question"}, timeout=8)
            seen2.extend(seen)
            await ws.send(json.dumps({
                "type": "qa_transcript",
                "text": f"single-session-answer-{i} with measurable impact and production ownership",
            }))
            _, seen_turn = await recv_until(ws, {"ai_decision"}, timeout=18)
            seen2.extend(seen_turn)

        summary, seen_tail = await recv_until(ws, {"final_summary"}, timeout=20)
        seen2.extend(seen_tail)
        return {
            "ok": summary is not None,
            "summary_received": summary is not None,
            "events_tail": [e.get("type") for e in seen2[-10:]],
        }


async def _session_worker(token: str, marker: str, transcript_lines: list[str], result: dict):
    room_id = str(uuid.uuid4())
    ws_url = f"{BASE_WS}?room_id={room_id}&role=devops&participant=candidate&token={token}"
    local_recv = []
    try:
        async with websockets.connect(ws_url, max_size=2**20) as ws:
            await recv_until(ws, {"question"}, timeout=8)
            for line in transcript_lines:
                await ws.send(json.dumps({"type": "qa_transcript", "text": f"{marker} {line}"}))
                await recv_until(ws, {"ai_decision", "next_question"}, timeout=12)
                await asyncio.sleep(0.1)
            end = time.time() + 8
            while time.time() < end:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=0.8)
                except Exception:
                    break
                data = json.loads(msg)
                local_recv.append(data)
    except Exception as exc:
        result["error"] = str(exc)
    result["events"] = local_recv


async def test_two_parallel(token: str) -> dict:
    ra, rb = {}, {}
    await asyncio.gather(
        _session_worker(token, "SESSION_A", ["line1", "line2", "line3"], ra),
        _session_worker(token, "SESSION_B", ["line1", "line2", "line3"], rb),
    )

    def extract_texts(events):
        texts = []
        for e in events:
            t = e.get("type")
            if t in {"transcript", "partial_transcript", "interviewer_question"}:
                texts.append(str(e.get("text") or e.get("question") or ""))
        return texts

    a_texts = extract_texts(ra.get("events", []))
    b_texts = extract_texts(rb.get("events", []))

    leakage = any("SESSION_B" in t for t in a_texts) or any("SESSION_A" in t for t in b_texts)
    dropped_a = len(ra.get("events", [])) == 0
    dropped_b = len(rb.get("events", [])) == 0

    return {
        "ok": (not leakage) and (not dropped_a) and (not dropped_b) and ("error" not in ra) and ("error" not in rb),
        "leakage": leakage,
        "dropped_a": dropped_a,
        "dropped_b": dropped_b,
        "err_a": ra.get("error"),
        "err_b": rb.get("error"),
        "count_a": len(ra.get("events", [])),
        "count_b": len(rb.get("events", [])),
    }


async def test_kill_mid_llm(token: str) -> dict:
    room_id = str(uuid.uuid4())
    ws_i = await websockets.connect(f"{BASE_WS}?room_id={room_id}&participant=interviewer&token={token}")
    ws_c = await websockets.connect(f"{BASE_WS}?room_id={room_id}&participant=candidate&token={token}")

    await recv_until(ws_i, {"question"}, timeout=5)
    await recv_until(ws_c, {"question"}, timeout=5)

    await ws_i.send(json.dumps({"type": "interviewer_question", "text": "Deep question requiring long answer generation"}))
    await recv_until(ws_c, {"answer_suggestion_start"}, timeout=10)
    await ws_c.close()

    # reconnect candidate and request sync
    ws_c2 = await websockets.connect(f"{BASE_WS}?room_id={room_id}&participant=candidate&token={token}")
    await recv_until(ws_c2, {"question"}, timeout=5)
    await ws_c2.send(json.dumps({"type": "sync_state_request"}))
    sync, seen = await recv_until(ws_c2, {"sync_state"}, timeout=8)

    await ws_i.close()
    await ws_c2.close()

    return {
        "ok": sync is not None,
        "sync_received": sync is not None,
        "sync_is_streaming": bool((sync or {}).get("is_streaming")),
        "seen": [e.get("type") for e in seen[-8:]],
    }


async def test_flood_websocket(token: str) -> dict:
    room_id = str(uuid.uuid4())
    ws_url = f"{BASE_WS}?room_id={room_id}&participant=candidate&token={token}"
    async with websockets.connect(ws_url, max_size=2**20) as ws:
        await recv_until(ws, {"question"}, timeout=5)
        start = time.time()
        for i in range(100):
            await ws.send(json.dumps({"type": "candidate_transcript", "text": f"flood message {i}?", "is_final": (i % 3 == 0)}))
        got = []
        ping_count = 0
        end = time.time() + 25
        while time.time() < end:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=1.0)
            except Exception:
                continue
            data = json.loads(raw)
            got.append(data.get("type"))
            if data.get("type") == "ping":
                ping_count += 1
                await ws.send(json.dumps({"type": "pong", "ts": time.time()}))

        alive = ws.state.name == "OPEN"
        return {
            "ok": alive,
            "alive": alive,
            "elapsed_sec": round(time.time() - start, 2),
            "events": len(got),
            "ping_count": ping_count,
            "tail": got[-12:],
        }


async def test_10_concurrent(token: str, backend_pid: int) -> dict:
    cpu0, mem0 = sample_process(backend_pid)

    event_counts = []
    ping_latencies = []

    async def worker(idx: int):
        await asyncio.sleep(0.2 * idx)
        room_id = str(uuid.uuid4())
        ws_url = f"{BASE_WS}?room_id={room_id}&participant=candidate&token={token}"
        local_events = 0
        local_lat = []
        async with websockets.connect(ws_url, max_size=2**20, open_timeout=35) as ws:
            await recv_until(ws, {"question"}, timeout=6)
            stop_at = time.time() + 20
            n = 0
            while time.time() < stop_at:
                sent_ts = time.time()
                await ws.send(json.dumps({"type": "candidate_transcript", "text": f"session-{idx}-msg-{n}", "is_final": bool(n % 2)}))
                n += 1
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=1.5)
                    data = json.loads(raw)
                    local_events += 1
                    if data.get("type") == "ping":
                        local_lat.append(time.time() - sent_ts)
                        await ws.send(json.dumps({"type": "pong", "ts": time.time()}))
                except Exception:
                    pass
                await asyncio.sleep(0.5)
        event_counts.append(local_events)
        ping_latencies.extend(local_lat)

    worker_results = await asyncio.gather(*[worker(i) for i in range(10)], return_exceptions=True)
    worker_errors = [str(item) for item in worker_results if isinstance(item, Exception)]

    cpu1, mem1 = sample_process(backend_pid)
    return {
        "ok": True,
        "cpu_start": cpu0,
        "cpu_end": cpu1,
        "cpu_delta": round(cpu1 - cpu0, 3),
        "mem_start_mb": round(mem0 / (1024 * 1024), 2),
        "mem_end_mb": round(mem1 / (1024 * 1024), 2),
        "mem_delta_mb": round((mem1 - mem0) / (1024 * 1024), 2),
        "avg_events_per_session": round(mean(event_counts), 2) if event_counts else 0.0,
        "avg_ping_latency_ms": round(mean(ping_latencies) * 1000, 2) if ping_latencies else None,
        "max_ping_latency_ms": round(max(ping_latencies) * 1000, 2) if ping_latencies else None,
        "worker_errors": worker_errors,
    }


async def main():
    token = build_dev_token()
    if len(sys.argv) > 1:
        backend_pid = int(sys.argv[1])
    else:
        backend_pid = get_backend_pid(token)

    results = {}

    async def run_guard(name, fn):
        try:
            results[name] = await fn()
        except Exception as exc:
            results[name] = {"ok": False, "error": str(exc)}

    await run_guard("test1_single_session", lambda: test_single_session(token))
    await run_guard("test2_two_parallel", lambda: test_two_parallel(token))
    await run_guard("test3_kill_mid_llm", lambda: test_kill_mid_llm(token))
    await run_guard("test4_flood", lambda: test_flood_websocket(token))
    await run_guard("test5_10_concurrent", lambda: test_10_concurrent(token, backend_pid))

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    asyncio.run(main())

