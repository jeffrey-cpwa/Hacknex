import cv2
import json
import os
import numpy as np
from ultralytics import YOLO
from insightface.app import FaceAnalysis
from sklearn.cluster import DBSCAN

# ============================================================
# HACKNEX TEMPORAL PEOPLE ANALYZER
#
# Input:
#   videos/test.mp4
#
# Outputs:
#   outputs/marked_video.mp4
#   outputs/events.json
#
# It:
#   1. Finds recurring faces automatically.
#   2. Names them Person 1, Person 2, ...
#   3. Tracks people with YOLO + ByteTrack.
#   4. Detects ENTER, LEAVE, STAY and SHORT_STAY events.
#   5. Writes timestamps and evidence into JSON.
# ============================================================

VIDEO = "videos/test.mp4"
MARKED_VIDEO = "outputs/marked_video.mp4"
JSON_OUTPUT = "outputs/events.json"

# A person must be absent for this many frames before we call it a LEAVE.
ABSENCE_FRAMES = 15

# If visible for at least this long, call it STAY.
STAY_SECONDS = 5.0

# Face clustering settings.
SAMPLE_EVERY = 10
CLUSTER_EPS = 0.35
UNKNOWN_THRESHOLD = 0.40

os.makedirs("outputs", exist_ok=True)

print("Loading YOLO...")
yolo = YOLO("yolo11n.pt")

print("Loading face model...")
face_app = FaceAnalysis(
    name="buffalo_l",
    providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
)
face_app.prepare(ctx_id=0, det_size=(640, 640))

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

def norm(v):
    v = np.asarray(v, dtype=np.float32)
    n = np.linalg.norm(v)
    return v / n if n > 0 else v

def timestamp(seconds):
    return {
        "seconds": round(float(seconds), 3),
        "formatted": f"{int(seconds // 60):02d}:{seconds % 60:05.2f}"
    }

def center(box):
    x1, y1, x2, y2 = box
    return ((x1 + x2) / 2, (y1 + y2) / 2)

def inside(point, box, padding=0.0):
    x, y = point
    x1, y1, x2, y2 = box
    w = x2 - x1
    h = y2 - y1
    return (
        x1 - w * padding <= x <= x2 + w * padding
        and y1 - h * padding <= y <= y2 + h * padding
    )

def face_for_person(person_box, faces):
    best = None
    best_area = -1

    for face in faces:
        fb = face.bbox.astype(float)
        fc = center(fb)
        if inside(fc, person_box, padding=0.20):
            area = max(1.0, (fb[2] - fb[0]) * (fb[3] - fb[1]))
            if area > best_area:
                best = face
                best_area = area

    return best

# ------------------------------------------------------------
# PASS 1: Discover recurring people from the video
# ------------------------------------------------------------

print("\nPASS 1: discovering people...")

cap = cv2.VideoCapture(VIDEO)
if not cap.isOpened():
    raise RuntimeError(f"Cannot open {VIDEO}")

fps = cap.get(cv2.CAP_PROP_FPS)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

all_embeddings = []
frame_no = 0

while True:
    ok, frame = cap.read()
    if not ok:
        break

    if frame_no % SAMPLE_EVERY == 0:
        faces = face_app.get(frame)

        for face in faces:
            if face.embedding is not None:
                all_embeddings.append(norm(face.embedding))

    frame_no += 1

cap.release()

if not all_embeddings:
    print("No faces found. The system will still track people as Unknown.")

X = np.asarray(all_embeddings, dtype=np.float32)

people = {}

if len(X) > 0:
    print(f"Collected {len(X)} face embeddings.")

    labels = DBSCAN(
        eps=CLUSTER_EPS,
        min_samples=2,
        metric="cosine"
    ).fit_predict(X)

    valid_labels = sorted(x for x in set(labels) if x != -1)

    for person_number, label in enumerate(valid_labels, start=1):
        cluster = X[labels == label]
        reference = norm(np.mean(cluster, axis=0))
        people[person_number] = reference

print(f"Discovered {len(people)} people.")

def identify(face):
    if face is None or face.embedding is None or not people:
        return "Unknown", 0.0

    emb = norm(face.embedding)

    best_name = "Unknown"
    best_score = -1.0

    for person_number, reference in people.items():
        score = float(np.dot(emb, reference))

        if score > best_score:
            best_score = score
            best_name = f"Person {person_number}"

    if best_score < UNKNOWN_THRESHOLD:
        return "Unknown", best_score

    return best_name, best_score

# ------------------------------------------------------------
# PASS 2: YOLO + ByteTrack + identity + temporal events
# ------------------------------------------------------------

print("\nPASS 2: tracking and creating events...")

cap = cv2.VideoCapture(VIDEO)

width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

writer = cv2.VideoWriter(
    MARKED_VIDEO,
    cv2.VideoWriter_fourcc(*"mp4v"),
    fps,
    (width, height)
)

# track_id -> state
tracks = {}

events = []
event_counter = 1
frame_no = 0

def add_event(track_id, identity, event_type, start, end=None,
              confidence=None, reason=None):

    global event_counter

    item = {
        "event_id": f"E{event_counter:04d}",
        "track_id": int(track_id),
        "person": identity,
        "event": event_type,
        "timestamp": timestamp(start)
    }

    if end is not None:
        item["end_timestamp"] = timestamp(end)
        item["duration_seconds"] = round(end - start, 3)

    if confidence is not None:
        item["confidence"] = round(float(confidence), 3)

    if reason:
        item["description"] = reason

    events.append(item)
    event_counter += 1

while True:
    ok, frame = cap.read()
    if not ok:
        break

    current_time = frame_no / fps

    # YOLO + ByteTrack
    result = yolo.track(
        frame,
        persist=True,
        tracker="bytetrack.yaml",
        classes=[0],          # person only
        conf=0.25,
        device=0,
        verbose=False
    )[0]

    # Face recognition
    faces = face_app.get(frame)

    current_ids = set()

    if result.boxes is not None and result.boxes.id is not None:

        boxes = result.boxes.xyxy.cpu().numpy()
        ids = result.boxes.id.int().cpu().tolist()
        confs = result.boxes.conf.cpu().numpy()

        for box, track_id, det_conf in zip(boxes, ids, confs):

            track_id = int(track_id)
            current_ids.add(track_id)

            if track_id not in tracks:

                face = face_for_person(box, faces)
                name, face_score = identify(face)

                tracks[track_id] = {
                    "person": name,
                    "face_score": face_score,
                    "first_seen": current_time,
                    "last_seen": current_time,
                    "last_present": frame_no,
                    "last_box": box.tolist()
                }

                add_event(
                    track_id,
                    name,
                    "ENTER",
                    current_time,
                    confidence=max(float(det_conf), float(face_score)),
                    reason=f"{name} entered the video scene."
                )

            else:

                state = tracks[track_id]

                # If the face becomes visible later, improve identity.
                face = face_for_person(box, faces)

                if face is not None:
                    name, face_score = identify(face)

                    if name != "Unknown":
                        state["person"] = name
                        state["face_score"] = face_score

                state["last_seen"] = current_time
                state["last_present"] = frame_no
                state["last_box"] = box.tolist()

            state = tracks[track_id]

            # Draw person box.
            x1, y1, x2, y2 = map(int, box)

            name = state["person"]

            cv2.rectangle(
                frame,
                (x1, y1),
                (x2, y2),
                (0, 255, 0),
                2
            )

            duration = current_time - state["first_seen"]

            label = f"{name} | ID {track_id} | {duration:.1f}s"

            cv2.putText(
                frame,
                label,
                (x1, max(25, y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (0, 255, 0),
                2
            )

    # --------------------------------------------------------
    # Detect people who disappeared from the scene.
    # --------------------------------------------------------

    for track_id, state in list(tracks.items()):

        if frame_no - state["last_present"] >= ABSENCE_FRAMES:

            # Only close a track once.
            if not state.get("closed", False):

                leave_time = state["last_seen"]
                duration = leave_time - state["first_seen"]

                if duration >= STAY_SECONDS:

                    add_event(
                        track_id,
                        state["person"],
                        "STAY",
                        state["first_seen"],
                        leave_time,
                        state["face_score"],
                        f"{state['person']} stayed in the scene for {duration:.2f} seconds."
                    )

                else:

                    add_event(
                        track_id,
                        state["person"],
                        "SHORT_STAY",
                        state["first_seen"],
                        leave_time,
                        state["face_score"],
                        f"{state['person']} appeared briefly and did not stay."
                    )

                add_event(
                    track_id,
                    state["person"],
                    "LEAVE",
                    leave_time,
                    confidence=state["face_score"],
                    reason=f"{state['person']} left the scene."
                )

                state["closed"] = True

    # Timestamp overlay.
    cv2.putText(
        frame,
        f"TIME: {current_time:.2f}s",
        (20, 35),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.9,
        (0, 255, 255),
        2
    )

    writer.write(frame)

    frame_no += 1

cap.release()
writer.release()

# ------------------------------------------------------------
# Save JSON
# ------------------------------------------------------------

result_json = {
    "video": os.path.basename(VIDEO),
    "fps": round(float(fps), 3),
    "frame_count": total_frames,
    "duration_seconds": round(total_frames / fps, 3),
    "people_discovered": len(people),
    "people": [
        {
            "person": f"Person {n}",
            "automatic_identity": True
        }
        for n in sorted(people.keys())
    ],
    "events": events
}

with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
    json.dump(result_json, f, indent=2)

print("\n==========================================")
print("DONE")
print("==========================================")
print(f"Marked video : {MARKED_VIDEO}")
print(f"Event JSON   : {JSON_OUTPUT}")
print(f"People       : {len(people)}")
print(f"Events       : {len(events)}")
