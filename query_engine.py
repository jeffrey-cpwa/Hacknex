import json
import re
from collections import defaultdict

DATA_FILE = "outputs/events.json"

with open(DATA_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

events  = data.get("events", [])
people  = [p["person"] for p in data.get("people", [])]
meta    = {k: v for k, v in data.items() if k not in ("events", "people")}

# -- KNOWN EVENT TYPES --------------------------------------------------------
EVENT_TYPES = {"ENTER", "LEAVE", "SHORT_STAY", "LONG_STAY", "REENTER", "LOITER"}

# -- HELPERS ------------------------------------------------------------------

def fmt(seconds):
    """Format seconds as MM:SS.ss"""
    m = int(seconds // 60)
    s = seconds % 60
    return f"{m:02d}:{s:05.2f}"


def find_person(question):
    """Extract a person name from a natural-language question."""
    q = question.lower()
    # try exact people list first (longest match wins)
    for name in sorted(people, key=len, reverse=True):
        if name.lower() in q:
            return name
    # fallback: "person 3" / "person3"
    match = re.search(r"person\s*(\d+)", q)
    if match:
        return f"Person {match.group(1)}"
    return None


def find_event_type(question):
    """Extract an event keyword from the question."""
    q = question.upper()
    for et in EVENT_TYPES:
        if et.replace("_", " ") in q or et in q:
            return et
    # natural-language aliases
    aliases = {
        "ENTER":      ["enter", "arrive", "appear", "came in", "show up"],
        "LEAVE":      ["leave", "left", "exit", "depart", "gone"],
        "SHORT_STAY": ["short", "briefly", "brief stay", "short stay"],
        "LONG_STAY":  ["long", "long stay", "stayed", "linger"],
        "REENTER":    ["reenter", "return", "came back", "re-enter"],
        "LOITER":     ["loiter", "loitering", "hanging around"],
    }
    q_low = question.lower()
    for etype, words in aliases.items():
        for w in words:
            if w in q_low:
                return etype
    return None


def find_time_window(question):
    """Extract an optional time range from the question (e.g. 'between 5 and 10 seconds')."""
    match = re.search(
        r"between\s+([\d.]+)\s+and\s+([\d.]+)\s*(?:second|sec|s)?",
        question, re.IGNORECASE
    )
    if match:
        return float(match.group(1)), float(match.group(2))
    match = re.search(r"after\s+([\d.]+)\s*(?:second|sec|s)?", question, re.IGNORECASE)
    if match:
        return float(match.group(1)), float("inf")
    match = re.search(r"before\s+([\d.]+)\s*(?:second|sec|s)?", question, re.IGNORECASE)
    if match:
        return 0.0, float(match.group(1))
    return None


def search_events(person=None, event_type=None, time_window=None):
    """Filter events by optional person, event type, and time window."""
    results = events
    if person:
        results = [e for e in results if e.get("person", "").lower() == person.lower()]
    if event_type:
        results = [e for e in results if e.get("event") == event_type]
    if time_window:
        t0, t1 = time_window
        results = [
            e for e in results
            if t0 <= e.get("timestamp", {}).get("seconds", 0) <= t1
        ]
    return results


# -- QUERY HANDLERS ------------------------------------------------------------

def q_when_enter(person):
    evs = search_events(person=person, event_type="ENTER")
    if not evs:
        return f"{person} was never seen entering the scene."
    times = [e["timestamp"]["seconds"] for e in evs]
    first = fmt(min(times))
    return f"{person} first entered at {first}  ({len(evs)} entry event(s) total)."


def q_when_leave(person):
    evs = search_events(person=person, event_type="LEAVE")
    if not evs:
        return f"{person} was never seen leaving the scene."
    times = [e["timestamp"]["seconds"] for e in evs]
    last = fmt(max(times))
    return f"{person} last left at {last}  ({len(evs)} leave event(s) total)."


def q_total_time(person):
    stay_evs = search_events(person=person, event_type="LONG_STAY") + \
               search_events(person=person, event_type="SHORT_STAY")
    if not stay_evs:
        return f"No stay duration data found for {person}."
    total = sum(e.get("duration_seconds", 0) for e in stay_evs)
    return f"{person} spent approximately {total:.2f}s in the scene."


def q_who_at_time(seconds):
    present = set()
    for e in events:
        ts  = e.get("timestamp", {}).get("seconds", -1)
        ets = e.get("end_timestamp", {}).get("seconds", ts)
        if ts <= seconds <= ets:
            present.add(e.get("person", "Unknown"))
    if not present:
        return f"No one detected on screen at {fmt(seconds)}."
    names = ", ".join(sorted(present))
    return f"At {fmt(seconds)}, present: {names}."


def q_summary():
    lines = [
        f"Video      : {meta.get('video', 'N/A')}",
        f"Duration   : {meta.get('duration_seconds', 0):.2f}s",
        f"FPS        : {meta.get('fps', 0):.2f}",
        f"Frames     : {meta.get('frame_count', 0)}",
        f"People     : {meta.get('people_discovered', 0)}",
        f"Events     : {len(events)}",
    ]
    by_type = defaultdict(int)
    for e in events:
        by_type[e.get("event", "?")] += 1
    lines.append("\nEvent breakdown:")
    for etype, count in sorted(by_type.items()):
        lines.append(f"  {etype:<12} {count}")
    return "\n".join(lines)


def q_person_timeline(person):
    evs = search_events(person=person)
    if not evs:
        return f"No events found for {person}."
    lines = [f"Timeline for {person}:"]
    for e in sorted(evs, key=lambda x: x["timestamp"]["seconds"]):
        ts    = e["timestamp"]["formatted"]
        etype = e["event"]
        dur   = f"  (duration: {e['duration_seconds']:.2f}s)" if "duration_seconds" in e else ""
        conf  = e.get("confidence", 0)
        lines.append(f"  [{ts}]  {etype:<12}{dur}  conf={conf:.2f}")
    return "\n".join(lines)


def q_who_loitered():
    loiters = [e for e in events if e.get("event") == "LOITER"]
    if not loiters:
        return "No loitering events detected."
    people_set = {e["person"] for e in loiters}
    return f"Loitering detected for: {', '.join(sorted(people_set))}"


def q_count_people():
    unique = {e.get("person") for e in events} - {"Unknown"}
    return f"{len(unique)} unique identified person(s) in the video."


# -- MAIN QUERY DISPATCHER -----------------------------------------------------

def answer(question):
    q   = question.strip().lower()
    person     = find_person(question)
    event_type = find_event_type(question)
    time_win   = find_time_window(question)

    # --- summary / overview ---
    if any(w in q for w in ["summary", "overview", "stats", "statistics"]):
        return q_summary()

    # --- who is on screen at time T ---
    m = re.search(r"who.+?(?:at|around|near)\s+([\d.]+)\s*(?:second|sec|s)?", q)
    if m:
        return q_who_at_time(float(m.group(1)))

    # --- loitering ---
    if "loiter" in q or "loitering" in q:
        return q_who_loitered()

    # --- how many people ---
    if re.search(r"how many (people|persons|individuals)", q):
        return q_count_people()

    # --- person-specific queries ---
    if person:
        if any(w in q for w in ["timeline", "history", "all events", "everything"]):
            return q_person_timeline(person)
        if any(w in q for w in ["enter", "arrive", "appear", "show up"]):
            return q_when_enter(person)
        if any(w in q for w in ["leave", "left", "exit", "depart"]):
            return q_when_leave(person)
        if any(w in q for w in ["how long", "total time", "duration", "spent"]):
            return q_total_time(person)
        # generic: show filtered events
        evs = search_events(person=person, event_type=event_type, time_window=time_win)
        if evs:
            lines = [f"Found {len(evs)} event(s) for {person}:"]
            for e in evs[:20]:
                lines.append(f"  [{e['timestamp']['formatted']}]  {e['event']}  — {e['description']}")
            if len(evs) > 20:
                lines.append(f"  ... and {len(evs)-20} more.")
            return "\n".join(lines)
        return f"No events found for {person} matching your query."

    # --- event-type-only queries ---
    if event_type:
        evs = search_events(event_type=event_type, time_window=time_win)
        if evs:
            lines = [f"Found {len(evs)} {event_type} event(s):"]
            for e in evs[:20]:
                lines.append(f"  [{e['timestamp']['formatted']}]  {e['person']}  — {e['description']}")
            if len(evs) > 20:
                lines.append(f"  ... and {len(evs)-20} more.")
            return "\n".join(lines)
        return f"No {event_type} events found."

    return (
        "Sorry, I couldn't understand that query.\n"
        "Try:\n"
        "  'When did Person 3 enter?'\n"
        "  'Show me the timeline for Person 1'\n"
        "  'Who was on screen at 10 seconds?'\n"
        "  'How long did Person 5 stay?'\n"
        "  'Summary'\n"
        "  'How many people?'\n"
    )


# -- INTERACTIVE LOOP ----------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("  Temporal Query Engine — HackNex")
    print(f"  Loaded {len(events)} events  |  {meta.get('people_discovered', '?')} people")
    print("  Type 'quit' to exit, 'summary' for overview")
    print("=" * 60)

    while True:
        try:
            q = input("\n> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break
        if not q:
            continue
        if q.lower() in ("quit", "exit", "q"):
            print("Bye!")
            break
        print("\n" + answer(q))
