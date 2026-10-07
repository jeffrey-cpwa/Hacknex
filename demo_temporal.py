"""
demo_temporal.py
----------------
Human-readable demonstration of the Temporal Reasoning Engine.
Run with:  python demo_temporal.py
"""

import temporal_engine as te


def hr(title=""):
    print("\n" + "-" * 60)
    if title:
        print("  " + title)
        print("-" * 60)


def qa(question, answer):
    print("\n  QUESTION: " + question)
    print("  ANSWER  : " + answer)


def bullet_events(events):
    for e in events:
        action = e["action"]
        label  = e["person_label"]
        ts     = e["start_time"]
        et     = e["end_time"]
        if action in ("STAY", "SHORT_STAY"):
            print("    - " + label + " " + action +
                  " from " + str(ts) + "s to " + str(et) +
                  "s  (duration: " + str(e["duration"]) + "s)")
        else:
            print("    - " + label + " " + action + " at " + str(ts) + "s")


# ============================================================
# HEADER
# ============================================================
hr()
print("  TEMPORAL REASONING ENGINE  --  HackNex Demo")
video = te.get_video_info()
print("  Source  : " + te.CLEAN_FILE)
print("  Video   : " + video["filename"] +
      "  |  " + str(video["duration_seconds"]) + "s" +
      "  |  " + str(video["fps"]) + " fps")
hr()

# ============================================================
# Q1: Who entered first?
# ============================================================
first = te.get_first_person_to_enter()
qa("Who entered first?",
   first["person_label"] + " at " + str(first["timestamp"]) + " seconds")

# ============================================================
# Q2: Who entered second?
# ============================================================
enters = te._sort(te._filter(te._EVENTS, action="ENTER"))
if len(enters) >= 2:
    s = enters[1]
    qa("Who entered second?",
       s["person_label"] + " at " + str(s["start_time"]) + " seconds")

# ============================================================
# Q3: When did Person 2 leave?
# ============================================================
p2_leave = te.get_last_event(person_id="person_2", action="LEAVE")
if p2_leave:
    qa("When did Person 2 leave?",
       "Person 2 left at " + str(p2_leave["start_time"]) + " seconds")
else:
    qa("When did Person 2 leave?", "No LEAVE event found")

# ============================================================
# Q4: Who left first?
# ============================================================
first_leaver = te.get_first_person_to_leave()
if first_leaver:
    qa("Who left first?",
       first_leaver["person_label"] + " at " +
       str(first_leaver["timestamp"]) + " seconds")

# ============================================================
# Q5: Was Person 2 present at 6 seconds?
# ============================================================
pres = te.is_person_present("person_2", 6.0)
qa("Was Person 2 present at 6 seconds?",
   "Yes" if pres["present"] else "No")

# ============================================================
# Q6: Was Person 2 present at 10 seconds?
# ============================================================
pres10 = te.is_person_present("person_2", 10.0)
qa("Was Person 2 present at 10 seconds?",
   "Yes" if pres10["present"] else "No")

# ============================================================
# Q7: How long did Person 1 stay?
# ============================================================
dur = te.get_stay_duration("person_1")
qa("How long did Person 1 stay?",
   str(dur["duration_seconds"]) + " seconds  (method: " + dur["method"] + ")")

# ============================================================
# Q8: Did Person 2 leave before Person 1?
# ============================================================
p2_lv = te.get_first_event(person_id="person_2", action="LEAVE")
p1_lv = te.get_first_event(person_id="person_1", action="LEAVE")
if p2_lv and p1_lv:
    rel    = te.compare_events(p2_lv["event_id"], p1_lv["event_id"])
    yes_no = "Yes" if p2_lv["start_time"] < p1_lv["start_time"] else "No"
    qa("Did Person 2 leave before Person 1?",
       yes_no + "  (P2 @ " + str(p2_lv["start_time"]) +
       "s, P1 @ " + str(p1_lv["start_time"]) + "s)" +
       "  [relationship: " + rel["relationship"] + "]")

# ============================================================
# Q9: How many people entered?
# ============================================================
cnt = te.count_events(action="ENTER")
qa("How many people entered?",
   str(cnt["unique_people"]) + " unique person(s)" +
   "  (" + str(cnt["count"]) + " ENTER event(s))")

# ============================================================
# Q10: How many people left?
# ============================================================
cnt_l = te.count_events(action="LEAVE")
qa("How many people left?",
   str(cnt_l["unique_people"]) + " unique person(s)" +
   "  (" + str(cnt_l["count"]) + " LEAVE event(s))")

# ============================================================
# Q11: What happened before Person 2 left?
# ============================================================
before = te.get_events_before_person_event("person_2", "LEAVE")
print("\n  QUESTION: What happened before Person 2 left?")
print("  ANSWER  : Events before " +
      str(before["anchor"]["start_time"]) + "s:")
bullet_events(before["events"])

# ============================================================
# Q12: What happened after Person 1 entered?
# ============================================================
after = te.get_events_after_person_event("person_1", "ENTER")
print("\n  QUESTION: What happened after Person 1 entered?")
print("  ANSWER  : Events after " +
      str(after["anchor"]["start_time"]) + "s:")
bullet_events(after["events"])

# ============================================================
# Q13: Which events overlapped?
# ============================================================
overlaps = te.find_overlapping_events()
print("\n  QUESTION: Which events overlapped?")
print("  ANSWER  : " + str(len(overlaps)) + " overlapping pair(s):")
for pair in overlaps[:8]:
    a = pair["event_1"]
    b = pair["event_2"]
    print("    - [" + a["event_id"] + "] " + a["person_label"] +
          " " + a["action"] +
          " (" + str(a["start_time"]) + "s-" + str(a["end_time"]) + "s)" +
          "  <OVERLAP>  " +
          "[" + b["event_id"] + "] " + b["person_label"] +
          " " + b["action"] +
          " (" + str(b["start_time"]) + "s-" + str(b["end_time"]) + "s)")

# ============================================================
# Full chronological event sequence
# ============================================================
hr("Full Chronological Event Sequence")
seq = te.get_event_sequence()
for ev in seq:
    action = ev["action"]
    label  = ev["person_label"]
    ts     = ev["start_time"]
    et     = ev["end_time"]
    conf   = ("conf=" + str(ev["confidence"])
              if ev["confidence"] is not None else "conf=N/A")
    if action in ("STAY", "SHORT_STAY"):
        print("  #" + str(ev["seq"]).zfill(2) +
              "  [" + ev["event_id"] + "]  " +
              label.ljust(10) + "  " + action.ljust(11) +
              "  " + str(ts) + "s -> " + str(et) + "s" +
              "  (dur " + str(ev["duration"]) + "s)  " + conf)
    else:
        print("  #" + str(ev["seq"]).zfill(2) +
              "  [" + ev["event_id"] + "]  " +
              label.ljust(10) + "  " + action.ljust(11) +
              "  @ " + str(ts) + "s  " + conf)

hr()
print("  Engine is ready for Temporal RAG integration.")
hr()
