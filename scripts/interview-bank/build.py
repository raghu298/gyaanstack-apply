#!/usr/bin/env python3
"""Make src/lib/interview-bank/questions.json from the GyaanStack interview bank.

Questions only: model answers stay on gyaanstack.com/interview (members).
  python3 scripts/interview-bank/build.py ~/gyaanstack-learn/_auth/iv_sets.json
"""
import json
import pathlib
import sys

src = pathlib.Path(sys.argv[1]).expanduser()
sets = json.loads(src.read_text())
out = {
    "source": "https://gyaanstack.com/interview",
    "sets": [
        {
            "id": s["id"],
            "name": s["name"],
            "qa": [{"id": q["id"], "q": q["q"], "l": q.get("l", "mid")} for q in s["qa"] if q.get("q")],
        }
        for s in sets
    ],
}
dest = pathlib.Path(__file__).resolve().parents[2] / "src/lib/interview-bank/questions.json"
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")
total = sum(len(s["qa"]) for s in out["sets"])
print(f"{total} questions in {len(out['sets'])} sets -> {dest} ({dest.stat().st_size // 1024} KB)")
