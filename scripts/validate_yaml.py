#!/usr/bin/env python3
from pathlib import Path
import sys

import yaml

ROOT = Path(__file__).resolve().parents[1]
GLOBS = [
    ROOT / "flows",
    ROOT / "blueprint",
    ROOT / "tests",
    ROOT / "infra",
]


def main() -> int:
    errors = 0
    for base in GLOBS:
        if not base.exists():
            continue
        for path in sorted(base.rglob("*.yml")) + sorted(base.rglob("*.yaml")):
            try:
                yaml.safe_load(path.read_text())
            except Exception as exc:  # noqa: BLE001
                print(f"FAIL {path}: {exc}", file=sys.stderr)
                errors += 1
    if errors:
        return 1
    print("ok: all YAML files parsed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
