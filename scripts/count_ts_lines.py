from __future__ import annotations

import argparse
from pathlib import Path


IGNORED_DIRS = {
    ".git",
    ".next",
    "node_modules",
    "coverage",
    "dist",
    "build",
}


def iter_source_files(root: Path):
    for path in root.rglob("*"):
        if path.is_dir():
            continue

        if any(part in IGNORED_DIRS for part in path.parts):
            continue

        if path.suffix not in {".ts", ".tsx"}:
            continue

        yield path


def count_lines(path: Path) -> int:
    return len(path.read_text(encoding="utf-8", errors="ignore").splitlines())


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Count total lines across all .ts and .tsx files in this project."
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Project root directory to scan.",
    )
    args = parser.parse_args()

    root = args.root.resolve()
    files = sorted(iter_source_files(root))
    total_lines = sum(count_lines(path) for path in files)

    print(f"Root: {root}")
    print(f"Files: {len(files)}")
    print(f"Total lines: {total_lines}")


if __name__ == "__main__":
    main()