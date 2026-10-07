/**
 * api.ts
 * ------
 * Client service connecting HackNex Frontend to FastAPI Backend (http://localhost:8000/api)
 */

import {
  Footage,
  TemporalEvent,
  TargetEntity,
  GanttTrack,
  TemporalRelationshipNode,
  ChatMessage,
} from '../types';

export const API_BASE_URL = 'http://localhost:8000/api';

export interface HealthStatus {
  status: string;
  service: string;
  timestamp: number;
  ollama: {
    online: boolean;
    default_model: string;
    available_models: string[];
  };
  temporal_engine: {
    status: string;
    clean_events_count: number;
    deterministic_pass_rate: string;
  };
}

export interface FilterProcessResponse {
  metrics: {
    raw: number;
    person: number;
    object: number;
    valid: number;
    review: number;
    low_conf: number;
    invalid: number;
    unknown_conf: number;
    duplicate: number;
    missing_ts: number;
  };
  all_records: any[];
  analysis_events: any[];
  persons: string[];
  max_duration: number;
}

/**
 * Health check
 */
export async function checkBackendHealth(): Promise<HealthStatus | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Backend /health unreachable:', err);
    return null;
  }
}

/**
 * Fetch Footage List
 */
export async function fetchFootageList(): Promise<Footage[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/footage`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch footage from API:', err);
    return null;
  }
}

/**
 * Fetch Events for active footage
 */
export async function fetchEvents(footageId?: string): Promise<TemporalEvent[] | null> {
  try {
    const url = footageId ? `${API_BASE_URL}/events?footage_id=${encodeURIComponent(footageId)}` : `${API_BASE_URL}/events`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch events from API:', err);
    return null;
  }
}

/**
 * Fetch Targets for footage
 */
export async function fetchTargets(footageId?: string): Promise<TargetEntity[] | null> {
  try {
    const url = footageId ? `${API_BASE_URL}/targets?footage_id=${encodeURIComponent(footageId)}` : `${API_BASE_URL}/targets`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch targets from API:', err);
    return null;
  }
}

/**
 * Fetch Gantt Tracks for footage
 */
export async function fetchGanttTracks(footageId?: string): Promise<GanttTrack[] | null> {
  try {
    const url = footageId ? `${API_BASE_URL}/gantt?footage_id=${encodeURIComponent(footageId)}` : `${API_BASE_URL}/gantt`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch gantt tracks from API:', err);
    return null;
  }
}

/**
 * Fetch Relationship Nodes for footage
 */
export async function fetchRelationshipNodes(footageId?: string): Promise<TemporalRelationshipNode[] | null> {
  try {
    const url = footageId ? `${API_BASE_URL}/timeline/relationships?footage_id=${encodeURIComponent(footageId)}` : `${API_BASE_URL}/timeline/relationships`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch relationship nodes from API:', err);
    return null;
  }
}

/**
 * Send Chat Question to Temporal RAG + Qwen3:4b
 */
export async function sendChatMessageAPI(
  question: string,
  session?: Record<string, any>,
  footageId?: string,
  sessionId?: string
): Promise<ChatMessage | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        session: session || {},
        footage_id: footageId || 'video-cctv-01',
        session_id: sessionId || null,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Chat API error (${res.status}): ${errText}`);
    }

    return await res.json();
  } catch (err) {
    console.error('sendChatMessageAPI error:', err);
    return null;
  }
}

/**
 * Fetch previous investigations / chat sessions
 */
export async function fetchChatSessions(): Promise<any[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/sessions`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch chat sessions:', err);
    return null;
  }
}

/**
 * Create a new investigation chat session
 */
export async function createChatSession(title = 'New Investigation', videoId = 'video-cctv-01'): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, video_id: videoId }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to create chat session:', err);
    return null;
  }
}

/**
 * Fetch messages for a specific chat session
 */
export async function fetchChatMessages(sessionId: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch chat session messages:', err);
    return null;
  }
}

/**
 * Process Raw Events in Data Filtration Engine
 */
export async function processFilterAPI(
  data: any,
  person = 'all',
  start = 0,
  end?: number,
  status = 'all'
): Promise<FilterProcessResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data,
        person,
        start,
        end,
        status,
      }),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('processFilterAPI error:', err);
    return null;
  }
}

/**
 * Upload Video to Server
 */
export async function uploadVideoAPI(file: File): Promise<Footage | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('uploadVideoAPI error:', err);
    return null;
  }
}
