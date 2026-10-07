const cleanSampleJSON = JSON.stringify({
  "video": "sample.mp4",
  "fps": 30,
  "frame_count": 900,
  "duration_seconds": 30.0,
  "people_discovered": 2,
  "people": ["Person 1", "Person 2"],
  "data": {
    "events": [
      {
        "event_id": "E0001",
        "track_id": 1,
        "person": "Person 1",
        "event": "ENTER",
        "timestamp": {
          "seconds": 0.0,
          "formatted": "00:00.00"
        },
        "end_timestamp": {
          "seconds": 5.0,
          "formatted": "00:05.00"
        },
        "duration_seconds": 5.0,
        "confidence": 0.95,
        "description": "Person 1 entered the video scene."
      },
      {
        "event_id": "E0002",
        "track_id": 2,
        "person": "Person 2",
        "event": "ENTER",
        "timestamp": {
          "seconds": 2.0,
          "formatted": "00:02.00"
        },
        "confidence": 0.92,
        "description": "Person 2 entered."
      },
      {
        "event_id": "E0003",
        "track_id": 1,
        "person": "Person 1",
        "event": "LEAVE",
        "timestamp": {
          "seconds": 15.0,
          "formatted": "00:15.00"
        },
        "confidence": 0.89,
        "description": "Person 1 left."
      }
    ]
  }
}, null, 2);

const messySampleJSON = cleanSampleJSON;
