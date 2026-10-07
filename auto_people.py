import cv2
import numpy as np
import os
from insightface.app import FaceAnalysis
from sklearn.cluster import DBSCAN

VIDEO  = "videos/test.mp4"
OUTPUT = "outputs/auto_people.mp4"

os.makedirs("outputs", exist_ok=True)

# -- FACE MODEL ----------------------------------------------------------------
print("Loading face model...")
app = FaceAnalysis(
    name="buffalo_l",
    providers=[
        "CUDAExecutionProvider",
        "CPUExecutionProvider"
    ]
)
app.prepare(ctx_id=0, det_size=(640, 640))
print("Face model ready.")

# -- STEP 1: COLLECT FACE EMBEDDINGS ------------------------------------------
cap = cv2.VideoCapture(VIDEO)
if not cap.isOpened():
    raise RuntimeError("Cannot open video")

fps          = cap.get(cv2.CAP_PROP_FPS)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
width        = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height       = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

print(f"FPS: {fps}")
print(f"Total frames: {total_frames}")
print(f"Resolution: {width}x{height}")

# Sample every N frames to build the embedding gallery quickly
SAMPLE_EVERY = max(1, int(fps))   # 1 sample per second

all_embeddings  = []   # list of normalised 512-d vectors
all_frame_idxs  = []   # which frame each embedding came from
all_bboxes      = []   # bbox for each embedding

print("\nPass 1 — collecting face embeddings...")
frame_idx = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break

    if frame_idx % SAMPLE_EVERY == 0:
        faces = app.get(frame)
        for face in faces:
            emb = face.embedding
            emb = emb / np.linalg.norm(emb)        # L2 normalise
            all_embeddings.append(emb)
            all_frame_idxs.append(frame_idx)
            all_bboxes.append(face.bbox)

        if frame_idx % (SAMPLE_EVERY * 30) == 0:
            print(f"  Frame {frame_idx}/{total_frames}  —  {len(all_embeddings)} embeddings so far")

    frame_idx += 1

cap.release()
print(f"\nCollected {len(all_embeddings)} face embeddings from {frame_idx} frames.")

# -- STEP 2: CLUSTER WITH DBSCAN -----------------------------------------------
# Cosine distance = 1 - dot product (both vectors are L2-normalised)
print("\nClustering faces with DBSCAN...")

if len(all_embeddings) == 0:
    raise RuntimeError("No faces detected in the video. Check your video file.")

X = np.array(all_embeddings)

db = DBSCAN(
    eps=0.45,          # cosine-distance threshold
    min_samples=2,     # min faces to form a cluster
    metric="cosine"
)
labels = db.fit_predict(X)

n_people = len(set(labels)) - (1 if -1 in labels else 0)
n_noise  = list(labels).count(-1)
print(f"Discovered {n_people} unique person(s)  ({n_noise} unmatched face(s) discarded)")

# -- STEP 3: BUILD PER-PERSON COLOUR MAP --------------------------------------
# Assign a distinct BGR colour to every cluster label
rng = np.random.default_rng(42)
colour_map = {}
for lbl in set(labels):
    if lbl == -1:
        colour_map[lbl] = (120, 120, 120)   # grey = unknown
    else:
        colour_map[lbl] = tuple(int(c) for c in rng.integers(80, 255, 3))

# -- STEP 4: BUILD PER-CLUSTER MEAN EMBEDDING (for live matching) -------------
cluster_embeddings = {}
for lbl in set(labels):
    if lbl == -1:
        continue
    idxs = np.where(labels == lbl)[0]
    mean_emb = X[idxs].mean(axis=0)
    mean_emb = mean_emb / np.linalg.norm(mean_emb)
    cluster_embeddings[lbl] = mean_emb


def match_to_cluster(embedding, threshold=0.45):
    """Return (cluster_label, distance) for the best matching cluster."""
    best_lbl  = -1
    best_dist = float("inf")
    for lbl, ref_emb in cluster_embeddings.items():
        dist = 1.0 - float(np.dot(embedding, ref_emb))
        if dist < best_dist:
            best_dist = dist
            if dist < threshold:
                best_lbl = lbl
    return best_lbl, best_dist


# -- STEP 5: ANNOTATE FULL VIDEO ----------------------------------------------
print("\nPass 2 — annotating video...")

cap    = cv2.VideoCapture(VIDEO)
fourcc = cv2.VideoWriter_fourcc(*"mp4v")
writer = cv2.VideoWriter(OUTPUT, fourcc, fps, (width, height))

frame_idx   = 0
face_counts = {lbl: 0 for lbl in colour_map}

while True:
    ret, frame = cap.read()
    if not ret:
        break

    faces = app.get(frame)

    for face in faces:
        emb = face.embedding / np.linalg.norm(face.embedding)
        lbl, dist = match_to_cluster(emb)

        x1, y1, x2, y2 = [int(v) for v in face.bbox]
        colour = colour_map[lbl]
        label  = f"Person {lbl}  ({dist:.2f})" if lbl != -1 else f"Unknown ({dist:.2f})"

        # Bounding box
        cv2.rectangle(frame, (x1, y1), (x2, y2), colour, 2)

        # Label background
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
        cv2.rectangle(frame, (x1, y1 - th - 8), (x1 + tw + 4, y1), colour, -1)
        cv2.putText(
            frame, label, (x1 + 2, y1 - 4),
            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA
        )

        face_counts[lbl] = face_counts.get(lbl, 0) + 1

    writer.write(frame)
    frame_idx += 1

    if frame_idx % 30 == 0:
        print(f"  Frame {frame_idx}/{total_frames}")

cap.release()
writer.release()

# -- SUMMARY ------------------------------------------------------------------
print(f"\nDone! {frame_idx} frames written to {OUTPUT}")
print("\nFace appearances per cluster:")
for lbl in sorted(face_counts):
    tag = f"Person {lbl}" if lbl != -1 else "Unknown"
    print(f"  {tag}: {face_counts[lbl]} frame(s)")
