"""
test_temporal_engine.py
-----------------------
Automated tests for temporal_engine.py
Run with:  python test_temporal_engine.py
"""

import sys
import temporal_engine as te

PASS = 0
FAIL = 0
ERRORS = []


def check(label, condition, detail=""):
    global PASS, FAIL
    if condition:
        print("  [PASS] " + label)
        PASS += 1
    else:
        msg = "  [FAIL] " + label
        if detail:
            msg += "\n         Detail: " + detail
        print(msg)
        FAIL += 1
        ERRORS.append(label)


def section(title):
    print("\n" + "=" * 60)
    print("  " + title)
    print("=" * 60)


# =============================================================================
# Q1: Who entered first?
# =============================================================================
section("Q1: Who entered first?")
r = te.get_first_person_to_enter()
check("Result is not None",          r is not None)
check("person_id is person_1",       r["person_id"]    == "person_1")
check("person_label is Person 1",    r["person_label"] == "Person 1")
check("timestamp is 3.42",           r["timestamp"]    == 3.42)


# =============================================================================
# Q2: Who entered second?
# =============================================================================
section("Q2: Who entered second?")
enters = te._sort(te._filter(te._EVENTS, action="ENTER"))
check("At least 2 ENTER events exist",  len(enters) >= 2)
if len(enters) >= 2:
    s = enters[1]
    check("Second entrant is person_2",     s["person_id"]    == "person_2")
    check("person_label is Person 2",       s["person_label"] == "Person 2")
    check("timestamp is 4.17",              s["start_time"]   == 4.17)


# =============================================================================
# Q3: Who left first?
# =============================================================================
section("Q3: Who left first?")
r = te.get_first_person_to_leave()
check("Result is not None",          r is not None)
check("person_label is Person 3",    r["person_label"] == "Person 3")
check("timestamp is 5.5",            r["timestamp"]    == 5.5)


# =============================================================================
# Q4: When did Person 2 leave?
# =============================================================================
section("Q4: When did Person 2 leave?")
ev = te.get_last_event(person_id="person_2", action="LEAVE")
check("LEAVE event found",           ev is not None)
if ev:
    check("start_time is 7.31",      ev["start_time"] == 7.31)
    check("action is LEAVE",         ev["action"]     == "LEAVE")


# =============================================================================
# Q5: What happened before Person 2 left?
# =============================================================================
section("Q5: What happened before Person 2 left?")
result  = te.get_events_before_person_event("person_2", "LEAVE")
check("No error key",                    "error" not in result)
check("Anchor is Person 2 LEAVE",        result["anchor"]["person_id"] == "person_2")
check("Anchor action is LEAVE",          result["anchor"]["action"]    == "LEAVE")
evs_before = result["events"]
ids_before  = [e["event_id"] for e in evs_before]
check("Person 1 ENTER is before P2 LEAVE",   "E0001" in ids_before)
check("Person 2 ENTER is before P2 LEAVE",   "E0003" in ids_before)
check("Person 3 LEAVE is before P2 LEAVE",   "E0006" in ids_before)
check("All returned events end before 7.31",
      all(e["end_time"] < 7.31 for e in evs_before))


# =============================================================================
# Q6: What happened after Person 1 entered?
# =============================================================================
section("Q6: What happened after Person 1 entered?")
result     = te.get_events_after_person_event("person_1", "ENTER")
check("No error key",                    "error" not in result)
anchor_ts  = result["anchor"]["start_time"]   # 3.42
after_evs  = result["events"]
check("All events start after 3.42",
      all(e["start_time"] > anchor_ts for e in after_evs))
check("Person 2 ENTER is in the list",
      any(e["person_id"] == "person_2" and e["action"] == "ENTER"
          for e in after_evs))


# =============================================================================
# Q7: Was Person 1 present at 7 seconds?
# =============================================================================
section("Q7: Was Person 1 present at 7 seconds?")
r = te.is_person_present("person_1", 7.0)
check("present == True",              r["present"] is True)
check("person_id matches",            r["person_id"] == "person_1")


# =============================================================================
# Q8: Was Person 2 present at 10 seconds?
# =============================================================================
section("Q8: Was Person 2 present at 10 seconds?")
r = te.is_person_present("person_2", 10.0)
check("present == False",             r["present"] is False)


# =============================================================================
# Q9: How long did Person 1 stay?
# =============================================================================
section("Q9: How long did Person 1 stay?")
r = te.get_stay_duration("person_1")
check("duration_seconds is 7.38",     r["duration_seconds"] == 7.38)


# =============================================================================
# Q10: Did Person 2 leave before Person 1?
# =============================================================================
section("Q10: Did Person 2 leave before Person 1?")
p2_leave = te.get_first_event(person_id="person_2", action="LEAVE")
p1_leave = te.get_first_event(person_id="person_1", action="LEAVE")
check("Both LEAVE events found",
      p2_leave is not None and p1_leave is not None)
if p2_leave and p1_leave:
    check("Person 2 left before Person 1",
          p2_leave["start_time"] < p1_leave["start_time"])
    rel = te.compare_events(p2_leave["event_id"], p1_leave["event_id"])
    check("compare_events returns BEFORE",
          rel["relationship"] == "BEFORE")


# =============================================================================
# Q11: How many people entered?
# =============================================================================
section("Q11: How many people entered?")
r = te.count_events(action="ENTER")
check("3 ENTER events",              r["count"]         == 3)
check("3 unique people entered",     r["unique_people"] == 3)


# =============================================================================
# Q12: How many people left?
# =============================================================================
section("Q12: How many people left?")
r = te.count_events(action="LEAVE")
check("3 LEAVE events",              r["count"]         == 3)
check("3 unique people left",        r["unique_people"] == 3)


# =============================================================================
# Q13: Which events overlapped?
# =============================================================================
section("Q13: Which events overlapped?")
overlaps = te.find_overlapping_events()
check("Overlapping events found",    len(overlaps) > 0)
stay_ids = {e["event_id"] for e in te._EVENTS
            if e["person_id"] == "person_1" and e["action"] == "STAY"}
found = any(
    o["event_1"]["event_id"] in stay_ids or o["event_2"]["event_id"] in stay_ids
    for o in overlaps
)
check("Person 1 STAY is involved in at least one overlap", found)


# =============================================================================
# BONUS: get_event_sequence
# =============================================================================
section("BONUS: get_event_sequence")
seq = te.get_event_sequence()
check("Sequence length matches events count",  len(seq) == len(te._EVENTS))
check("First seq index is 1",                  seq[0]["seq"] == 1)
check("Sequence is chronological",
      all(seq[i]["start_time"] <= seq[i+1]["start_time"]
          for i in range(len(seq)-1)))


# =============================================================================
# BONUS: get_events_between
# =============================================================================
section("BONUS: get_events_between(4.0, 6.0)")
between = te.get_events_between(4.0, 6.0)
check("Events found in window",        len(between) > 0)
check("All events overlap [4.0, 6.0]",
      all(e["start_time"] <= 6.0 and e["end_time"] >= 4.0 for e in between))


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
