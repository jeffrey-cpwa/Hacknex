"""
query_parser.py
---------------
Converts natural-language questions into structured intent dicts.
No LLM required -- pure regex + keyword matching.

Supported intents:
  PERSON_EVENT_TIME   "When did Person 2 leave?"
  EVENTS_BEFORE       "What happened before Person 2 left?"
  EVENTS_AFTER        "What happened after Person 1 entered?"
  PRESENCE_AT_TIME    "Was Person 2 present at 10 seconds?"
  DURATION            "How long did Person 1 stay?"
  FIRST_PERSON_ENTER  "Who entered first?"
  FIRST_PERSON_LEAVE  "Who left first?"
  COMPARE_EVENTS      "Did Person 2 leave before Person 1?"
  COUNT               "How many people entered?"
  OVERLAP             "Which events overlapped?"
  SEQUENCE            "What is the sequence of events?"
  UNKNOWN             fallback
"""

import re

# ── Action alias maps ─────────────────────────────────────────────────────────
ENTER_WORDS = {"enter", "entered", "arrive", "arrived", "appear", "appeared",
               "came in", "show up", "showed up"}
LEAVE_WORDS = {"leave", "left", "exit", "exited", "depart", "departed",
               "gone"}
STAY_WORDS  = {"stay", "stayed", "remain", "remained", "how long",
               "duration", "time in scene"}


def _normalise(q: str) -> str:
    return q.lower().strip()


def _find_person(q: str):
    """Extract the FIRST person mentioned: 'Person 3' -> 'person_3'."""
    m = re.search(r"person\s*(\d+)", q, re.IGNORECASE)
    return "person_" + m.group(1) if m else None


def _find_all_persons(q: str) -> list:
    """Extract ALL persons mentioned in order."""
    return ["person_" + n for n in re.findall(r"person\s*(\d+)", q, re.IGNORECASE)]


def _find_action(q: str):
    """Detect ENTER or LEAVE keyword."""
    ql = _normalise(q)
    for w in ENTER_WORDS:
        if w in ql:
            return "ENTER"
    for w in LEAVE_WORDS:
        if w in ql:
            return "LEAVE"
    for w in STAY_WORDS:
        if w in ql:
            return "STAY"
    return None


def _find_timestamp(q: str):
    """Extract numeric timestamp: 'at 10 seconds' -> 10.0"""
    m = re.search(r"at\s+([\d.]+)\s*(?:second|sec|s)?", q, re.IGNORECASE)
    if m:
        return float(m.group(1))
    m = re.search(r"([\d.]+)\s*(?:second|sec|s)", q, re.IGNORECASE)
    if m:
        return float(m.group(1))
    return None


# ── Main parser ───────────────────────────────────────────────────────────────

def parse(question: str) -> dict:
    """
    Parse a natural-language question and return a structured intent dict.

    Always returns at minimum:
        { "intent": <str>, "raw_question": <str> }
    """
    q   = question.strip()
    ql  = _normalise(q)
    out = {"intent": "UNKNOWN", "raw_question": q}

    persons = _find_all_persons(q)
    p1      = persons[0] if persons else None
    p2      = persons[1] if len(persons) > 1 else None
    action  = _find_action(q)
    ts      = _find_timestamp(q)

    # ── OVERLAP ───────────────────────────────────────────────────────────────
    if "overlap" in ql:
        return {**out, "intent": "OVERLAP"}

    # ── SEQUENCE ──────────────────────────────────────────────────────────────
    if "sequence" in ql or "order of events" in ql or "chronological" in ql:
        return {**out, "intent": "SEQUENCE"}

    # ── COUNT ─────────────────────────────────────────────────────────────────
    if re.search(r"how many (people|persons|individuals)", ql):
        return {**out, "intent": "COUNT", "action": action}

    # ── FIRST_PERSON_ENTER ────────────────────────────────────────────────────
    if re.search(r"who.{0,20}enter.{0,10}first|who.{0,10}first.{0,20}enter"
                 r"|who.{0,10}came in first|who.{0,10}arrived first", ql):
        return {**out, "intent": "FIRST_PERSON_ENTER"}

    # ── FIRST_PERSON_LEAVE ────────────────────────────────────────────────────
    if re.search(r"who.{0,20}left first|who.{0,10}first.{0,20}left"
                 r"|who.{0,20}leave first|who.{0,10}first.{0,20}leave"
                 r"|who.{0,20}exit.{0,10}first", ql):
        return {**out, "intent": "FIRST_PERSON_LEAVE"}

    # ── PRESENCE_AT_TIME ──────────────────────────────────────────────────────
    if re.search(r"\bpresent\b|\bthere\b|\bon.?screen\b", ql) and ts is not None and p1:
        return {**out, "intent": "PRESENCE_AT_TIME",
                "person_id": p1, "timestamp": ts}

    if re.search(r"was person \d+ (at|around|near)", ql) and ts is not None and p1:
        return {**out, "intent": "PRESENCE_AT_TIME",
                "person_id": p1, "timestamp": ts}

    # ── COMPARE_EVENTS ────────────────────────────────────────────────────────
    if (re.search(r"\bbefore\b|\bafter\b|\bfirst\b", ql)
            and len(persons) >= 2
            and action in ("LEAVE", "ENTER")):
        return {**out, "intent": "COMPARE_EVENTS",
                "person_id_1": p1, "person_id_2": p2, "action": action}

    # ── EVENTS_BEFORE ─────────────────────────────────────────────────────────
    if re.search(r"what happened before|events before"
                 r"|before .{0,30}(left|entered|arrived|exited)", ql):
        return {**out, "intent": "EVENTS_BEFORE",
                "person_id": p1, "action": action or "LEAVE"}

    # ── EVENTS_AFTER ──────────────────────────────────────────────────────────
    if re.search(r"what happened after|events after"
                 r"|after .{0,30}(entered|arrived|left|exited)", ql):
        return {**out, "intent": "EVENTS_AFTER",
                "person_id": p1, "action": action or "ENTER"}

    # ── DURATION ──────────────────────────────────────────────────────────────
    if re.search(r"how long|duration|total time|stay|stayed|time in", ql) and p1:
        return {**out, "intent": "DURATION", "person_id": p1}

    # ── PERSON_EVENT_TIME ─────────────────────────────────────────────────────
    if re.search(r"when did|what time|at what time|time did", ql) and p1 and action:
        return {**out, "intent": "PERSON_EVENT_TIME",
                "person_id": p1, "action": action}

    # ── Fallback: any person + action ─────────────────────────────────────────
    if p1 and action:
        return {**out, "intent": "PERSON_EVENT_TIME",
                "person_id": p1, "action": action}

    return out


# ── Quick self-test when run directly ─────────────────────────────────────────
if __name__ == "__main__":
    import json
    tests = [
        "When did Person 2 leave?",
        "Who entered first?",
        "Who left first?",
        "What happened before Person 2 left?",
        "What happened after Person 1 entered?",
        "Was Person 2 present at 10 seconds?",
        "How long did Person 1 stay?",
        "Did Person 2 leave before Person 1?",
        "How many people entered?",
        "Which events overlapped?",
        "What is the sequence of events?",
    ]
    for q in tests:
        result = parse(q)
        print(f"Q: {q}")
        print(f"   -> {json.dumps(result)}\n")
