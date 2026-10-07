"""
chatbot_backend.py
------------------
Main interface for Video Understanding chatbot queries.

Pipeline:
  question
      ↓
  pronoun resolution / query normalization
      ↓
  temporal_rag (deterministic ground truth)
      ↓
  verified evidence
      ↓
  answer_generator
      ↓
  Qwen3:4b (via Ollama)
      ↓
  final answer + separated verified evidence
"""

import json
import re
import temporal_rag
from answer_generator import generate_answer

# Global session memory for terminal chat
SESSION_STATE = {
    "last_person_id": None,
    "last_person_label": None,
    "last_action": None,
}


def resolve_pronouns(question: str, state: dict) -> str:
    """Resolve 'they', 'he', 'she' to the last discussed person if present."""
    last_label = state.get("last_person_label")
    if not last_label:
        return question

    q = question
    # Check if question already has Person X
    if re.search(r"person\s*\d+", q, re.IGNORECASE):
        return q

    # Replace pronoun references
    q_resolved = re.sub(r"\b(they|he|she|this person|that person)\b", last_label, q, flags=re.IGNORECASE)
    return q_resolved


def _extract_evidence_timestamps(evidence: list, rag_result: dict = None) -> list:
    """Extract all unique, sorted timestamps present in verified evidence."""
    ts_set = set()
    for ev in evidence:
        st = ev.get("start_time")
        et = ev.get("end_time")
        if st is not None:
            ts_set.add(round(float(st), 2))
        if et is not None:
            ts_set.add(round(float(et), 2))

    if rag_result:
        if rag_result.get("target_event"):
            t_ts = rag_result["target_event"].get("timestamp")
            if t_ts is not None:
                ts_set.add(round(float(t_ts), 2))
        if rag_result.get("first"):
            f_ts = rag_result["first"].get("timestamp")
            if f_ts is not None:
                ts_set.add(round(float(f_ts), 2))

    return sorted(list(ts_set))


def answer_question(question: str, session: dict = None) -> dict:
    """
    Process user question through Temporal RAG and Qwen3:4b.

    Returns:
    {
        "question": str,
        "resolved_question": str,
        "answer": str,
        "intent": str,
        "evidence": list,
        "timestamps": list,
        "model": str,
        "used_fallback": bool,
        "error": str | None
    }
    """
    current_session = session if session is not None else SESSION_STATE

    # 1. Resolve pronouns using conversational memory
    resolved_q = resolve_pronouns(question, current_session)

    # 2. Retrieve structured verified evidence via Temporal RAG
    rag_result = temporal_rag.retrieve(resolved_q)

    intent = rag_result.get("intent", "UNKNOWN")
    evidence = rag_result.get("evidence", [])
    timestamps = _extract_evidence_timestamps(evidence, rag_result)

    # 3. Update conversation memory
    parsed = rag_result.get("parsed", {})
    if parsed.get("person_id"):
        pid = parsed["person_id"]
        current_session["last_person_id"] = pid
        current_session["last_person_label"] = pid.replace("_", " ").title()
    if parsed.get("action"):
        current_session["last_action"] = parsed["action"]

    # 4. Generate natural-language answer using Qwen3:4b
    gen_result = generate_answer(resolved_q, rag_result, follow_up_context=current_session)

    return {
        "question": question,
        "resolved_question": resolved_q,
        "answer": gen_result["answer"],
        "intent": intent,
        "evidence": evidence,
        "timestamps": timestamps,
        "model": gen_result["model"],
        "used_fallback": gen_result.get("used_fallback", False),
        "error": gen_result.get("error")
    }


if __name__ == "__main__":
    q = "When did Person 2 leave?"
    res = answer_question(q)
    print(json.dumps(res, indent=2))
