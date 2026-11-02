#!/usr/bin/env python3
"""Add a field to the front matter of every opportunity that lacks it: add-field.py <name> [default].

The default is written as YAML, so `~` (the default) means "not stated" and `"[any]"` a list. Add the field to
src/schema.yml first; the edit is textual, so the rest of each front matter keeps its formatting and comments.
"""

import re
import sys
from pathlib import Path

import yaml

SRC = Path(__file__).resolve().parent.parent / "src"


def main() -> int:
    if len(sys.argv) not in (2, 3):
        print(__doc__, file=sys.stderr)
        return 2
    name, default = sys.argv[1], sys.argv[2] if len(sys.argv) == 3 else "~"
    names = [f["name"] for f in yaml.safe_load((SRC / "schema.yml").read_text())["fields"]]
    if name not in names:
        print(f"{name} is not in src/schema.yml: add it there first", file=sys.stderr)
        return 1
    changed = 0
    for path in sorted((SRC / "opportunities").glob("*.md")):
        text = path.read_text()
        match = re.match(r"\A---\n(.*?\n)---\n", text, re.DOTALL)
        if not match or re.search(rf"^{re.escape(name)}:", match.group(1), re.MULTILINE):
            continue
        end = match.end(1)
        path.write_text(f"{text[:end]}{name}: {default}\n{text[end:]}")
        changed += 1
    print(f"added {name}: {default} to {changed} opportunities")
    return 0


if __name__ == "__main__":
    sys.exit(main())
