import subprocess
import sys
from pathlib import Path


def run_script(script_path: Path) -> int:
    print(f"\n=== Running {script_path.name} ===")
    result = subprocess.run([sys.executable, str(script_path)], check=False)
    print(f"=== {script_path.name} exit={result.returncode} ===")
    return result.returncode


def main() -> int:
    backend_dir = Path(__file__).resolve().parents[1]
    scripts = [
        backend_dir / "tmp_room_ws_smoke.py",
        backend_dir / "tmp_room_rejoin_smoke.py",
        backend_dir / "tmp_room_stream_cancel_smoke.py",
    ]

    missing = [str(p) for p in scripts if not p.exists()]
    if missing:
        print("Missing required smoke scripts:")
        for m in missing:
            print(f" - {m}")
        return 1

    failures = 0
    for script in scripts:
        code = run_script(script)
        if code != 0:
            failures += 1

    if failures:
        print(f"\nROOM_HARDENING_SMOKES_FAILED ({failures} failed)")
        return 1

    print("\nROOM_HARDENING_SMOKES_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
