import argparse

from runtime_stress_suite import main


if __name__ == "__main__":
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--stagger-seconds", type=float, default=0.2)
    known, passthrough = parser.parse_known_args()

    forwarded = ["--stagger-seconds", str(known.stagger_seconds), *passthrough]
    raise SystemExit(main(forwarded))
