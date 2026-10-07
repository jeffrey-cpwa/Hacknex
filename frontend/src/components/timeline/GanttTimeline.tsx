import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GanttTrack } from '../../types';
import {
  Clock,
  User,
  Truck,
  Box,
  Cpu,
  ShieldAlert,
  Play,
  Crosshair,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';

export const GanttTimeline: React.FC = () => {
  const {
    ganttTracks,
    activeFootage,
    currentTimeSec,
    setCurrentTimeSec,
    setSelectedEventId,
    openEvidenceForEvent,
    events,
  } = useApp();

  const [hoveredInterval, setHoveredInterval] = useState<{
    trackName: string;
    activity: string;
    startFormatted: string;
    endFormatted: string;
    durationFormatted: string;
    eventId?: string;
  } | null>(null);

  const totalDuration = Math.max(1, activeFootage?.durationSec || 15.2);
  const step = totalDuration > 120 ? 60 : totalDuration > 30 ? 10 : totalDuration > 15 ? 2.5 : 1;
  const timeMarkers = React.useMemo(() => {
    const list: Array<{ label: string; sec: number }> = [];
    for (let s = 0; s <= totalDuration + 0.1; s += step) {
      const cur = Math.min(s, totalDuration);
      const mins = Math.floor(cur / 60);
      const secs = Math.floor(cur % 60);
      const ms = Math.floor((cur % 1) * 10);
      const label = totalDuration < 60
        ? `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`
        : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      list.push({ label, sec: cur });
      if (cur >= totalDuration) break;
    }
    return list;
  }, [totalDuration, step]);

  const getTrackIcon = (type: string) => {
    switch (type) {
      case 'person':
        return User;
      case 'vehicle':
        return Truck;
      case 'object':
        return Box;
      case 'machine':
        return Cpu;
      default:
        return Clock;
    }
  };

  const handleIntervalClick = (interval: GanttTrack['intervals'][0]) => {
    setCurrentTimeSec(interval.startSec);
    if (interval.eventId) {
      setSelectedEventId(interval.eventId);
    }
  };

  return (
    <div style={styles.container}>
      {/* Gantt Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>GANTT TIMELINE</h2>
          <p style={styles.subtitle}>
            Visualize event duration and overlapping activity across entities.
          </p>
        </div>
        <div style={styles.headerLegend}>
          <span style={styles.legendPill}>
            <span style={{ ...styles.dot, backgroundColor: '#F59E0B' }} /> Person
          </span>
          <span style={styles.legendPill}>
            <span style={{ ...styles.dot, backgroundColor: '#38BDF8' }} /> Vehicle
          </span>
          <span style={styles.legendPill}>
            <span style={{ ...styles.dot, backgroundColor: '#EF4444' }} /> Object
          </span>
          <span style={styles.legendPill}>
            <span style={{ ...styles.dot, backgroundColor: '#A855F7' }} /> Machine
          </span>
          <span style={styles.legendPill}>
            <span style={{ ...styles.dot, backgroundColor: '#F43F5E' }} /> Alarm
          </span>
        </div>
      </div>

      {/* Gantt Matrix Chart */}
      <div style={styles.chartContainer}>
        {/* Time Header Axis */}
        <div style={styles.axisHeaderRow}>
          <div style={styles.trackLabelHeader}>ENTITY / TARGET</div>
          <div style={styles.timeAxisGrid}>
            {timeMarkers.map((m) => {
              const leftPct = (m.sec / activeFootage.durationSec) * 100;
              return (
                <div key={m.label} style={{ ...styles.timeMark, left: `${leftPct}%` }}>
                  <span style={styles.timeMarkText}>{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tracks List */}
        <div style={styles.tracksList}>
          {/* Vertical Playhead Cursor */}
          <div
            style={{
              ...styles.playhead,
              left: `calc(180px + ${(currentTimeSec / activeFootage.durationSec) * 100}% * (100% - 180px) / 100)`,
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

          {ganttTracks.map((track) => {
            const Icon = getTrackIcon(track.type);
            return (
              <div key={track.targetId} style={styles.trackRow}>
                {/* Left: Entity Name */}
                <div style={styles.trackLabelCol}>
                  <div
                    style={{
                      ...styles.trackIconBox,
                      backgroundColor: `${track.color}20`,
                      borderColor: `${track.color}40`,
                    }}
                  >
                    <Icon size={13} color={track.color} />
                  </div>
                  <div style={styles.trackNameCol}>
                    <span style={styles.trackName}>{track.targetName}</span>
                    <span style={styles.trackType}>{track.type.toUpperCase()}</span>
                  </div>
                </div>

                {/* Right: Gantt Bars Track */}
                <div style={styles.trackLane}>
                  {/* Background Grid Lines */}
                  {timeMarkers.map((m) => (
                    <div
                      key={m.label}
                      style={{
                        ...styles.gridLine,
                        left: `${(m.sec / activeFootage.durationSec) * 100}%`,
                      }}
                    />
                  ))}

                  {/* Interval Duration Bars */}
                  {track.intervals.map((inv) => {
                    const leftPct = (inv.startSec / activeFootage.durationSec) * 100;
                    const widthPct = Math.max(
                      2.5,
                      ((inv.endSec - inv.startSec) / activeFootage.durationSec) * 100
                    );

                    return (
                      <div
                        key={inv.id}
                        onClick={() => handleIntervalClick(inv)}
                        onMouseEnter={() =>
                          setHoveredInterval({
                            trackName: track.targetName,
                            activity: inv.activity,
                            startFormatted: inv.startFormatted,
                            endFormatted: inv.endFormatted,
                            durationFormatted: inv.durationFormatted,
                            eventId: inv.eventId,
                          })
                        }
                        onMouseLeave={() => setHoveredInterval(null)}
                        style={{
                          ...styles.ganttBar,
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          backgroundColor: `${track.color}35`,
                          borderColor: track.color,
                          boxShadow:
                            inv.severity === 'critical'
                              ? '0 0 12px rgba(239, 68, 68, 0.6)'
                              : `0 0 8px ${track.color}40`,
                        }}
                      >
                        <span style={styles.barLabel}>{inv.activity}</span>
                        <span style={styles.barDuration}>{inv.durationFormatted}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gantt Interactive Hover Inspector Card */}
      <div style={styles.inspectorCard}>
        {hoveredInterval ? (
          <div style={styles.inspectorContent}>
            <div style={styles.inspectorLeft}>
              <div style={styles.inspectorTag}>ACTIVE DURATION INTERVAL</div>
              <div style={styles.inspectorTitle}>{hoveredInterval.trackName}</div>
              <div style={styles.inspectorActivity}>{hoveredInterval.activity}</div>
            </div>
            <div style={styles.inspectorMetrics}>
              <div style={styles.metricItem}>
                <span style={styles.metricLabel}>START TIME</span>
                <span style={styles.metricVal}>{hoveredInterval.startFormatted}</span>
              </div>
              <div style={styles.metricItem}>
                <span style={styles.metricLabel}>END TIME</span>
                <span style={styles.metricVal}>{hoveredInterval.endFormatted}</span>
              </div>
              <div style={styles.metricItem}>
                <span style={styles.metricLabel}>TOTAL DURATION</span>
                <span style={{ ...styles.metricVal, color: '#F59E0B' }}>
                  {hoveredInterval.durationFormatted}
                </span>
              </div>
            </div>
            {hoveredInterval.eventId && (
              <button
                onClick={() => {
                  const found = events.find((e) => e.id === hoveredInterval.eventId);
                  if (found) openEvidenceForEvent(found);
                }}
                className="btn btn-primary btn-sm"
              >
                <Play size={12} fill="#08090B" />
                <span>View Evidence</span>
              </button>
            )}
          </div>
        ) : (
          <div style={styles.inspectorEmpty}>
            <Info size={16} color="#9299A4" />
            <span>Hover over any duration bar to inspect exact start, end, and duration metrics.</span>
          </div>
        )}
      </div>
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
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0C0F',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 18px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#F5F7FA',
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  headerLegend: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  legendPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
  },
  chartContainer: {
    backgroundColor: '#0A0C0F',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxShadow: 'var(--shadow-md)',
  },
  axisHeaderRow: {
    display: 'flex',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: '#0E1014',
    height: '38px',
  },
  trackLabelHeader: {
    width: '180px',
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '0.08em',
    padding: '10px 14px',
    borderRight: '1px solid var(--border-subtle)',
  },
  timeAxisGrid: {
    flex: 1,
    position: 'relative',
  },
  timeMark: {
    position: 'absolute',
    top: '10px',
    transform: 'translateX(-50%)',
  },
  timeMarkText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10.5px',
    color: 'var(--text-muted)',
  },
  tracksList: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '2px',
    transform: 'translateX(-50%)',
    zIndex: 20,
    pointerEvents: 'none',
  },
  playheadBadge: {
    position: 'absolute',
    top: '2px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontFamily: 'var(--font-mono)',
    fontSize: '9.5px',
    fontWeight: 700,
    color: '#08090B',
    backgroundColor: '#F59E0B',
    padding: '1px 4px',
    borderRadius: '2px',
    whiteSpace: 'nowrap',
  },
  playheadLine: {
    position: 'absolute',
    top: '16px',
    bottom: 0,
    width: '2px',
    backgroundColor: '#F59E0B',
    boxShadow: '0 0 6px rgba(245, 158, 11, 0.8)',
  },
  trackRow: {
    display: 'flex',
    borderBottom: '1px solid var(--border-subtle)',
    minHeight: '62px',
  },
  trackLabelCol: {
    width: '180px',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderRight: '1px solid var(--border-subtle)',
    backgroundColor: 'rgba(14, 16, 20, 0.6)',
    flexShrink: 0,
  },
  trackIconBox: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackNameCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  trackName: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#F5F7FA',
  },
  trackType: {
    fontSize: '9px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
  trackLane: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    pointerEvents: 'none',
  },
  ganttBar: {
    position: 'absolute',
    height: '34px',
    borderRadius: '4px',
    border: '1.5px solid',
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    zIndex: 5,
  },
  barLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#F5F7FA',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginRight: '6px',
  },
  barDuration: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    fontWeight: 700,
    color: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: '1px 5px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  inspectorCard: {
    backgroundColor: '#0E1116',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 18px',
    minHeight: '76px',
    display: 'flex',
    alignItems: 'center',
  },
  inspectorContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  inspectorLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  inspectorTag: {
    fontSize: '9.5px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '0.06em',
  },
  inspectorTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#F5F7FA',
  },
  inspectorActivity: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  inspectorMetrics: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  metricLabel: {
    fontSize: '9px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  metricVal: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12.5px',
    fontWeight: 700,
    color: '#F5F7FA',
  },
  inspectorEmpty: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--text-muted)',
    fontSize: '12px',
  },
};
