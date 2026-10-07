"""
temporal_rag.py
---------------
Hybrid Temporal RAG system.

For every question:
  1. Parse intent via query_parser
  2. Exact retrieval via temporal_retriever (source of truth)
  3. Semantic context via vector_store
  4. Merge into a single evidence package

The LLM (future stage) receives only verified, structured evidence.
No timestamps are invented here.
"""

import temporal_retriever as tr
import vector_store       as vs
from event_documents import _event_to_text

# Semantic retrieval is supplementary only
SEMANTIC_TOP_K       = 3
SEMANTIC_SCORE_FLOOR = 0.30   # drop very low-confidence semantic hits

# Intents that are purely deterministic (no semantic needed)
DETERMINISTIC_INTENTS = {
    "PERSON_EVENT_TIME", "EVENTS_BEFORE", "EVENTS_AFTER",
    "PRESENCE_AT_TIME", "DURATION",
    "FIRST_PERSON_ENTER", "FIRST_PERSON_LEAVE",
    "COMPARE_EVENTS", "OVERLAP", "SEQUENCE", "COUNT",
}


# ── Merge helpers ─────────────────────────────────────────────────────────────

def _dedup(events: list) -> list:
    """Remove duplicate event_ids, preserving order."""
    seen = set()
    out  = []
    for e in events:
        eid = e.get("event_id")
        if eid and eid not in seen:
            seen.add(eid)
            out.append(e)
    return out


def _add_text(ev: dict) -> dict:
    """Attach a human-readable text field to any evidence event."""
    if "text" not in ev:
        ev = dict(ev)
        ev["text"] = _event_to_text(ev)
    return ev


# ── Main RAG function ─────────────────────────────────────────────────────────

def retrieve(question: str,
             use_semantic: bool = True,
             semantic_top_k: int = SEMANTIC_TOP_K) -> dict:
    """
    Full hybrid retrieval for one question.

    Returns:
    {
      "query"          : str,
      "intent"         : str,
      "parsed"         : dict,
      "evidence"       : [ { ...event fields..., source, text } ],
      "semantic_hits"  : [ { ...doc fields..., score, rank } ],
      "target_event"   : dict | None,   (anchor for BEFORE/AFTER)
      "presence"       : dict | None,
      "duration"       : dict | None,
      "comparison"     : dict | None,
      "count"          : dict | None,
      "pairs"          : list | None,
    }
    """
    # ── 1. Deterministic retrieval ─────────────────────────────────────────
    det = tr.retrieve(question)
    intent  = det["intent"]
    parsed  = det["parsed"]

    # Pull extra result fields through
    anchor      = det.get("anchor")
    presence    = det.get("presence")
    duration    = det.get("duration")
    comparison  = det.get("comparison")
    count_info  = det.get("count")
    pairs       = det.get("pairs")
    first_info  = det.get("first")

    det_evidence = [_add_text(e) for e in det.get("evidence", [])]

    # ── 2. Semantic retrieval (supplementary) ──────────────────────────────
    semantic_hits = []
    if use_semantic and intent not in DETERMINISTIC_INTENTS:
        try:
            store  = vs.get_store()
            hits   = store.search(question, top_k=semantic_top_k)
            semantic_hits = [h for h in hits if h.get("score", 0) >= SEMANTIC_SCORE_FLOOR]
        except Exception as exc:
            semantic_hits = []
            print(f"  [WARN] Vector search failed: {exc}")

    # Convert semantic hits to evidence format (tag source)
    sem_evidence = []
    det_ids = {e["event_id"] for e in det_evidence}
    for h in semantic_hits:
        if h.get("event_id") not in det_ids:   # don't duplicate
            sem_evidence.append({
                "event_id"    : h.get("event_id"),
                "person_id"   : h.get("person_id"),
                "person_label": h.get("person_label"),
                "action"      : h.get("action"),
                "start_time"  : h.get("start_time"),
                "end_time"    : h.get("end_time"),
                "duration"    : h.get("duration"),
                "confidence"  : h.get("confidence"),
                "text"        : h.get("text"),
                "source"      : "vector_store",
                "score"       : h.get("score"),
            })

    # ── 3. Merge: deterministic first, semantic second ─────────────────────
    merged = _dedup(det_evidence + sem_evidence)

    # Sort by start_time for readability
    merged.sort(key=lambda e: (e.get("start_time") or 0, e.get("event_id") or ""))

    # ── 4. Build target_event from anchor ──────────────────────────────────
    target_event = None
    if anchor:
        target_event = {
            "event_id"   : anchor.get("event_id"),
            "person"     : anchor.get("person_label"),
            "person_id"  : anchor.get("person_id"),
            "action"     : anchor.get("action"),
            "timestamp"  : anchor.get("start_time"),
        }
    elif first_info:
        target_event = {
            "person"     : first_info.get("person_label"),
            "person_id"  : first_info.get("person_id"),
            "action"     : parsed.get("action"),
            "timestamp"  : first_info.get("timestamp"),
        }

    return {
        "query"        : question,
        "intent"       : intent,
        "parsed"       : parsed,
        "evidence"     : merged,
        "semantic_hits": semantic_hits,
        "target_event" : target_event,
        "presence"     : presence,
        "duration"     : duration,
        "comparison"   : comparison,
        "count"        : count_info,
        "pairs"        : pairs,
        "first"        : first_info,
        "error"        : det.get("error"),
    }


# ── Answer formatter (no LLM) ─────────────────────────────────────────────────

def format_answer(result: dict) -> str:
    """
    Generate a clean natural-language answer from the evidence.
    This is a rule-based formatter -- no LLM.
    The LLM layer will replace / augment this in Stage 4.
    """
    intent = result["intent"]
    ev     = result["evidence"]

    if result.get("error") and not ev:
        return f"Could not answer: {result['error']}"

    if intent == "PERSON_EVENT_TIME":
        if ev:
            e = ev[0]
            return (f"{e['person_label']} performed {e['action']} "
                    f"at {e['start_time']} seconds.")
        return "No matching event found."

    if intent == "FIRST_PERSON_ENTER":
        f = result.get("first")
        if f:
            return f"{f['person_label']} entered first at {f['timestamp']} seconds."
        return "No ENTER events found."

    if intent == "FIRST_PERSON_LEAVE":
        f = result.get("first")
        if f:
            return f"{f['person_label']} left first at {f['timestamp']} seconds."
        return "No LEAVE events found."

    if intent == "PRESENCE_AT_TIME":
        p = result.get("presence", {})
        pid = p.get("person_id", "")
        ts  = p.get("timestamp", "")
        label = pid.replace("_", " ").title()
        if p.get("present"):
            return f"Yes, {label} was present at {ts} seconds."
        return f"No, {label} was not present at {ts} seconds."

    if intent == "DURATION":
        d = result.get("duration", {})
        pid = d.get("person_id", "")
        label = pid.replace("_", " ").title()
        secs  = d.get("duration_seconds")
        if secs is not None:
            return f"{label} stayed for {secs} seconds."
        return f"Duration data not available for {label}."

    if intent == "COMPARE_EVENTS":
        c = result.get("comparison", {})
        rel = c.get("relationship", "UNKNOWN")
        if len(ev) >= 2:
            e1, e2 = ev[0], ev[1]
            action = result["parsed"].get("action", "")
            if rel == "BEFORE":
                return (f"Yes, {e1['person_label']} {action}d before {e2['person_label']} "
                        f"({e1['start_time']}s vs {e2['start_time']}s).")
            elif rel == "AFTER":
                return (f"No, {e1['person_label']} {action}d after {e2['person_label']} "
                        f"({e1['start_time']}s vs {e2['start_time']}s).")
            elif rel == "SAME_TIME":
                return (f"{e1['person_label']} and {e2['person_label']} both "
                        f"{action}d at the same time ({e1['start_time']}s).")
        return f"Temporal relationship: {rel}"

    if intent in ("EVENTS_BEFORE", "EVENTS_AFTER"):
        te_label = "before" if intent == "EVENTS_BEFORE" else "after"
        t = result.get("target_event", {})
        ts = t.get("timestamp") if t else "?"
        if not ev:
            return f"No events found {te_label} {ts}s."
        parts = []
        for e in ev:
            if e["action"] in ("STAY", "SHORT_STAY"):
                parts.append(f"{e['person_label']} {e['action']} "
                             f"from {e['start_time']}s to {e['end_time']}s")
            else:
                parts.append(f"{e['person_label']} {e['action']} at {e['start_time']}s")
        return f"Events {te_label} {ts}s: " + "; ".join(parts) + "."

    if intent == "COUNT":
        c = result.get("count", {})
        action = c.get("action") or "events"
        return (f"{c.get('unique_people', 0)} unique person(s) "
                f"with {c.get('count', 0)} {action} event(s).")

    if intent == "OVERLAP":
        pairs = result.get("pairs", [])
        return f"{len(pairs)} overlapping event pair(s) found."

    if intent == "SEQUENCE":
        lines = [f"[{e['event_id']}] {e['person_label']} {e['action']} @ {e['start_time']}s"
                 for e in ev]
        return "Event sequence:\n" + "\n".join(lines)

    return "Intent not recognised."


# ── Self-test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    questions = [
        "When did Person 2 leave?",
        "Who entered first?",
        "What happened before Person 2 left?",
        "Was Person 2 present at 6 seconds?",
        "How long did Person 1 stay?",
    ]
    print("Initialising vector store (first run may download model) ...\n")
    for q in questions:
        r = retrieve(q)
        print(f"Q: {q}")
        print(f"   intent  : {r['intent']}")
        print(f"   answer  : {format_answer(r)}")
        print(f"   evidence: {len(r['evidence'])} event(s)")
        print()
