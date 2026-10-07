from ultralytics import YOLO
import cv2
import os

VIDEO = "videos/test.mp4"
OUTPUT = "outputs/tracked.mp4"

os.makedirs("outputs", exist_ok=True)

print("Loading YOLO...")
model = YOLO("yolo11n.pt")

cap = cv2.VideoCapture(VIDEO)
if not cap.isOpened():
    raise RuntimeError(f"Cannot open video: {VIDEO}")

fps = cap.get(cv2.CAP_PROP_FPS)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

print(f"Video: {width}x{height}")
print(f"FPS: {fps}")

fourcc = cv2.VideoWriter_fourcc(*"mp4v")
writer = cv2.VideoWriter(OUTPUT, fourcc, fps, (width, height))

print("Running tracker...")
frame_count = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # persist=True preserves tracker state across consecutive frames
    # giving us stable, persistent IDs throughout the video
    results = model.track(frame, persist=True)

    # Annotate the frame with bounding boxes and IDs
    annotated = results[0].plot()

    writer.write(annotated)
    frame_count += 1

    if frame_count % 30 == 0:
        print(f"  Processed {frame_count} frames...")

cap.release()
writer.release()

print(f"\nDone! {frame_count} frames processed.")
print(f"Output saved to: {OUTPUT}")
