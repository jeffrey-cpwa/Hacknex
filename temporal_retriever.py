"""
temporal_retriever.py
---------------------
Maps parsed query intents to temporal_engine function calls
and returns structured evidence packages.

The source of truth is ALWAYS events_clean.json via temporal_engine.
No timestamps are invented here.
"""

import temporal_engine as te
from query_parser import parse

SOURCE = "temporal_engine"


# ── Evidence wrapper ──────────────────────────────────────────────────────────

def _wrap_event(ev: dict) -> dict:
    """Attach source tag to a single event dict."""
    return {
        "event_id"    : ev.get("event_id"),
        "person_id"   : ev.get("person_id"),
        "person_label": ev.get("person_label"),
        "action"      : ev.get("action"),
        "start_time"  : ev.get("start_time"),
        "end_time"    : ev.get("end_time"),
        "duration"    : ev.get("duration"),
        "confidence"  : ev.get("confidence"),
        "source"      : SOURCE,
    }


def _wrap_events(evs: list) -> list:
    return [_wrap_event(e) for e in evs]


# ── Intent handlers ───────────────────────────────────────────────────────────

def _handle_person_event_time(intent: dict) -> dict:
    person_id = intent.get("person_id")
    action    = intent.get("action")
    ev = te.get_first_event(person_id=person_id, action=action)
    if not ev:
        ev = te.get_last_event(person_id=person_id, action=action)
    evidence = [_wrap_event(ev)] if ev else []
    return {"evidence": evidence, "result_type": "single_event"}


def _handle_events_before(intent: dict) -> dict:
    person_id = intent.get("person_id")
    action    = intent.get("action", "LEAVE")
    result    = te.get_events_before_person_event(person_id, action)
    if "error" in result:
        return {"evidence": [], "error": result["error"]}
    return {
        "anchor"      : _wrap_event(result["anchor"]),
        "evidence"    : _wrap_events(result["events"]),
        "result_type" : "events_before",
    }


def _handle_events_after(intent: dict) -> dict:
    person_id = intent.get("person_id")
    action    = intent.get("action", "ENTER")
    result    = te.get_events_after_person_event(person_id, action)
    if "error" in result:
        return {"evidence": [], "error": result["error"]}
    return {
        "anchor"      : _wrap_event(result["anchor"]),
        "evidence"    : _wrap_events(result["events"]),
        "result_type" : "events_after",
    }


def _handle_presence_at_time(intent: dict) -> dict:
    person_id = intent.get("person_id")
    timestamp = intent.get("timestamp", 0.0)
    result    = te.is_person_present(person_id, timestamp)
    return {
        "evidence"    : [],
        "presence"    : result,
        "result_type" : "presence",
    }


def _handle_duration(intent: dict) -> dict:
    person_id = intent.get("person_id")
    result    = te.get_stay_duration(person_id)
    stay_evs  = result.get("events", [])
    if not stay_evs:
        # include enter/leave in evidence
        ev_in  = result.get("enter")
        ev_out = result.get("leave")
        evs    = [e for e in [ev_in, ev_out] if e]
    else:
        evs = stay_evs
    return {
        "evidence"    : _wrap_events(evs),
        "duration"    : result,
        "result_type" : "duration",
    }


def _handle_first_enter(_intent: dict) -> dict:
    result = te.get_first_person_to_enter()
    evidence = [_wrap_event(result["event"])] if result else []
    return {"evidence": evidence, "first": result, "result_type": "first_enter"}


def _handle_first_leave(_intent: dict) -> dict:
    result = te.get_first_person_to_leave()
    evidence = [_wrap_event(result["event"])] if result else []
    return {"evidence": evidence, "first": result, "result_type": "first_leave"}


def _handle_compare_events(intent: dict) -> dict:
    p1     = intent.get("person_id_1")
    p2     = intent.get("person_id_2")
    action = intent.get("action", "LEAVE")
    ev1    = te.get_first_event(person_id=p1, action=action)
    ev2    = te.get_first_event(person_id=p2, action=action)
    if not ev1 or not ev2:
        return {"evidence": [], "error": "One or both events not found"}
    comparison = te.compare_events(ev1["event_id"], ev2["event_id"])
    return {
        "evidence"    : _wrap_events([ev1, ev2]),
        "comparison"  : comparison,
        "result_type" : "compare",
    }


def _handle_count(intent: dict) -> dict:
    action = intent.get("action")
    result = te.count_events(action=action)
    # collect the matching events as evidence
    evs = te._filter(te._EVENTS, action=action)
    return {
        "evidence"    : _wrap_events(te._sort(evs)),
        "count"       : result,
        "result_type" : "count",
    }


def _handle_overlap(_intent: dict) -> dict:
    pairs = te.find_overlapping_events()
    flat  = {}
    for pair in pairs:
        for key in ("event_1", "event_2"):
            e = pair[key]
            flat[e["event_id"]] = e
    return {
        "evidence"    : _wrap_events(list(flat.values())),
        "pairs"       : pairs,
        "result_type" : "overlap",
    }


def _handle_sequence(_intent: dict) -> dict:
    seq = te.get_event_sequence()
    return {
        "evidence"    : _wrap_events(seq),
        "result_type" : "sequence",
    }


# ── Dispatch table ────────────────────────────────────────────────────────────

_DISPATCH = {
    "PERSON_EVENT_TIME" : _handle_person_event_time,
    "EVENTS_BEFORE"     : _handle_events_before,
    "EVENTS_AFTER"      : _handle_events_after,
    "PRESENCE_AT_TIME"  : _handle_presence_at_time,
    "DURATION"          : _handle_duration,
    "FIRST_PERSON_ENTER": _handle_first_enter,
    "FIRST_PERSON_LEAVE": _handle_first_leave,
    "COMPARE_EVENTS"    : _handle_compare_events,
    "COUNT"             : _handle_count,
    "OVERLAP"           : _handle_overlap,
    "SEQUENCE"          : _handle_sequence,
}


# ── Public API ────────────────────────────────────────────────────────────────

def retrieve(question: str) -> dict:
    """
    Parse the question, call the appropriate temporal engine function,
    and return a structured evidence package.

    Returned dict always contains:
      - query         : original question
      - intent        : parsed intent string
      - parsed        : full parsed intent dict
      - evidence      : list of event dicts (source = temporal_engine)
      - [extra keys depending on intent]
    """
    parsed  = parse(question)
    intent  = parsed["intent"]
    handler = _DISPATCH.get(intent)

    if handler is None:
        return {
            "query"   : question,
            "intent"  : intent,
            "parsed"  : parsed,
            "evidence": [],
            "error"   : f"No handler for intent: {intent}",
        }

    result = handler(parsed)
    return {
        "query"  : question,
        "intent" : intent,
        "parsed" : parsed,
        **result,
    }


# ── Self-test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import json
    questions = [
        "When did Person 2 leave?",
        "Who entered first?",
        "What happened before Person 2 left?",
        "Was Person 2 present at 6 seconds?",
    ]
    for q in questions:
        r = retrieve(q)
        print(f"Q: {q}")
        print(f"   intent   : {r['intent']}")
        print(f"   evidence : {len(r['evidence'])} event(s)")
        for e in r["evidence"][:3]:
            print(f"     [{e['event_id']}] {e['person_label']} {e['action']} @ {e['start_time']}s")
        print()
