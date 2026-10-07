import cv2
import os
import numpy as np
from insightface.app import FaceAnalysis

KNOWN_DIR = "known_faces"
VIDEO     = "videos/test.mp4"
OUTPUT    = "outputs/face_recognized.mp4"
THRESHOLD = 0.45          # cosine-distance threshold (lower = stricter)

os.makedirs("outputs", exist_ok=True)

# -- 1. Load model -------------------------------------------------------------
print("Loading face model...")
app = FaceAnalysis(
    name="buffalo_l",
    providers=[
        "CUDAExecutionProvider",
        "CPUExecutionProvider"
    ]
)
app.prepare(ctx_id=0, det_size=(640, 640))
print("Face model loaded.")


# -- 2. Helper: extract & normalise embedding from an image path ---------------
def get_embedding(image_path):
    img = cv2.imread(image_path)
    if img is None:
        return None
    faces = app.get(img)
    if not faces:
        return None
    # use the largest detected face
    face = max(
        faces,
        key=lambda x: (x.bbox[2] - x.bbox[0]) *
                       (x.bbox[3] - x.bbox[1])
    )
    embedding = face.embedding
    # L2-normalise so cosine similarity == dot product
    embedding = embedding / np.linalg.norm(embedding)
    return embedding


# -- 3. Helper: compare a live embedding against the known gallery -------------
def identify_face(embedding, known_faces, threshold=THRESHOLD):
    """
    Returns (name, distance) for the closest match below threshold,
    or ("Unknown", distance) if no match is found.
    """
    best_name = "Unknown"
    best_dist = float("inf")

    for name, ref_embeddings in known_faces.items():
        for ref_emb in ref_embeddings:
            # cosine distance = 1 - dot product (both vectors are normalised)
            dist = 1.0 - float(np.dot(embedding, ref_emb))
            if dist < best_dist:
                best_dist = dist
                if dist < threshold:
                    best_name = name

    return best_name, best_dist


# -- 4. Build known-face gallery from known_faces/<person>/*.jpg|png -----------
known_faces = {}
print("\nLoading known faces...")

if not os.path.isdir(KNOWN_DIR):
    print(f"  [WARN] '{KNOWN_DIR}/' not found — no identities will be matched.")
else:
    for person in os.listdir(KNOWN_DIR):
        person_dir = os.path.join(KNOWN_DIR, person)
        if not os.path.isdir(person_dir):
            continue

        embeddings = []
        for filename in os.listdir(person_dir):
            if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            path = os.path.join(person_dir, filename)
            emb  = get_embedding(path)
            if emb is not None:
                embeddings.append(emb)
                print(f"  + {person}/{filename}")
            else:
                print(f"  - {person}/{filename}  (no face detected, skipped)")

        if embeddings:
            known_faces[person] = embeddings

print(f"\nGallery ready: {len(known_faces)} identit{'y' if len(known_faces)==1 else 'ies'} loaded.")


# -- 5. Process video ----------------------------------------------------------
cap = cv2.VideoCapture(VIDEO)
if not cap.isOpened():
    raise RuntimeError(f"Cannot open video: {VIDEO}")

fps    = cap.get(cv2.CAP_PROP_FPS)
width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
print(f"\nVideo: {width}x{height} @ {fps:.1f} fps")

fourcc = cv2.VideoWriter_fourcc(*"mp4v")
writer = cv2.VideoWriter(OUTPUT, fourcc, fps, (width, height))

frame_count = 0
print("Running face recognition...\n")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame_count += 1
    faces = app.get(frame)

    for face in faces:
        x1, y1, x2, y2 = [int(v) for v in face.bbox]

        # Identify face
        emb = face.embedding / np.linalg.norm(face.embedding)
        name, dist = identify_face(emb, known_faces)

        # Colour: green for known, red for unknown
        colour = (0, 200, 80) if name != "Unknown" else (0, 60, 220)
        label  = f"{name}  ({dist:.2f})"

        # Draw bounding box
        cv2.rectangle(frame, (x1, y1), (x2, y2), colour, 2)

        # Draw label background
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
        cv2.rectangle(frame, (x1, y1 - th - 8), (x1 + tw + 4, y1), colour, -1)
        cv2.putText(
            frame, label, (x1 + 2, y1 - 4),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA
        )

    writer.write(frame)

    if frame_count % 30 == 0:
        print(f"  Frame {frame_count}  —  {len(faces)} face(s) detected")

cap.release()
writer.release()

print(f"\nDone! {frame_count} frames processed.")
print(f"Output saved to: {OUTPUT}")
