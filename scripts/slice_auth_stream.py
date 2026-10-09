from pathlib import Path
import gzip, csv, sys

DATA = Path(__file__).resolve().parent.parent / "data"

START_DAY, END_DAY = 9, 9
start, end = (START_DAY - 1) * 86400, END_DAY * 86400

cols = ["time", "src_user", "dst_user", "src_comp", "dst_comp",
        "auth_type", "logon_type", "auth_orientation", "result"]

kept = 0
with gzip.open(sys.stdin.buffer, "rt") as f, open(DATA / "auth_slice.csv", "w", newline="") as out:
    w = csv.writer(out)
    w.writerow(cols)
    for i, line in enumerate(f):
        parts = line.rstrip("\n").split(",")
        t = int(parts[0])
        if t < start:
            if i % 20_000_000 == 0:
                print(f"skipping... day {t // 86400 + 1}", flush=True)
            continue
        if t >= end:
            break
        w.writerow(parts)
        kept += 1

print(f"Done. Kept {kept:,} rows")
