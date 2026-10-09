from pathlib import Path
import pandas as pd

DATA = Path(__file__).resolve().parent.parent / "data"

rt = pd.read_csv(DATA / "redteam.txt.gz", names=["time", "user", "src_comp", "dst_comp"])
rt["day"] = rt["time"] // 86400 + 1   # time is seconds from the start

print("Total red-team events:", len(rt))
print("\nEvents per day:")
print(rt["day"].value_counts().sort_index())
print("\nTop source computers:")
print(rt["src_comp"].value_counts().head())
print("\nTop users:")
print(rt["user"].value_counts().head())
