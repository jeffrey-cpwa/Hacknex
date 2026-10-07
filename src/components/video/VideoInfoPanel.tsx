import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileVideo,
  Layers,
  Users,
  Box,
  Truck,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Info,
  Clock,
  AlertTriangle,
} from 'lucide-react';

export const VideoInfoPanel: React.FC = () => {
  const {
    activeFootage,
    allTargets,
    openTargetInTracking,
    events,
    jumpToTimestamp,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'info' | 'targets' | 'insights'>('info');

  const criticalEvents = events.filter((e) => e.severity === 'critical');
  const warningEvents = events.filter((e) => e.severity === 'warning');

  return (
    <div style={styles.container}>
      {/* Tab bar */}
      <div style={styles.tabBar}>
        <button
          onClick={() => setActiveTab('info')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'info' ? styles.tabBtnActive : {}),
          }}
        >
          <Info size={13} />
          <span>Video Metadata</span>
        </button>
        <button
          onClick={() => setActiveTab('targets')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'targets' ? styles.tabBtnActive : {}),
          }}
        >
          <Users size={13} />
          <span>Tracked Targets ({allTargets.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'insights' ? styles.tabBtnActive : {}),
          }}
        >
          <ShieldAlert size={13} />
          <span>Incident Alerts ({criticalEvents.length + warningEvents.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      <div style={styles.tabBody}>
        {/* 1. Video Metadata Tab */}
        {activeTab === 'info' && (
          <div style={styles.metadataGrid}>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Source File</span>
              <span style={styles.metaValueMono}>{activeFootage.filename}</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Total Duration</span>
              <span style={styles.metaValueMono}>{activeFootage.duration} (342s)</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Native Resolution</span>
              <span style={styles.metaValueMono}>{activeFootage.resolution} @ {activeFootage.fps}fps</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Indexed Events</span>
              <span style={{ ...styles.metaValue, color: '#F59E0B' }}>
                {activeFootage.eventCount} temporal milestones
              </span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Tracked People</span>
              <span style={styles.metaValue}>{activeFootage.trackedPeopleCount} entities</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Tracked Objects</span>
              <span style={styles.metaValue}>{activeFootage.trackedObjectsCount} objects</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Analysis Status</span>
              <span style={{ ...styles.metaValue, color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> Analysis Complete
              </span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>Tags</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {activeFootage.tags.map((t, idx) => (
                  <span key={idx} style={styles.tagPill}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. Tracked Targets Tab */}
        {activeTab === 'targets' && (
          <div style={styles.targetsGrid}>
            {allTargets.map((tgt) => (
              <div
                key={tgt.id}
                onClick={() => openTargetInTracking(tgt.id)}
                style={styles.targetCard}
                title="Inspect Target Intelligence"
              >
                <div style={styles.targetCardHeader}>
                  <div style={styles.targetNameRow}>
                    <span
                      style={{
                        ...styles.targetColorDot,
                        backgroundColor: tgt.color,
                      }}
                    />
                    <span style={styles.targetName}>{tgt.name}</span>
                  </div>
                  <ExternalLink size={12} color="#9299A4" />
                </div>
                <div style={styles.targetBadge}>{tgt.badge}</div>
                <div style={styles.targetMetaRow}>
                  <span>Visible: {tgt.totalDuration}</span>
                  <span>Conf: {tgt.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. Incident Insights Tab */}
        {activeTab === 'insights' && (
          <div style={styles.insightsList}>
            {events
              .filter((e) => e.severity === 'critical' || e.severity === 'warning')
              .map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => jumpToTimestamp(alert.timestampSec, alert.id)}
                  style={{
                    ...styles.alertCard,
                    borderColor:
                      alert.severity === 'critical'
                        ? 'rgba(239, 68, 68, 0.4)'
                        : 'rgba(245, 158, 11, 0.4)',
                  }}
                >
                  <div style={styles.alertCardLeft}>
                    {alert.severity === 'critical' ? (
                      <ShieldAlert size={16} color="#EF4444" />
                    ) : (
                      <AlertTriangle size={16} color="#F59E0B" />
                    )}
                    <div>
                      <div style={styles.alertTitle}>{alert.title}</div>
                      <div style={styles.alertLocation}>
                        {alert.location} · Target: {alert.targetNames.join(', ')}
                      </div>
                    </div>
                  </div>
                  <span style={styles.alertTimecode}>{alert.timestamp}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#0A0C0F',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: '#0E1014',
    padding: '0 8px',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    color: '#F59E0B',
    borderColor: '#F59E0B',
    fontWeight: 600,
  },
  tabBody: {
    padding: '12px 14px',
  },
  metadataGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    backgroundColor: 'var(--bg-card)',
    padding: '8px 10px',
    borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--border-subtle)',
  },
  metaLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.04em',
  },
  metaValue: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#F5F7FA',
  },
  metaValueMono: {
    fontSize: '11.5px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
    color: '#F5F7FA',
  },
  tagPill: {
    fontSize: '9.5px',
    backgroundColor: '#08090B',
    padding: '1px 5px',
    borderRadius: '2px',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-default)',
  },
  targetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '10px',
  },
  targetCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  targetCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  targetNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  targetColorDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  targetName: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#F5F7FA',
  },
  targetBadge: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginBottom: '6px',
  },
  targetMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
  },
  insightsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  alertCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid',
    cursor: 'pointer',
  },
  alertCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  alertTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#F5F7FA',
  },
  alertLocation: {
    fontSize: '10.5px',
    color: 'var(--text-muted)',
  },
  alertTimecode: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 700,
    color: '#F59E0B',
    backgroundColor: '#08090B',
    padding: '2px 6px',
    borderRadius: '3px',
    border: '1px solid var(--border-default)',
  },
};
