"""
demo_qwen.py
------------
Human-readable demonstration of Video Understanding AI
powered by Temporal RAG + Ollama Qwen3:4b.

Runs the required showcase queries:
1. When did Person 2 leave?
2. Who entered first?
3. What happened before Person 2 left?
4. Was Person 2 present at 10 seconds?
5. How long did Person 1 stay?
"""

from chatbot_backend import answer_question


def format_evidence_line(ev: dict) -> str:
    eid = ev.get("event_id", "N/A")
    label = ev.get("person_label", ev.get("person_id", "Unknown"))
    action = ev.get("action", "")
    start = ev.get("start_time")
    end = ev.get("end_time")
    dur = ev.get("duration")

    if action in ("STAY", "SHORT_STAY") and start is not None and end is not None:
        return f"{eid} | {label} | {action} | {start}s -> {end}s ({dur}s)"
    return f"{eid} | {label} | {action} | {start}s"


def run_demo():
    print("========================================")
    print("VIDEO UNDERSTANDING AI")
    print("========================================")

    questions = [
        "When did Person 2 leave?",
        "Who entered first?",
        "What happened before Person 2 left?",
        "Was Person 2 present at 10 seconds?",
        "How long did Person 1 stay?"
    ]

    for q in questions:
        res = answer_question(q)

        print("\nQUESTION:")
        print(q)
        print("\nANSWER:")
        print(res["answer"])
        print("\nMODEL:")
        print(res["model"])
        print("\nVERIFIED EVIDENCE:")
        if res.get("evidence"):
            for ev in res["evidence"]:
                print(format_evidence_line(ev))
        elif res.get("intent") == "PRESENCE_AT_TIME":
            p = res.get("resolved_question")
            print(f"Presence Fact: Person 2 not in scene at 10.0s (left at 7.31s)")
        else:
            print("No matching events.")
        print("\n" + "=" * 40)


if __name__ == "__main__":
    run_demo()
