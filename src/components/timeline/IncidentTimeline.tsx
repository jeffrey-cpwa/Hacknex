import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TemporalEvent } from '../../types';
import {
  Play,
  Clock,
  ShieldAlert,
  Truck,
  Box,
  Cpu,
  User,
  LogOut,
  LogIn,
  AlertTriangle,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Crosshair,
  MapPin,
  Calendar,
} from 'lucide-react';

export const IncidentTimeline: React.FC = () => {
  const {
    events,
    activeFootage,
    currentTimeSec,
    setCurrentTimeSec,
    selectedEventId,
    setSelectedEventId,
    highlightedEventIds,
    openEvidenceForEvent,
    openTargetInTracking,
  } = useApp();

  const [hoveredEvent, setHoveredEvent] = useState<TemporalEvent | null>(null);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[3]; // default restricted entry

  const timeMarkers = [
    { label: '00:00', sec: 0 },
    { label: '01:00', sec: 60 },
    { label: '02:00', sec: 120 },
    { label: '03:00', sec: 180 },
    { label: '04:00', sec: 240 },
    { label: '05:00', sec: 300 },
    { label: '05:42', sec: 342 },
  ];

  const getEventIcon = (category: string, severity: string) => {
    if (severity === 'critical') return ShieldAlert;
    switch (category) {
      case 'entry':
        return LogIn;
      case 'exit':
        return LogOut;
      case 'vehicle':
        return Truck;
      case 'object':
        return Box;
      case 'machinery':
      case 'anomaly':
        return Cpu;
      case 'alarm':
        return ShieldAlert;
      case 'interaction':
        return User;
      default:
        return Clock;
    }
  };

  const handleMarkerClick = (evt: TemporalEvent) => {
    setSelectedEventId(evt.id);
    setCurrentTimeSec(evt.timestampSec);
  };

  return (
    <div style={styles.container}>
      {/* Visual Timeline Canvas */}
      <div style={styles.timelineCanvas}>
        {/* Timeline Header Info */}
        <div style={styles.canvasHeader}>
          <div style={styles.canvasLegend}>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: '#EF4444' }} />
              <span>Critical Incident</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: '#F59E0B' }} />
              <span>Warning / Object</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: '#38BDF8' }} />
              <span>Vehicle / Logistics</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: '#10B981' }} />
              <span>Perimeter / Personnel</span>
            </div>
          </div>
          <span style={styles.canvasNote}>
            Click any milestone marker to seek video time and inspect forensic evidence
          </span>
        </div>

        {/* The Horizontal Timeline Track */}
        <div style={styles.trackContainer}>
          {/* Axis Line */}
          <div style={styles.axisLine} />

          {/* Current Playhead */}
          <div
            style={{
              ...styles.playhead,
              left: `${(currentTimeSec / activeFootage.durationSec) * 100}%`,
            }}
          >
            <div style={styles.playheadBadge}>
              {Math.floor(currentTimeSec / 60)
                .toString()
                .padStart(2, '0')}
              :
              {Math.floor(currentTimeSec % 60)
                .toString()
                .padStart(2, '0')}
            </div>
            <div style={styles.playheadLine} />
          </div>

          {/* Time Division Grid Lines */}
          {timeMarkers.map((m) => {
            const leftPct = (m.sec / activeFootage.durationSec) * 100;
            return (
              <div key={m.label} style={{ ...styles.gridMark, left: `${leftPct}%` }}>
                <div style={styles.gridTick} />
                <span style={styles.gridLabel}>{m.label}</span>
              </div>
            );
          })}

          {/* Event Markers plotted along timeline */}
          {events.map((evt, idx) => {
            const leftPct = (evt.timestampSec / activeFootage.durationSec) * 100;
            const isSelected = evt.id === selectedEventId;
            const isHighlighted = highlightedEventIds.includes(evt.id);
            const isTop = idx % 2 === 0;
            const Icon = getEventIcon(evt.category, evt.severity);

            return (
              <div
                key={evt.id}
                onClick={() => handleMarkerClick(evt)}
                onMouseEnter={() => setHoveredEvent(evt)}
                onMouseLeave={() => setHoveredEvent(null)}
                style={{
                  ...styles.markerWrapper,
                  left: `${leftPct}%`,
                  top: isTop ? '15%' : '55%',
                }}
              >
                {/* Connecting stem line */}
                <div
                  style={{
                    ...styles.markerStem,
                    ...(isTop ? styles.markerStemTop : styles.markerStemBottom),
                    backgroundColor: isSelected ? '#F59E0B' : 'rgba(255, 255, 255, 0.2)',
                  }}
                />

                {/* Marker Node Card */}
                <div
                  style={{
                    ...styles.markerNode,
                    ...(isSelected ? styles.markerNodeSelected : {}),
                    ...(isHighlighted ? styles.markerNodeHighlighted : {}),
                    borderColor:
                      evt.severity === 'critical'
                        ? '#EF4444'
                        : evt.severity === 'warning'
                        ? '#F59E0B'
                        : isSelected
                        ? '#F59E0B'
                        : 'var(--border-default)',
                  }}
                >
                  <div style={styles.markerHeader}>
                    <Icon
                      size={11}
                      color={
                        evt.severity === 'critical'
                          ? '#EF4444'
                          : evt.severity === 'warning'
                          ? '#F59E0B'
                          : '#38BDF8'
                      }
                    />
                    <span style={styles.markerTimestamp}>{evt.timestamp.substring(0, 5)}</span>
                  </div>
                  <div style={styles.markerTitle}>{evt.title}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hover Tooltip Popup */}
        {hoveredEvent && (
          <div style={styles.hoverTooltip}>
            <div style={styles.tooltipHeader}>
              <span style={styles.tooltipTimestamp}>{hoveredEvent.timestamp}</span>
              <span style={styles.tooltipSeverity}>{hoveredEvent.severity.toUpperCase()}</span>
            </div>
            <div style={styles.tooltipTitle}>{hoveredEvent.title}</div>
            <div style={styles.tooltipTarget}>Target: {hoveredEvent.targetNames.join(', ')}</div>
            <div style={styles.tooltipLocation}>Location: {hoveredEvent.location}</div>
          </div>
        )}
      </div>

      {/* Selected Event Detail Inspection Card */}
      {selectedEvent && (
        <div style={styles.selectedCard}>
          <div style={styles.selectedCardLeft}>
            <div style={styles.selectedBadgeRow}>
              <span style={styles.selectedHeaderBadge}>SELECTED EVENT</span>
              <span style={styles.selectedTimePill}>{selectedEvent.timestamp}</span>
              {selectedEvent.severity === 'critical' && (
                <span style={styles.criticalBadge}>CRITICAL INCIDENT</span>
              )}
            </div>

            <h3 style={styles.selectedTitle}>{selectedEvent.title}</h3>
            <p style={styles.selectedDesc}>{selectedEvent.description}</p>

            <div style={styles.selectedMetaGrid}>
              <div style={styles.metaBox}>
                <span style={styles.metaLabel}>PRIMARY TARGET</span>
                <span style={styles.metaVal}>{selectedEvent.targetNames.join(', ')}</span>
              </div>
              <div style={styles.metaBox}>
                <span style={styles.metaLabel}>LOCATION</span>
                <span style={styles.metaVal}>{selectedEvent.location}</span>
              </div>
              <div style={styles.metaBox}>
                <span style={styles.metaLabel}>EVIDENCE WINDOW</span>
                <span style={styles.metaValMono}>
                  {selectedEvent.evidenceStartFormatted} — {selectedEvent.evidenceEndFormatted}
                </span>
              </div>
              <div style={styles.metaBox}>
                <span style={styles.metaLabel}>AI CONFIDENCE</span>
                <span style={{ ...styles.metaVal, color: '#F59E0B' }}>
                  {selectedEvent.confidence}%
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons Right */}
          <div style={styles.selectedCardRight}>
            <button
              onClick={() => openEvidenceForEvent(selectedEvent)}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', gap: '8px' }}
            >
              <Play size={15} fill="#08090B" />
              <span>▶ Watch Evidence Clip</span>
            </button>

            <button
              onClick={() => {
                if (selectedEvent.targetIds.length > 0) {
                  openTargetInTracking(selectedEvent.targetIds[0]);
                }
              }}
              className="btn btn-accent-subtle"
              style={{ width: '100%', gap: '6px' }}
            >
              <Crosshair size={14} />
              <span>Inspect Target History</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: '100%',
  },
  timelineCanvas: {
    backgroundColor: '#0A0C0F',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    minHeight: '340px',
    boxShadow: 'var(--shadow-md)',
  },
  canvasHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '10px',
  },
  canvasLegend: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  canvasNote: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  trackContainer: {
    position: 'relative',
    height: '240px',
    margin: '10px 0',
  },
  axisLine: {
    position: 'absolute',
    top: '48%',
    left: 0,
    right: 0,
    height: '2px',
    backgroundColor: '#252A31',
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '2px',
    transform: 'translateX(-50%)',
    zIndex: 10,
    pointerEvents: 'none',
    transition: 'left 0.1s linear',
  },
  playheadBadge: {
    position: 'absolute',
    top: '-2px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    fontWeight: 700,
    color: '#08090B',
    backgroundColor: '#F59E0B',
    padding: '1px 5px',
    borderRadius: '3px',
    whiteSpace: 'nowrap',
    boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)',
  },
  playheadLine: {
    position: 'absolute',
    top: '18px',
    bottom: 0,
    width: '2px',
    backgroundColor: '#F59E0B',
    boxShadow: '0 0 6px rgba(245, 158, 11, 0.8)',
  },
  gridMark: {
    position: 'absolute',
    top: '44%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  gridTick: {
    width: '1px',
    height: '10px',
    backgroundColor: '#373F4D',
  },
  gridLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginTop: '6px',
  },
  markerWrapper: {
    position: 'absolute',
    transform: 'translateX(-50%)',
    cursor: 'pointer',
    zIndex: 5,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  markerStem: {
    width: '1px',
    position: 'absolute',
  },
  markerStemTop: {
    top: '100%',
    height: '35px',
  },
  markerStemBottom: {
    bottom: '100%',
    height: '35px',
  },
  markerNode: {
    backgroundColor: '#12151A',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 8px',
    width: '140px',
    boxShadow: 'var(--shadow-md)',
    transition: 'all 0.15s ease',
  },
  markerNodeSelected: {
    backgroundColor: '#1C222D',
    borderColor: '#F59E0B',
    boxShadow: '0 0 14px rgba(245, 158, 11, 0.35), inset 0 0 0 1px #F59E0B',
    transform: 'scale(1.05)',
  },
  markerNodeHighlighted: {
    borderColor: '#38BDF8',
    boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)',
  },
  markerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2px',
  },
  markerTimestamp: {
    fontFamily: 'var(--font-mono)',
    fontSize: '9.5px',
    fontWeight: 700,
    color: '#F59E0B',
  },
  markerTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#F5F7FA',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  hoverTooltip: {
    position: 'absolute',
    bottom: '16px',
    right: '20px',
    backgroundColor: '#151922',
    border: '1px solid var(--border-accent)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 20,
    minWidth: '220px',
  },
  tooltipHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  tooltipTimestamp: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 700,
    color: '#F59E0B',
  },
  tooltipSeverity: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#EF4444',
  },
  tooltipTitle: {
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#F5F7FA',
    marginBottom: '3px',
  },
  tooltipTarget: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  tooltipLocation: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  selectedCard: {
    backgroundColor: '#0E1116',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '18px 22px',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 260px',
    gap: '24px',
    alignItems: 'center',
    boxShadow: 'var(--shadow-lg)',
  },
  selectedCardLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  selectedBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  selectedHeaderBadge: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
  },
  selectedTimePill: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    fontWeight: 700,
    color: '#F59E0B',
    backgroundColor: '#08090B',
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid var(--border-default)',
  },
  criticalBadge: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: '2px 6px',
    borderRadius: '3px',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  selectedTitle: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#F5F7FA',
  },
  selectedDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
  },
  selectedMetaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
    marginTop: '4px',
  },
  metaBox: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-xs)',
    padding: '6px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  metaLabel: {
    fontSize: '9.5px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  metaVal: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#F5F7FA',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  metaValMono: {
    fontSize: '11.5px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
    color: '#F5F7FA',
  },
  selectedCardRight: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    borderLeft: '1px solid var(--border-subtle)',
    paddingLeft: '20px',
  },
};
