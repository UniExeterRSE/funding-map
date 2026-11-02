#!/usr/bin/env python3
"""Start a new opportunity, src/opportunities/<stem>.md, with every field from src/schema.yml: new.py <stem>."""

import datetime as dt
import sys
from pathlib import Path

import yaml

SRC = Path(__file__).resolve().parent.parent / "src"


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    path = SRC / "opportunities" / f"{sys.argv[1]}.md"
    if path.exists():
        print(f"{path} exists", file=sys.stderr)
        return 1
    lines = ["---"]
    for f in yaml.safe_load((SRC / "schema.yml").read_text())["fields"]:
        hint = [f["help"]] if "help" in f else []
        if "values" in f:
            hint.append(("one of: " if f["type"] == "choice" else "list of: ") + ", ".join(v["id"] for v in f["values"]))
        value = dt.date.today().isoformat() if f["type"] == "date" else "[]" if f["type"] == "choices" else "~"
        lines.append(f"{f['name']}: {value}" + (f"  # {' | '.join(hint)}" if hint else ""))
    lines += ["---", "", "One to three sentences: what it pays for, for whom, and any catch. Link out for the rest.", ""]
    path.write_text("\n".join(lines))
    print(f"wrote {path.relative_to(SRC.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
