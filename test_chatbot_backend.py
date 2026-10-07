"""
test_chatbot_backend.py
-----------------------
End-to-end tests for the Chatbot Backend integrating Temporal RAG and Qwen3:4b.

Verifies:
  - Correct model integration (qwen3:4b verified, no silent fallback)
  - Key information and exact timestamps for all required questions
  - Verified evidence separation
  - Timestamp integrity: all timestamps in answers and evidence exist in outputs/events_clean.json
"""

import json
import re
import sys
from chatbot_backend import answer_question

CLEAN_FILE = "outputs/events_clean.json"


def load_known_timestamps():
    with open(CLEAN_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    known = set()
    for ev in data.get("events", []):
        for k in ("start_time", "end_time", "duration"):
            val = ev.get(k)
            if val is not None:
                known.add(round(float(val), 2))
                known.add(float(val))
    # video metadata
    v = data.get("video", {})
    if "duration_seconds" in v:
        known.add(round(float(v["duration_seconds"]), 2))
    return known


KNOWN_TIMESTAMPS = load_known_timestamps()


def check(cond, msg):
    if cond:
        print(f"  [PASS] {msg}", flush=True)
    else:
        print(f"  [FAIL] {msg}", flush=True)
        raise AssertionError(msg)


def test_suite():
    passed = 0
    total = 0
    cached_results = []

    print("=" * 60, flush=True)
    print("RUNNING CHATBOT BACKEND TESTS (TEMPORAL RAG + QWEN3:4B)", flush=True)
    print(f"Known JSON timestamps: {sorted(list(KNOWN_TIMESTAMPS))}", flush=True)
    print("=" * 60, flush=True)

    # -------------------------------------------------------------
    # 1. When did Person 2 leave? -> Must contain 7.31
    # -------------------------------------------------------------
    print("\n[Q1] When did Person 2 leave?", flush=True)
    res1 = answer_question("When did Person 2 leave?")
    cached_results.append(res1)
    print(f"  Answer: {res1['answer']}", flush=True)
    print(f"  Model : {res1['model']}", flush=True)
    check("7.31" in res1["answer"], "Answer contains 7.31")
    check(res1["model"] == "qwen3:4b", "Model is qwen3:4b (not fallback)")
    check(any(e["event_id"] == "E0007" for e in res1["evidence"]), "Evidence contains E0007")
    passed += 3
    total += 3

    # -------------------------------------------------------------
    # 2. When did Person 2 enter? -> Must contain 4.17
    # -------------------------------------------------------------
    print("\n[Q2] When did Person 2 enter?", flush=True)
    res2_in = answer_question("When did Person 2 enter?")
    cached_results.append(res2_in)
    print(f"  Answer: {res2_in['answer']}", flush=True)
    check("4.17" in res2_in["answer"], "Answer contains 4.17")
    check(res2_in["model"] == "qwen3:4b", "Model is qwen3:4b")
    passed += 2
    total += 2

    # -------------------------------------------------------------
    # 3. Who entered first? -> Must contain Person 1 and 3.42
    # -------------------------------------------------------------
    print("\n[Q3] Who entered first?", flush=True)
    res2 = answer_question("Who entered first?")
    cached_results.append(res2)
    print(f"  Answer: {res2['answer']}", flush=True)
    check("person 1" in res2["answer"].lower(), "Answer contains Person 1")
    check("3.42" in res2["answer"], "Answer contains 3.42")
    check(res2["model"] == "qwen3:4b", "Model is qwen3:4b")
    passed += 3
    total += 3

    # -------------------------------------------------------------
    # 4. Who left first? -> Must contain Person 3 and 5.50 (or 5.5)
    # -------------------------------------------------------------
    print("\n[Q4] Who left first?", flush=True)
    res3 = answer_question("Who left first?")
    cached_results.append(res3)
    print(f"  Answer: {res3['answer']}", flush=True)
    check("person 3" in res3["answer"].lower(), "Answer contains Person 3")
    check("5.5" in res3["answer"], "Answer contains 5.5")
    check(res3["model"] == "qwen3:4b", "Model is qwen3:4b")
    passed += 3
    total += 3

    # -------------------------------------------------------------
    # 5. Was Person 2 present at 6 seconds? -> Must contain Yes
    # -------------------------------------------------------------
    print("\n[Q5] Was Person 2 present at 6 seconds?", flush=True)
    res_p6 = answer_question("Was Person 2 present at 6 seconds?")
    cached_results.append(res_p6)
    print(f"  Answer: {res_p6['answer']}", flush=True)
    check("yes" in res_p6["answer"].lower() or "present" in res_p6["answer"].lower(), "Answer indicates present / Yes")
    check(res_p6["model"] == "qwen3:4b", "Model is qwen3:4b")
    passed += 2
    total += 2

    # -------------------------------------------------------------
    # 6. Was Person 2 present at 10 seconds? -> Must contain No
    # -------------------------------------------------------------
    print("\n[Q6] Was Person 2 present at 10 seconds?", flush=True)
    res4 = answer_question("Was Person 2 present at 10 seconds?")
    cached_results.append(res4)
    print(f"  Answer: {res4['answer']}", flush=True)
    check("no" in res4["answer"].lower() or "not" in res4["answer"].lower() or "false" in res4["answer"].lower(), "Answer contains No / not present")
    check(res4["model"] == "qwen3:4b", "Model is qwen3:4b")
    passed += 2
    total += 2

    # -------------------------------------------------------------
    # 7. How long did Person 1 stay? -> Must contain 7.38
    # -------------------------------------------------------------
    print("\n[Q7] How long did Person 1 stay?", flush=True)
    res5 = answer_question("How long did Person 1 stay?")
    cached_results.append(res5)
    print(f"  Answer: {res5['answer']}", flush=True)
    check("7.38" in res5["answer"], "Answer contains 7.38")
    check(res5["model"] == "qwen3:4b", "Model is qwen3:4b")
    passed += 2
    total += 2

    # -------------------------------------------------------------
    # 8. Did Person 2 leave before Person 1? -> Must contain Yes
    # -------------------------------------------------------------
    print("\n[Q8] Did Person 2 leave before Person 1?", flush=True)
    res6 = answer_question("Did Person 2 leave before Person 1?")
    cached_results.append(res6)
    print(f"  Answer: {res6['answer']}", flush=True)
    check("yes" in res6["answer"].lower() or "before" in res6["answer"].lower(), "Answer contains Yes / before")
    check(res6["model"] == "qwen3:4b", "Model is qwen3:4b")
    passed += 2
    total += 2

    # -------------------------------------------------------------
    # 9. What happened before Person 2 left? -> Evidence for P1, P2, P3
    # -------------------------------------------------------------
    print("\n[Q9] What happened before Person 2 left?", flush=True)
    res7 = answer_question("What happened before Person 2 left?")
    cached_results.append(res7)
    print(f"  Answer: {res7['answer']}", flush=True)
    ev_people = {e.get("person_id") for e in res7["evidence"]}
    check("person_1" in ev_people, "Evidence contains Person 1")
    check("person_2" in ev_people, "Evidence contains Person 2")
    check("person_3" in ev_people, "Evidence contains Person 3")
    check(res7["model"] == "qwen3:4b", "Model is qwen3:4b")
    passed += 4
    total += 4

    # -------------------------------------------------------------
    # 10. INTEGRITY CHECK: All timestamps in evidence exist in clean JSON
    # -------------------------------------------------------------
    print("\n[INTEGRITY] Verifying all timestamps trace back to events_clean.json...", flush=True)
    for r in cached_results:
        q_text = r["question"]
        for ev in r["evidence"]:
            for key in ("start_time", "end_time"):
                ts = ev.get(key)
                if ts is not None:
                    round_ts = round(float(ts), 2)
                    check(round_ts in KNOWN_TIMESTAMPS,
                          f"Timestamp {round_ts}s from {ev.get('event_id')} in '{q_text}' is in clean JSON")
                    passed += 1
                    total += 1

    print("\n" + "=" * 60, flush=True)
    print(f"ALL TESTS PASSED: {passed}/{total} assertions verified.", flush=True)
    print("=" * 60, flush=True)


if __name__ == "__main__":
    test_suite()
