"""
═══════════════════════════════════════════════════════════════════════
  MASTER TEST RUNNER — Orchestrates E2E → Regression → Load
  Usage:
    python -m tests.run_all_tests            (all three suites)
    python -m tests.run_all_tests e2e        (E2E only)
    python -m tests.run_all_tests regression (regression only)
    python -m tests.run_all_tests load       (load only)
═══════════════════════════════════════════════════════════════════════
"""

import subprocess
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

SUITES = {
    "e2e": {
        "file": "tests/test_e2e_full.py",
        "label": "End-to-End (77 tests)",
        "cmd": [sys.executable, "-m", "pytest", "tests/test_e2e_full.py", "-v", "--tb=short", "-x"],
    },
    "regression": {
        "file": "tests/test_regression_p0.py",
        "label": "Regression (P0 + behavioral)",
        "cmd": [sys.executable, "-m", "pytest", "tests/test_regression_p0.py", "-v", "--tb=short"],
    },
    "load": {
        "file": "tests/test_load_100_users.py",
        "label": "100-User Load Test",
        "cmd": [sys.executable, "tests/test_load_100_users.py"],
    },
}


def banner(msg: str, color: str = CYAN):
    width = 70
    print(f"\n{color}{BOLD}{'═' * width}")
    print(f"  {msg}")
    print(f"{'═' * width}{RESET}\n")


def run_suite(name: str) -> dict:
    suite = SUITES[name]
    banner(f"Running: {suite['label']}", CYAN)
    start = time.time()
    result = subprocess.run(
        suite["cmd"],
        cwd=str(BACKEND_DIR),
        capture_output=False,
    )
    elapsed = time.time() - start
    passed = result.returncode == 0
    status = f"{GREEN}PASS{RESET}" if passed else f"{RED}FAIL{RESET}"
    print(f"\n  {status}  {suite['label']}  ({elapsed:.1f}s)")
    return {"name": name, "label": suite["label"], "passed": passed, "elapsed": elapsed}


def main():
    requested = sys.argv[1:] if len(sys.argv) > 1 else ["e2e", "regression", "load"]
    invalid = [s for s in requested if s not in SUITES]
    if invalid:
        print(f"Unknown suite(s): {invalid}. Valid: {list(SUITES.keys())}")
        sys.exit(1)

    banner("MASTER QA TEST RUNNER", YELLOW)
    print(f"  Suites: {', '.join(requested)}")
    print(f"  Backend: {BACKEND_DIR}")

    results = []
    overall_start = time.time()
    for name in requested:
        results.append(run_suite(name))

    overall_elapsed = time.time() - overall_start

    # ─── Summary ──────────────────────────────────────────────────────
    banner("FINAL REPORT", YELLOW)
    pass_count = sum(1 for r in results if r["passed"])
    fail_count = len(results) - pass_count

    for r in results:
        icon = f"{GREEN}✓{RESET}" if r["passed"] else f"{RED}✗{RESET}"
        print(f"  {icon}  {r['label']:.<50} {r['elapsed']:.1f}s")

    print(f"\n  Total: {len(results)} suites | {GREEN}{pass_count} passed{RESET} | {RED}{fail_count} failed{RESET} | {overall_elapsed:.1f}s")

    if fail_count > 0:
        print(f"\n  {RED}{BOLD}VERDICT: FAIL — {fail_count} suite(s) failed{RESET}")
        sys.exit(1)
    else:
        print(f"\n  {GREEN}{BOLD}VERDICT: ALL SUITES PASSED ✓{RESET}")
        sys.exit(0)


if __name__ == "__main__":
    main()
