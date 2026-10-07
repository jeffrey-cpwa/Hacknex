"""
demo_rag.py
-----------
Human-readable demonstration of the full Temporal RAG pipeline.

Shows for each question:
  - QUESTION
  - INTENT
  - RETRIEVED EVIDENCE (event_id, person, action, timestamp)
  - ANSWER

Run with:  python demo_rag.py
"""

import temporal_rag as rag


def hr(title=""):
    print("\n" + "-" * 60)
    if title:
        print("  " + title)
        print("-" * 60)


def show(question: str):
    print("\n" + "=" * 60)
    print("  QUESTION:")
    print("  " + question)

    result = rag.retrieve(question, use_semantic=False)
    intent = result["intent"]

    print("\n  INTENT: " + intent)

    # -- evidence table
    evidence = result["evidence"]
    if evidence:
        print("\n  RETRIEVED EVIDENCE:")
        for ev in evidence:
            src  = ev.get("source", "?")
            eid  = ev.get("event_id",     "?")
            plbl = ev.get("person_label", "?")
            act  = ev.get("action",       "?")
            ts   = ev.get("start_time",   "?")
            et   = ev.get("end_time",     ts)
            dur  = ev.get("duration",     0.0)
            conf = ev.get("confidence")
            conf_s = ("conf=" + str(conf)) if conf is not None else "conf=N/A"

            if act in ("STAY", "SHORT_STAY"):
                row = ("  [" + eid + "]  " + plbl.ljust(10) + "  " +
                       act.ljust(12) + "  " + str(ts) + "s -> " +
                       str(et) + "s  (dur " + str(dur) + "s)  " +
                       conf_s + "  [" + src + "]")
            else:
                row = ("  [" + eid + "]  " + plbl.ljust(10) + "  " +
                       act.ljust(12) + "  @ " + str(ts) + "s  " +
                       conf_s + "  [" + src + "]")
            print(row)

    # -- extra info for special intents
    if intent == "PRESENCE_AT_TIME":
        p = result.get("presence", {})
        print("\n  PRESENCE CHECK:")
        print("  person    : " + str(p.get("person_id")))
        print("  timestamp : " + str(p.get("timestamp")) + "s")
        print("  present   : " + str(p.get("present")))

    if intent == "DURATION":
        d = result.get("duration", {})
        print("\n  DURATION:")
        print("  person    : " + str(d.get("person_id")))
        print("  seconds   : " + str(d.get("duration_seconds")))
        print("  method    : " + str(d.get("method")))

    if intent == "COMPARE_EVENTS":
        c = result.get("comparison", {})
        print("\n  COMPARISON: " + str(c.get("relationship")))

    if intent == "OVERLAP":
        pairs = result.get("pairs", [])
        print("\n  OVERLAPPING PAIRS:")
        for pair in pairs[:6]:
            a = pair["event_1"]
            b = pair["event_2"]
            print("  [" + a["event_id"] + "] " + a["person_label"] +
                  " " + a["action"] + " (" + str(a["start_time"]) +
                  "s-" + str(a["end_time"]) + "s)" +
                  "  <->  " +
                  "[" + b["event_id"] + "] " + b["person_label"] +
                  " " + b["action"] + " (" + str(b["start_time"]) +
                  "s-" + str(b["end_time"]) + "s)")

    if intent == "COUNT":
        c = result.get("count", {})
        print("\n  COUNT:")
        print("  action        : " + str(c.get("action")))
        print("  total events  : " + str(c.get("count")))
        print("  unique people : " + str(c.get("unique_people")))

    # -- answer
    answer = rag.format_answer(result)
    print("\n  ANSWER:")
    print("  " + answer)


# ── Run demo ──────────────────────────────────────────────────────────────────

hr()
print("  TEMPORAL RAG DEMO  --  HackNex")
print("  All evidence sourced from: outputs/events_clean.json")
print("  No timestamps invented.")
hr()

show("When did Person 2 leave?")
show("Who entered first?")
show("Who left first?")
show("What happened before Person 2 left?")
show("What happened after Person 1 entered?")
show("Was Person 2 present at 6 seconds?")
show("Was Person 2 present at 10 seconds?")
show("How long did Person 1 stay?")
show("Did Person 2 leave before Person 1?")
show("How many people entered?")
show("Which events overlapped?")

hr()
print("  RAG backend is ready for LLM / chatbot integration.")
hr()
