#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import io
import json
import math
import sys
from pathlib import Path
from urllib.request import Request, urlopen

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = (SCRIPT_DIR / ".." / "docs" / "data").resolve()
DATA_DIR.mkdir(parents=True, exist_ok=True)

URLS = {
    "stations": "https://opendata.mtr.com.hk/data/mtr_lines_and_stations.csv",
    "fares": "https://opendata.mtr.com.hk/data/mtr_lines_fares.csv",
}


def fetch_text(url: str, encoding: str = "utf-8-sig", timeout: int = 30) -> str:
    req = Request(url, headers={"User-Agent": "python-fetch/1.0"})
    with urlopen(req, timeout=timeout) as resp:
        if resp.status != 200:
            raise RuntimeError(f"Fetch failed: {resp.status} {resp.reason} for {url}")
        data = resp.read()
    return data.decode(encoding, errors="replace")


def process_stations() -> None:
    print("Fetching stations CSV…")
    text = fetch_text(URLS["stations"])
    reader = csv.DictReader(io.StringIO(text))

    by_id = {}  # id -> {id, en, zh, lines:set}
    for row in reader:
        raw_id = row.get("Station ID") or ""
        en = (row.get("English Name") or "").strip()
        zh = (row.get("Chinese Name") or "").strip()
        line = (row.get("Line Code") or "").strip().lower()

        if line == "ael":
            continue

        try:
            station_id = int(str(raw_id).strip())
            if station_id <= 0:
                continue
        except (TypeError, ValueError):
            continue

        if station_id not in by_id:
            by_id[station_id] = {"id": station_id, "en": en, "zh": zh, "lines": set()}
        if line:
            by_id[station_id]["lines"].add(line)

    stations = []
    for s in by_id.values():
        stations.append(
            {
                "id": s["id"],
                "en": s["en"],
                "zh": s["zh"],
                "lines": sorted(s["lines"]),
            }
        )
    stations.sort(key=lambda x: x["id"])

    out_path = DATA_DIR / "stations.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(stations, f, ensure_ascii=False, indent=2)

    print(f"✅ Saved {len(stations)} unique stations (excluding AEL) to {out_path}")


def process_fares() -> None:
    print("Fetching fares CSV…")
    text = fetch_text(URLS["fares"])
    reader = csv.DictReader(io.StringIO(text))

    fares: dict[int, dict[int, float | None]] = {}
    for row in reader:
        try:
            src_id = int(str(row.get("SRC_STATION_ID", "")).strip())
            dest_id = int(str(row.get("DEST_STATION_ID", "")).strip())
        except ValueError:
            continue

        if src_id <= 0 or dest_id <= 0 or src_id == dest_id:
            continue

        raw = row.get("OCT_ADT_FARE", "")
        try:
            value = float(str(raw).strip())
            if not math.isfinite(value):
                value = None
        except (TypeError, ValueError):
            value = None

        a, b = sorted((src_id, dest_id))
        if a not in fares:
            fares[a] = {}
        fares[a][b] = value

    out_path = DATA_DIR / "adult.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(fares, f, ensure_ascii=False, indent=2)

    print(f"✅ Saved fare lookup table for {len(fares)} stations to {out_path}")


def main() -> int:
    try:
        process_stations()
        process_fares()
        print("🎯 All data converted successfully")
        return 0
    except Exception as e:
        print("❌ Conversion failed:", e, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())