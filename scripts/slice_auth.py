from pathlib import Path
import gzip, csv

DATA = Path(__file__).resolve().parent.parent / "data"

START_DAY, END_DAY = 8, 9          # <-- set from explore_redteam.py output
start, end = (START_DAY - 1) * 86400, END_DAY * 86400

cols = ["time", "src_user", "dst_user", "src_comp", "dst_comp",
        "auth_type", "logon_type", "auth_orientation", "result"]

kept = 0
with gzip.open(DATA / "auth.txt.gz", "rt") as f, open(DATA / "auth_slice.csv", "w", newline="") as out:
    w = csv.writer(out)
    w.writerow(cols)
    for i, line in enumerate(f):
        parts = line.rstrip("\n").split(",")
        t = int(parts[0])
        if t < start:
            if i % 20_000_000 == 0:
                print(f"skipping... line {i:,}")
            continue
        if t >= end:
            break                  # file is sorted by time, so stop early
        w.writerow(parts)
        kept += 1

print(f"Done. Kept {kept:,} rows")
