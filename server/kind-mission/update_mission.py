#!/usr/bin/env python3
"""Atomically write kind.gmcat.io's deterministic daily mission JSON."""
import hashlib
import html
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

ACTS = Path(os.environ.get("KIND_ACTS", "/opt/gmcat-kind/acts.json"))
OUTPUT = Path(os.environ.get("KIND_MISSION", "/var/www/sites/kind.gmcat.io/mission.json"))
CLASSROOM = Path(os.environ.get("KIND_CLASSROOM", "/var/www/sites/kind.gmcat.io/classroom/index.html"))


def mission(day, acts):
    flat = [(category, act) for category, items in acts.items() for act in items]
    n = int.from_bytes(hashlib.sha256(("gmcat-kind:" + day).encode()).digest()[:8], "big")
    category, text = flat[n % len(flat)]
    return {"date": day, "category": category, "mission": text}


if __name__ == "__main__":
    day = os.environ.get("KIND_DATE") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    data = mission(day, json.loads(ACTS.read_text()))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temp = OUTPUT.with_suffix(".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    os.replace(temp, OUTPUT)
    if CLASSROOM.exists():
        page = CLASSROOM.read_text()
        page, n1 = re.subn(r'(<h1 id="classroom-mission">).*?(</h1>)',
                           lambda m: m.group(1) + html.escape(data["mission"]) + m.group(2), page, count=1)
        page, n2 = re.subn(r'(<p class="classroom-category" id="classroom-category">).*?(</p>)',
                           lambda m: m.group(1) + html.escape(data["category"].title()) + m.group(2), page, count=1)
        if n1 != 1 or n2 != 1:
            raise RuntimeError("classroom mission markers missing")
        classroom_temp = CLASSROOM.with_suffix(".tmp")
        classroom_temp.write_text(page)
        os.replace(classroom_temp, CLASSROOM)
    print(data["date"], data["category"], data["mission"])
