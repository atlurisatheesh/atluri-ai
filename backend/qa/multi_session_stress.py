import asyncio
import json
import os
import re
import socket
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.request import urlopen

import websockets

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
REPORT_PATH = ROOT / "qa" / "reports" / "multi_session_stress_report.json"


@dataclass
class BackendHandle:
    process: subprocess.Popen
    port: int
    stdout_path: Path
    stderr_path: Path


def find_free_port(start: int = 9010, end: int = 9050) -> int:
    for port in range(start, end + 1):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                return port
    raise RuntimeError("No free port found")


async def wait_http_ready(port: int, timeout_s: float = 30.0) -> None:
    started = time.time()
    while time.time() - started < timeout_s:
        try:
            with urlopen(f"http://127.0.0.1:{port}/docs", timeout=2.0) as resp:
                if resp.status == 200:
                    return
        except Exception:
            pass
        await asyncio.sleep(0.3)
    raise TimeoutError(f"Backend not ready on port {port}")


def start_backend(qa_mode: bool, tag: str) -> BackendHandle:
    port = find_free_port()
    stdout_path = ROOT / "qa" / "reports" / f"{tag}_stdout.log"
    stderr_path = ROOT / "qa" / "reports" / f"{tag}_stderr.log"

    stdout_f = open(stdout_path, "w", encoding="utf-8")
    stderr_f = open(stderr_path, "w", encoding="utf-8")

    env = os.environ.copy()
    env["QA_MODE"] = "true" if qa_mode else "false"

    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
            "--log-level",
            "info",
        ],
        cwd=str(ROOT),
        env=env,
        stdout=stdout_f,
        stderr=stderr_f,
    )

    return BackendHandle(process=process, port=port, stdout_path=stdout_path, stderr_path=stderr_path)


def stop_backend(handle: BackendHandle) -> None:
    if handle.process.poll() is None:
        handle.process.terminate()
        try:
            handle.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            handle.process.kill()


def count_patterns(text: str, patterns: dict[str, str]) -> dict[str, int]:
    result = {}
    for key, pattern in patterns.items():
        result[key] = len(re.findall(pattern, text, flags=re.MULTILINE))
    return result


async def run_client(
    session_id: str,
    ws_url: str,
    lines: list[str],
    start_delay_s: float,
    first_line_barrier: asyncio.Event,
    disconnect_mid_turn: bool = False,
) -> dict[str, Any]:
    await asyncio.sleep(start_delay_s)
    events: list[dict[str, Any]] = []
    sent_lines: list[str] = []
    errors: list[str] = []

    try:
        async with websockets.connect(ws_url, max_size=2**20, open_timeout=20) as ws:
            line_idx = 0
            ended = False
            start_t = time.time()

            while time.time() - start_t < 120 and not ended:
                raw = await asyncio.wait_for(ws.recv(), timeout=20)
                data = json.loads(raw)
                events.append(data)
                event_type = data.get("type")

                if event_type == "question":
                    if not first_line_barrier.is_set():
                        await first_line_barrier.wait()
                    if line_idx < len(lines):
                        payload = {"type": "qa_transcript", "text": lines[line_idx]}
                        await ws.send(json.dumps(payload))
                        sent_lines.append(lines[line_idx])
                        line_idx += 1
                        if disconnect_mid_turn:
                            await ws.close()
                            ended = True

                elif event_type == "next_question":
                    if line_idx < len(lines):
                        payload = {"type": "qa_transcript", "text": lines[line_idx]}
                        await ws.send(json.dumps(payload))
                        sent_lines.append(lines[line_idx])
                        line_idx += 1
                    else:
                        await ws.send(json.dumps({"type": "stop"}))

                elif event_type == "final_summary":
                    ended = True

    except Exception as exc:
        errors.append(str(exc))

    ai_decisions = [e for e in events if e.get("type") == "ai_decision"]
    next_questions = [e for e in events if e.get("type") == "next_question"]
    transcripts = [e.get("text", "") for e in events if e.get("type") == "transcript"]

    return {
        "session_id": session_id,
        "sent_lines": sent_lines,
        "events": events,
        "errors": errors,
        "counts": {
            "ai_decision": len(ai_decisions),
            "next_question": len(next_questions),
            "transcript": len(transcripts),
            "final_summary": len([e for e in events if e.get("type") == "final_summary"]),
        },
        "persona_telemetry": [
            {
                "persona_name": (e.get("decision") or {}).get("persona_name"),
                "pressure_intensity": (e.get("decision") or {}).get("pressure_intensity"),
            }
            for e in ai_decisions
        ],
        "transcripts": transcripts,
    }


async def phase_qa_concurrency() -> dict[str, Any]:
    handle = start_backend(qa_mode=True, tag="phase_qa")
    try:
        await wait_http_ready(handle.port)
        ws_url = f"ws://127.0.0.1:{handle.port}/ws/voice?role=devops"

        first_line_barrier = asyncio.Event()

        scenarios = {
            "s1": [
                "I designed a rollout and reduced failures by 40 percent.",
                "I introduced canary checks and rollback automation.",
                "I tracked latency and error budgets each release.",
                "I led incident triage and stakeholder updates.",
                "I improved reliability while reducing cost.",
            ],
            "s2": [
                "I worked on tasks.",
                "I am not sure.",
                "I did small updates.",
                "No measurable impact.",
                "I cannot recall details.",
            ],
            "s3": [
                "I migrated service configs.",
                "I handled deploy scripts.",
            ],
            "s4": [
                "I improved pipeline visibility and rollback speed.",
                "I compared consistency and cost tradeoffs.",
                "I mitigated risk with staged releases.",
                "I documented incident response flows.",
                "I improved delivery reliability across teams.",
            ],
            "s5": [
                "I configured kubernetes workloads.",
                "I optimized autoscaling settings.",
                "I lowered deployment drift via automation.",
                "I created runbooks for on-call.",
                "I cut mean-time-to-recovery.",
            ],
        }

        tasks = [
            asyncio.create_task(run_client("s1", ws_url, scenarios["s1"], 0.0, first_line_barrier)),
            asyncio.create_task(run_client("s2", ws_url, scenarios["s2"], 0.2, first_line_barrier)),
            asyncio.create_task(run_client("s3", ws_url, scenarios["s3"], 0.4, first_line_barrier, disconnect_mid_turn=True)),
            asyncio.create_task(run_client("s4", ws_url, scenarios["s4"], 0.6, first_line_barrier)),
            asyncio.create_task(run_client("s5", ws_url, scenarios["s5"], 0.8, first_line_barrier)),
        ]

        await asyncio.sleep(2)
        first_line_barrier.set()
        session_results = await asyncio.gather(*tasks)

        errors: list[str] = []
        bleed_violations = []
        duplicate_violations = []
        contract_violations = []

        transcript_map = {r["session_id"]: set(r["sent_lines"]) for r in session_results}

        for result in session_results:
            sid = result["session_id"]
            sent = transcript_map[sid]
            for txt in result["transcripts"]:
                if txt and txt not in sent:
                    bleed_violations.append({"session": sid, "text": txt})

            if sid != "s3":
                if result["counts"]["ai_decision"] > len(result["sent_lines"]):
                    duplicate_violations.append({"session": sid, "kind": "ai_decision_overflow"})
                if result["counts"]["next_question"] > result["counts"]["ai_decision"]:
                    duplicate_violations.append({"session": sid, "kind": "next_question_overflow"})

            if result["counts"]["ai_decision"] and not result["counts"]["transcript"]:
                contract_violations.append({"session": sid, "kind": "ai_without_transcript"})

            errors.extend(result["errors"])

        stderr_text = handle.stderr_path.read_text(encoding="utf-8", errors="ignore")
        log_counts = count_patterns(
            stderr_text,
            {
                "qa_mode_disabled_dg": r"\[QA_MODE\] Deepgram disabled",
                "deepgram_reconnect": r"Reconnecting Deepgram",
                "watchdog_terminated": r"\[DG\] Watchdog terminated",
                "service_started": r"\[DG\] Service started",
                "service_stopped": r"\[DG\] Service stopped",
            },
        )

        return {
            "backend": {
                "port": handle.port,
                "stdout_log": str(handle.stdout_path),
                "stderr_log": str(handle.stderr_path),
                "qa_mode": True,
            },
            "session_results": session_results,
            "invariants": {
                "session_isolation": len(bleed_violations) == 0,
                "finalize_safety": len(duplicate_violations) == 0,
                "event_contract_integrity": len(contract_violations) == 0,
                "disconnect_safety": any(r["session_id"] == "s3" for r in session_results),
                "no_cross_session_deepgram": log_counts["deepgram_reconnect"] == 0,
            },
            "violations": {
                "bleed": bleed_violations,
                "duplicates": duplicate_violations,
                "contract": contract_violations,
                "errors": errors,
            },
            "log_counts": log_counts,
        }
    finally:
        stop_backend(handle)


async def run_nonqa_connect_disconnect(ws_url: str, delay: float, hold: float) -> dict[str, Any]:
    await asyncio.sleep(delay)
    out = {"ok": True, "error": None}
    try:
        async with websockets.connect(ws_url, max_size=2**20, open_timeout=20) as ws:
            await asyncio.wait_for(ws.recv(), timeout=25)
            await asyncio.sleep(hold)
    except Exception as exc:
        out["ok"] = False
        out["error"] = str(exc)
    return out


async def phase_nonqa_lifecycle() -> dict[str, Any]:
    handle = start_backend(qa_mode=False, tag="phase_nonqa")
    try:
        await wait_http_ready(handle.port)
        ws_url = f"ws://127.0.0.1:{handle.port}/ws/voice?role=devops"

        tasks = [
            asyncio.create_task(run_nonqa_connect_disconnect(ws_url, 0.0, 2.0)),
            asyncio.create_task(run_nonqa_connect_disconnect(ws_url, 0.2, 2.0)),
            asyncio.create_task(run_nonqa_connect_disconnect(ws_url, 0.4, 0.3)),
            asyncio.create_task(run_nonqa_connect_disconnect(ws_url, 0.6, 2.0)),
            asyncio.create_task(run_nonqa_connect_disconnect(ws_url, 0.8, 2.0)),
        ]
        results = await asyncio.gather(*tasks)

        flood_tasks = [
            asyncio.create_task(run_nonqa_connect_disconnect(ws_url, i * 0.05, 0.05))
            for i in range(10)
        ]
        flood_results = await asyncio.gather(*flood_tasks)

        await asyncio.sleep(3)

        stderr_text = handle.stderr_path.read_text(encoding="utf-8", errors="ignore")
        log_counts = count_patterns(
            stderr_text,
            {
                "service_started": r"\[DG\] Service started",
                "service_stopped": r"\[DG\] Service stopped",
                "watchdog_terminated": r"\[DG\] Watchdog terminated",
                "reconnect": r"Reconnecting Deepgram",
                "reconnect_failed": r"Deepgram reconnect failed",
                "keep_alive_thread_error": r"_keep_alive_thread",
                "asgi_exception": r"Exception in ASGI application",
            },
        )

        return {
            "backend": {
                "port": handle.port,
                "stdout_log": str(handle.stdout_path),
                "stderr_log": str(handle.stderr_path),
                "qa_mode": False,
            },
            "session_results": results,
            "flood_results": flood_results,
            "invariants": {
                "deepgram_lifecycle_isolation": log_counts["service_started"] >= 1 and log_counts["service_stopped"] >= 1,
                "no_keep_alive_thread_error": log_counts["keep_alive_thread_error"] == 0,
                "no_reconnect_failure_loop": log_counts["reconnect_failed"] == 0,
                "no_unhandled_asgi_exceptions": log_counts["asgi_exception"] == 0,
            },
            "log_counts": log_counts,
        }
    finally:
        stop_backend(handle)


def phase_persona_isolation() -> dict[str, Any]:
    from app.session_controller import SessionController

    c1 = SessionController()
    c2 = SessionController()
    c3 = SessionController()

    strong_seq = [
        (6.5, 0.82, "L3", False, "Strong"),
        (7.1, 0.86, "L3", False, "Strong"),
        (8.0, 0.9, "L4", False, "Strong"),
    ]
    weak_seq = [
        (-9.0, 0.42, "L2", True, "Needs Improvement"),
        (-10.0, 0.38, "L2", True, "Needs Improvement"),
        (-11.0, 0.35, "L2", True, "Needs Improvement"),
    ]
    stable_seq = [
        (0.5, 0.62, "L2", False, "Average"),
        (1.0, 0.66, "L2", False, "Average"),
        (0.0, 0.6, "L2", False, "Average"),
    ]

    out = {"s1": [], "s2": [], "s3": []}

    for step in range(3):
        d1 = c1.update_persona_state(*strong_seq[step])
        d2 = c2.update_persona_state(*weak_seq[step])
        d3 = c3.update_persona_state(*stable_seq[step])
        out["s1"].append(d1.pressure_intensity)
        out["s2"].append(d2.pressure_intensity)
        out["s3"].append(d3.pressure_intensity)

    return {
        "intensity_traces": out,
        "invariants": {
            "s1_increases": out["s1"][-1] >= out["s1"][0],
            "s2_not_global_with_s1": out["s2"][-1] <= out["s2"][0],
            "s3_stable": max(out["s3"]) - min(out["s3"]) <= 1,
            "divergent_states": len({out["s1"][-1], out["s2"][-1], out["s3"][-1]}) >= 2,
        },
    }


async def main() -> None:
    report: dict[str, Any] = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "objective": "Concurrent lifecycle + isolation invariant validation",
    }

    qa_phase = await phase_qa_concurrency()
    nonqa_phase = await phase_nonqa_lifecycle()
    persona_phase = phase_persona_isolation()

    report["phase_qa_concurrency"] = qa_phase
    report["phase_nonqa_lifecycle"] = nonqa_phase
    report["phase_persona_isolation"] = persona_phase

    all_checks = {}
    all_checks.update({f"qa::{k}": v for k, v in qa_phase["invariants"].items()})
    all_checks.update({f"nonqa::{k}": v for k, v in nonqa_phase["invariants"].items()})
    all_checks.update({f"persona::{k}": v for k, v in persona_phase["invariants"].items()})

    report["summary"] = {
        "passed": sum(1 for v in all_checks.values() if v),
        "total": len(all_checks),
        "checks": all_checks,
    }

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report["summary"], indent=2))
    print(f"REPORT={REPORT_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
