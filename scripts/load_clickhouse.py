from pathlib import Path
import os, time
import pyarrow.parquet as pq
import clickhouse_connect
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

client = clickhouse_connect.get_client(
    host=os.getenv("CLICKHOUSE_HOST"),
    username=os.getenv("CLICKHOUSE_USER"),
    password=os.getenv("CLICKHOUSE_PASSWORD"),
    secure=True,
)

cols = ["time", "src_user", "dst_user", "src_comp", "dst_comp", "auth_type",
        "logon_type", "auth_orientation", "result", "is_attack", "timestamp"]

pf = pq.ParquetFile(ROOT / "data" / "auth_logs.parquet")
total, start = 0, time.time()
for batch in pf.iter_batches(batch_size=1_000_000, columns=cols):
    df = batch.to_pandas()
    for c in cols[1:9]:
        df[c] = df[c].astype(str)
    client.insert_df("auth_logs", df)
    total += len(df)
    print(f"  {total:,} rows loaded ({time.time() - start:.0f}s)", flush=True)

print("Rows in table:", client.query("SELECT count() FROM auth_logs").result_rows[0][0])
print("Attack rows:", client.query("SELECT sum(is_attack) FROM auth_logs").result_rows[0][0])
