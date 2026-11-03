#!/usr/bin/env python3
"""Validate every opportunity's front matter against src/schema.yml and write the filter's data.

Run by Quarto after a render (project.post-render), it writes opportunities.json into the output directory, holding
the schema's fields and one item per opportunity; any invalid opportunity fails the render. With --check it only
validates, which is what CI and contributors run.

An opportunity whose deadline is a date has no status of its own: it is open until the end of that day and closed
after. This writes the status as of the build; filter.js and the script filters/opportunity.lua puts on each page
work it out again in the reader's browser, so a deadline passing between builds shows at once.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import re
import sys
from pathlib import Path

import yaml

SRC = Path(__file__).resolve().parent.parent / "src"
FRONT_MATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)


def load_schema() -> list[dict]:
    return yaml.safe_load((SRC / "schema.yml").read_text())["fields"]


def front_matter(path: Path) -> dict:
    match = FRONT_MATTER.match(path.read_text())
    if not match:
        raise ValueError("no YAML front matter between --- lines at the top")
    meta = yaml.safe_load(match.group(1)) or {}
    # An unquoted YAML date loads as a date; keep the text, as written.
    return {k: v.isoformat() if isinstance(v, dt.date) else v for k, v in meta.items()}


def errors(meta: dict, fields: list[dict]) -> list[str]:
    out = []
    by_name = {f["name"]: f for f in fields}
    for name in meta.keys() - by_name.keys():
        out.append(f"{name}: not in schema.yml (add it there first)")
    for f in fields:
        name, value = f["name"], meta.get(f["name"])
        if name not in meta:
            out.append(f"{name}: missing (use ~ for not stated)")
            continue
        if name == "status" and is_date(meta.get("deadline")):
            if value is not None:
                out.append("status: leave it empty (~), as the deadline is a date: it is open until then, closed after")
            continue
        if value is None or value == [] or value == "":
            if name == "status":
                out.append("status: required, unless the deadline is a date")
            elif f.get("required"):
                out.append(f"{name}: required")
            continue
        ids = {v["id"] for v in f.get("values", [])}
        match f["type"]:
            case "text":
                ok = isinstance(value, (str, int, float))
            case "url":
                ok = isinstance(value, str) and value.startswith("https://")
            case "number":
                ok = isinstance(value, (int, float)) and not isinstance(value, bool)
            case "date":
                ok = isinstance(value, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) is not None
            case "choice":
                ok = value in ids
            case "choices":
                ok = isinstance(value, list) and all(v in ids for v in value)
            case other:
                raise ValueError(f"schema.yml: {name} has unknown type {other}")
        if not ok:
            hint = f" (one of: {', '.join(sorted(ids))})" if ids else ""
            out.append(f"{name}: {value!r} is not a valid {f['type']}{hint}")
    return out


def is_date(value) -> bool:
    return isinstance(value, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) is not None


def main() -> int:
    today = dt.date.today().isoformat()
    fields = load_schema()
    items, failed = [], False
    for path in sorted((SRC / "opportunities").glob("*.md")):
        rel = path.relative_to(SRC)
        try:
            meta = front_matter(path)
            problems = errors(meta, fields)
        except (ValueError, yaml.YAMLError) as e:
            problems = [str(e)]
        for p in problems:
            print(f"{rel}: {p}", file=sys.stderr)
            failed = True
        if not problems and is_date(meta.get("deadline")):
            meta["status"] = "closed" if meta["deadline"] < today else "open"
        items.append({**meta, "href": rel.with_suffix(".html").as_posix()})
    if failed:
        return 1
    if "--check" in sys.argv:
        print(f"{len(items)} opportunities valid")
        return 0
    out = Path(os.environ.get("QUARTO_PROJECT_OUTPUT_DIR", SRC / "docs"))
    out.mkdir(parents=True, exist_ok=True)
    (out / "opportunities.json").write_text(json.dumps({"fields": fields, "items": items}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
