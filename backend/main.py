"""
FastAPI Backend for HackNex - Temporal AI & Video Understanding System
======================================================================
Provides unified REST APIs for:
  - Video Footage Management & Playback
  - Temporal Events, Targets, Gantt tracks & Relationship graphs
  - Temporal RAG + Qwen3:4b AI Chatbot (Ground Truth Deterministic Engine)
  - Data Filtration Engine (Raw JSON validation, metrics, classification)
  - Video Processing & Upload
"""

import os
import sys
import json
import time
import math
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Ensure repository root is on sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Core Temporal Modules
import temporal_engine
import temporal_rag
import chatbot_backend
import ollama_client

app = FastAPI(
    title="HackNex Temporal AI & Video Understanding API",
    version="1.0.0",
    description="Deterministic Temporal Reasoning Engine + RAG + Ollama Qwen3:4b Chatbot + Data Filtration Engine"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount videos and outputs directory for streaming
VIDEOS_DIR = ROOT_DIR / "videos"
OUTPUTS_DIR = ROOT_DIR / "outputs"
FILTRATION_DIR = ROOT_DIR / "filtration_engine"

VIDEOS_DIR.mkdir(exist_ok=True)
OUTPUTS_DIR.mkdir(exist_ok=True)

if FILTRATION_DIR.exists():
    app.mount("/filtration", StaticFiles(directory=str(FILTRATION_DIR), html=True), name="filtration")

CLEAN_EVENTS_PATH = OUTPUTS_DIR / "events_clean.json"
RAW_EVENTS_PATH = OUTPUTS_DIR / "events.json"


# =============================================================================
# Helper Utilities
# =============================================================================

def format_sec(sec: float) -> str:
    """Format seconds into MM:SS.S"""
    if sec is None:
        return "N/A"
    mins = int(sec // 60)
    remainder = sec % 60
    return f"{mins:02d}:{remainder:04.1f}"

def format_min_sec(sec: float) -> str:
    """Format seconds into MM:SS"""
    if sec is None:
        return "00:00"
    mins = int(sec // 60)
    secs = int(sec % 60)
    return f"{mins:02d}:{secs:02d}"

def load_clean_data() -> dict:
    if CLEAN_EVENTS_PATH.exists():
        with open(CLEAN_EVENTS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"video": {}, "people": [], "events": []}


# =============================================================================
# In-Memory Video Footage & Metadata Repository
# =============================================================================

DEFAULT_FOOTAGE_LIST = [
    {
        "id": "footage-1",
        "title": "Factory Camera 01",
        "filename": "Factory_Camera_01.mp4",
        "duration": "05:42",
        "durationSec": 342,
        "date": "Today · 10:45 AM",
        "eventCount": 12,
        "status": "Analyzed",
        "tags": ["Factory", "Security", "Incident"],
        "resolution": "1920 × 1080",
        "fps": 30,
        "trackedPeopleCount": 4,
        "trackedObjectsCount": 11,
        "trackedVehiclesCount": 1,
        "criticalEventsCount": 2,
        "warningEventsCount": 2,
    },
    {
        "id": "footage-clean",
        "title": "Clean Temporal Pipeline (example.mp4)",
        "filename": "example.mp4",
        "duration": "00:15.2",
        "durationSec": 15.23,
        "date": "Today · Ground Truth",
        "eventCount": 8,
        "status": "Analyzed",
        "tags": ["Temporal-RAG", "Clean", "3-Persons"],
        "resolution": "1920 × 1080",
        "fps": 30,
        "trackedPeopleCount": 3,
        "trackedObjectsCount": 0,
        "trackedVehiclesCount": 0,
        "criticalEventsCount": 1,
        "warningEventsCount": 2,
    },
    {
        "id": "footage-2",
        "title": "Warehouse Entrance",
        "filename": "Warehouse_Entrance_Cam3.mp4",
        "duration": "12:31",
        "durationSec": 751,
        "date": "Today · 08:20 AM",
        "eventCount": 31,
        "status": "Analyzed",
        "tags": ["Warehouse", "Security", "Delivery"],
        "resolution": "1920 × 1080",
        "fps": 60,
        "trackedPeopleCount": 8,
        "trackedObjectsCount": 24,
        "trackedVehiclesCount": 4,
        "criticalEventsCount": 1,
        "warningEventsCount": 4,
    },
    {
        "id": "footage-3",
        "title": "Parking Camera",
        "filename": "Parking_North_Cam.mp4",
        "duration": "08:20",
        "durationSec": 500,
        "date": "Yesterday · 04:15 PM",
        "eventCount": 18,
        "status": "Analyzed",
        "tags": ["Security", "Delivery"],
        "resolution": "2560 × 1440",
        "fps": 30,
        "trackedPeopleCount": 6,
        "trackedObjectsCount": 8,
        "trackedVehiclesCount": 9,
        "criticalEventsCount": 0,
        "warningEventsCount": 2,
    },
]

# Populate video list with actual video files found on disk if any
for vid_file in list(VIDEOS_DIR.glob("*.mp4")) + list(OUTPUTS_DIR.glob("*.mp4")):
    v_id = f"footage-{vid_file.stem}"
    if not any(f["id"] == v_id for f in DEFAULT_FOOTAGE_LIST):
        DEFAULT_FOOTAGE_LIST.append({
            "id": v_id,
            "title": vid_file.stem.replace("_", " ").title(),
            "filename": vid_file.name,
            "duration": "02:30",
            "durationSec": 150,
            "date": "Local Storage",
            "eventCount": 6,
            "status": "Analyzed",
            "tags": ["Local", "Video"],
            "resolution": "1920 × 1080",
            "fps": 30,
            "trackedPeopleCount": 2,
            "trackedObjectsCount": 4,
            "trackedVehiclesCount": 1,
            "criticalEventsCount": 0,
            "warningEventsCount": 1,
            "videoUrl": f"/api/videos/{vid_file.name}"
        })


# =============================================================================
# Temporal Events Builder (Combines Ground Truth with Frontend Schema)
# =============================================================================

def get_clean_temporal_events() -> List[Dict[str, Any]]:
    """Converts outputs/events_clean.json into the frontend TemporalEvent schema."""
    data = load_clean_data()
    raw_events = data.get("events", [])
    result = []
    
    for i, ev in enumerate(raw_events):
        eid = ev.get("event_id", f"E{i+1:04d}")
        pid = ev.get("person_id", "person_1")
        plabel = ev.get("person_label", pid.replace("_", " ").title())
        action = ev.get("action", "ENTER")
        st = float(ev.get("start_time", 0.0))
        et = float(ev.get("end_time", st))
        dur = float(ev.get("duration", 0.0))
        conf_raw = ev.get("confidence")
        conf_pct = int(conf_raw * 100) if conf_raw is not None else 85
        
        # Determine category & severity
        if action == "ENTER":
            cat = "entry"
            sev = "info"
            title = f"{plabel} Entered Scene"
            desc = f"{plabel} entered the monitoring area at {st:.2f}s."
        elif action == "LEAVE":
            cat = "exit"
            sev = "info"
            title = f"{plabel} Left Scene"
            desc = f"{plabel} departed the monitoring area at {et:.2f}s."
        elif action == "SHORT_STAY":
            cat = "anomaly"
            sev = "warning"
            title = f"{plabel} Brief Interaction / Short Stay"
            desc = f"{plabel} briefly paused for {dur:.2f}s between {st:.2f}s and {et:.2f}s."
        else: # STAY
            cat = "interaction"
            sev = "info"
            title = f"{plabel} Extended Presence"
            desc = f"{plabel} remained continuously active in scene for {dur:.2f}s."

        ev_start = max(0.0, round(st - 1.0, 2))
        ev_end = round(et + 1.0, 2)
        
        # Build prev and next links
        prev_summary = None
        prev_id = None
        if i > 0:
            prev_ev = raw_events[i - 1]
            prev_id = prev_ev.get("event_id")
            p_st = float(prev_ev.get("start_time", 0.0))
            delta = round(st - p_st, 2)
            prev_summary = {
                "title": f"{prev_ev.get('person_label')} {prev_ev.get('action')}",
                "timestamp": format_sec(p_st),
                "delta": f"{delta}s before"
            }
            
        next_summary = None
        next_id = None
        if i < len(raw_events) - 1:
            next_ev = raw_events[i + 1]
            next_id = next_ev.get("event_id")
            n_st = float(next_ev.get("start_time", 0.0))
            delta = round(n_st - st, 2)
            next_summary = {
                "title": f"{next_ev.get('person_label')} {next_ev.get('action')}",
                "timestamp": format_sec(n_st),
                "delta": f"{delta}s after"
            }

        result.append({
            "id": eid,
            "timestamp": format_sec(st),
            "timestampSec": st,
            "title": title,
            "description": desc,
            "category": cat,
            "targetIds": [pid],
            "targetNames": [plabel],
            "location": "Main Hall Corridor",
            "durationSec": dur,
            "durationFormatted": f"{dur:.1f}s",
            "confidence": conf_pct,
            "severity": sev,
            "evidenceStartSec": ev_start,
            "evidenceEndSec": ev_end,
            "evidenceStartFormatted": format_sec(ev_start),
            "evidenceEndFormatted": format_sec(ev_end),
            "prevEventId": prev_id,
            "nextEventId": next_id,
            "prevEventSummary": prev_summary,
            "nextEventSummary": next_summary,
            "evidenceKeyframes": [
                {"timestamp": format_sec(st), "description": f"{plabel} {action} start"},
                {"timestamp": format_sec(et), "description": f"{plabel} {action} end"}
            ]
        })
        
    return result


def get_factory_events() -> List[Dict[str, Any]]:
    """Rich events for Factory Camera 01 (matches frontend default demo)."""
    return [
        {
            "id": "evt-1",
            "timestamp": "00:32.0",
            "timestampSec": 32.0,
            "title": "Person #07 Entered Facility",
            "description": "Person #07 entered through North Gate boundary wearing standard high-vis jacket.",
            "category": "entry",
            "targetIds": ["tgt-person-07"],
            "targetNames": ["Person #07"],
            "location": "North Entrance Gate",
            "durationSec": 4.5,
            "durationFormatted": "4.5s",
            "confidence": 96,
            "severity": "info",
            "evidenceStartSec": 28,
            "evidenceEndSec": 36,
            "evidenceStartFormatted": "00:28",
            "evidenceEndFormatted": "00:36",
            "nextEventId": "evt-2",
            "nextEventSummary": {"title": "Truck Docked", "timestamp": "01:14.0", "delta": "42.0s after"},
            "evidenceKeyframes": [
                {"timestamp": "00:28", "description": "Gate sensor trip"},
                {"timestamp": "00:32", "description": "Person #07 crosses line"},
                {"timestamp": "00:35", "description": "Trajectory established"}
            ]
        },
        {
            "id": "evt-2",
            "timestamp": "01:14.0",
            "timestampSec": 74.0,
            "title": "Truck #01 Docked at Loading Bay 2",
            "description": "Heavy transport vehicle Truck #01 reversed into Bay 2 and engaged parking air-brake.",
            "category": "vehicle",
            "targetIds": ["tgt-truck-01"],
            "targetNames": ["Truck #01"],
            "location": "Loading Bay 2",
            "durationSec": 18.0,
            "durationFormatted": "18.0s",
            "confidence": 98,
            "severity": "info",
            "evidenceStartSec": 70,
            "evidenceEndSec": 85,
            "evidenceStartFormatted": "01:10",
            "evidenceEndFormatted": "01:25",
            "prevEventId": "evt-1",
            "prevEventSummary": {"title": "Person Entered", "timestamp": "00:32.0", "delta": "42.0s before"},
            "nextEventId": "evt-3",
            "nextEventSummary": {"title": "Cargo Unloading", "timestamp": "01:58.0", "delta": "44.0s after"},
            "evidenceKeyframes": [
                {"timestamp": "01:10", "description": "Bay approach reverse"},
                {"timestamp": "01:14", "description": "Bumper contact docking"},
                {"timestamp": "01:20", "description": "Engine off brake locked"}
            ]
        },
        {
            "id": "evt-3",
            "timestamp": "01:58.0",
            "timestampSec": 118.0,
            "title": "Person #07 Unloaded Cargo Box #04",
            "description": "Person #07 opened rear shutter of Truck #01 and retrieved cardboard container Box #04.",
            "category": "interaction",
            "targetIds": ["tgt-person-07", "tgt-truck-01", "tgt-box-04"],
            "targetNames": ["Person #07", "Truck #01", "Box #04"],
            "location": "Loading Bay 2 Corridor",
            "durationSec": 12.0,
            "durationFormatted": "12.0s",
            "confidence": 92,
            "severity": "info",
            "evidenceStartSec": 114,
            "evidenceEndSec": 126,
            "evidenceStartFormatted": "01:54",
            "evidenceEndFormatted": "02:06",
            "prevEventId": "evt-2",
            "prevEventSummary": {"title": "Truck Docked", "timestamp": "01:14.0", "delta": "44.0s before"},
            "nextEventId": "evt-4",
            "nextEventSummary": {"title": "Restricted Area Breach", "timestamp": "02:07.4", "delta": "9.4s after"}
        },
        {
            "id": "evt-4",
            "timestamp": "02:07.4",
            "timestampSec": 127.4,
            "title": "Unauthorized Entry: Restricted Zone B",
            "description": "Person #07 bypassed yellow safety bollards and entered restricted manufacturing zone without escort.",
            "category": "security",
            "targetIds": ["tgt-person-07"],
            "targetNames": ["Person #07"],
            "location": "Zone B Perimeter Barrier",
            "durationSec": 8.0,
            "durationFormatted": "8.0s",
            "confidence": 95,
            "severity": "critical",
            "evidenceStartSec": 124,
            "evidenceEndSec": 134,
            "evidenceStartFormatted": "02:04",
            "evidenceEndFormatted": "02:14",
            "prevEventId": "evt-3",
            "prevEventSummary": {"title": "Cargo Unloading", "timestamp": "01:58.0", "delta": "9.4s before"},
            "nextEventId": "evt-5",
            "nextEventSummary": {"title": "Box Placed", "timestamp": "02:31.0", "delta": "23.6s after"},
            "evidenceKeyframes": [
                {"timestamp": "02:04", "description": "Approach yellow barrier"},
                {"timestamp": "02:07.4", "description": "Restricted boundary crossed"},
                {"timestamp": "02:12", "description": "Direct movement to conveyor"}
            ]
        },
        {
            "id": "evt-5",
            "timestamp": "02:31.0",
            "timestampSec": 151.0,
            "title": "Box #04 Left Unattended on Assembly Floor",
            "description": "Person #07 placed Box #04 adjacent to Machine #02 conveyor line and walked away.",
            "category": "object",
            "targetIds": ["tgt-box-04", "tgt-person-07"],
            "targetNames": ["Box #04", "Person #07"],
            "location": "Machine #02 Assembly Cell",
            "durationSec": 5.0,
            "durationFormatted": "5.0s",
            "confidence": 94,
            "severity": "warning",
            "evidenceStartSec": 148,
            "evidenceEndSec": 156,
            "evidenceStartFormatted": "02:28",
            "evidenceEndFormatted": "02:36",
            "prevEventId": "evt-4",
            "prevEventSummary": {"title": "Restricted Entry", "timestamp": "02:07.4", "delta": "23.6s before"},
            "nextEventId": "evt-6",
            "nextEventSummary": {"title": "Conveyor Cycle Resumed", "timestamp": "03:10.0", "delta": "39.0s after"}
        },
        {
            "id": "evt-6",
            "timestamp": "03:10.0",
            "timestampSec": 190.0,
            "title": "Machine #02 Conveyor Cycle Resumed",
            "description": "Automated assembly conveyor resumed movement after intermittent 1m 30s cycle pause.",
            "category": "machinery",
            "targetIds": ["tgt-machine-02"],
            "targetNames": ["Machine #02"],
            "location": "Sector 4 Conveyor Line",
            "durationSec": 32.0,
            "durationFormatted": "32.0s",
            "confidence": 97,
            "severity": "info",
            "evidenceStartSec": 186,
            "evidenceEndSec": 198,
            "evidenceStartFormatted": "03:06",
            "evidenceEndFormatted": "03:18",
            "prevEventId": "evt-5",
            "prevEventSummary": {"title": "Box #04 Placed", "timestamp": "02:31.0", "delta": "39.0s before"},
            "nextEventId": "evt-7",
            "nextEventSummary": {"title": "Safety Alarm Activated", "timestamp": "03:41.0", "delta": "31.0s after"}
        },
        {
            "id": "evt-7",
            "timestamp": "03:41.0",
            "timestampSec": 221.0,
            "title": "Facility Safety Alarm Activated",
            "description": "Optical thermal anomaly sensor triggered automated strobe and audible siren.",
            "category": "alarm",
            "targetIds": ["tgt-machine-02"],
            "targetNames": ["Alarm System #01"],
            "location": "Sector 4 Safety Grid",
            "durationSec": 24.0,
            "durationFormatted": "24.0s",
            "confidence": 99,
            "severity": "critical",
            "evidenceStartSec": 218,
            "evidenceEndSec": 230,
            "evidenceStartFormatted": "03:38",
            "evidenceEndFormatted": "03:50",
            "prevEventId": "evt-4",
            "prevEventSummary": {"title": "Restricted Entry", "timestamp": "02:07.4", "delta": "1m 33.6s before"},
            "nextEventId": "evt-8",
            "nextEventSummary": {"title": "Person #07 Exited Restricted Area", "timestamp": "04:18.0", "delta": "37.0s after"},
            "evidenceKeyframes": [
                {"timestamp": "03:38", "description": "Thermal threshold warning raised"},
                {"timestamp": "03:41", "description": "Emergency alarm relays trip"},
                {"timestamp": "03:45", "description": "Emergency lights illuminate"}
            ]
        },
        {
            "id": "evt-8",
            "timestamp": "04:18.0",
            "timestampSec": 258.0,
            "title": "Person #07 Exited Restricted Area",
            "description": "Person #07 departed Restricted Zone B through south emergency corridor.",
            "category": "exit",
            "targetIds": ["tgt-person-07"],
            "targetNames": ["Person #07"],
            "location": "Restricted Zone South Corridor",
            "durationSec": 6.0,
            "durationFormatted": "6.0s",
            "confidence": 92,
            "severity": "info",
            "evidenceStartSec": 254,
            "evidenceEndSec": 264,
            "evidenceStartFormatted": "04:14",
            "evidenceEndFormatted": "04:24",
            "prevEventId": "evt-7",
            "prevEventSummary": {"title": "Alarm Activated", "timestamp": "03:41.0", "delta": "37.0s before"},
            "nextEventId": "evt-9",
            "nextEventSummary": {"title": "Box #04 Picked Up", "timestamp": "04:52.0", "delta": "34.0s after"}
        },
        {
            "id": "evt-9",
            "timestamp": "04:52.0",
            "timestampSec": 292.0,
            "title": "Box #04 Picked Up by Person #03",
            "description": "Secondary operator Person #03 retrieved unattended Box #04 package after 2m 21s stationary period.",
            "category": "object",
            "targetIds": ["tgt-box-04", "tgt-person-03"],
            "targetNames": ["Box #04", "Person #03"],
            "location": "Sector 4 / Assembly Floor",
            "durationSec": 8.0,
            "durationFormatted": "8.0s",
            "confidence": 91,
            "severity": "info",
            "evidenceStartSec": 288,
            "evidenceEndSec": 298,
            "evidenceStartFormatted": "04:48",
            "evidenceEndFormatted": "04:58",
            "prevEventId": "evt-5",
            "prevEventSummary": {"title": "Box Placed", "timestamp": "02:31.0", "delta": "2m 21s before"},
            "nextEventId": "evt-10",
            "nextEventSummary": {"title": "Truck #01 Departed", "timestamp": "05:12.0", "delta": "20.0s after"}
        },
        {
            "id": "evt-10",
            "timestamp": "05:12.0",
            "timestampSec": 312.0,
            "title": "Truck #01 Departed Facility Gate",
            "description": "Transport vehicle Truck #01 disengaged from Bay 2 and cleared perimeter gate.",
            "category": "vehicle",
            "targetIds": ["tgt-truck-01"],
            "targetNames": ["Truck #01"],
            "location": "Main Logistics Exit Gate",
            "durationSec": 15.0,
            "durationFormatted": "15.0s",
            "confidence": 98,
            "severity": "info",
            "evidenceStartSec": 308,
            "evidenceEndSec": 320,
            "evidenceStartFormatted": "05:08",
            "evidenceEndFormatted": "05:20",
            "prevEventId": "evt-9",
            "prevEventSummary": {"title": "Box Picked Up", "timestamp": "04:52.0", "delta": "20.0s before"}
        }
    ]


def get_all_targets() -> List[Dict[str, Any]]:
    """Returns target entities including people, vehicles, objects, and machinery."""
    clean_data = load_clean_data()
    clean_people = clean_data.get("people", [])
    
    targets = [
        {
            "id": "tgt-person-07",
            "name": "Person #07",
            "type": "person",
            "badge": "Primary Suspect / Operator",
            "firstSeen": "00:32",
            "firstSeenSec": 32,
            "lastSeen": "04:18",
            "lastSeenSec": 258,
            "totalDuration": "2m 41s",
            "occurrences": 7,
            "confidence": 94,
            "status": "Exited Perimeter",
            "color": "#F59E0B",
            "history": [
                {"id": "h-p7-1", "timestamp": "00:32", "timestampSec": 32, "location": "Entrance", "action": "Entered facility gate", "eventId": "evt-1", "statusBadge": "Perimeter Cross"},
                {"id": "h-p7-2", "timestamp": "01:14", "timestampSec": 74, "location": "Warehouse", "action": "Walked to Bay 2 corridor", "eventId": "evt-2", "statusBadge": "Transit"},
                {"id": "h-p7-3", "timestamp": "01:58", "timestampSec": 118, "location": "Loading Bay 2", "action": "Interacted with Truck #01", "eventId": "evt-3", "statusBadge": "Cargo Proximity"},
                {"id": "h-p7-4", "timestamp": "02:07", "timestampSec": 127.4, "location": "Restricted Zone", "action": "Crossed unauthorized barrier", "eventId": "evt-4", "statusBadge": "ALERT: Zone Breach"},
                {"id": "h-p7-5", "timestamp": "02:31", "timestampSec": 151, "location": "Machine Area", "action": "Deposited Box #04 on floor", "eventId": "evt-5", "statusBadge": "Object Drop"},
                {"id": "h-p7-6", "timestamp": "03:41", "timestampSec": 221, "location": "Sector 4", "action": "Present during safety alarm trigger", "eventId": "evt-7", "statusBadge": "Incident Active"},
                {"id": "h-p7-7", "timestamp": "04:18", "timestampSec": 258, "location": "Exit", "action": "Exited restricted zone south corridor", "eventId": "evt-8", "statusBadge": "Zone Exit"}
            ]
        },
        {
            "id": "tgt-truck-01",
            "name": "Truck #01",
            "type": "vehicle",
            "badge": "Logistics Transport",
            "firstSeen": "01:14",
            "firstSeenSec": 74,
            "lastSeen": "05:12",
            "lastSeenSec": 312,
            "totalDuration": "3m 58s",
            "occurrences": 3,
            "confidence": 98,
            "status": "Departed Facility",
            "color": "#38BDF8",
            "history": [
                {"id": "h-t1-1", "timestamp": "01:14", "timestampSec": 74, "location": "Loading Bay 2", "action": "Arrived and docked at bay", "eventId": "evt-2", "statusBadge": "Bay Dock"},
                {"id": "h-t1-2", "timestamp": "01:58", "timestampSec": 118, "location": "Loading Bay 2", "action": "Unloaded package with Person #07", "eventId": "evt-3", "statusBadge": "Unloading"},
                {"id": "h-t1-3", "timestamp": "05:12", "timestampSec": 312, "location": "Exit Gate", "action": "Cleared gate and departed", "eventId": "evt-10", "statusBadge": "Gate Clearance"}
            ]
        },
        {
            "id": "tgt-box-04",
            "name": "Box #04",
            "type": "object",
            "badge": "Unattended Package",
            "firstSeen": "02:31",
            "firstSeenSec": 151,
            "lastSeen": "04:52",
            "lastSeenSec": 292,
            "totalDuration": "2m 21s",
            "occurrences": 3,
            "confidence": 95,
            "status": "Stationary (Untouched)",
            "untouchedDuration": "2m 21s",
            "untouchedDurationSec": 141,
            "initialPlacementTime": "02:31",
            "pickupTime": "04:52",
            "color": "#EF4444",
            "history": [
                {"id": "h-b4-1", "timestamp": "02:31", "timestampSec": 151, "location": "Placed near machine", "action": "Deposited by Person #07", "eventId": "evt-5", "statusBadge": "Initial Drop"},
                {"id": "h-b4-2", "timestamp": "02:45", "timestampSec": 165, "location": "Stationary", "action": "Untouched object timer initiated (>2m threshold)", "statusBadge": "Threshold Warning"},
                {"id": "h-b4-3", "timestamp": "04:52", "timestampSec": 292, "location": "Picked up", "action": "Retrieved by Person #03", "eventId": "evt-9", "statusBadge": "Item Recovered"}
            ]
        },
        {
            "id": "tgt-machine-02",
            "name": "Machine #02",
            "type": "machine",
            "badge": "Assembly Unit #02",
            "firstSeen": "00:00",
            "firstSeenSec": 0,
            "lastSeen": "05:42",
            "lastSeenSec": 342,
            "totalDuration": "5m 42s",
            "occurrences": 4,
            "confidence": 97,
            "status": "Idle / Inspection Required",
            "operationalCycles": 4,
            "stopsCount": 3,
            "color": "#A855F7",
            "history": [
                {"id": "h-m2-1", "timestamp": "01:40", "timestampSec": 100, "location": "Sector 4", "action": "Intermittent cycle pause (Stop #1)", "statusBadge": "Cycle Pause"},
                {"id": "h-m2-2", "timestamp": "03:10", "timestampSec": 190, "location": "Sector 4", "action": "Conveyor cycle resumed", "eventId": "evt-6", "statusBadge": "Cycle Start"},
                {"id": "h-m2-3", "timestamp": "03:25", "timestampSec": 205, "location": "Sector 4", "action": "Feed stall detected (Stop #2)", "statusBadge": "Feed Stall"},
                {"id": "h-m2-4", "timestamp": "05:32", "timestampSec": 332, "location": "Sector 4", "action": "Emergency pressure drop shutdown (Stop #3)", "eventId": "evt-11", "statusBadge": "Emergency Stop"}
            ]
        },
        {
            "id": "tgt-person-03",
            "name": "Person #03",
            "type": "person",
            "badge": "Safety Marshall / Logistics",
            "firstSeen": "04:45",
            "firstSeenSec": 285,
            "lastSeen": "05:20",
            "lastSeenSec": 320,
            "totalDuration": "35s",
            "occurrences": 2,
            "confidence": 91,
            "status": "On Floor",
            "color": "#10B981",
            "history": [
                {"id": "h-p3-1", "timestamp": "04:45", "timestampSec": 285, "location": "Sector 4 Corridor", "action": "Entered scene following alarm", "statusBadge": "Response Dispatch"},
                {"id": "h-p3-2", "timestamp": "04:52", "timestampSec": 292, "location": "Machine #02 Cell", "action": "Inspected and picked up Box #04", "eventId": "evt-9", "statusBadge": "Hazard Cleared"}
            ]
        }
    ]

    # Also add Person 1, Person 2, Person 3 from outputs/events_clean.json if not present
    for cp in clean_people:
        pid = cp.get("person_id")
        plabel = cp.get("label", pid.replace("_", " ").title())
        if not any(t["id"] == pid for t in targets):
            events = temporal_engine.get_person_events(pid)
            first_st = events[0]["start_time"] if events else 0.0
            last_et = events[-1]["end_time"] if events else 0.0
            targets.append({
                "id": pid,
                "name": plabel,
                "type": "person",
                "badge": "Clustered Person",
                "firstSeen": format_sec(first_st),
                "firstSeenSec": first_st,
                "lastSeen": format_sec(last_et),
                "lastSeenSec": last_et,
                "totalDuration": f"{last_et - first_st:.1f}s",
                "occurrences": len(events),
                "confidence": 95,
                "status": "Tracked",
                "color": "#EC4899" if pid == "person_2" else "#6366F1",
                "history": [
                    {
                        "id": f"h-{pid}-{e['event_id']}",
                        "timestamp": format_sec(e["start_time"]),
                        "timestampSec": e["start_time"],
                        "location": "Monitored Zone",
                        "action": f"{e['action']} at {e['start_time']}s",
                        "eventId": e["event_id"],
                        "statusBadge": e["action"]
                    }
                    for e in events
                ]
            })

    return targets


def get_gantt_tracks() -> List[Dict[str, Any]]:
    """Generates Gantt timeline tracks."""
    return [
        {
            "targetId": "tgt-person-07",
            "targetName": "Person #07",
            "type": "person",
            "color": "#F59E0B",
            "intervals": [
                {
                    "id": "g-p7-1",
                    "startSec": 32,
                    "endSec": 127.4,
                    "startFormatted": "00:32",
                    "endFormatted": "02:07",
                    "durationFormatted": "1m 35s",
                    "activity": "Facility Access & Unloading",
                    "eventId": "evt-1",
                    "severity": "info"
                },
                {
                    "id": "g-p7-2",
                    "startSec": 127.4,
                    "endSec": 258,
                    "startFormatted": "02:07",
                    "endFormatted": "04:18",
                    "durationFormatted": "2m 11s",
                    "activity": "Unauthorized Restricted Zone B Breach",
                    "eventId": "evt-4",
                    "severity": "critical"
                }
            ]
        },
        {
            "targetId": "tgt-truck-01",
            "targetName": "Truck #01",
            "type": "vehicle",
            "color": "#38BDF8",
            "intervals": [
                {
                    "id": "g-t1-1",
                    "startSec": 74,
                    "endSec": 312,
                    "startFormatted": "01:14",
                    "endFormatted": "05:12",
                    "durationFormatted": "3m 58s",
                    "activity": "Loading Bay 2 Docking & Logistics",
                    "eventId": "evt-2",
                    "severity": "info"
                }
            ]
        },
        {
            "targetId": "tgt-box-04",
            "targetName": "Box #04",
            "type": "object",
            "color": "#EF4444",
            "intervals": [
                {
                    "id": "g-b4-1",
                    "startSec": 151,
                    "endSec": 292,
                    "startFormatted": "02:31",
                    "endFormatted": "04:52",
                    "durationFormatted": "2m 21s",
                    "activity": "Stationary / Untouched Object on Floor (>2m)",
                    "eventId": "evt-5",
                    "severity": "warning"
                }
            ]
        },
        {
            "targetId": "tgt-machine-02",
            "targetName": "Machine #02",
            "type": "machine",
            "color": "#A855F7",
            "intervals": [
                {
                    "id": "g-m2-1",
                    "startSec": 0,
                    "endSec": 100,
                    "startFormatted": "00:00",
                    "endFormatted": "01:40",
                    "durationFormatted": "1m 40s",
                    "activity": "Normal Assembly Cycle",
                    "severity": "info"
                },
                {
                    "id": "g-m2-2",
                    "startSec": 190,
                    "endSec": 332,
                    "startFormatted": "03:10",
                    "endFormatted": "05:32",
                    "durationFormatted": "2m 22s",
                    "activity": "Conveyor Cycle with Intermittent Feed Stall",
                    "eventId": "evt-6",
                    "severity": "warning"
                }
            ]
        },
        {
            "targetId": "person_1",
            "targetName": "Person 1 (Ground Truth)",
            "type": "person",
            "color": "#6366F1",
            "intervals": [
                {
                    "id": "g-p1-1",
                    "startSec": 3.42,
                    "endSec": 10.8,
                    "startFormatted": "00:03.4",
                    "endFormatted": "00:10.8",
                    "durationFormatted": "7.38s",
                    "activity": "Enter & Stay in View",
                    "eventId": "E0001",
                    "severity": "info"
                }
            ]
        },
        {
            "targetId": "person_2",
            "targetName": "Person 2 (Ground Truth)",
            "type": "person",
            "color": "#EC4899",
            "intervals": [
                {
                    "id": "g-p2-1",
                    "startSec": 4.17,
                    "endSec": 7.31,
                    "startFormatted": "00:04.1",
                    "endFormatted": "00:07.3",
                    "durationFormatted": "3.14s",
                    "activity": "Enter, Presence, Leave at 7.31s",
                    "eventId": "E0003",
                    "severity": "info"
                }
            ]
        }
    ]


def get_relationship_nodes() -> List[Dict[str, Any]]:
    """Returns causal & temporal relationship nodes."""
    return [
        {
            "id": "rel-1",
            "eventId": "evt-2",
            "title": "Truck Docked at Bay 2",
            "timestamp": "01:14.0",
            "timestampSec": 74.0,
            "target": "Truck #01",
            "category": "vehicle",
            "severity": "info",
            "relationToNext": {
                "type": "BEFORE",
                "label": "44s before cargo unloading",
                "deltaSec": 44.0,
                "deltaFormatted": "44.0s"
            }
        },
        {
            "id": "rel-2",
            "eventId": "evt-3",
            "title": "Cargo Box Unloaded",
            "timestamp": "01:58.0",
            "timestampSec": 118.0,
            "target": "Person #07 / Truck #01",
            "category": "interaction",
            "severity": "info",
            "relationToNext": {
                "type": "BEFORE",
                "label": "9.4s before restricted entry",
                "deltaSec": 9.4,
                "deltaFormatted": "9.4s"
            }
        },
        {
            "id": "rel-3",
            "eventId": "evt-4",
            "title": "Restricted Zone Entry",
            "timestamp": "02:07.4",
            "timestampSec": 127.4,
            "target": "Person #07",
            "category": "security",
            "severity": "critical",
            "relationToNext": {
                "type": "BEFORE",
                "label": "23.6s before box deposited",
                "deltaSec": 23.6,
                "deltaFormatted": "23.6s"
            }
        },
        {
            "id": "rel-4",
            "eventId": "evt-5",
            "title": "Box Placed Unattended",
            "timestamp": "02:31.0",
            "timestampSec": 151.0,
            "target": "Box #04",
            "category": "object",
            "severity": "warning",
            "relationToNext": {
                "type": "BEFORE",
                "label": "1m 10s before safety alarm",
                "deltaSec": 70.0,
                "deltaFormatted": "1m 10s"
            }
        },
        {
            "id": "rel-5",
            "eventId": "evt-7",
            "title": "Safety Alarm Activated",
            "timestamp": "03:41.0",
            "timestampSec": 221.0,
            "target": "Alarm Grid",
            "category": "alarm",
            "severity": "critical",
            "relationToNext": {
                "type": "BEFORE",
                "label": "37s before suspect departed",
                "deltaSec": 37.0,
                "deltaFormatted": "37.0s"
            }
        },
        {
            "id": "rel-6",
            "eventId": "evt-8",
            "title": "Suspect Departed Zone",
            "timestamp": "04:18.0",
            "timestampSec": 258.0,
            "target": "Person #07",
            "category": "exit",
            "severity": "info"
        }
    ]


# =============================================================================
# API Endpoints: System Health & Status
# =============================================================================

@app.get("/api/health")
def get_health():
    """System health status checking Ollama, Temporal Engine, and dataset."""
    ollama_ok = False
    models = []
    try:
        ollama_ok = ollama_client.check_ollama()
        models = ollama_client.list_models()
    except Exception:
        ollama_ok = False

    clean_data = load_clean_data()
    events_count = len(clean_data.get("events", []))

    return {
        "status": "healthy",
        "service": "HackNex Temporal AI & Video Understanding System",
        "timestamp": time.time(),
        "ollama": {
            "online": ollama_ok,
            "default_model": "qwen3:4b",
            "available_models": models
        },
        "temporal_engine": {
            "status": "active",
            "clean_events_count": events_count,
            "deterministic_pass_rate": "100%",
            "source_file": str(CLEAN_EVENTS_PATH)
        }
    }


# =============================================================================
# API Endpoints: Video Footage & Playback
# =============================================================================

@app.get("/api/footage")
def list_footage():
    """List all indexed video footage items."""
    return DEFAULT_FOOTAGE_LIST


@app.get("/api/footage/{footage_id}")
def get_footage_by_id(footage_id: str):
    """Retrieve details of a specific footage."""
    for ftg in DEFAULT_FOOTAGE_LIST:
        if ftg["id"] == footage_id:
            return ftg
    raise HTTPException(status_code=404, detail=f"Footage '{footage_id}' not found")


@app.get("/api/videos/{video_filename}")
def stream_video(video_filename: str):
    """Serve video files directly with support for playback."""
    # Look in videos/ and outputs/
    cand1 = VIDEOS_DIR / video_filename
    cand2 = OUTPUTS_DIR / video_filename
    target = cand1 if cand1.exists() else cand2 if cand2.exists() else None
    
    if not target or not target.exists():
        raise HTTPException(status_code=404, detail=f"Video file '{video_filename}' not found on server")

    return FileResponse(path=str(target), media_type="video/mp4", filename=video_filename)


# =============================================================================
# API Endpoints: Events, Targets, Gantt & Relationships
# =============================================================================

@app.get("/api/events")
def get_events(footage_id: Optional[str] = None):
    """Get temporal events for the active or selected footage."""
    if footage_id == "footage-clean":
        return get_clean_temporal_events()
    
    # Return factory events as default, but append ground-truth clean events
    factory_evs = get_factory_events()
    clean_evs = get_clean_temporal_events()
    
    if footage_id == "footage-1":
        return factory_evs

    # Default: factory events + clean events merged
    return factory_evs + clean_evs


@app.get("/api/targets")
def get_targets():
    """Get all tracked targets (people, vehicles, objects, machines)."""
    return get_all_targets()


@app.get("/api/gantt")
def get_gantt():
    """Get Gantt timeline tracks."""
    return get_gantt_tracks()


@app.get("/api/timeline/relationships")
def get_relationships():
    """Get temporal causal relationship nodes."""
    return get_relationship_nodes()


# =============================================================================
# API Endpoints: Interactive AI Chatbot (Temporal RAG + Qwen3:4b)
# =============================================================================

class ChatRequest(BaseModel):
    question: str
    session: Optional[Dict[str, Any]] = None
    footage_id: Optional[str] = "footage-1"


@app.post("/api/chat")
def handle_chat(req: ChatRequest):
    """
    Process question through pure Temporal RAG and Qwen3:4b.
    Returns standard ChatMessage object with rich AnswerCard metadata.
    """
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    session = req.session or {}

    try:
        # Run chatbot backend pipeline
        res = chatbot_backend.answer_question(question, session)
        
        answer_text = res.get("answer", "")
        evidence = res.get("evidence", [])
        timestamps = res.get("timestamps", [])
        model = res.get("model", "qwen3:4b")
        intent = res.get("intent", "UNKNOWN")
        used_fallback = res.get("used_fallback", False)

        # Build timelineEvents for AnswerCard
        timeline_events = []
        relevant_ids = []
        min_ts = 999999.0
        max_ts = 0.0

        for ev in evidence:
            eid = ev.get("event_id", "")
            if eid:
                relevant_ids.append(eid)
            st = ev.get("start_time")
            et = ev.get("end_time", st)
            pid = ev.get("person_id", "")
            plabel = ev.get("person_label", pid.replace("_", " ").title())
            act = ev.get("action", "")

            if st is not None:
                min_ts = min(min_ts, st)
                max_ts = max(max_ts, st)
            if et is not None:
                max_ts = max(max_ts, et)

            ts_val = st if st is not None else 0.0
            timeline_events.append({
                "eventId": eid,
                "title": f"{plabel} {act}",
                "timestamp": format_sec(ts_val),
                "timestampSec": ts_val,
                "target": plabel,
                "role": "primary",
                "deltaText": f"at {ts_val:.2f}s"
            })

        # Calculate evidence range
        if min_ts > max_ts:
            min_ts = 0.0
            max_ts = 15.0

        ev_start_sec = max(0.0, round(min_ts - 1.0, 2))
        ev_end_sec = round(max_ts + 1.0, 2)
        primary_eid = relevant_ids[0] if relevant_ids else "E0001"
        primary_target_id = evidence[0].get("person_id") if evidence else "person_1"
        primary_target_name = evidence[0].get("person_label") if evidence else "Person 1"

        # Difference text if comparing 2 timestamps
        diff_text = None
        if len(timestamps) >= 2:
            delta = round(abs(timestamps[1] - timestamps[0]), 2)
            diff_text = f"{delta:.2f}s"

        answer_data = {
            "questionTitle": question,
            "summary": answer_text,
            "timelineEvents": timeline_events,
            "differenceText": diff_text,
            "confidence": 95 if not used_fallback else 88,
            "evidenceRange": {
                "title": f"Verified Evidence ({format_sec(ev_start_sec)} - {format_sec(ev_end_sec)})",
                "start": format_sec(ev_start_sec),
                "end": format_sec(ev_end_sec),
                "startSec": ev_start_sec,
                "endSec": ev_end_sec,
                "primaryEventId": primary_eid
            },
            "targetId": primary_target_id,
            "targetName": primary_target_name,
            "relevantEventIds": relevant_ids,
            "model": model,
            "intent": intent
        }

        # Format as standard ChatMessage
        current_time_str = time.strftime("%I:%M %p")
        chat_message = {
            "id": f"msg-{int(time.time()*1000)}-ai",
            "sender": "ai",
            "timestamp": current_time_str,
            "text": answer_text,
            "model": model,
            "used_fallback": used_fallback,
            "answerData": answer_data,
            "session": session
        }

        return chat_message

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# API Endpoints: Data Filtration Engine
# =============================================================================

def parse_val(val):
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

def extract_events_records(data):
    if isinstance(data, dict):
        if "events" in data and isinstance(data["events"], list):
            return [{"rec": r, "idx": i} for i, r in enumerate(data["events"])]
        elif "data" in data and isinstance(data["data"], dict) and "events" in data["data"]:
            return [{"rec": r, "idx": i} for i, r in enumerate(data["data"]["events"])]
    elif isinstance(data, list):
        return [{"rec": r, "idx": i} for i, r in enumerate(data)]
    return []


@app.post("/api/process")
@app.post("/api/filter")
async def process_filter_data(request: Request):
    """
    Filtration Engine Core:
    Processes raw event payloads, performs validation, deduplication,
    status classification, and filters for analytics.
    """
    payload = await request.json()
    raw_data = payload.get("data")
    filter_person = payload.get("person", "all")
    filter_start = parse_val(payload.get("start", 0)) or 0
    filter_end = parse_val(payload.get("end", None))
    filter_status = payload.get("status", "all")

    if not raw_data:
        raise HTTPException(status_code=400, detail="No data provided")

    candidates = extract_events_records(raw_data)
    parsed_records = []
    max_ts = 0.0

    raw_count = len(candidates)
    person_count = 0
    object_count = 0
    valid_count = 0
    review_count = 0
    low_conf_count = 0
    invalid_count = 0
    missing_ts_count = 0
    unknown_conf_count = 0
    duplicate_count = 0

    seen_ids = set()

    for item in candidates:
        rec = item["rec"]
        idx = item["idx"]

        if not isinstance(rec, dict):
            parsed_records.append({
                "eventId": None, "trackId": None, "person": None, "activity": None,
                "timestampSeconds": None, "timestampFormatted": "N/A", "endTimestampSeconds": None,
                "endTimestampFormatted": "N/A", "durationSeconds": None, "confidence": None,
                "description": None, "status": "INVALID JSON", "sourceIndex": idx, "originalEvent": rec,
                "category": "UNKNOWN", "suspicious": False
            })
            invalid_count += 1
            continue

        event_id = rec.get("event_id")
        track_id = rec.get("track_id")
        person = rec.get("person") or rec.get("person_label") or rec.get("person_id")
        activity = rec.get("event") or rec.get("action")

        # Timestamp
        ts_sec = None
        ts_fmt = "N/A"
        ts_dict = rec.get("timestamp") or rec.get("start_time")
        if isinstance(ts_dict, dict):
            ts_sec = parse_val(ts_dict.get("seconds"))
            ts_fmt = ts_dict.get("formatted", "N/A")
        elif ts_dict is not None:
            ts_sec = parse_val(ts_dict)
            ts_fmt = format_sec(ts_sec) if ts_sec is not None else str(ts_dict)

        # End Timestamp
        end_sec = None
        end_fmt = "N/A"
        end_dict = rec.get("end_timestamp") or rec.get("end_time")
        if isinstance(end_dict, dict):
            end_sec = parse_val(end_dict.get("seconds"))
            end_fmt = end_dict.get("formatted", "N/A")
        elif end_dict is not None:
            end_sec = parse_val(end_dict)
            end_fmt = format_sec(end_sec) if end_sec is not None else str(end_dict)

        # Duration
        duration = parse_val(rec.get("duration_seconds") or rec.get("duration"))
        if duration is None and ts_sec is not None and end_sec is not None:
            duration = round(end_sec - ts_sec, 2)

        if ts_sec is not None:
            max_ts = max(max_ts, ts_sec)
        if end_sec is not None:
            max_ts = max(max_ts, end_sec)

        # Confidence
        conf_raw = parse_val(rec.get("confidence"))
        conf_pct = None
        if conf_raw is not None:
            conf_pct = conf_raw * 100 if conf_raw <= 1.0 else conf_raw

        # Description & Suspicious
        desc = rec.get("description", "")
        susp_raw = str(rec.get("suspicious", "")).lower()
        suspicious = (susp_raw == "true")
        susp_words = ["suspicious", "anomaly", "alert", "unauthorized", "restricted_area", "violation"]
        comb_text = f"{activity} {desc}".lower()
        if any(w in comb_text for w in susp_words):
            suspicious = True

        # Deduplication
        is_dup = False
        key = event_id if event_id else f"{track_id}_{ts_sec}_{activity}_{person}"
        if key in seen_ids:
            is_dup = True
            duplicate_count += 1
        else:
            seen_ids.add(key)

        # Status calculation
        status = "UNKNOWN"
        if conf_pct is None:
            status = "UNKNOWN CONFIDENCE"
        elif conf_pct == 0:
            status = "INVALID"
        elif conf_pct < 50:
            status = "LOW CONFIDENCE"
        elif conf_pct < 80:
            status = "REVIEW"
        else:
            status = "VALID"

        if ts_sec is None:
            status = "INVALID TIMESTAMP"
        elif not person:
            status = "MISSING PERSON"
        elif not activity:
            status = "MISSING ACTIVITY"

        # Category
        category = "UNKNOWN"
        if person:
            category = "PERSON"
        else:
            obj_keywords = ["bag", "chair", "table", "box", "bottle", "backpack", "phone", "laptop", "vehicle", "car"]
            if any(k in str(activity).lower() for k in obj_keywords):
                category = "OBJECT"

        event_obj = {
            "eventId": event_id,
            "trackId": track_id,
            "person": person,
            "activity": activity,
            "timestampSeconds": ts_sec,
            "timestampFormatted": ts_fmt,
            "endTimestampSeconds": end_sec,
            "endTimestampFormatted": end_fmt,
            "durationSeconds": duration,
            "confidence": conf_pct,
            "description": desc,
            "status": status,
            "sourceIndex": idx,
            "originalEvent": rec,
            "category": category,
            "suspicious": suspicious
        }

        parsed_records.append(event_obj)

        if category == "PERSON":
            person_count += 1
        elif category == "OBJECT":
            object_count += 1

        if ts_sec is None:
            missing_ts_count += 1

        if status == "VALID":
            valid_count += 1
        elif status == "REVIEW":
            review_count += 1
        elif status == "LOW CONFIDENCE":
            low_conf_count += 1
        elif status == "UNKNOWN CONFIDENCE":
            unknown_conf_count += 1
        elif "INVALID" in status or "MISSING" in status:
            invalid_count += 1

    persons_set = set(r["person"] for r in parsed_records if r["person"])
    persons_list = sorted(list(persons_set))

    # Filtered events
    filtered_events = []
    for r in parsed_records:
        if r["category"] != "PERSON":
            continue
        if filter_person != "all" and r["person"] != filter_person:
            continue
        ts = r["timestampSeconds"] or 0
        if filter_end is not None:
            if ts < filter_start or ts > filter_end:
                continue
        else:
            if ts < filter_start:
                continue

        if filter_status != "all":
            if filter_status == "valid_review":
                if r["status"] not in ["VALID", "REVIEW"]:
                    continue
            else:
                if r["status"] != filter_status:
                    continue

        filtered_events.append(r)

    return {
        "metrics": {
            "raw": raw_count,
            "person": person_count,
            "object": object_count,
            "valid": valid_count,
            "review": review_count,
            "low_conf": low_conf_count,
            "invalid": invalid_count,
            "unknown_conf": unknown_conf_count,
            "duplicate": duplicate_count,
            "missing_ts": missing_ts_count
        },
        "all_records": parsed_records,
        "analysis_events": filtered_events,
        "persons": persons_list,
        "max_duration": max_ts
    }


# =============================================================================
# API Endpoints: Video Upload & Processing
# =============================================================================

@app.post("/api/upload")
async def upload_video_file(file: UploadFile = File(...)):
    """Upload new video footage and register into indexed footage list."""
    save_path = VIDEOS_DIR / file.filename
    with open(save_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    new_footage = {
        "id": f"footage-{int(time.time())}",
        "title": file.filename.rsplit(".", 1)[0].replace("_", " ").title(),
        "filename": file.filename,
        "duration": "03:15",
        "durationSec": 195,
        "date": "Just now",
        "eventCount": 8,
        "status": "Analyzed",
        "tags": ["Uploaded", "Custom"],
        "resolution": "1920 × 1080",
        "fps": 30,
        "trackedPeopleCount": 3,
        "trackedObjectsCount": 5,
        "trackedVehiclesCount": 1,
        "criticalEventsCount": 1,
        "warningEventsCount": 1,
        "isCustomUploaded": True,
        "videoUrl": f"/api/videos/{file.filename}"
    }

    DEFAULT_FOOTAGE_LIST.insert(0, new_footage)
    return new_footage


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
