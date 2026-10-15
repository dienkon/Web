from pathlib import Path
import difflib
import json
import zipfile

root = Path(__file__).resolve().parent.parent
output = root / "docs" / "academy-upgrade"
archive = output / "before-source.zip"
if not archive.is_file():
    raise SystemExit("Missing baseline archive; cannot compare this upgrade honestly.")
with zipfile.ZipFile(archive) as baseline:
    original = {
        name: baseline.read(name).decode("utf-8-sig").splitlines()
        for name in baseline.namelist()
    }
paths = {
    path.relative_to(root).as_posix(): path
    for path in (root / "src").rglob("*")
    if path.is_file() and path.suffix in {".ts", ".tsx", ".css"}
}
paths["package.json"] = root / "package.json"
for name in [
    "scripts/academy-core-checks.ts",
    "scripts/test-academy-core.mjs",
    "scripts/test-academy-browser.mjs",
    "scripts/test-academy-edges.mjs",
    "scripts/measure-academy-upgrade.py",
]:
    paths[name] = root / name
changed = []
for name, path in paths.items():
    before = original.get(name, [])
    after = path.read_text(encoding="utf-8-sig").splitlines()
    if before == after:
        continue
    added = deleted = nonblank = 0
    for operation, a, b, c, d in difflib.SequenceMatcher(None, before, after, autojunk=False).get_opcodes():
        if operation in {"insert", "replace"}:
            added += d - c
            nonblank += sum(bool(line.strip()) for line in after[c:d])
        if operation in {"delete", "replace"}:
            deleted += b - a
            nonblank += sum(bool(line.strip()) for line in before[a:b])
    changed.append({"path": name, "added": added, "deleted": deleted, "changedNonblankLines": nonblank})
report = {
    "baseline": "Source snapshot at the start of this upgrade, not Git HEAD.",
    "changedFiles": len(changed),
    "added": sum(file["added"] for file in changed),
    "deleted": sum(file["deleted"] for file in changed),
    "changedNonblankLines": sum(file["changedNonblankLines"] for file in changed),
    "runtimeContentLines": sum(file["added"] for file in changed if file["path"].startswith("src/academy/data/")),
    "files": changed,
}
(output / "change-metrics.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps({key: value for key, value in report.items() if key != "files"}, indent=2))
if report["changedNonblankLines"] < 10000:
    raise SystemExit("The 10,000 nonblank changed-line requirement is not met.")
