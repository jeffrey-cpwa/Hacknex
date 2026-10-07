"""
clean_events.py
---------------
Converts raw vision-pipeline events JSON ? clean, standardized JSON
ready for Temporal RAG / downstream reasoning.

Usage:
    python clean_events.py <raw_json_path> <output_json_path>
"""

import json
import sys
import os
import re
import copy
from collections import defaultdict

# -----------------------------------------------------------------------------
# CONSTANTS
# -----------------------------------------------------------------------------

VALID_ACTIONS   = {"ENTER", "LEAVE", "STAY", "SHORT_STAY"}
INSTANT_ACTIONS = {"ENTER", "LEAVE"}          # start_time == end_time
MERGE_WINDOW    = 0.5                          # seconds — deduplicate within this window

# -----------------------------------------------------------------------------
# HELPERS
# -----------------------------------------------------------------------------

def warn(msg):
    print(f"  [WARN] {msg}")


def make_person_id(label: str) -> str:
    """'Person 3' ? 'person_3',  'Unknown' ? 'unknown'"""
    return re.sub(r"\s+", "_", label.strip().lower())


def round2(v):
    """Round to 2 decimal places; return None safely."""
    if v is None:
        return None
    try:
        return round(float(v), 2)
    except (TypeError, ValueError):
        return None


def safe_confidence(raw_conf):
    """Return float confidence or None — never invent a value."""
    if raw_conf is None:
        return None
    try:
        f = float(raw_conf)
        return round2(f) if f > 0.0 else None   # treat 0.0 as missing
    except (TypeError, ValueError):
        return None


# -----------------------------------------------------------------------------
# NORMALISE A SINGLE RAW EVENT
# -----------------------------------------------------------------------------

def normalise_event(raw: dict) -> dict | None:
    """
    Map a raw event dict to the clean schema.
    Returns None (and prints a warning) if critical fields are missing.
    """
    # -- person ----------------------------------------------------------------
    person_label = raw.get("person") or raw.get("person_label")
    if not person_label:
        warn(f"Event {raw.get('event_id','?')} has no person field — skipping.")
        return None
    person_id = make_person_id(person_label)

    # -- action ----------------------------------------------------------------
    raw_action = (raw.get("event") or raw.get("action") or "").upper()
    if raw_action not in VALID_ACTIONS:
        warn(f"Unknown action '{raw_action}' in event {raw.get('event_id','?')} — skipping.")
        return None

    # -- timestamps ------------------------------------------------------------
    ts_block  = raw.get("timestamp", {})
    ets_block = raw.get("end_timestamp", {})

    start_time = round2(ts_block.get("seconds") if isinstance(ts_block, dict) else ts_block)
    end_time   = round2(ets_block.get("seconds") if isinstance(ets_block, dict) else ets_block)

    if start_time is None:
        warn(f"Event {raw.get('event_id','?')} missing start timestamp — skipping.")
        return None

    # instantaneous events: end == start
    if raw_action in INSTANT_ACTIONS or end_time is None:
        end_time = start_time

    # duration — always compute numerically
    duration = round2(end_time - start_time)

    # -- confidence ------------------------------------------------------------
    confidence = safe_confidence(raw.get("confidence"))

    return {
        "person_id"    : person_id,
        "person_label" : person_label,
        "action"       : raw_action,
        "start_time"   : start_time,
        "end_time"     : end_time,
        "duration"     : duration,
        "confidence"   : confidence,
        "_raw_id"      : raw.get("event_id", ""),   # keep for dedup; stripped later
    }


# -----------------------------------------------------------------------------
# DUPLICATE MERGING
# -----------------------------------------------------------------------------

def merge_duplicates(events: list[dict]) -> list[dict]:
    """
    If the same person has the same action within MERGE_WINDOW seconds,
    keep only the highest-confidence occurrence (or the first if tied).
    """
    merged   = []
    used     = [False] * len(events)

    for i, ev in enumerate(events):
        if used[i]:
            continue
        group = [ev]
        for j in range(i + 1, len(events)):
            if used[j]:
                continue
            other = events[j]
            same_person = ev["person_id"] == other["person_id"]
            same_action = ev["action"]    == other["action"]
            close_time  = abs(ev["start_time"] - other["start_time"]) <= MERGE_WINDOW
            if same_person and same_action and close_time:
                group.append(other)
                used[j] = True
        # pick best from group
        best = max(
            group,
            key=lambda e: (e["confidence"] or 0, -e["start_time"])
        )
        merged.append(best)
        used[i] = True

    return merged


# -----------------------------------------------------------------------------
# MAIN CLEANER
# -----------------------------------------------------------------------------

def clean(raw_path: str, out_path: str):
    # -- load raw --------------------------------------------------------------
    print(f"\nLoading raw events from: {raw_path}")
    with open(raw_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    raw_events = raw_data.get("events", [])
    print(f"  Raw events found: {len(raw_events)}")

    # -- normalise -------------------------------------------------------------
    print("\nNormalising events...")
    normalised = []
    for re_ in raw_events:
        ev = normalise_event(re_)
        if ev:
            normalised.append(ev)

    print(f"  Normalised: {len(normalised)}")

    # -- sort chronologically --------------------------------------------------
    normalised.sort(key=lambda e: (e["start_time"], e["person_id"]))

    # -- merge duplicates ------------------------------------------------------
    print(f"\nMerging duplicates (window={MERGE_WINDOW}s)...")
    cleaned = merge_duplicates(normalised)
    cleaned.sort(key=lambda e: (e["start_time"], e["person_id"]))
    print(f"  After merge: {len(cleaned)}")

    # -- assign final event IDs ------------------------------------------------
    for idx, ev in enumerate(cleaned, start=1):
        ev["event_id"] = f"E{idx:04d}"
        ev.pop("_raw_id", None)

    # reorder fields to match schema
    ordered = []
    for ev in cleaned:
        ordered.append({
            "event_id"    : ev["event_id"],
            "person_id"   : ev["person_id"],
            "person_label": ev["person_label"],
            "action"      : ev["action"],
            "start_time"  : ev["start_time"],
            "end_time"    : ev["end_time"],
            "duration"    : ev["duration"],
            "confidence"  : ev["confidence"],
        })

    # -- build people list -----------------------------------------------------
    seen_people = {}
    for ev in ordered:
        pid = ev["person_id"]
        if pid not in seen_people:
            seen_people[pid] = ev["person_label"]

    people = [
        {"person_id": pid, "label": label}
        for pid, label in sorted(seen_people.items())
    ]

    # -- video metadata --------------------------------------------------------
    video_meta = {
        "video_id"        : os.path.splitext(raw_data.get("video", "unknown"))[0],
        "filename"        : raw_data.get("video", "unknown"),
        "duration_seconds": round2(raw_data.get("duration_seconds")),
        "fps"             : round2(raw_data.get("fps")),
        "total_frames"    : raw_data.get("frame_count"),
    }

    # -- summary counts --------------------------------------------------------
    action_counts = defaultdict(int)
    for ev in ordered:
        action_counts[ev["action"]] += 1

    summary = {
        "total_people"   : len(people),
        "total_events"   : len(ordered),
        "enter_count"    : action_counts["ENTER"],
        "leave_count"    : action_counts["LEAVE"],
        "stay_count"     : action_counts["STAY"],
        "short_stay_count": action_counts["SHORT_STAY"],
    }

    # -- event sequence --------------------------------------------------------
    event_sequence = [ev["event_id"] for ev in ordered]

    # -- assemble final document -----------------------------------------------
    clean_doc = {
        "video"          : video_meta,
        "people"         : people,
        "summary"        : summary,
        "event_sequence" : event_sequence,
        "events"         : ordered,
    }

    # -- validate required fields ----------------------------------------------
    print("\nValidating output...")
    required = ["event_id","person_id","person_label","action",
                "start_time","end_time","duration","confidence"]
    issues = 0
    for ev in ordered:
        for field in required:
            if field not in ev:
                warn(f"Event {ev.get('event_id','?')} missing required field '{field}'")
                issues += 1
    if issues == 0:
        print("  All events validated OK.")
    else:
        print(f"  {issues} validation issue(s) found (see warnings above).")

    # -- save ------------------------------------------------------------------
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(clean_doc, f, indent=2, ensure_ascii=False)

    # -- print report ----------------------------------------------------------
    print("\n" + "=" * 50)
    print("  CLEANING COMPLETE")
    print("=" * 50)
    print(f"  Video      : {video_meta['filename']}")
    print(f"  People     : {summary['total_people']}")
    print(f"  Raw events : {len(raw_events)}")
    print(f"  Clean evts : {summary['total_events']}")
    print(f"  ENTER      : {summary['enter_count']}")
    print(f"  LEAVE      : {summary['leave_count']}")
    print(f"  STAY       : {summary['stay_count']}")
    print(f"  SHORT_STAY : {summary['short_stay_count']}")
    print(f"\n  Output     : {out_path}")
    print("=" * 50 + "\n")

    return clean_doc


# -----------------------------------------------------------------------------
# ENTRY POINT
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python clean_events.py <raw_json_path> <output_json_path>")
        sys.exit(1)

    raw_path = sys.argv[1]
    out_path = sys.argv[2]

    if not os.path.isfile(raw_path):
        print(f"ERROR: File not found: {raw_path}")
        sys.exit(1)

    clean(raw_path, out_path)
