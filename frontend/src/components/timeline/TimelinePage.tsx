import React from 'react';
import { useApp } from '../../context/AppContext';
import { IncidentTimeline } from './IncidentTimeline';
import { GanttTimeline } from './GanttTimeline';
import { TargetTracking } from './TargetTracking';
import { EventRelationshipGraph } from './EventRelationshipGraph';
import { Clock, Layers, Crosshair, BarChart3 } from 'lucide-react';

export const TimelinePage: React.FC = () => {
  const { timelineMode, setTimelineMode } = useApp();

  return (
    <div style={styles.container}>
      {/* Header & Subtitle */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.title}>TIMELINE</h1>
          <p style={styles.subtitle}>
            Explore events and temporal relationships across the footage.
          </p>
        </div>

        {/* Sub-mode Navigation Pill Tabs */}
        <div style={styles.modeTabs}>
          <button
            onClick={() => setTimelineMode('incident')}
            style={{
              ...styles.modeTab,
              ...(timelineMode === 'incident' ? styles.modeTabActive : {}),
            }}
          >
            <Clock size={13} />
            <span>Incident Timeline</span>
          </button>

          <button
            onClick={() => setTimelineMode('gantt')}
            style={{
              ...styles.modeTab,
              ...(timelineMode === 'gantt' ? styles.modeTabActive : {}),
            }}
          >
            <BarChart3 size={13} />
            <span>Gantt Timeline</span>
          </button>

          <button
            onClick={() => setTimelineMode('target')}
            style={{
              ...styles.modeTab,
              ...(timelineMode === 'target' ? styles.modeTabActive : {}),
            }}
          >
            <Crosshair size={13} />
            <span>Target Tracking</span>
          </button>
        </div>
      </div>

      {/* Active Timeline Visualization Mode */}
      <div style={styles.modeBody}>
        {timelineMode === 'incident' && <IncidentTimeline />}
        {timelineMode === 'gantt' && <GanttTimeline />}
        {timelineMode === 'target' && <TargetTracking />}
      </div>

      {/* Expandable Temporal Relationship Graph Section */}
      <div style={styles.relationshipSection}>
        <EventRelationshipGraph />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px 24px',
    height: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#F5F7FA',
  },
  subtitle: {
    fontSize: '12.5px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  modeTabs: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    backgroundColor: '#0E1116',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-sm)',
    padding: '3px',
  },
  modeTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: 'var(--radius-xs)',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  modeTabActive: {
    backgroundColor: '#181D26',
    color: '#F59E0B',
    fontWeight: 600,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.4)',
  },
  modeBody: {
    flex: 1,
  },
  relationshipSection: {
    marginTop: '4px',
    marginBottom: '20px',
  },
};
