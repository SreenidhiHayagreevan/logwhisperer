from pathlib import Path
import pandas as pd

DATA = Path(__file__).resolve().parent.parent / "data"

START_DAY, END_DAY = 9, 9          # <-- same as slice_auth.py
start, end = (START_DAY - 1) * 86400, END_DAY * 86400

auth = pd.read_csv(DATA / "auth_slice.csv")
rt = pd.read_csv(DATA / "redteam.txt.gz", names=["time", "src_user", "src_comp", "dst_comp"])
rt = rt[(rt["time"] >= start) & (rt["time"] < end)].drop_duplicates()
rt["is_attack"] = 1

# Label: same time, user, and computers as a red-team event
auth = auth.merge(rt, on=["time", "src_user", "src_comp", "dst_comp"], how="left")
auth["is_attack"] = auth["is_attack"].fillna(0).astype("int8")

# Real timestamps: make the last day end on Oct 8, 2026
BASE = pd.Timestamp("2026-10-09") - pd.Timedelta(days=END_DAY)
auth["timestamp"] = BASE + pd.to_timedelta(auth["time"], unit="s")

print("Rows:", len(auth))
print("Attack rows:", auth["is_attack"].sum(), "| Red-team events in range:", len(rt))
print(auth[auth["is_attack"] == 1].head(10))

auth.to_parquet(DATA / "auth_logs.parquet", index=False)
print("Saved auth_logs.parquet")
