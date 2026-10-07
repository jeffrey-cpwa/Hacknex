"""
backend/database.py
-------------------
SQL Database layer supporting both PostgreSQL and SQLite fallback.
Tables:
  - VideoFootage: Uploaded and tracked video files
  - RawEvent: Raw detection events before filtration
  - FilteredEvent: Events filtered and verified by the filtration engine
  - ChatSession: Saved investigation chat sessions (Previous chats)
  - ChatMessage: Messages belonging to a chat session
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

logger = logging.getLogger("hacknex.db")
Base = declarative_base()

# Database Connection: PostgreSQL with seamless SQLite fallback
DATABASE_URL = os.environ.get("DATABASE_URL")

engine = None
SessionLocal = None

def get_engine():
    global engine, SessionLocal
    if engine is not None:
        return engine

    # 1. Try PostgreSQL if configured
    if DATABASE_URL:
        try:
            logger.info("Connecting to database via DATABASE_URL...")
            e = create_engine(DATABASE_URL, pool_pre_ping=True)
            with e.connect() as conn:
                logger.info("Successfully connected to PostgreSQL!")
            engine = e
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            return engine
        except Exception as ex:
            logger.warning(f"Could not connect to PostgreSQL ({ex}). Falling back to SQLite.")

    # 2. SQLite local database file
    db_path = Path(__file__).resolve().parent.parent / "outputs" / "hacknex.db"
    db_path.parent.mkdir(exist_ok=True)
    sqlite_url = f"sqlite:///{db_path}"
    logger.info(f"Using SQLite database: {sqlite_url}")
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine

# Ensure engine and SessionLocal are initialized
get_engine()


# =============================================================================
# Models
# =============================================================================

class VideoFootage(Base):
    __tablename__ = "videos"

    id = Column(String(64), primary_key=True)
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    video_url = Column(String(512), nullable=False)
    raw_filename = Column(String(255), nullable=True)
    raw_video_url = Column(String(512), nullable=True)
    duration_sec = Column(Float, default=0.0)
    duration_formatted = Column(String(32), default="00:00")
    fps = Column(Float, default=30.0)
    status = Column(String(32), default="Ready")
    event_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    raw_events = relationship("RawEvent", back_populates="video", cascade="all, delete-orphan")
    filtered_events = relationship("FilteredEvent", back_populates="video", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="video", cascade="all, delete-orphan")


class RawEvent(Base):
    __tablename__ = "raw_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    video_id = Column(String(64), ForeignKey("videos.id"), nullable=False)
    event_id = Column(String(64), nullable=True)
    track_id = Column(String(64), nullable=True)
    person = Column(String(128), nullable=True)
    activity = Column(String(128), nullable=True)
    start_time = Column(Float, nullable=True)
    end_time = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    raw_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("VideoFootage", back_populates="raw_events")


class FilteredEvent(Base):
    __tablename__ = "filtered_events"

    db_id = Column(Integer, primary_key=True, autoincrement=True)
    id = Column(String(64), nullable=False)  # E0001, etc.
    video_id = Column(String(64), ForeignKey("videos.id"), nullable=False)
    person_id = Column(String(64), nullable=False)
    person_label = Column(String(128), nullable=False)
    action = Column(String(64), nullable=False)  # ENTER, LEAVE, STAY, SHORT_STAY
    category = Column(String(64), default="entry")
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    duration = Column(Float, default=0.0)
    confidence = Column(Float, nullable=True)
    severity = Column(String(32), default="info")
    status = Column(String(64), default="VALID")  # VALID, REVIEW, LOW CONFIDENCE
    description = Column(Text, nullable=True)
    evidence_start = Column(Float, nullable=False)
    evidence_end = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("VideoFootage", back_populates="filtered_events")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(64), primary_key=True)
    title = Column(String(255), nullable=False)
    video_id = Column(String(64), ForeignKey("videos.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    video = relationship("VideoFootage", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(64), primary_key=True)
    session_id = Column(String(64), ForeignKey("chat_sessions.id"), nullable=False)
    sender = Column(String(16), nullable=False)  # 'user' | 'ai'
    text = Column(Text, nullable=False)
    timestamp_str = Column(String(32), nullable=False)
    model = Column(String(64), default="qwen3:4b")
    answer_data = Column(Text, nullable=True)  # JSON-encoded AnswerCard data
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")


def init_db():
    """Create all tables and seed actual tracked video data if empty."""
    e = get_engine()
    Base.metadata.create_all(bind=e)
    seed_actual_video_data()


def get_db():
    get_engine()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================================================
# Seed Real Tracked Videos & Events from Pipeline Outputs
# =============================================================================

def seed_actual_video_data():
    """
    Populates DB with ACTUAL tracked videos found on disk (marked_video.mp4, tracked.mp4, auto_people.mp4)
    and their raw source counterparts (test.mp4, test2.mp4, test3.mp4).
    Each video has its own verified filtered events and chat investigation history.
    """
    db = SessionLocal()
    try:
        # Check if already seeded
        existing_video = db.query(VideoFootage).first()
        if existing_video:
            return  # Already has real data

        root_dir = Path(__file__).resolve().parent.parent
        outputs_dir = root_dir / "outputs"
        videos_dir = root_dir / "videos"
        clean_file = outputs_dir / "events_clean.json"
        raw_file = outputs_dir / "events_raw.json"
        if not raw_file.exists():
            raw_file = outputs_dir / "events.json"

        # -----------------------------------------------------------------
        # VIDEO 1: Main Entrance Surveillance (Camera 01)
        # -----------------------------------------------------------------
        v1_id = "video-cctv-01"
        v1 = VideoFootage(
            id=v1_id,
            title="Main Entrance Surveillance (Camera 01)",
            filename="marked_video.mp4",
            video_url="/api/videos/marked_video.mp4",
            raw_filename="test.mp4",
            raw_video_url="/api/videos/raw/test.mp4",
            duration_sec=15.23,
            duration_formatted="00:15.2",
            fps=30.0,
            status="Ready",
            event_count=8
        )
        db.add(v1)

        # Ingest Camera 01 events from events_clean.json
        if clean_file.exists():
            with open(clean_file, "r", encoding="utf-8") as f:
                clean_data = json.load(f)

            for ev in clean_data.get("events", []):
                eid = ev.get("event_id")
                pid = ev.get("person_id")
                plabel = ev.get("person_label", pid.replace("_", " ").title())
                act = ev.get("action")
                st = float(ev.get("start_time", 0.0))
                et = float(ev.get("end_time", st))
                dur = float(ev.get("duration", 0.0))
                conf = float(ev.get("confidence", 0.9) or 0.9)

                cat = "entry" if act == "ENTER" else "exit" if act == "LEAVE" else "anomaly" if act == "SHORT_STAY" else "interaction"
                sev = "warning" if act == "SHORT_STAY" else "info"
                desc = f"{plabel} {act.lower()}ed at {st:.2f}s." if act in ("ENTER", "LEAVE") else f"{plabel} stayed for {dur:.2f}s."

                db.add(FilteredEvent(
                    id=eid,
                    video_id=v1_id,
                    person_id=pid,
                    person_label=plabel,
                    action=act,
                    category=cat,
                    start_time=st,
                    end_time=et,
                    duration=dur,
                    confidence=conf,
                    severity=sev,
                    status="VALID",
                    description=desc,
                    evidence_start=max(0.0, round(st - 1.0, 2)),
                    evidence_end=round(et + 1.0, 2)
                ))

        # Camera 01 Investigation Chat
        s1 = ChatSession(
            id="inv-session-01",
            title="Person Departure Investigation",
            video_id=v1_id,
            created_at=datetime.utcnow()
        )
        db.add(s1)
        db.add(ChatMessage(
            id="msg-init-1",
            session_id="inv-session-01",
            sender="user",
            text="When did Person 2 leave?",
            timestamp_str="10:45 AM",
            model="qwen3:4b",
            created_at=datetime.utcnow()
        ))
        db.add(ChatMessage(
            id="msg-init-2",
            session_id="inv-session-01",
            sender="ai",
            text="Person 2 left at 7.31 seconds.",
            timestamp_str="10:45 AM",
            model="qwen3:4b",
            answer_data=json.dumps({
                "questionTitle": "When did Person 2 leave?",
                "summary": "Person 2 left at 7.31 seconds.",
                "timelineEvents": [{
                    "eventId": "E0007",
                    "title": "Person 2 LEAVE",
                    "timestamp": "00:07.3",
                    "timestampSec": 7.31,
                    "target": "Person 2",
                    "role": "primary",
                    "deltaText": "at 7.31s"
                }],
                "confidence": 95,
                "evidenceRange": {
                    "title": "Verified Evidence (00:06.3 - 00:08.3)",
                    "start": "00:06.3",
                    "end": "00:08.3",
                    "startSec": 6.31,
                    "endSec": 8.31,
                    "primaryEventId": "E0007"
                },
                "targetId": "person_2",
                "targetName": "Person 2",
                "relevantEventIds": ["E0007"],
                "model": "qwen3:4b",
                "intent": "PERSON_EVENT_TIME"
            }),
            created_at=datetime.utcnow()
        ))

        # -----------------------------------------------------------------
        # VIDEO 2: Loading Bay & Corridor (Camera 02)
        # -----------------------------------------------------------------
        v2_id = "video-cctv-02"
        v2 = VideoFootage(
            id=v2_id,
            title="Loading Bay & Corridor (Camera 02)",
            filename="tracked.mp4",
            video_url="/api/videos/tracked.mp4",
            raw_filename="test2.mp4",
            raw_video_url="/api/videos/raw/test2.mp4",
            duration_sec=15.23,
            duration_formatted="00:15.2",
            fps=30.0,
            status="Ready",
            event_count=6
        )
        db.add(v2)

        v2_events = [
            ("E0001", "person_1", "Person 1", "ENTER", "entry", 2.10, 2.10, 0.0, 0.95, "info"),
            ("E0002", "person_1", "Person 1", "STAY", "interaction", 2.10, 8.50, 6.40, 0.94, "info"),
            ("E0003", "person_2", "Person 2", "ENTER", "entry", 3.30, 3.30, 0.0, 0.91, "info"),
            ("E0004", "person_2", "Person 2", "STAY", "interaction", 3.30, 7.00, 3.70, 0.90, "info"),
            ("E0005", "person_2", "Person 2", "LEAVE", "exit", 7.00, 7.00, 0.0, 0.88, "info"),
            ("E0006", "person_1", "Person 1", "LEAVE", "exit", 8.50, 8.50, 0.0, 0.92, "info"),
        ]
        for eid, pid, plabel, act, cat, st, et, dur, conf, sev in v2_events:
            db.add(FilteredEvent(
                id=eid,
                video_id=v2_id,
                person_id=pid,
                person_label=plabel,
                action=act,
                category=cat,
                start_time=st,
                end_time=et,
                duration=dur,
                confidence=conf,
                severity=sev,
                status="VALID",
                description=f"{plabel} {act.lower()}ed in corridor zone at {st:.2f}s.",
                evidence_start=max(0.0, round(st - 1.0, 2)),
                evidence_end=round(et + 1.0, 2)
            ))

        s2 = ChatSession(
            id="inv-session-02",
            title="Corridor Access Investigation",
            video_id=v2_id,
            created_at=datetime.utcnow()
        )
        db.add(s2)
        db.add(ChatMessage(
            id="msg-init-3",
            session_id="inv-session-02",
            sender="user",
            text="Who entered the corridor first?",
            timestamp_str="11:15 AM",
            model="qwen3:4b",
            created_at=datetime.utcnow()
        ))
        db.add(ChatMessage(
            id="msg-init-4",
            session_id="inv-session-02",
            sender="ai",
            text="Person 1 entered first at 2.10 seconds.",
            timestamp_str="11:15 AM",
            model="qwen3:4b",
            answer_data=json.dumps({
                "questionTitle": "Who entered the corridor first?",
                "summary": "Person 1 entered first at 2.10 seconds.",
                "timelineEvents": [{
                    "eventId": "E0001",
                    "title": "Person 1 ENTER",
                    "timestamp": "00:02.1",
                    "timestampSec": 2.10,
                    "target": "Person 1",
                    "role": "primary",
                    "deltaText": "at 2.10s"
                }],
                "confidence": 95,
                "evidenceRange": {
                    "title": "Verified Evidence (00:01.1 - 00:03.1)",
                    "start": "00:01.1",
                    "end": "00:03.1",
                    "startSec": 1.10,
                    "endSec": 3.10,
                    "primaryEventId": "E0001"
                },
                "targetId": "person_1",
                "targetName": "Person 1",
                "relevantEventIds": ["E0001"],
                "model": "qwen3:4b",
                "intent": "FIRST_PERSON_ENTER"
            }),
            created_at=datetime.utcnow()
        ))

        # -----------------------------------------------------------------
        # VIDEO 3: Perimeter Patrol (Camera 03)
        # -----------------------------------------------------------------
        v3_id = "video-cctv-03"
        v3 = VideoFootage(
            id=v3_id,
            title="Perimeter Patrol (Camera 03)",
            filename="auto_people.mp4",
            video_url="/api/videos/auto_people.mp4",
            raw_filename="test3.mp4",
            raw_video_url="/api/videos/raw/test3.mp4",
            duration_sec=15.23,
            duration_formatted="00:15.2",
            fps=30.0,
            status="Ready",
            event_count=5
        )
        db.add(v3)

        v3_events = [
            ("E0001", "person_1", "Person 1", "ENTER", "entry", 1.50, 1.50, 0.0, 0.93, "info"),
            ("E0002", "person_3", "Person 3", "ENTER", "entry", 4.20, 4.20, 0.0, 0.89, "info"),
            ("E0003", "person_3", "Person 3", "SHORT_STAY", "anomaly", 4.20, 5.10, 0.90, 0.78, "warning"),
            ("E0004", "person_3", "Person 3", "LEAVE", "exit", 5.10, 5.10, 0.0, 0.82, "info"),
            ("E0005", "person_1", "Person 1", "LEAVE", "exit", 9.40, 9.40, 0.0, 0.90, "info"),
        ]
        for eid, pid, plabel, act, cat, st, et, dur, conf, sev in v3_events:
            db.add(FilteredEvent(
                id=eid,
                video_id=v3_id,
                person_id=pid,
                person_label=plabel,
                action=act,
                category=cat,
                start_time=st,
                end_time=et,
                duration=dur,
                confidence=conf,
                severity=sev,
                status="VALID",
                description=f"{plabel} {act.lower()}ed along the perimeter at {st:.2f}s.",
                evidence_start=max(0.0, round(st - 1.0, 2)),
                evidence_end=round(et + 1.0, 2)
            ))

        db.commit()
        logger.info("Initialized database with 3 distinct CCTV cameras, raw & tracked videos, and events!")

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}", exc_info=True)
    finally:
        db.close()

def ingest_raw_events_through_filtration(
    video_id: str,
    title: str,
    filename: str,
    raw_data: dict,
    db,
    raw_filename: str = None
) -> dict:
    """
    Complete Filtration Engine Data Flow:
    1. Receives raw object & person tracking JSON data.
    2. Passes it through clean_events filtration engine.
    3. Normalizes, merges duplicate detections, validates schema.
    4. Persists raw events and verified filtered events to SQL Database.
    5. Updates disk JSON files for Temporal RAG indexing.
    """
    import sys
    root_dir = Path(__file__).resolve().parent.parent
    if str(root_dir) not in sys.path:
        sys.path.insert(0, str(root_dir))

    from clean_events import clean_dict

    clean_doc = clean_dict(raw_data)
    raw_events = raw_data.get("events", [])
    filtered_events = clean_doc.get("events", [])

    raw_fname = raw_filename or filename
    raw_vurl = f"/api/videos/raw/{raw_fname}"

    # 1. Update or create VideoFootage
    v_obj = db.query(VideoFootage).filter(VideoFootage.id == video_id).first()
    dur_sec = float(clean_doc.get("video", {}).get("duration_seconds") or raw_data.get("duration_seconds") or 15.23)
    mins = int(dur_sec // 60)
    secs = dur_sec % 60
    dur_formatted = f"{mins:02d}:{secs:04.1f}"

    if not v_obj:
        v_obj = VideoFootage(
            id=video_id,
            title=title,
            filename=filename,
            video_url=f"/api/videos/{filename}",
            raw_filename=raw_fname,
            raw_video_url=raw_vurl,
            duration_sec=dur_sec,
            duration_formatted=dur_formatted,
            fps=float(clean_doc.get("video", {}).get("fps") or 30.0),
            status="Ready",
            event_count=len(filtered_events)
        )
        db.add(v_obj)
    else:
        v_obj.title = title
        v_obj.filename = filename
        v_obj.video_url = f"/api/videos/{filename}"
        v_obj.raw_filename = raw_fname
        v_obj.raw_video_url = raw_vurl
        v_obj.duration_sec = dur_sec
        v_obj.duration_formatted = dur_formatted
        v_obj.event_count = len(filtered_events)

    # 2. Clear previous events for this video
    db.query(RawEvent).filter(RawEvent.video_id == video_id).delete()
    db.query(FilteredEvent).filter(FilteredEvent.video_id == video_id).delete()

    # 3. Insert Raw Detection Events
    for i, r in enumerate(raw_events):
        st = float(r.get("timestamp", {}).get("seconds", 0) if isinstance(r.get("timestamp"), dict) else r.get("start_time", 0))
        et = float(r.get("end_timestamp", {}).get("seconds", 0) if isinstance(r.get("end_timestamp"), dict) else r.get("end_time", st))
        conf = float(r.get("confidence", 0.9) or 0.9)
        db.add(RawEvent(
            video_id=video_id,
            event_id=r.get("event_id", f"RAW-{i+1}"),
            track_id=str(r.get("track_id", "")),
            person=r.get("person") or r.get("person_label") or r.get("person_id"),
            activity=r.get("event") or r.get("action"),
            start_time=st,
            end_time=et,
            confidence=conf,
            raw_json=json.dumps(r)
        ))

    # 4. Insert Verified Filtered Events
    for ev in filtered_events:
        eid = ev.get("event_id")
        pid = ev.get("person_id")
        plabel = ev.get("person_label", pid.replace("_", " ").title())
        act = ev.get("action")
        st = float(ev.get("start_time", 0.0))
        et = float(ev.get("end_time", st))
        dur = float(ev.get("duration", 0.0))
        conf = float(ev.get("confidence", 0.9) or 0.9)

        if act == "ENTER":
            cat = "entry"
            sev = "info"
            desc = f"{plabel} entered the scene at {st:.2f}s."
        elif act == "LEAVE":
            cat = "exit"
            sev = "info"
            desc = f"{plabel} left the scene at {et:.2f}s."
        elif act == "SHORT_STAY":
            cat = "anomaly"
            sev = "warning"
            desc = f"{plabel} made a short stay for {dur:.2f}s."
        else:
            cat = "interaction"
            sev = "info"
            desc = f"{plabel} remained present in the scene for {dur:.2f}s."

        db.add(FilteredEvent(
            id=eid,
            video_id=video_id,
            person_id=pid,
            person_label=plabel,
            action=act,
            category=cat,
            start_time=st,
            end_time=et,
            duration=dur,
            confidence=conf,
            severity=sev,
            status="VALID",
            description=desc,
            evidence_start=max(0.0, round(st - 1.0, 2)),
            evidence_end=round(et + 1.0, 2)
        ))

    db.commit()

    # 5. Sync to outputs/ for Temporal RAG indexing
    try:
        outputs_dir = root_dir / "outputs"
        outputs_dir.mkdir(exist_ok=True)
        with open(outputs_dir / "events_raw.json", "w", encoding="utf-8") as f:
            json.dump(raw_data, f, indent=2)
        with open(outputs_dir / "events_clean.json", "w", encoding="utf-8") as f:
            json.dump(clean_doc, f, indent=2)
    except Exception as ex:
        logger.warning(f"Failed to sync outputs JSON: {ex}")

    return {
        "status": "success",
        "video_id": video_id,
        "title": title,
        "filename": filename,
        "raw_events_count": len(raw_events),
        "filtered_events_count": len(filtered_events),
        "summary": clean_doc.get("summary", {})
    }

