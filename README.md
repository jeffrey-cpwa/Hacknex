# HackNex — Temporal AI & CCTV Video Understanding Platform

[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Vite-61DAFB.svg)](https://reactjs.org/)
[![YOLO11](https://img.shields.io/badge/Vision-YOLO11%20%2B%20ByteTrack-FF6F00.svg)](https://github.com/ultralytics/ultralytics)
[![Ollama](https://img.shields.io/badge/LLM-Ollama%20Qwen3:4b-purple.svg)](https://ollama.com/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20SQLite-336791.svg)](https://www.sqlalchemy.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**HackNex** is an end-to-end, forensic-grade CCTV video intelligence platform that bridges Computer Vision, automated data filtration, relational database storage, deterministic temporal reasoning, and local Large Language Models (Qwen3:4b).

It transforms raw, unstructured multi-camera video footage into an interactive, conversational forensic investigation hub where investigators can inspect raw feeds, watch trajectory-mapped object-tracked video streams, visualize chronological timelines, and query footage in natural language with **100% verified, hallucination-free timestamp evidence**.

---

## 📑 Table of Contents

- [Working Methodology & Pipeline](#-working-methodology--pipeline)
- [Current Features](#-current-features)
  - [1. Multi-Video & Camera Stream Management](#1-multi-video--camera-stream-management)
  - [2. Upload Page & Raw Video Inspection](#2-upload-page--raw-video-inspection)
  - [3. Video Analysis & Object-Tracked Mapped Video](#3-video-analysis--object-tracked-mapped-video)
  - [4. Data Filtration & Cleaning Engine](#4-data-filtration--cleaning-engine)
  - [5. SQL Database Storage Layer](#5-sql-database-storage-layer)
  - [6. Deterministic Temporal Engine](#6-deterministic-temporal-engine)
  - [7. Temporal RAG & Hybrid Retrieval](#7-temporal-rag--hybrid-retrieval)
  - [8. Conversational AI Chatbot (Qwen3:4b)](#8-conversational-ai-chatbot-qwen34b)
  - [9. Multi-Modal Timeline & Entity Exploration](#9-multi-modal-timeline--entity-exploration)
- [Upcoming Features & Roadmap](#-upcoming-features--roadmap)
- [System Architecture](#-system-architecture)
- [Repository Structure](#-repository-structure)
- [Quickstart & Installation](#-quickstart--installation)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Local Ollama Qwen3:4b Setup](#2-local-ollama-qwen34b-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [API Reference](#-api-reference)
- [Verification & Test Suites](#-verification--test-suites)
- [License](#-license)

---

## 🔄 Working Methodology & Pipeline

HackNex adheres to a strict architectural rule: **Deterministic ground truth is the sole authority**. Large Language Models are never permitted to guess, fabricate, or hallucinate timestamps, person identities, or temporal ordering.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           1. RAW FOOTAGE UPLOAD                           │
│   User uploads CCTV MP4/AVI/MKV video or selects existing camera stream  │
│             Preview available immediately in Raw Video Player             │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                      2. NEURAL TRACKING & DETECTION                       │
│     YOLO11 (Object Detection) + ByteTrack (Multi-Object Tracking)         │
│     Automatic Person Clustering & Spatial Trajectory Generation           │
│     Outputs: Marked video with bounding boxes + raw events JSON           │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                      3. DATA FILTRATION ENGINE                            │
│     clean_events.py (clean_dict): Normalizes timestamps (MM:SS -> sec)    │
│     Eliminates jitter, merges duplicate detections, validates schema      │
│     Classifies events into ENTER, LEAVE, STAY, SHORT_STAY, ANOMALY        │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                      4. SQL DATABASE PERSISTENCE                          │
│     PostgreSQL / SQLite (outputs/hacknex.db via SQLAlchemy ORM)           │
│     Tables: videos, raw_events, filtered_events, chat_sessions, messages  │
│     Isolates events, targets, and tracks strictly per camera footage ID   │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
┌───────────────────────────────────┐       ┌───────────────────────────────────┐
│     5. VIDEO ANALYSIS & TIMELINE  │       │     6. TEMPORAL RAG & AI CHAT     │
│  - Mapped video playback (206)    │       │  - User asks natural language Q   │
│  - Incident Timeline markers      │       │  - Intent parsed by query_parser  │
│  - Gantt duration intervals       │       │  - Deterministic temporal engine  │
│  - Entity trajectory cards        │       │  - Verified evidence retrieved    │
│  - Temporal relationship graphs   │       │  - Ollama Qwen3:4b drafts answer  │
└───────────────────────────────────┘       └───────────────────────────────────┘
```

### Detailed Pipeline Stages:
1. **Source Ingestion & Raw Preview**: The raw video file is uploaded to the backend `videos/` folder. The upload page provides immediate playback of the unmanipulated camera stream.
2. **Object Tracking & Annotation**: The vision pipeline executes YOLO11 object detection and ByteTrack association across frames, rendering an annotated video (`outputs/marked_video.mp4` / `tracked.mp4`) with bounding boxes, person IDs, and track paths.
3. **Data Cleaning & Filtration**: Raw detection events are routed to `clean_events.py`. The engine normalizes disparate time formats (`00:04.2`, `4.17s`, `250 frames`), merges overlapping window detections, computes durations, and outputs verified events into `outputs/events_clean.json`.
4. **Relational Database Sync**: Filtered events are stored in the SQL Database with foreign keys linking directly to the specific `VideoFootage` record. This guarantees zero data contamination between different cameras.
5. **Interactive Video Analysis**: The frontend streams mapped videos using HTTP 206 Partial Content byte ranges, synchronizing video scrubbers with database event markers and interactive timecode popups.
6. **Grounded Temporal Reasoning & RAG**: When an investigator asks a question (e.g., *"When did Person 2 leave?"*), `query_parser.py` classifies the query intent, `temporal_engine.py` executes exact deterministic timestamp logic on the active video's database records, and `ollama_client.py` uses Qwen3:4b to articulate a concise, natural response referencing the verified event ID.

---

## 🚀 Current Features

### 1. Multi-Video & Camera Stream Management
- **Multi-Camera Isolation**: Supports any number of distinct cameras and video files simultaneously.
- **Seeded Surveillance Presets**:
  - **Camera 01**: *Main Entrance Surveillance* (`marked_video.mp4` mapped / `test.mp4` raw) — 8 verified events.
  - **Camera 02**: *Loading Bay & Corridor* (`tracked.mp4` mapped / `test2.mp4` raw) — 6 verified events.
  - **Camera 03**: *Perimeter Patrol* (`auto_people.mp4` mapped / `test3.mp4` raw) — 5 verified events.
- **Per-Video Event Scoping**: Switching the camera immediately updates the video stream, incident markers, target identities, Gantt intervals, relationship graphs, and AI investigation memory.

### 2. Upload Page & Raw Video Inspection
- **Raw Camera Stream Viewer**: High-resolution video player embedded directly on the upload page allowing investigators to view the original untracked source video before running neural analysis.
- **Drag-and-Drop Dropzone**: Supports `MP4`, `MOV`, `AVI`, and `MKV` video files.
- **Progressive Pipeline Telemetry**: Step-by-step progress animation displaying video upload, frame extraction, object detection, person tracking, event generation, and timeline compilation.
- **Card Action Bar**: Footage cards allow single-click toggling between **Raw Preview** and **Video Analysis**.

### 3. Video Analysis & Object-Tracked Mapped Video
- **Mapped Stream Playback**: Displays the object-tracked video with bounding boxes, person identification IDs, and trajectory paths.
- **Interactive Camera Switcher Bar**: Seamless pill buttons at the top of the workspace to toggle between Camera 01, Camera 02, Camera 03, or custom uploaded videos in one click.
- **Forensic Transport Controls**: Play/pause, frame restart, speed selector (0.5x, 1x, 1.5x, 2x), mute, timecode readout (`MM:SS.S`), and fullscreen.
- **Synchronized Scrubber Markers**: Scrubber timeline includes color-coded event tick marks (critical alerts in red, warnings in amber, informational events in cyan). Clicking any marker seeks the video to that exact millisecond.

### 4. Data Filtration & Cleaning Engine
- **Field Normalization**: Resolves arbitrary field variants (`timestamp`, `start_time`, `frame_time`, `activity`, `action`, `confidence`).
- **Timestamp Standardization**: Converts all timestamps into floating-point seconds and standard `MM:SS.S` display strings.
- **Deduplication & De-jittering**: Merges multiple split detections of the same individual entering or exiting into consolidated event records.
- **Audit Logging**: Classifies each candidate event into `VALID`, `REVIEW`, `LOW CONFIDENCE`, or `INVALID`.

### 5. SQL Database Storage Layer
- **Dual Engine Architecture**: Supports production PostgreSQL via connection string with seamless zero-config SQLite local fallback (`outputs/hacknex.db`).
- **Relational Schema**:
  - `videos`: Footage metadata, URLs, duration, resolution, FPS, and status.
  - `raw_events`: Unfiltered vision inference detections.
  - `filtered_events`: Verified events with severity, confidence, duration, and evidence bounds.
  - `chat_sessions`: Saved investigation history sessions.
  - `chat_messages`: User questions, AI answers, verified evidence payloads, and models used.

### 6. Deterministic Temporal Engine
- **Source of Truth**: Passes **42/42 unit tests** in `test_temporal_engine.py`.
- **Supported Deterministic Queries**:
  - First / last person to enter or leave.
  - Duration of stay per individual.
  - Co-occurrence & concurrent presence (who was in the room together).
  - Sequence & relative ordering (what happened before/after event X).
  - Short stay anomaly detection.
- **Dynamic Context Reloading**: Dynamically reloads ground-truth datasets per camera so queries reflect the active video footage.

### 7. Temporal RAG & Hybrid Retrieval
- **Intent Detection**: Analyzes questions with pattern matching and semantic understanding in `query_parser.py`.
- **Hybrid Retrieval**: Combines sentence-transformers vector embeddings (`all-MiniLM-L6-v2`) with deterministic temporal rules.
- **Verified Evidence Range**: Extracts precise start and end window timestamps (`evidence_start`, `evidence_end`) for forensic validation.

### 8. Conversational AI Chatbot (Qwen3:4b)
- **Local Ollama Inference**: Direct integration with local `qwen3:4b` running on `http://localhost:11434`.
- **Zero Hallucination Guarantee**: If Ollama or Qwen is offline, the chatbot automatically falls back to deterministic rule-based response synthesis.
- **Interactive Chat Interface**:
  - Natural language questions and answers.
  - Verified Evidence Cards with clickable timestamps that jump the video player to the event.
  - Saved previous investigations in the sidebar for resuming forensic sessions.

### 9. Multi-Modal Timeline & Entity Exploration
- **Incident Timeline**: Chronological event cards displaying target tags, severity indicators, and elapsed time deltas.
- **Gantt Interval Timeline**: Continuous horizontal duration bars visualizing person presence across video duration.
- **Target Tracking**: Profile cards per identified individual (Person 1, Person 2, Person 3) showing total appearances, initial entry, and final exit.
- **Temporal Relationships**: Node network graph displaying sequential temporal dependencies (*"3.14s before Person 2 LEAVE"*).

---

## 🔮 Upcoming Features & Roadmap

- [ ] **Live RTSP CCTV Stream Ingestion**: Direct streaming from IP cameras with background worker queues for continuous 24/7 inference.
- [ ] **Cross-Camera Re-Identification (ReID)**: Deep person re-identification using OSNet embeddings to track the same target moving across multiple physical CCTV cameras.
- [ ] **Automated Perimeter Defense & Webhook Alerts**: Real-time webhook notifications (Slack, Discord, Telegram, SMS) triggered when anomalous short stays or unauthorized entry events occur.
- [ ] **Distributed Vector Database**: Migration support for Milvus or Qdrant for scaling to thousands of hours of historical footage.
- [ ] **Face Recognition & Watchlist Matching**: Integrated InsightFace matching against registered authorized personnel and security watchlists.
- [ ] **Cloud Multi-Tenant Deployment**: Helm charts and Docker Compose manifests for AWS ECS/EKS with S3/MinIO bucket storage for video blobs.
- [ ] **Exportable Forensic PDF Reports**: One-click generation of court-admissible forensic incident reports with embedded keyframe captures, timeline logs, and hash integrity proofs.

---

## 🏗 System Architecture

```
                  ┌─────────────────────────────────────┐
                  │          Browser Client             │
                  │     (React 19 + TypeScript + Vite)  │
                  └───────────────┬─────────────────────┘
                                  │  REST / Range (206)
                                  ▼
┌───────────────────────────────────────────────────────────────────────┐
│                       FastAPI Application Gateway                     │
│                            (backend/main.py)                          │
├───────────────────────────────┬───────────────────────────────────────┤
│    Video Streaming Service    │        Data Filtration Pipeline       │
│  - GET /api/videos/raw/{file} │  - POST /api/upload                   │
│  - GET /api/videos/{file}     │  - POST /api/filter (clean_events.py) │
├───────────────────────────────┼───────────────────────────────────────┤
│    Timeline & Target Service  │       Conversational AI Service       │
│  - GET /api/events            │  - POST /api/chat                     │
│  - GET /api/targets           │  - GET  /api/chat/sessions            │
│  - GET /api/gantt             │  - GET  /api/chat/sessions/{id}       │
└───────────────┬───────────────┴───────────────────┬───────────────────┘
                │                                   │
                ▼                                   ▼
┌───────────────────────────────┐   ┌───────────────────────────────────┐
│     SQL Database Storage      │   │     Temporal RAG Intelligence     │
│   (PostgreSQL / SQLite)       │   │                                   │
│  - VideoFootage               │   │  ┌─────────────────────────────┐  │
│  - FilteredEvent              │   │  │ query_parser.py             │  │
│  - RawEvent                   │   │  └──────────────┬──────────────┘  │
│  - ChatSession                │   │                 ▼                 │
│  - ChatMessage                │   │  ┌─────────────────────────────┐  │
└───────────────────────────────┘   │  │ temporal_engine.py          │  │
                                    │  │ (Deterministic Source)      │  │
                                    │  └──────────────┬──────────────┘  │
                                    │                 ▼                 │
                                    │  ┌─────────────────────────────┐  │
                                    │  │ ollama_client.py (Qwen3:4b) │  │
                                    │  └─────────────────────────────┘  │
                                    └───────────────────────────────────┘
```

---

## 📂 Repository Structure

```
HackNex/
├── backend/
│   ├── database.py              # SQLAlchemy DB models, PostgreSQL/SQLite engine & seed data
│   └── main.py                  # FastAPI REST API endpoints & video streaming service
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/            # Interactive AI chat, message list, thinking steps
│   │   │   ├── layout/          # Sidebar navigation, TopHeader with camera status
│   │   │   ├── timeline/        # Incident markers, Gantt tracks, Relationship graph
│   │   │   ├── upload/          # UploadPage, Raw Video Player, FootageCard
│   │   │   └── video/           # VideoWorkspace, VideoPlayer (Mapped Stream), EventsPanel
│   │   ├── context/
│   │   │   └── AppContext.tsx   # Global React context, multi-camera state & sync
│   │   ├── services/
│   │   │   └── api.ts           # Axios/Fetch API client connecting to backend
│   │   └── types/
│   │       └── index.ts         # TypeScript interfaces (Footage, Event, Target, etc.)
│   ├── package.json
│   └── vite.config.ts
├── filtration_engine/           # Static browser-based JSON cleaning visualization UI
│   ├── index.html
│   ├── style.css
│   └── app.js
├── outputs/
│   ├── events.json              # Raw events from vision pipeline
│   ├── events_raw.json          # Formatted candidate detection records
│   ├── events_clean.json        # Normalized, deduplicated, verified events
│   ├── hacknex.db               # Local SQLite database (auto-generated)
│   ├── marked_video.mp4         # Object-tracked video stream (Camera 01)
│   ├── tracked.mp4              # Object-tracked video stream (Camera 02)
│   └── auto_people.mp4          # Object-tracked video stream (Camera 03)
├── videos/
│   ├── test.mp4                 # Raw CCTV video feed (Camera 01)
│   ├── test2.mp4                # Raw CCTV video feed (Camera 02)
│   └── test3.mp4                # Raw CCTV video feed (Camera 03)
├── clean_events.py              # Core Python data cleaning & normalization engine
├── temporal_engine.py           # Deterministic temporal reasoning engine (42/42 tests)
├── query_parser.py              # Natural language query intent classifier
├── temporal_retriever.py        # Hybrid semantic + deterministic evidence retriever
├── vector_store.py              # Vector embeddings using sentence-transformers
├── event_documents.py           # Text serialization of structured temporal events
├── temporal_rag.py              # Temporal RAG pipeline coordinator
├── ollama_client.py             # Ollama HTTP API connector (Qwen3:4b)
├── chatbot_backend.py           # Answer synthesis combining evidence & LLM
├── chatbot.py                   # Terminal-based interactive AI chat demo
├── test_temporal_engine.py      # 42 unit tests for deterministic engine
├── test_temporal_rag.py         # 100 assertion test suite for temporal RAG
└── README.md
```

---

## ⚡ Quickstart & Installation

### Prerequisites
- **Python**: 3.10, 3.11, or 3.12
- **Node.js**: v18+ or v22+
- **Ollama**: (Optional for local LLM synthesis, fallback engine included)
  - Install Ollama from [ollama.com](https://ollama.com)
  - Pull model: `ollama run qwen3:4b`

---

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/jeffrey-cpwa/Hacknex.git
cd HackNex

# Create and activate virtual environment
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-multipart sentence-transformers numpy
```

Start the FastAPI backend:
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend initializes the database schema and seeds the 3 CCTV cameras automatically.
- Swagger API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

---

### 2. Local Ollama Qwen3:4b Setup

Ensure Ollama is running locally:
```bash
ollama serve
ollama pull qwen3:4b
```
Verify the model responds:
```bash
curl http://localhost:11434/api/tags
```

---

### 3. Frontend Setup

In a separate terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev -- --host 0.0.0.0 --port 5173
```
Open `http://localhost:5173` in your browser.

---

## 📡 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check verifying Ollama, Qwen3:4b, SQL DB, and records count |
| `GET` | `/api/footage` | Returns all registered CCTV footage camera streams |
| `GET` | `/api/footage/{id}` | Returns metadata for a specific footage item |
| `GET` | `/api/videos/raw/{filename}` | Streams raw uploaded source video (`test.mp4`) via HTTP 206 Partial Content |
| `GET` | `/api/videos/{filename}` | Streams mapped object-tracked video (`marked_video.mp4`) via HTTP 206 |
| `GET` | `/api/events?footage_id={id}` | Returns verified chronological events strictly filtered by camera ID |
| `GET` | `/api/targets?footage_id={id}` | Returns target entities and tracking profiles for camera ID |
| `GET` | `/api/gantt?footage_id={id}` | Returns Gantt continuous duration intervals for camera ID |
| `GET` | `/api/timeline/relationships?footage_id={id}` | Returns temporal relationship dependency nodes |
| `POST` | `/api/upload` | Uploads video file, runs filtration, and stores in SQL Database |
| `POST` | `/api/chat` | Evaluates question through Temporal RAG and Qwen3:4b |
| `GET` | `/api/chat/sessions` | Lists previous saved investigation chat sessions |
| `GET` | `/api/chat/sessions/{id}` | Retrieves full message history of an investigation session |

#### Example Chat Request:
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "When did Person 2 leave?",
    "footage_id": "video-cctv-01"
  }'
```

#### Example Response:
```json
{
  "text": "Person 2 left at 7.31 seconds.",
  "confidence": 95,
  "model": "qwen3:4b",
  "evidenceRange": {
    "start": "00:06.3",
    "end": "00:08.3",
    "startSec": 6.31,
    "endSec": 8.31,
    "primaryEventId": "E0007"
  },
  "timelineEvents": [
    {
      "eventId": "E0007",
      "title": "Person 2 LEAVE",
      "timestamp": "00:07.3",
      "timestampSec": 7.31,
      "target": "Person 2",
      "deltaText": "at 7.31s"
    }
  ]
}
```

---

## 🧪 Verification & Test Suites

The repository contains automated test suites to ensure deterministic rigor and prevent regressions:

### 1. Deterministic Temporal Engine Test Suite
Tests exact timestamp logic, first/last queries, durations, and anomaly rules across 42 assertions:
```bash
python test_temporal_engine.py
```
*Result: 42 passed, 0 failed.*

### 2. Temporal RAG 100-Assertion Suite
Tests question intent classification, semantic retrieval, and verified evidence extraction across 100 queries:
```bash
python test_temporal_rag.py
```
*Result: 100/100 assertions passed.*

### 3. Interactive CLI Chatbot
Test conversational reasoning directly in your terminal:
```bash
python chatbot.py
```

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
