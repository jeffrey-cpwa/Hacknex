import {
  Footage,
  TemporalEvent,
  TargetEntity,
  GanttTrack,
  TemporalRelationshipNode,
  InvestigationSession,
} from '../types';

// Zero preloaded fake data - Everything is dynamically loaded from SQL Database
export const INITIAL_FOOTAGE_LIST: Footage[] = [];

export const MOCK_EVENTS: TemporalEvent[] = [];

export const MOCK_TARGETS: TargetEntity[] = [];

export const MOCK_GANTT_TRACKS: GanttTrack[] = [];

export const MOCK_RELATIONSHIP_NODES: TemporalRelationshipNode[] = [];

export const PRESET_QUESTIONS: any[] = [];

export const INITIAL_RECENT_INVESTIGATIONS: InvestigationSession[] = [];

export const MOCK_INSIGHT_ALERTS: any[] = [];
