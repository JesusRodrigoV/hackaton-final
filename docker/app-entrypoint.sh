#!/bin/sh
set -e

python - <<'PY'
import os
import time

import psycopg2

database_url = os.environ["DATABASE_URL"].replace("postgresql+psycopg2://", "postgresql://")
for attempt in range(30):
    try:
        connection = psycopg2.connect(database_url)
        connection.close()
        print("Core database is ready")
        break
    except Exception as exc:
        print(f"Waiting for core database ({attempt + 1}/30): {exc}")
        time.sleep(2)
else:
    raise SystemExit("Core database did not become ready")
PY

alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
