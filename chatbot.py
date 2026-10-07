"""
chatbot.py
----------
Interactive terminal AI Chatbot for Video Understanding.
Integrates Temporal RAG + Ollama Qwen3:4b.

Run with:
  python chatbot.py
"""

import sys
import json
import ollama_client
import temporal_engine as te
from chatbot_backend import answer_question

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

CLEAN_FILE = "outputs/events_clean.json"


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


def main():
    print("=" * 40, flush=True)
    print(" VIDEO UNDERSTANDING AI", flush=True)
    print(" Temporal RAG + Qwen3:4b", flush=True)
    print("=" * 40, flush=True)

    # 1. Ollama health check
    ollama_ok, err = ollama_client.verify_ollama_setup(verbose=True)
    if not ollama_ok:
        print(f"\n[WARNING] Ollama check failed: {err}", flush=True)
        print("[WARNING] Deterministic fallback active.\n", flush=True)

    # 2. Load events dataset
    try:
        with open(CLEAN_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        events_count = len(data.get("events", []))
        people_count = len(data.get("people", []))
        print(f"[OK] Temporal RAG loaded", flush=True)
        print(f"[OK] {events_count} events loaded", flush=True)
        print(f"[OK] {people_count} people detected", flush=True)
    except Exception as e:
        print(f"[ERROR] Could not load events data: {e}", flush=True)
        return

    print("\nType your question.", flush=True)
    print("Type 'exit' to quit.\n", flush=True)

    session = {
        "last_person_id": None,
        "last_person_label": None,
        "last_action": None,
    }

    while True:
        try:
            user_input = input("You: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye.", flush=True)
            break

        if not user_input:
            continue

        if user_input.lower() in ("exit", "quit", "q"):
            print("Goodbye.", flush=True)
            break

        result = answer_question(user_input, session=session)

        print(f"\nAI:\n{result['answer']}\n", flush=True)

        # Display verified evidence underneath (using standard ASCII border)
        print("----------------------------------------", flush=True)
        print("VERIFIED EVIDENCE", flush=True)
        print("----------------------------------------", flush=True)
        evidence = result.get("evidence", [])
        if evidence:
            for ev in evidence:
                print(format_evidence_line(ev), flush=True)
        elif result.get("intent") == "PRESENCE_AT_TIME":
            print("Presence check evaluated against video detection bounds.", flush=True)
        else:
            print("No matching video events found.", flush=True)
        print("----------------------------------------\n", flush=True)


if __name__ == "__main__":
    main()
