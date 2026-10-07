import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TemporalEvent } from '../../types';
import {
  ShieldAlert,
  Truck,
  Box,
  Cpu,
  User,
  LogOut,
  LogIn,
  AlertTriangle,
  Layers,
  Search,
  Filter,
  Activity,
  ArrowRight,
} from 'lucide-react';

export const EventsPanel: React.FC = () => {
  const {
    events,
    selectedEventId,
    setSelectedEventId,
    jumpToTimestamp,
    currentTimeSec,
  } = useApp();

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
        return Activity;
    }
  };

  const filteredEvents = events.filter((evt) => {
    const matchesSeverity =
      severityFilter === 'all' || evt.severity === severityFilter;
    const matchesSearch =
      !searchQuery ||
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.targetNames.some((n) => n.toLowerCase().includes(searchQuery.toLowerCase())) ||
      evt.timestamp.includes(searchQuery);
    return matchesSeverity && matchesSearch;
  });

  const handleEventClick = (evt: TemporalEvent) => {
    setSelectedEventId(evt.id);
    jumpToTimestamp(evt.timestampSec, evt.id);
  };

  return (
    <div style={styles.container}>
      {/* Panel Header */}
      <div style={styles.header}>
        <div style={styles.headerTitleRow}>
          <div style={styles.titleGroup}>
            <span style={styles.title}>EVENTS</span>
            <span style={styles.countBadge}>{filteredEvents.length}</span>
          </div>
          <div style={styles.filterGroup}>
            {['all', 'critical', 'warning'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                style={{
                  ...styles.filterBtn,
                  ...(severityFilter === sev ? styles.filterBtnActive : {}),
                }}
              >
                {sev === 'all' ? 'All' : sev.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Search within events */}
        <div style={styles.searchRow}>
          <Search size={12} color="#9299A4" />
          <input
            type="text"
            placeholder="Search chronological events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Events Chronological Stream */}
      <div style={styles.list}>
        {filteredEvents.map((evt) => {
          const isSelected = evt.id === selectedEventId;
          const isPassed = currentTimeSec >= evt.timestampSec;
          const Icon = getEventIcon(evt.category, evt.severity);

          return (
            <div
              key={evt.id}
              onClick={() => handleEventClick(evt)}
              style={{
                ...styles.eventCard,
                ...(isSelected ? styles.eventCardSelected : {}),
              }}
              className="event-item"
            >
              {/* Left Indicator & Icon */}
              <div
                style={{
                  ...styles.iconBox,
                  backgroundColor:
                    evt.severity === 'critical'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : evt.severity === 'warning'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(56, 189, 248, 0.12)',
                  borderColor:
                    evt.severity === 'critical'
                      ? 'rgba(239, 68, 68, 0.4)'
                      : evt.severity === 'warning'
                      ? 'rgba(245, 158, 11, 0.4)'
                      : 'rgba(56, 189, 248, 0.3)',
                }}
              >
                <Icon
                  size={14}
                  color={
                    evt.severity === 'critical'
                      ? '#EF4444'
                      : evt.severity === 'warning'
                      ? '#F59E0B'
                      : '#38BDF8'
                  }
                />
              </div>

              {/* Event Content */}
              <div style={styles.eventContent}>
                <div style={styles.eventHeaderRow}>
                  <span style={styles.timestampPill}>{evt.timestamp}</span>
                  {evt.severity === 'critical' && (
                    <span style={styles.criticalPill}>HIGH ALERT</span>
                  )}
                  {evt.severity === 'warning' && (
                    <span style={styles.warningPill}>WARNING</span>
                  )}
                </div>

                <div
                  style={{
                    ...styles.eventTitle,
                    color: isSelected ? '#F59E0B' : '#F5F7FA',
                  }}
                >
                  {evt.title}
                </div>

                <div style={styles.targetRow}>
                  <span style={styles.targetLabel}>{evt.targetNames.join(', ')}</span>
                  <span style={styles.locationLabel}>· {evt.location}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#0A0C0F',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    padding: '12px 14px',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: '#0E1014',
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  title: {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#F5F7FA',
  },
  countBadge: {
    fontSize: '10.5px',
    fontFamily: 'var(--font-mono)',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    padding: '1px 5px',
    borderRadius: '4px',
    border: '1px solid var(--border-subtle)',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },
  filterBtn: {
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '3px',
    border: '1px solid var(--border-subtle)',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  filterBtnActive: {
    backgroundColor: 'var(--bg-card)',
    borderColor: 'var(--accent-amber)',
    color: '#F59E0B',
  },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#08090B',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xs)',
    padding: '4px 8px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#F5F7FA',
    fontSize: '11px',
    width: '100%',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  eventCard: {
    display: 'flex',
    gap: '10px',
    padding: '9px 10px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: '#111419',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  eventCardSelected: {
    backgroundColor: '#181D26',
    borderColor: 'var(--border-accent)',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(245, 158, 11, 0.2)',
  },
  iconBox: {
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: '1px solid',
  },
  eventContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minWidth: 0,
  },
  eventHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timestampPill: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#F59E0B',
  },
  criticalPill: {
    fontSize: '8.5px',
    fontWeight: 700,
    color: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: '1px 4px',
    borderRadius: '2px',
    letterSpacing: '0.04em',
  },
  warningPill: {
    fontSize: '8.5px',
    fontWeight: 700,
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    padding: '1px 4px',
    borderRadius: '2px',
    letterSpacing: '0.04em',
  },
  eventTitle: {
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  targetRow: {
    fontSize: '10.5px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  targetLabel: {
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  locationLabel: {
    color: 'var(--text-muted)',
  },
};
