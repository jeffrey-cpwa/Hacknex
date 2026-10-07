import React from 'react';
import { useApp } from '../../context/AppContext';
import { TemporalEvent } from '../../types';
import {
  ShieldAlert,
  Clock,
  User,
  MapPin,
  Timer,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Play,
  Crosshair,
  Layers,
  ChevronRight,
  Calendar,
} from 'lucide-react';

interface EventDetailPanelProps {
  event: TemporalEvent;
  onClose?: () => void;
}

export const EventDetailPanel: React.FC<EventDetailPanelProps> = ({ event, onClose }) => {
  const {
    openEvidenceForEvent,
    openTargetInTracking,
    openTimelineWithEvents,
    jumpToTimestamp,
  } = useApp();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <div style={styles.badgeGroup}>
            <span style={styles.sectionBadge}>EVENT DETAILS</span>
            {event.severity === 'critical' && (
              <span style={styles.criticalBadge}>CRITICAL BREACH</span>
            )}
            {event.severity === 'warning' && (
              <span style={styles.warningBadge}>ANOMALY WARNING</span>
            )}
          </div>
          <span style={styles.timestampBadge}>{event.timestamp}</span>
        </div>
        <h3 style={styles.eventTitle}>{event.title}</h3>
        <p style={styles.description}>{event.description}</p>
      </div>

      {/* Details Grid */}
      <div style={styles.grid}>
        {/* Target */}
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>
            <User size={11} color="#9299A4" />
            <span>Target</span>
          </div>
          <div style={styles.metricValue}>
            {event.targetNames.join(', ')}
          </div>
        </div>

        {/* Location */}
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>
            <MapPin size={11} color="#9299A4" />
            <span>Location</span>
          </div>
          <div style={styles.metricValue}>{event.location}</div>
        </div>

        {/* Duration */}
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>
            <Timer size={11} color="#9299A4" />
            <span>Duration</span>
          </div>
          <div style={styles.metricValue}>
            {event.durationFormatted || `${event.durationSec || 4.5} sec`}
          </div>
        </div>

        {/* Confidence */}
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>
            <Sparkles size={11} color="#F59E0B" />
            <span>AI Confidence</span>
          </div>
          <div style={{ ...styles.metricValue, color: '#F59E0B' }}>
            {event.confidence}%
          </div>
        </div>
      </div>

      {/* Preceding & Following Temporal Chain */}
      <div style={styles.chainSection}>
        <div style={styles.chainTitle}>TEMPORAL EVENT ORDER</div>

        <div style={styles.chainRow}>
          {/* Previous Event */}
          {event.prevEventSummary ? (
            <div
              style={styles.chainNode}
              onClick={() => {
                if (event.prevEventId) {
                  jumpToTimestamp(event.timestampSec - 40, event.prevEventId);
                }
              }}
              title="Jump to Previous Event"
            >
              <div style={styles.chainNodeLabel}>
                <ArrowLeft size={10} color="#9299A4" />
                <span>PREVIOUS</span>
              </div>
              <div style={styles.chainNodeTitle}>{event.prevEventSummary.title}</div>
              <div style={styles.chainNodeTime}>
                {event.prevEventSummary.timestamp} ({event.prevEventSummary.delta})
              </div>
            </div>
          ) : (
            <div style={{ ...styles.chainNode, opacity: 0.5 }}>
              <div style={styles.chainNodeLabel}>PREVIOUS</div>
              <div style={styles.chainNodeTitle}>Perimeter Baseline</div>
              <div style={styles.chainNodeTime}>00:00</div>
            </div>
          )}

          {/* Next Event */}
          {event.nextEventSummary ? (
            <div
              style={styles.chainNode}
              onClick={() => {
                if (event.nextEventId) {
                  jumpToTimestamp(event.timestampSec + 30, event.nextEventId);
                }
              }}
              title="Jump to Following Event"
            >
              <div style={styles.chainNodeLabel}>
                <span>NEXT</span>
                <ArrowRight size={10} color="#9299A4" />
              </div>
              <div style={styles.chainNodeTitle}>{event.nextEventSummary.title}</div>
              <div style={styles.chainNodeTime}>
                {event.nextEventSummary.timestamp} ({event.nextEventSummary.delta})
              </div>
            </div>
          ) : (
            <div style={{ ...styles.chainNode, opacity: 0.5 }}>
              <div style={styles.chainNodeLabel}>NEXT</div>
              <div style={styles.chainNodeTitle}>End of Segment</div>
              <div style={styles.chainNodeTime}>05:42</div>
            </div>
          )}
        </div>
      </div>

      {/* Evidence Segment Pill */}
      <div style={styles.evidenceBox}>
        <div style={styles.evidenceLabel}>EVIDENCE CLIP SEGMENT</div>
        <div style={styles.evidenceTimeRow}>
          <span style={styles.evidenceRange}>
            {event.evidenceStartFormatted} — {event.evidenceEndFormatted}
          </span>
          <span style={styles.evidenceSub}>
            (Window: {Math.round(event.evidenceEndSec - event.evidenceStartSec)}s)
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.actionsGroup}>
        <button
          onClick={() => openEvidenceForEvent(event)}
          className="btn btn-primary"
          style={{ width: '100%', padding: '8px 12px' }}
        >
          <Play size={14} fill="#08090B" />
          <span>View Evidence</span>
        </button>

        <div style={styles.subActionsRow}>
          <button
            onClick={() => openTimelineWithEvents([event.id], event.timestampSec)}
            className="btn btn-accent-subtle"
            style={{ flex: 1 }}
          >
            <Layers size={13} />
            <span>Open Timeline</span>
          </button>

          <button
            onClick={() => {
              if (event.targetIds.length > 0) {
                openTargetInTracking(event.targetIds[0]);
              }
            }}
            className="btn"
            style={{ flex: 1 }}
          >
            <Crosshair size={13} />
            <span>View Target</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#0F1217',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '12px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  sectionBadge: {
    fontSize: '9.5px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
  },
  criticalBadge: {
    fontSize: '9.5px',
    fontWeight: 700,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#EF4444',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    padding: '1px 5px',
    borderRadius: '3px',
  },
  warningBadge: {
    fontSize: '9.5px',
    fontWeight: 700,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#F59E0B',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    padding: '1px 5px',
    borderRadius: '3px',
  },
  timestampBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    fontWeight: 700,
    color: '#F59E0B',
    backgroundColor: '#08090B',
    padding: '2px 7px',
    borderRadius: '4px',
    border: '1px solid var(--border-default)',
  },
  eventTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#F5F7FA',
  },
  description: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  metricCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-xs)',
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  metricLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.04em',
  },
  metricValue: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#F5F7FA',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  chainSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  chainTitle: {
    fontSize: '9.5px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
  },
  chainRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  chainNode: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-xs)',
    padding: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  chainNodeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '9.5px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    marginBottom: '2px',
  },
  chainNodeTitle: {
    fontSize: '11.5px',
    fontWeight: 600,
    color: '#E5E7EB',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  chainNodeTime: {
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-amber)',
    marginTop: '2px',
  },
  evidenceBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    border: '1px dashed rgba(245, 158, 11, 0.3)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  evidenceLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#F59E0B',
    letterSpacing: '0.06em',
  },
  evidenceTimeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  evidenceRange: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    fontWeight: 700,
    color: '#F5F7FA',
  },
  evidenceSub: {
    fontSize: '10.5px',
    color: 'var(--text-muted)',
  },
  actionsGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '4px',
  },
  subActionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
};
