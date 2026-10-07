"""
event_documents.py
------------------
Converts structured events into natural-language text documents
suitable for semantic / vector retrieval.

Each document preserves all structured fields alongside the text
so downstream systems can always trace answers to source events.
"""

import json
import os

CLEAN_FILE = "outputs/events_clean.json"


# ── Text generation ────────────────────────────────────────────────────────────

def _event_to_text(ev: dict) -> str:
    """Convert a single event dict to a human-readable sentence."""
    label  = ev.get("person_label", ev.get("person_id", "Someone"))
    action = ev.get("action", "")
    start  = ev.get("start_time", 0.0)
    end    = ev.get("end_time", start)
    dur    = ev.get("duration", 0.0)
    conf   = ev.get("confidence")
    conf_s = f" (confidence: {conf:.2f})" if conf is not None else ""

    if action == "ENTER":
        return (f"{label} entered the scene at {start} seconds{conf_s}.")

    if action == "LEAVE":
        return (f"{label} left the scene at {start} seconds{conf_s}.")

    if action == "STAY":
        return (
            f"{label} stayed in the scene from {start} seconds "
            f"to {end} seconds for a duration of {dur} seconds{conf_s}."
        )

    if action == "SHORT_STAY":
        return (
            f"{label} appeared briefly in the scene from {start} seconds "
            f"to {end} seconds (short stay, duration {dur} seconds){conf_s}."
        )

    return f"{label} performed action {action} at {start} seconds{conf_s}."


def build_documents(events: list) -> list:
    """
    Convert a list of event dicts to document dicts.

    Each document contains:
      event_id, person_id, person_label, action,
      start_time, end_time, duration, confidence,
      text   <- natural language representation
    """
    docs = []
    for ev in events:
        doc = {
            "event_id"    : ev.get("event_id"),
            "person_id"   : ev.get("person_id"),
            "person_label": ev.get("person_label"),
            "action"      : ev.get("action"),
            "start_time"  : ev.get("start_time"),
            "end_time"    : ev.get("end_time"),
            "duration"    : ev.get("duration"),
            "confidence"  : ev.get("confidence"),
            "text"        : _event_to_text(ev),
        }
        docs.append(doc)
    return docs


def load_documents(path: str = CLEAN_FILE) -> list:
    """Load events_clean.json and return document dicts."""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return build_documents(data.get("events", []))


# ── Self-test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    docs = load_documents()
    print(f"Generated {len(docs)} documents:\n")
    for d in docs:
        print(f"  [{d['event_id']}] {d['text']}")
