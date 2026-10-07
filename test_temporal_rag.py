"""
test_temporal_rag.py
--------------------
Automated end-to-end tests for the Temporal RAG pipeline.

Tests verify:
  - Correct intent parsing
  - Correct evidence retrieval
  - All timestamps come from events_clean.json (never invented)
  - Correct answers for all 11 required questions

Run with:  python test_temporal_rag.py
"""

import sys
import json
import temporal_rag as rag
import temporal_engine as te

PASS = 0
FAIL = 0
ERRORS = []

# Load the valid timestamps from clean JSON (ground truth)
VALID_TIMESTAMPS = {e["start_time"] for e in te._EVENTS}
VALID_TIMESTAMPS |= {e["end_time"]   for e in te._EVENTS}
VALID_EVENT_IDS  = {e["event_id"]    for e in te._EVENTS}


def check(label, condition, detail=""):
    global PASS, FAIL
    if condition:
        print("  [PASS] " + label)
        PASS += 1
    else:
        msg = "  [FAIL] " + label
        if detail:
            msg += "   (" + str(detail) + ")"
        print(msg)
        FAIL += 1
        ERRORS.append(label)


def section(title):
    print("\n" + "=" * 60)
    print("  " + title)
    print("=" * 60)


def assert_timestamps_valid(evidence, label="timestamps valid"):
    """All start_time / end_time in evidence must come from clean JSON."""
    for ev in evidence:
        for key in ("start_time", "end_time"):
            ts = ev.get(key)
            if ts is not None:
                check(label + " [" + ev.get("event_id","?") + "] " + key,
                      ts in VALID_TIMESTAMPS,
                      f"Invented timestamp {ts} not in clean JSON")


# =============================================================================
# Q1: When did Person 2 leave?
# =============================================================================
section("Q1: When did Person 2 leave?")
r = rag.retrieve("When did Person 2 leave?", use_semantic=False)
check("Intent is PERSON_EVENT_TIME",  r["intent"] == "PERSON_EVENT_TIME")
check("person_id is person_2",        r["parsed"].get("person_id") == "person_2")
check("action is LEAVE",              r["parsed"].get("action")    == "LEAVE")
check("Evidence not empty",           len(r["evidence"]) > 0)
if r["evidence"]:
    e0 = r["evidence"][0]
    check("start_time is 7.31",       e0["start_time"] == 7.31)
    check("source is temporal_engine",e0["source"] == "temporal_engine")
assert_timestamps_valid(r["evidence"])
ans = rag.format_answer(r)
check("Answer mentions 7.31",         "7.31" in ans)


# =============================================================================
# Q2: Who entered first?
# =============================================================================
section("Q2: Who entered first?")
r = rag.retrieve("Who entered first?", use_semantic=False)
check("Intent is FIRST_PERSON_ENTER", r["intent"] == "FIRST_PERSON_ENTER")
check("Evidence not empty",           len(r["evidence"]) > 0)
f = r.get("first", {})
check("First person is Person 1",     f.get("person_label") == "Person 1")
check("Timestamp is 3.42",            f.get("timestamp")    == 3.42)
assert_timestamps_valid(r["evidence"])
ans = rag.format_answer(r)
check("Answer mentions Person 1",     "Person 1" in ans)
check("Answer mentions 3.42",         "3.42" in ans)


# =============================================================================
# Q3: Who left first?
# =============================================================================
section("Q3: Who left first?")
r = rag.retrieve("Who left first?", use_semantic=False)
check("Intent is FIRST_PERSON_LEAVE", r["intent"] == "FIRST_PERSON_LEAVE")
f = r.get("first", {})
check("First leaver is Person 3",     f.get("person_label") == "Person 3")
check("Timestamp is 5.5",             f.get("timestamp")    == 5.5)
assert_timestamps_valid(r["evidence"])
ans = rag.format_answer(r)
check("Answer mentions Person 3",     "Person 3" in ans)
check("Answer mentions 5.5",          "5.5" in ans)


# =============================================================================
# Q4: What happened before Person 2 left?
# =============================================================================
section("Q4: What happened before Person 2 left?")
r = rag.retrieve("What happened before Person 2 left?", use_semantic=False)
check("Intent is EVENTS_BEFORE",      r["intent"] == "EVENTS_BEFORE")
check("Target event is P2 LEAVE",
      r.get("target_event", {}).get("person_id") == "person_2")
check("Target timestamp is 7.31",
      r.get("target_event", {}).get("timestamp") == 7.31)
check("Evidence not empty",           len(r["evidence"]) > 0)
ev_ids = [e["event_id"] for e in r["evidence"]]
check("P1 ENTER (E0001) in evidence", "E0001" in ev_ids)
check("P2 ENTER (E0003) in evidence", "E0003" in ev_ids)
check("P3 LEAVE (E0006) in evidence", "E0006" in ev_ids)
check("All evidence ends before 7.31",
      all(e.get("end_time", 0) < 7.31 for e in r["evidence"]))
assert_timestamps_valid(r["evidence"])


# =============================================================================
# Q5: What happened after Person 1 entered?
# =============================================================================
section("Q5: What happened after Person 1 entered?")
r = rag.retrieve("What happened after Person 1 entered?", use_semantic=False)
check("Intent is EVENTS_AFTER",       r["intent"] == "EVENTS_AFTER")
check("Evidence not empty",           len(r["evidence"]) > 0)
check("All evidence starts after 3.42",
      all(e.get("start_time", 0) > 3.42 for e in r["evidence"]))
assert_timestamps_valid(r["evidence"])


# =============================================================================
# Q6: Was Person 2 present at 6 seconds?
# =============================================================================
section("Q6: Was Person 2 present at 6 seconds?")
r = rag.retrieve("Was Person 2 present at 6 seconds?", use_semantic=False)
check("Intent is PRESENCE_AT_TIME",   r["intent"] == "PRESENCE_AT_TIME")
check("Parsed timestamp is 6.0",      r["parsed"].get("timestamp") == 6.0)
p = r.get("presence", {})
check("present == True",              p.get("present") is True)
ans = rag.format_answer(r)
check("Answer says Yes",              ans.lower().startswith("yes"))


# =============================================================================
# Q7: Was Person 2 present at 10 seconds?
# =============================================================================
section("Q7: Was Person 2 present at 10 seconds?")
r = rag.retrieve("Was Person 2 present at 10 seconds?", use_semantic=False)
check("Intent is PRESENCE_AT_TIME",   r["intent"] == "PRESENCE_AT_TIME")
p = r.get("presence", {})
check("present == False",             p.get("present") is False)
ans = rag.format_answer(r)
check("Answer says No",               ans.lower().startswith("no"))


# =============================================================================
# Q8: How long did Person 1 stay?
# =============================================================================
section("Q8: How long did Person 1 stay?")
r = rag.retrieve("How long did Person 1 stay?", use_semantic=False)
check("Intent is DURATION",           r["intent"] == "DURATION")
d = r.get("duration", {})
check("duration_seconds is 7.38",     d.get("duration_seconds") == 7.38)
assert_timestamps_valid(r["evidence"])
ans = rag.format_answer(r)
check("Answer mentions 7.38",         "7.38" in ans)


# =============================================================================
# Q9: Did Person 2 leave before Person 1?
# =============================================================================
section("Q9: Did Person 2 leave before Person 1?")
r = rag.retrieve("Did Person 2 leave before Person 1?", use_semantic=False)
check("Intent is COMPARE_EVENTS",     r["intent"] == "COMPARE_EVENTS")
c = r.get("comparison", {})
check("Relationship is BEFORE",       c.get("relationship") == "BEFORE")
assert_timestamps_valid(r["evidence"])
ans = rag.format_answer(r)
check("Answer says Yes or BEFORE",    "Yes" in ans or "before" in ans.lower())


# =============================================================================
# Q10: How many people entered?
# =============================================================================
section("Q10: How many people entered?")
r = rag.retrieve("How many people entered?", use_semantic=False)
check("Intent is COUNT",              r["intent"] == "COUNT")
c = r.get("count", {})
check("count is 3",                   c.get("count")         == 3)
check("unique_people is 3",           c.get("unique_people") == 3)
ans = rag.format_answer(r)
check("Answer mentions 3",            "3" in ans)


# =============================================================================
# Q11: Which events overlapped?
# =============================================================================
section("Q11: Which events overlapped?")
r = rag.retrieve("Which events overlapped?", use_semantic=False)
check("Intent is OVERLAP",            r["intent"] == "OVERLAP")
pairs = r.get("pairs", [])
check("Overlapping pairs found",      len(pairs) > 0)
check("Evidence not empty",           len(r["evidence"]) > 0)
check("All event_ids valid",
      all(e["event_id"] in VALID_EVENT_IDS for e in r["evidence"]))
assert_timestamps_valid(r["evidence"])
ans = rag.format_answer(r)
check("Answer mentions pairs",        "pair" in ans.lower() or "overlap" in ans.lower())


# =============================================================================
# INTEGRITY: No invented timestamps anywhere
# =============================================================================
section("INTEGRITY: No invented timestamps in any answer")
all_questions = [
    "When did Person 2 leave?",
    "Who entered first?",
    "Who left first?",
    "What happened before Person 2 left?",
    "What happened after Person 1 entered?",
    "Was Person 2 present at 6 seconds?",
    "Was Person 2 present at 10 seconds?",
    "How long did Person 1 stay?",
    "Did Person 2 leave before Person 1?",
    "How many people entered?",
    "Which events overlapped?",
]
all_pass = True
for q in all_questions:
    result = rag.retrieve(q, use_semantic=False)
    for ev in result["evidence"]:
        for key in ("start_time", "end_time"):
            ts = ev.get(key)
            if ts is not None and ts not in VALID_TIMESTAMPS:
                print("  [FAIL] Invented timestamp " + str(ts) + " in: " + q)
                all_pass = False
if all_pass:
    check("All timestamps traceable to events_clean.json", True)


# =============================================================================
# REPORT
# =============================================================================
print("\n" + "=" * 60)
print("  RESULTS:  " + str(PASS) + " passed  |  " + str(FAIL) + " failed")
print("=" * 60)
if ERRORS:
    print("\n  Failed tests:")
    for e in ERRORS:
        print("    - " + e)
else:
    print("\n  All tests passed!")

sys.exit(0 if FAIL == 0 else 1)
