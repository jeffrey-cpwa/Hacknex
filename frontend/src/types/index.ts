// Type definitions for TEMPORAL AI

export type NavigationTab = 'upload' | 'video' | 'timeline' | 'chat';

export type TimelineMode = 'incident' | 'gantt' | 'target';

export type TargetCategory = 'person' | 'vehicle' | 'object' | 'machine';

export type EventSeverity = 'critical' | 'warning' | 'info';

export type EventCategory =
  | 'entry'
  | 'exit'
  | 'vehicle'
  | 'security'
  | 'object'
  | 'machinery'
  | 'alarm'
  | 'interaction'
  | 'anomaly';

export interface TemporalEvent {
  id: string;
  timestamp: string; // "02:07.4"
  timestampSec: number; // 127.4
  title: string;
  description: string;
  category: EventCategory;
  targetIds: string[];
  targetNames: string[];
  location: string;
  durationSec?: number;
  durationFormatted?: string;
  confidence: number; // e.g. 94 (%)
  severity: EventSeverity;
  evidenceStartSec: number;
  evidenceEndSec: number;
  evidenceStartFormatted: string;
  evidenceEndFormatted: string;
  prevEventId?: string;
  nextEventId?: string;
  prevEventSummary?: { title: string; timestamp: string; delta: string };
  nextEventSummary?: { title: string; timestamp: string; delta: string };
  evidenceKeyframes?: Array<{ timestamp: string; description: string }>;
}

export interface TargetHistoryPoint {
  id: string;
  timestamp: string;
  timestampSec: number;
  location: string;
  action: string;
  eventId?: string;
  statusBadge?: string;
}

export interface TargetEntity {
  id: string;
  name: string;
  type: TargetCategory;
  badge: string;
  firstSeen: string;
  firstSeenSec: number;
  lastSeen: string;
  lastSeenSec: number;
  totalDuration: string;
  occurrences: number;
  confidence: number;
  status: string;
  color: string;
  history: TargetHistoryPoint[];
  // Specific for objects:
  untouchedDuration?: string;
  untouchedDurationSec?: number;
  initialPlacementTime?: string;
  pickupTime?: string;
  // Specific for machinery:
  operationalCycles?: number;
  stopsCount?: number;
}

export interface GanttTrack {
  targetId: string;
  targetName: string;
  type: TargetCategory;
  color: string;
  intervals: Array<{
    id: string;
    startSec: number;
    endSec: number;
    startFormatted: string;
    endFormatted: string;
    durationFormatted: string;
    activity: string;
    eventId?: string;
    severity?: EventSeverity;
  }>;
}

export interface TemporalRelationshipNode {
  id: string;
  eventId: string;
  title: string;
  timestamp: string;
  timestampSec: number;
  target: string;
  category: EventCategory;
  severity: EventSeverity;
  relationToNext?: {
    type: 'BEFORE' | 'AFTER' | 'DURING' | 'BETWEEN';
    label: string;
    deltaSec: number;
    deltaFormatted: string;
  };
}

export interface Footage {
  id: string;
  title: string;
  filename: string;
  duration: string; // "05:42"
  durationSec: number; // 342
  date: string;
  eventCount: number;
  status: 'Analyzed' | 'Processing' | 'Unindexed';
  tags: string[];
  resolution: string;
  fps: number;
  trackedPeopleCount: number;
  trackedObjectsCount: number;
  trackedVehiclesCount: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  criticalEventsCount: number;
  warningEventsCount: number;
  isCustomUploaded?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  timestamp: string;
  text: string;
  isThinking?: boolean;
  thinkingSteps?: string[];
  questionPresetId?: string;
  answerData?: {
    questionTitle?: string;
    summary: string;
    timelineEvents: Array<{
      eventId?: string;
      title: string;
      timestamp: string;
      timestampSec: number;
      target: string;
      role?: 'preceding' | 'primary' | 'following';
      deltaText?: string;
    }>;
    differenceText?: string;
    confidence: number;
    evidenceRange: {
      title: string;
      start: string;
      end: string;
      startSec: number;
      endSec: number;
      primaryEventId?: string;
    };
    targetId?: string;
    targetName?: string;
    relevantEventIds: string[];
    linkedInsight?: string;
  };
}

export interface InvestigationSession {
  id: string;
  title: string;
  date: string;
  eventCount: number;
  footageId: string;
  footageTitle: string;
  lastQuery?: string;
  activeMode?: TimelineMode;
}

export interface EvidenceData {
  title: string;
  footageId: string;
  footageTitle: string;
  startSec: number;
  endSec: number;
  startFormatted: string;
  endFormatted: string;
  primaryEventId?: string;
  targetName?: string;
  targetId?: string;
  confidence: number;
  description: string;
  microSteps: Array<{
    timestamp: string;
    timestampSec: number;
    description: string;
    highlight?: boolean;
  }>;
}

export interface GlobalSearchResult {
  id: string;
  type: 'event' | 'target' | 'object' | 'video' | 'chat';
  title: string;
  subtitle: string;
  timestamp?: string;
  timestampSec?: number;
  targetId?: string;
  eventId?: string;
  footageId?: string;
  tab: NavigationTab;
  mode?: TimelineMode;
}
