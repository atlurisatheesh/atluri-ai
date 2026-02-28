import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = ROOT / "qa" / "reports"
STRESS_SCRIPT = ROOT / "qa" / "multi_session_stress.py"
BEHAVIOR_SCRIPT = ROOT / "qa" / "skillgraph_behavior_validation.py"
MEMORY_BEHAVIOR_SCRIPT = ROOT / "qa" / "memory_behavior_validation.py"
PROGRESS_EXPORT_SCRIPT = ROOT / "qa" / "run_progress_export_smoke.py"
STRESS_REPORT = REPORT_DIR / "multi_session_stress_report.json"
BEHAVIOR_REPORT = REPORT_DIR / "skillgraph_behavior_validation_report.json"
MEMORY_BEHAVIOR_REPORT = ROOT / "qa" / "memory_behavior_report.json"
PROGRESS_EXPORT_REPORT = REPORT_DIR / "progress_export_smoke_report.json"
GATE_REPORT = REPORT_DIR / "quality_gate_report.json"


def run_script(script_path: Path, env_overrides: dict[str, str] | None = None) -> dict:
    env = dict(**{"PYTHONUNBUFFERED": "1"})
    env.update({k: v for k, v in dict(**(env_overrides or {})).items()})

    cmd = [sys.executable, str(script_path)]
    started = time.time()
    proc = subprocess.run(
        cmd,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        env={**dict(**subprocess.os.environ), **env},
    )

    return {
        "script": str(script_path),
        "exit_code": proc.returncode,
        "duration_sec": round(time.time() - started, 2),
        "stdout_tail": "\n".join((proc.stdout or "").splitlines()[-20:]),
        "stderr_tail": "\n".join((proc.stderr or "").splitlines()[-20:]),
    }


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    stress_run = run_script(STRESS_SCRIPT)
    behavior_run = run_script(BEHAVIOR_SCRIPT, env_overrides={"QA_MODE": "false"})
    memory_behavior_run = run_script(MEMORY_BEHAVIOR_SCRIPT, env_overrides={"QA_MODE": "false"})
    progress_export_run = run_script(PROGRESS_EXPORT_SCRIPT, env_overrides={"QA_MODE": "false"})

    stress_report = load_json(STRESS_REPORT)
    behavior_report = load_json(BEHAVIOR_REPORT)
    memory_behavior_report = load_json(MEMORY_BEHAVIOR_REPORT)
    progress_export_report = load_json(PROGRESS_EXPORT_REPORT)

    stress_checks = ((stress_report.get("summary") or {}).get("checks") or {})
    stress_all_pass = bool(stress_checks) and all(bool(v) for v in stress_checks.values())

    behavior_summary = behavior_report.get("summary") or {}
    behavior_all_pass = bool(behavior_summary.get("all_pass", False))

    memory_behavior_all_pass = bool(memory_behavior_report.get("all_pass", False))
    progress_export_all_pass = bool(progress_export_report.get("all_pass", False))

    pass_all = (
        stress_run["exit_code"] == 0
        and behavior_run["exit_code"] == 0
        and memory_behavior_run["exit_code"] == 0
        and progress_export_run["exit_code"] == 0
        and stress_all_pass
        and behavior_all_pass
        and memory_behavior_all_pass
        and progress_export_all_pass
    )

    gate_report = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "objective": "Unified structural + behavioral production quality gate",
        "runs": {
            "multi_session_stress": stress_run,
            "skillgraph_behavior": behavior_run,
            "memory_behavior": memory_behavior_run,
            "progress_export_smoke": progress_export_run,
        },
        "results": {
            "stress_all_pass": stress_all_pass,
            "behavior_all_pass": behavior_all_pass,
            "memory_behavior_all_pass": memory_behavior_all_pass,
            "progress_export_all_pass": progress_export_all_pass,
            "gate_pass": pass_all,
            "stress_total_checks": len(stress_checks),
            "stress_passed_checks": sum(1 for v in stress_checks.values() if v),
            "behavior_passed": behavior_summary.get("passed", 0),
            "behavior_total": behavior_summary.get("total", 0),
            "memory_behavior_passed": memory_behavior_report.get("passed", 0),
            "memory_behavior_total": memory_behavior_report.get("total", 0),
            "progress_export_steps": len(progress_export_report.get("steps") or []),
            "progress_export_passed": sum(1 for s in (progress_export_report.get("steps") or []) if bool((s or {}).get("ok"))),
        },
        "artifacts": {
            "stress_report": str(STRESS_REPORT),
            "behavior_report": str(BEHAVIOR_REPORT),
            "memory_behavior_report": str(MEMORY_BEHAVIOR_REPORT),
            "progress_export_report": str(PROGRESS_EXPORT_REPORT),
        },
    }

    GATE_REPORT.write_text(json.dumps(gate_report, indent=2), encoding="utf-8")

    print(json.dumps(gate_report["results"], indent=2))
    print(f"REPORT={GATE_REPORT}")

    if not pass_all:
        sys.exit(1)


if __name__ == "__main__":
    main()
