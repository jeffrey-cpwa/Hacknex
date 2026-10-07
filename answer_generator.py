"""
answer_generator.py
-------------------
Generates natural-language answers using Qwen3:4b via Ollama,
grounded strictly on verified evidence produced by Temporal RAG.

Includes conversation memory for pronoun resolution and causal question detection.
"""

import ollama_client
import temporal_rag

SYSTEM_PROMPT = """You are answering questions about a video.

You MUST use only the verified evidence.

Never invent events.
Never invent timestamps.
Never change timestamps.
Never change event ordering.
Never confuse ENTER and LEAVE.

If evidence says LEAVE at 7.31 seconds, the answer must say 7.31 seconds.

If evidence is insufficient, say:
"The available video evidence is insufficient to determine this."

If asked why someone entered or left, say:
"The available video evidence does not indicate why they performed that action."

Do not expose chain-of-thought.

Return ONLY the final answer."""


def format_evidence_block(evidence: list, rag_result: dict = None) -> str:
    """Format structured evidence items strictly as requested."""
    lines = []

    # Add core computed facts for clarity
    if rag_result:
        if rag_result.get("target_event"):
            t = rag_result["target_event"]
            lines.append(f"Target Event: {t.get('person')} {t.get('action')} @ {t.get('timestamp')}s (Event ID: {t.get('event_id')})")

        if rag_result.get("first"):
            f = rag_result["first"]
            action = rag_result.get("parsed", {}).get("action", "ENTER")
            verb = "entered" if "ENTER" in str(action).upper() else "left"
            lines.append(f"First Person: {f.get('person_label')} {verb} at {f.get('timestamp')} seconds (Event ID: {f.get('event', {}).get('event_id')})")

        if rag_result.get("presence"):
            p = rag_result["presence"]
            pid = p.get("person_id", "").replace("_", " ").title()
            ts = p.get("timestamp")
            is_present = p.get("present")
            lines.append(f"Presence Fact: {pid} was {'present' if is_present else 'NOT present'} at {ts} seconds.")

        if rag_result.get("duration"):
            d = rag_result["duration"]
            pid = d.get("person_id", "").replace("_", " ").title()
            secs = d.get("duration_seconds")
            lines.append(f"Duration Fact: {pid} stayed for {secs} seconds.")

        if rag_result.get("comparison"):
            c = rag_result["comparison"]
            rel = c.get("relationship", "UNKNOWN")
            lines.append(f"Comparison Fact: Temporal relationship is {rel}.")

    for ev in evidence:
        eid = ev.get("event_id", "N/A")
        plabel = ev.get("person_label", ev.get("person_id", "Unknown"))
        action = ev.get("action", "")
        start = ev.get("start_time")
        end = ev.get("end_time")
        conf = ev.get("confidence")
        conf_str = f"{conf:.2f}" if conf is not None else "N/A"

        lines.append(
            f"\nEvent ID: {eid}\n"
            f"Person: {plabel}\n"
            f"Action: {action}\n"
            f"Start: {start} seconds\n"
            f"End: {end} seconds\n"
            f"Confidence: {conf_str}"
        )

    if not lines:
        return "No events found in verified evidence."
    return "\n".join(lines).strip()


def generate_answer(question: str, rag_result: dict, follow_up_context: dict = None) -> dict:
    """
    Generate an answer using Qwen3:4b based exclusively on verified evidence.
    """
    evidence = rag_result.get("evidence", [])
    intent = rag_result.get("intent", "UNKNOWN")

    # Handle explicit causality/why questions where video evidence has no cause
    q_lower = question.lower()
    if q_lower.startswith("why ") or " why " in q_lower or "reason" in q_lower:
        person_str = "they"
        if follow_up_context and follow_up_context.get("last_person_label"):
            person_str = follow_up_context["last_person_label"]
        elif rag_result.get("parsed", {}).get("person_id"):
            person_str = rag_result["parsed"]["person_id"].replace("_", " ").title()
        return {
            "answer": f"The available video evidence does not indicate why {person_str} left.",
            "model": "qwen3:4b",
            "used_fallback": False,
            "error": None
        }

    evidence_text = format_evidence_block(evidence, rag_result)

    user_prompt = f"""USER QUESTION:
{question}

VERIFIED EVIDENCE:
{evidence_text}

Answer the question directly and concisely using only the verified evidence above. State exact timestamps and relevant persons."""

    # Call Ollama Qwen3:4b
    response = ollama_client.generate(prompt=user_prompt, system_prompt=SYSTEM_PROMPT)

    if response.get("success") and response.get("content"):
        raw_ans = response["content"].strip()
        return {
            "answer": raw_ans,
            "model": response.get("model", "qwen3:4b"),
            "used_fallback": False,
            "error": None
        }

    # Only fall back if Ollama was unreachable
    fallback_text = temporal_rag.format_answer(rag_result)
    print(f"\n[WARNING] Ollama unavailable — deterministic fallback active. Error: {response.get('error')}")
    return {
        "answer": fallback_text,
        "model": "deterministic_fallback",
        "used_fallback": True,
        "error": response.get("error", "Ollama generation failed")
    }


if __name__ == "__main__":
    q = "When did Person 2 leave?"
    rag_res = temporal_rag.retrieve(q)
    ans = generate_answer(q, rag_res)
    print("Q:", q)
    print("Answer:", ans["answer"])
    print("Model :", ans["model"])
