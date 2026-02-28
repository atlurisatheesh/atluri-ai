import argparse
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path


def wait_for_port(host: str, port: int, timeout_sec: float = 20.0) -> bool:
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=1.0):
                return True
        except OSError:
            time.sleep(0.25)
    return False


def run_variant(script_path: Path, python_exe: str, port: int, backend_pid: int) -> dict:
    cmd = [python_exe, str(script_path), "--port", str(port), "--backend-pid", str(backend_pid)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"{script_path.name} failed with code {proc.returncode}: {proc.stderr.strip()}")
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{script_path.name} returned non-JSON output: {exc}") from exc


def summarize(label: str, payload: dict) -> dict:
    test5 = payload.get("test5_10_concurrent", {})
    worker_errors = test5.get("worker_errors") or []
    all_ok = all(bool(payload.get(key, {}).get("ok")) for key in payload.keys())
    return {
        "label": label,
        "all_ok": all_ok,
        "test5_errors": len(worker_errors),
        "test5_cpu_delta": test5.get("cpu_delta"),
        "test5_mem_delta_mb": test5.get("mem_delta_mb"),
        "test5_avg_events": test5.get("avg_events_per_session"),
    }


def print_table(rows: list[dict]) -> None:
    headers = ["Variant", "AllOK", "Test5Errors", "CPUΔ", "MemΔMB", "AvgEvents"]
    table = [
        [
            row["label"],
            "yes" if row["all_ok"] else "no",
            str(row["test5_errors"]),
            str(row["test5_cpu_delta"]),
            str(row["test5_mem_delta_mb"]),
            str(row["test5_avg_events"]),
        ]
        for row in rows
    ]
    widths = [len(h) for h in headers]
    for line in table:
        for i, cell in enumerate(line):
            widths[i] = max(widths[i], len(cell))

    def format_line(values: list[str]) -> str:
        return " | ".join(values[i].ljust(widths[i]) for i in range(len(values)))

    print(format_line(headers))
    print("-+-".join("-" * w for w in widths))
    for line in table:
        print(format_line(line))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run baseline vs staggered runtime A/B suite")
    parser.add_argument("--port", type=int, default=9010)
    parser.add_argument("--python-exe", default=sys.executable)
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument("--startup-timeout", type=float, default=20.0)
    parser.add_argument("--server-log", default="qa/reports/runtime_ab_server.log")
    args = parser.parse_args(argv)

    backend_root = Path(__file__).resolve().parents[1]
    qa_root = Path(__file__).resolve().parent
    baseline_script = qa_root / "runtime_stress_baseline.py"
    staggered_script = qa_root / "runtime_stress_staggered.py"

    env = os.environ.copy()
    env["ALLOW_UNVERIFIED_JWT_DEV"] = env.get("ALLOW_UNVERIFIED_JWT_DEV", "true")
    env["QA_MODE"] = env.get("QA_MODE", "true")
    env["SKIP_OPTIONAL_IMPORTS"] = env.get("SKIP_OPTIONAL_IMPORTS", "1")
    env["PYTHONUNBUFFERED"] = "1"

    server_cmd = [
        args.python_exe,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        str(args.port),
        "--workers",
        str(args.workers),
        "--log-level",
        "warning",
    ]

    server_log_path = (backend_root / args.server_log).resolve()
    server_log_path.parent.mkdir(parents=True, exist_ok=True)

    with server_log_path.open("w", encoding="utf-8") as server_log:
        server = subprocess.Popen(
            server_cmd,
            cwd=str(backend_root),
            env=env,
            stdout=server_log,
            stderr=subprocess.STDOUT,
        )
    try:
        if not wait_for_port("127.0.0.1", args.port, timeout_sec=args.startup_timeout):
            raise RuntimeError(f"backend did not start on port {args.port} within timeout")

        baseline = run_variant(baseline_script, args.python_exe, args.port, server.pid)
        staggered = run_variant(staggered_script, args.python_exe, args.port, server.pid)

        baseline_summary = summarize("baseline", baseline)
        staggered_summary = summarize("staggered", staggered)

        print_table([baseline_summary, staggered_summary])
        print(f"server_log={server_log_path}")
        print(json.dumps({"baseline": baseline, "staggered": staggered}, indent=2))
        return 0
    finally:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()


if __name__ == "__main__":
    raise SystemExit(main())
