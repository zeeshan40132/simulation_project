"""
Upload ONNX models to Supabase Storage bucket 'models'.
Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
"""

import os
import sys
import requests
from pathlib import Path

MODELS_DIR = Path(__file__).parent / "models"
ONNX_FILES = [
    "wait_time_model.onnx",
    "outcome_model.onnx",
    "satisfaction_model.onnx",
]
BUCKET = "models"


def get_supabase_config():
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url:
        raise EnvironmentError("SUPABASE_URL not set")
    if not key:
        raise EnvironmentError(
            "SUPABASE_SERVICE_ROLE_KEY not set — anon key cannot write to storage"
        )
    return url.rstrip("/"), key


def ensure_bucket(base_url, key):
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    r = requests.get(f"{base_url}/storage/v1/bucket/{BUCKET}", headers=headers)
    if r.status_code == 200:
        print(f"Bucket '{BUCKET}' already exists")
        return
    # Try to create — if it fails (e.g. bucket already exists but GET was denied),
    # warn and continue; upload will fail explicitly if there's a real auth problem.
    payload = {"id": BUCKET, "name": BUCKET, "public": True}
    r = requests.post(
        f"{base_url}/storage/v1/bucket", json=payload, headers=headers
    )
    if r.status_code in (200, 201):
        print(f"Bucket '{BUCKET}' created (public=True)")
    else:
        print(f"Warning: could not create bucket ({r.status_code}) — assuming it already exists")


def upload_file(base_url, key, filename):
    path = MODELS_DIR / filename
    if not path.exists():
        print(f"  SKIP  {filename}  (file not found)")
        return False

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/octet-stream",
        "x-upsert": "true",
    }
    with open(path, "rb") as f:
        data = f.read()

    upload_url = f"{base_url}/storage/v1/object/{BUCKET}/{filename}"
    r = requests.post(upload_url, headers=headers, data=data)

    size_kb = len(data) / 1024
    if r.status_code in (200, 201):
        public_url = f"{base_url}/storage/v1/object/public/{BUCKET}/{filename}"
        print(f"  OK    {filename:<32}  {size_kb:.1f} KB")
        print(f"        {public_url}")
        return True
    else:
        print(f"  FAIL  {filename}  {r.status_code}: {r.text}")
        return False


def main():
    base_url, key = get_supabase_config()
    print(f"Supabase: {base_url}")
    ensure_bucket(base_url, key)
    print()

    results = []
    for fname in ONNX_FILES:
        ok = upload_file(base_url, key, fname)
        results.append((fname, ok))

    print(f"\nUploaded {sum(ok for _, ok in results)}/{len(results)} models")
    failed = [f for f, ok in results if not ok]
    if failed:
        print(f"Failed: {failed}")
        sys.exit(1)


if __name__ == "__main__":
    main()
