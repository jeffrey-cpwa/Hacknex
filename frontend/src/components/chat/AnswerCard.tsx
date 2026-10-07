import React from 'react';
import { useApp } from '../../context/AppContext';
import { ChatMessage } from '../../types';
import {
  Play,
  Clock,
  Crosshair,
  Sparkles,
} from 'lucide-react';

interface AnswerCardProps {
  message: ChatMessage;
}

export const AnswerCard: React.FC<AnswerCardProps> = ({ message }) => {
  const {
    jumpToTimestamp,
    openTimelineWithEvents,
    openTargetInTracking,
    setActiveTab,
  } = useApp();

  const data = message.answerData;
  if (!data) return null;

  // View Evidence connects directly to Footage Analysis workspace and seeks to timestamp
  const handleViewEvidence = () => {
    jumpToTimestamp(data.evidenceRange.startSec, data.evidenceRange.primaryEventId, 'video');
  };

  // Open Timeline focuses on relevant timestamp and highlights the events
  const handleOpenTimeline = () => {
    openTimelineWithEvents(
      data.relevantEventIds,
      data.timelineEvents[0]?.timestampSec
    );
  };

  const handleOpenTarget = () => {
    if (data.targetId) {
      openTargetInTracking(data.targetId);
    }
  };

  return (
    <div style={styles.card} className="ai-answer-card">
      {/* Header with AI Badge */}
      <div style={styles.cardHeader}>
        <div style={styles.aiBadgeRow}>
          <div style={styles.aiIconBox}>
            <Sparkles size={12} color="#F59E0B" />
          </div>
          <span style={styles.aiTag}>TEMPORAL REASONING</span>
        </div>

        <div style={styles.confidencePill}>
          <span>Confidence:</span>
          <strong style={{ color: '#10B981' }}>{data.confidence}%</strong>
        </div>
      </div>

      {/* Summary text */}
      <div style={styles.summaryText}>{data.summary}</div>

      {/* Prominent Timestamps Box */}
      <div style={styles.timelineBox}>
        {data.timelineEvents.map((evt, idx) => (
          <div key={idx} style={styles.timestampRow}>
            <span style={styles.eventLabel}>{evt.title}:</span>
            <span style={styles.eventTimestamp}>{evt.timestamp}</span>
            {evt.deltaText && (
              <span style={styles.eventDelta}>({evt.deltaText})</span>
            )}
          </div>
        ))}
        {data.differenceText && (
          <div style={styles.diffRow}>
            <span style={styles.diffLabel}>Time difference:</span>
            <span style={styles.diffVal}>{data.differenceText}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={styles.actionsRow}>
        <button
          onClick={handleViewEvidence}
          className="btn btn-primary btn-sm"
          style={{ gap: '6px' }}
        >
          <Play size={12} fill="#08090B" />
          <span>View Evidence ({data.evidenceRange.start}–{data.evidenceRange.end})</span>
        </button>

        <button
          onClick={handleOpenTimeline}
          className="btn btn-accent-subtle btn-sm"
          style={{ gap: '6px' }}
        >
          <Clock size={12} />
          <span>Open Timeline</span>
        </button>

        {data.targetId && (
          <button
            onClick={handleOpenTarget}
            className="btn btn-sm"
            style={{ gap: '6px' }}
          >
            <Crosshair size={12} color="#9299A4" />
            <span>View Target</span>
          </button>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#0F1218',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: 'var(--shadow-md)',
    marginTop: '6px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '8px',
  },
  aiBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  aiIconBox: {
    width: '20px',
    height: '20px',
    borderRadius: '3px',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTag: {
    fontSize: '9.5px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#F59E0B',
  },
  confidencePill: {
    fontSize: '10.5px',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-card)',
    padding: '2px 7px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    gap: '4px',
  },
  summaryText: {
    fontSize: '13px',
    color: '#F5F7FA',
    lineHeight: 1.45,
    fontWeight: 500,
  },
  timelineBox: {
    backgroundColor: '#090B0E',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xs)',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  timestampRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
  },
  eventLabel: {
    color: 'var(--text-secondary)',
  },
  eventTimestamp: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    fontWeight: 700,
    color: '#F59E0B',
  },
  eventDelta: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10.5px',
    color: 'var(--text-muted)',
  },
  diffRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderTop: '1px dashed var(--border-subtle)',
    paddingTop: '6px',
    marginTop: '2px',
    fontSize: '12px',
  },
  diffLabel: {
    color: 'var(--text-muted)',
    fontSize: '11.5px',
  },
  diffVal: {
    fontFamily: 'var(--font-mono)',
    color: '#F59E0B',
    fontWeight: 600,
  },
  actionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    paddingTop: '6px',
  },
};
