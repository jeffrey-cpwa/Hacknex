"""
temporal_engine.py
------------------
Pure-Python temporal reasoning engine.
Loads events_clean.json and exposes a structured query API.
No LLM involved - all logic is deterministic JSON arithmetic.

Architecture:
    events_clean.json
          |
    temporal_engine.py   (this file)
          |
    structured evidence
          |
    future RAG layer
          |
    future LLM / chatbot
"""

import json
from typing import Optional

CLEAN_FILE = "outputs/events_clean.json"
SAME_TIME_THRESHOLD = 0.01   # seconds - events closer than this are SAME_TIME


# =============================================================================
# LOADER
# =============================================================================

def _load(path: str = CLEAN_FILE) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


_DATA   = _load()
_EVENTS = _DATA["events"]          # already chronologically sorted
_PEOPLE = _DATA["people"]
_VIDEO  = _DATA["video"]

# O(1) lookup by event_id
_BY_ID: dict = {e["event_id"]: e for e in _EVENTS}


# =============================================================================
# INTERNAL HELPERS
# =============================================================================

def _filter(events, person_id=None, action=None):
    result = events
    if person_id:
        result = [e for e in result if e["person_id"] == person_id]
    if action:
        result = [e for e in result if e["action"]    == action]
    return result


def _sort(events):
    return sorted(events, key=lambda e: (e["start_time"], e["event_id"]))


# =============================================================================
# 1. get_person_events
# =============================================================================

def get_person_events(person_id: str):
    """All events for a person, sorted chronologically."""
    return _sort(_filter(_EVENTS, person_id=person_id))


# =============================================================================
# 2. get_first_event
# =============================================================================

def get_first_event(person_id=None, action=None):
    """Earliest event matching optional person and/or action filters."""
    pool = _sort(_filter(_EVENTS, person_id=person_id, action=action))
    return pool[0] if pool else None


# =============================================================================
# 3. get_last_event
# =============================================================================

def get_last_event(person_id=None, action=None):
    """Latest event matching optional person and/or action filters."""
    pool = _sort(_filter(_EVENTS, person_id=person_id, action=action))
    return pool[-1] if pool else None


# =============================================================================
# 4. get_events_before
# =============================================================================

def get_events_before(timestamp: float, person_id=None):
    """Events whose end_time is strictly before the given timestamp."""
    pool = _filter(_EVENTS, person_id=person_id)
    return _sort([e for e in pool if e["end_time"] < timestamp])


# =============================================================================
# 5. get_events_after
# =============================================================================

def get_events_after(timestamp: float, person_id=None):
    """Events whose start_time is strictly after the given timestamp."""
    pool = _filter(_EVENTS, person_id=person_id)
    return _sort([e for e in pool if e["start_time"] > timestamp])


# =============================================================================
# 6. get_events_between
# =============================================================================

def get_events_between(start: float, end: float):
    """Events that overlap with the interval [start, end]."""
    return _sort([
        e for e in _EVENTS
        if e["start_time"] <= end and e["end_time"] >= start
    ])


# =============================================================================
# 7. is_person_present
# =============================================================================

def is_person_present(person_id: str, timestamp: float) -> dict:
    """
    Determine whether the person was on-screen at the given timestamp.

    Resolution order:
    1. Explicit STAY / SHORT_STAY window contains timestamp.
    2. ENTER -> LEAVE interval contains timestamp.
    3. ENTER with no subsequent LEAVE (still present).
    """
    evs = _sort(get_person_events(person_id))

    # 1. Explicit stay windows
    for e in evs:
        if e["action"] in ("STAY", "SHORT_STAY"):
            if e["start_time"] <= timestamp <= e["end_time"]:
                return {"present": True, "person_id": person_id,
                        "timestamp": timestamp, "via": e["event_id"]}

    # 2 & 3. ENTER / LEAVE pairing
    enters = [e for e in evs if e["action"] == "ENTER"]
    leaves = [e for e in evs if e["action"] == "LEAVE"]

    for enter in enters:
        if enter["start_time"] > timestamp:
            continue
        later_leaves = [l for l in leaves
                        if l["start_time"] >= enter["start_time"]]
        if later_leaves:
            leave = min(later_leaves, key=lambda x: x["start_time"])
            if enter["start_time"] <= timestamp <= leave["start_time"]:
                return {"present": True, "person_id": person_id,
                        "timestamp": timestamp,
                        "via": enter["event_id"] + "->" + leave["event_id"]}
        else:
            return {"present": True, "person_id": person_id,
                    "timestamp": timestamp, "via": enter["event_id"]}

    return {"present": False, "person_id": person_id, "timestamp": timestamp}


# =============================================================================
# 8. get_stay_duration
# =============================================================================

def get_stay_duration(person_id: str) -> dict:
    """
    Total time the person was in the scene.
    Prefers explicit STAY / SHORT_STAY durations.
    Falls back to ENTER -> LEAVE arithmetic.
    """
    evs = get_person_events(person_id)

    stay_evs = [e for e in evs if e["action"] in ("STAY", "SHORT_STAY")]
    if stay_evs:
        total = round(sum(e["duration"] for e in stay_evs), 2)
        return {"person_id": person_id, "duration_seconds": total,
                "method": "STAY_events", "events": stay_evs}

    enter = get_first_event(person_id=person_id, action="ENTER")
    leave = get_last_event( person_id=person_id, action="LEAVE")
    if enter and leave:
        total = round(leave["start_time"] - enter["start_time"], 2)
        return {"person_id": person_id, "duration_seconds": total,
                "method": "ENTER_LEAVE", "enter": enter, "leave": leave}

    return {"person_id": person_id, "duration_seconds": None, "method": "unknown"}


# =============================================================================
# 9. get_first_person_to_enter
# =============================================================================

def get_first_person_to_enter():
    """The person who entered first and their timestamp."""
    ev = get_first_event(action="ENTER")
    if not ev:
        return None
    return {"person_id":    ev["person_id"],
            "person_label": ev["person_label"],
            "timestamp":    ev["start_time"],
            "event":        ev}


# =============================================================================
# 10. get_first_person_to_leave
# =============================================================================

def get_first_person_to_leave():
    """The person who left first and their timestamp."""
    ev = get_first_event(action="LEAVE")
    if not ev:
        return None
    return {"person_id":    ev["person_id"],
            "person_label": ev["person_label"],
            "timestamp":    ev["start_time"],
            "event":        ev}


# =============================================================================
# 11. compare_events
# =============================================================================

def compare_events(event_id_1: str, event_id_2: str) -> dict:
    """
    Temporal relationship between two events.

    Rules:
        SAME_TIME : abs(A.start - B.start) < SAME_TIME_THRESHOLD
        BEFORE    : A.end_time < B.start_time
        AFTER     : A.start_time > B.end_time
        OVERLAP   : A.start <= B.end AND B.start <= A.end
    """
    a = _BY_ID.get(event_id_1)
    b = _BY_ID.get(event_id_2)
    if not a or not b:
        missing = [x for x in (event_id_1, event_id_2) if x not in _BY_ID]
        return {"error": "Event(s) not found: " + str(missing)}

    if abs(a["start_time"] - b["start_time"]) < SAME_TIME_THRESHOLD:
        rel = "SAME_TIME"
    elif a["end_time"] < b["start_time"]:
        rel = "BEFORE"
    elif a["start_time"] > b["end_time"]:
        rel = "AFTER"
    else:
        rel = "OVERLAP"

    return {"event_1": a, "event_2": b, "relationship": rel}


# =============================================================================
# 12. get_events_before_person_event
# =============================================================================

def get_events_before_person_event(person_id: str, action: str) -> dict:
    """
    Find person_id first occurrence of action, then return every event
    whose end_time is before that anchor start_time.
    """
    anchor = get_first_event(person_id=person_id, action=action)
    if not anchor:
        return {"error": "No " + action + " event found for " + person_id,
                "events": []}
    before = get_events_before(anchor["start_time"])
    return {"anchor": anchor, "events": before}


# =============================================================================
# 13. get_events_after_person_event
# =============================================================================

def get_events_after_person_event(person_id: str, action: str) -> dict:
    """
    Find person_id first occurrence of action, then return every event
    whose start_time is after that anchor end_time.
    """
    anchor = get_first_event(person_id=person_id, action=action)
    if not anchor:
        return {"error": "No " + action + " event found for " + person_id,
                "events": []}
    after = get_events_after(anchor["end_time"])
    return {"anchor": anchor, "events": after}


# =============================================================================
# 14. count_events
# =============================================================================

def count_events(action=None, person_id=None) -> dict:
    """Count events matching optional action and/or person_id filters."""
    pool          = _filter(_EVENTS, person_id=person_id, action=action)
    unique_people = len({e["person_id"] for e in pool})
    return {"count":         len(pool),
            "unique_people": unique_people,
            "action":        action,
            "person_id":     person_id}


# =============================================================================
# 15. get_event_sequence
# =============================================================================

def get_event_sequence():
    """Full chronological event list, each entry tagged with its seq index."""
    return [{"seq": i + 1, **e} for i, e in enumerate(_sort(_EVENTS))]


# =============================================================================
# 16. find_overlapping_events
# =============================================================================

def find_overlapping_events():
    """
    Return all distinct pairs of events that overlap in time.
    SAME_TIME pairs are excluded.
    """
    evs   = _sort(_EVENTS)
    pairs = []
    for i in range(len(evs)):
        for j in range(i + 1, len(evs)):
            a, b = evs[i], evs[j]
            overlaps = (a["start_time"] <= b["end_time"] and
                        b["start_time"] <= a["end_time"])
            same_t   = abs(a["start_time"] - b["start_time"]) < SAME_TIME_THRESHOLD
            if overlaps and not same_t:
                pairs.append({"event_1": a, "event_2": b,
                              "relationship": "OVERLAP"})
    return pairs


# =============================================================================
# METADATA PASS-THROUGHS
# =============================================================================

def get_video_info():  return _VIDEO
def get_all_people():  return _PEOPLE
def get_all_events():  return _sort(_EVENTS)


def reload(path: str = CLEAN_FILE):
    """Hot-reload data from disk without restarting the interpreter."""
    global _DATA, _EVENTS, _PEOPLE, _VIDEO, _BY_ID
    _DATA   = _load(path)
    _EVENTS = _DATA["events"]
    _PEOPLE = _DATA["people"]
    _VIDEO  = _DATA["video"]
    _BY_ID  = {e["event_id"]: e for e in _EVENTS}
