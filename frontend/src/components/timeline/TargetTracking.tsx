import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TargetCategory, TargetEntity } from '../../types';
import {
  User,
  Truck,
  Box,
  Cpu,
  Clock,
  MapPin,
  Sparkles,
  Play,
  ArrowDown,
  Crosshair,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Layers,
  Activity,
  ArrowRight,
} from 'lucide-react';

export const TargetTracking: React.FC = () => {
  const {
    allTargets,
    selectedTargetId,
    setSelectedTargetId,
    selectedTarget,
    targetCategoryFilter,
    setTargetCategoryFilter,
    jumpToTimestamp,
    openEvidenceForEvent,
    events,
  } = useApp();

  const categories: Array<{ id: TargetCategory; label: string; icon: React.ElementType }> = [
    { id: 'person', label: 'Person', icon: User },
    { id: 'vehicle', label: 'Vehicle', icon: Truck },
    { id: 'object', label: 'Object', icon: Box },
    { id: 'machine', label: 'Machine', icon: Cpu },
  ];

  // Filter targets by selected category
  const filteredTargets = allTargets.filter((t) => t.type === targetCategoryFilter);

  const currentTarget: TargetEntity =
    allTargets.find((t) => t.id === selectedTargetId) ||
    filteredTargets[0] ||
    allTargets[0];

  const handleSelectTarget = (target: TargetEntity) => {
    setSelectedTargetId(target.id);
  };

  const handleLocationClick = (timestampSec: number, eventId?: string) => {
    jumpToTimestamp(timestampSec, eventId);
  };

  return (
    <div style={styles.container}>
      {/* Header & Category Tabs */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>TARGET TRACKING</h2>
          <p style={styles.subtitle}>
            Inspect continuous spatial trajectory, dwell time, and occurrence history.
          </p>
        </div>

        {/* Category Tabs */}
        <div style={styles.categoryTabs}>
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = targetCategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setTargetCategoryFilter(cat.id);
                  const firstInCat = allTargets.find((t) => t.type === cat.id);
                  if (firstInCat) {
                    setSelectedTargetId(firstInCat.id);
                  }
                }}
                style={{
                  ...styles.catTabBtn,
                  ...(isActive ? styles.catTabBtnActive : {}),
                }}
              >
                <Icon size={13} color={isActive ? '#F59E0B' : '#9299A4'} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Selector Bar */}
      <div style={styles.targetSelectorBar}>
        <span style={styles.selectorLabel}>TARGET SELECTOR:</span>
        <div style={styles.targetPillsList}>
          {filteredTargets.map((tgt) => {
            const isSelected = tgt.id === currentTarget.id;
            return (
              <button
                key={tgt.id}
                onClick={() => handleSelectTarget(tgt)}
                style={{
                  ...styles.targetPill,
                  ...(isSelected ? styles.targetPillActive : {}),
                }}
              >
                <span
                  style={{
                    ...styles.colorDot,
                    backgroundColor: tgt.color,
                  }}
                />
                <span style={styles.pillName}>{tgt.name}</span>
                <span style={styles.pillBadge}>{tgt.badge}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Intelligence Card (Left) + Connected Movement Path (Right) */}
      <div style={styles.mainGrid}>
        {/* Left: Target Intelligence Panel */}
        <div style={styles.intelligenceCard}>
          <div style={styles.intelHeader}>
            <div style={styles.intelAvatarRow}>
              <div
                style={{
                  ...styles.intelAvatar,
                  backgroundColor: `${currentTarget.color}20`,
                  borderColor: currentTarget.color,
                }}
              >
                <Crosshair size={20} color={currentTarget.color} />
              </div>
              <div>
                <div style={styles.intelTargetName}>{currentTarget.name}</div>
                <div style={styles.intelBadge}>{currentTarget.badge}</div>
              </div>
            </div>
            <span style={styles.statusPill}>{currentTarget.status}</span>
          </div>

          {/* Metrics Grid */}
          <div style={styles.metricsGrid}>
            <div style={styles.metricItem}>
              <span style={styles.metricLabel}>FIRST SEEN</span>
              <span style={styles.metricValMono}>{currentTarget.firstSeen}</span>
            </div>
            <div style={styles.metricItem}>
              <span style={styles.metricLabel}>LAST SEEN</span>
              <span style={styles.metricValMono}>{currentTarget.lastSeen}</span>
            </div>
            <div style={styles.metricItem}>
              <span style={styles.metricLabel}>OCCURRENCES</span>
              <span style={styles.metricVal}>{currentTarget.occurrences} events</span>
            </div>
            <div style={styles.metricItem}>
              <span style={styles.metricLabel}>VISIBLE DURATION</span>
              <span style={{ ...styles.metricVal, color: '#F59E0B' }}>
                {currentTarget.totalDuration}
              </span>
            </div>
            <div style={styles.metricItem}>
              <span style={styles.metricLabel}>RE-ID CONFIDENCE</span>
              <span style={{ ...styles.metricVal, color: '#10B981' }}>
                {currentTarget.confidence}%
              </span>
            </div>
            {/* If Object: show Untouched Duration */}
            {currentTarget.type === 'object' && currentTarget.untouchedDuration && (
              <div style={{ ...styles.metricItem, borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.08)' }}>
                <span style={{ ...styles.metricLabel, color: '#EF4444' }}>UNTOUCHED DURATION</span>
                <span style={{ ...styles.metricValMono, color: '#EF4444' }}>
                  {currentTarget.untouchedDuration}
                </span>
              </div>
            )}
          </div>

          {/* Dedicated Object Mode Evidence Trigger */}
          {currentTarget.type === 'object' && (
            <div style={styles.objectEvidenceCard}>
              <div style={styles.objEvidHeader}>
                <ShieldAlert size={15} color="#EF4444" />
                <span style={styles.objEvidTitle}>UNATTENDED OBJECT DETECTED</span>
              </div>
              <p style={styles.objEvidDesc}>
                Box #04 was left stationary and untouched for <strong>2m 21s</strong>, exceeding the 2-minute facility safety threshold.
              </p>
              <button
                onClick={() => {
                  const boxEvent = events.find((e) => e.id === 'evt-5');
                  if (boxEvent) openEvidenceForEvent(boxEvent);
                }}
                className="btn btn-danger"
                style={{ width: '100%', padding: '7px 10px', gap: '6px' }}
              >
                <Play size={13} fill="#EF4444" />
                <span>▶ View Object Evidence</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: TARGET HISTORY - Visual Connected Movement Path */}
        <div style={styles.historyCard}>
          <div style={styles.historyHeader}>
            <div style={styles.historyTitleGroup}>
              <h3 style={styles.historyTitle}>TARGET HISTORY</h3>
              <span style={styles.historySub}>
                Connected spatial trajectory & event sequence
              </span>
            </div>
            <span style={styles.historyStepCount}>
              {currentTarget.history.length} waypoints
            </span>
          </div>

          {/* Visual Connected Path */}
          <div style={styles.pathContainer}>
            {currentTarget.history.map((step, idx) => {
              const isLast = idx === currentTarget.history.length - 1;
              return (
                <div key={step.id} style={styles.stepWrapper}>
                  {/* Step Row */}
                  <div
                    onClick={() => handleLocationClick(step.timestampSec, step.eventId)}
                    style={styles.stepNode}
                    className="step-node"
                    title={`Click to jump to ${step.timestamp}`}
                  >
                    {/* Time Badge */}
                    <div style={styles.stepTimeBadge}>{step.timestamp}</div>

                    {/* Node Dot */}
                    <div
                      style={{
                        ...styles.stepDot,
                        backgroundColor: currentTarget.color,
                        boxShadow: `0 0 8px ${currentTarget.color}80`,
                      }}
                    />

                    {/* Location & Action */}
                    <div style={styles.stepDetails}>
                      <div style={styles.stepLocationRow}>
                        <span style={styles.stepLocation}>{step.location}</span>
                        {step.statusBadge && (
                          <span style={styles.stepStatusBadge}>{step.statusBadge}</span>
                        )}
                      </div>
                      <div style={styles.stepAction}>{step.action}</div>
                    </div>

                    <ArrowRight size={13} color="#9299A4" style={{ marginLeft: 'auto' }} />
                  </div>

                  {/* Down Connector Arrow (except last) */}
                  {!isLast && (
                    <div style={styles.arrowConnector}>
                      <div style={styles.connectorLine} />
                      <ArrowDown size={12} color="var(--accent-amber)" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
  categoryTabs: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#12151A',
    padding: '3px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
  },
  catTabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: 'var(--radius-xs)',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '11.5px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  catTabBtnActive: {
    backgroundColor: '#1C222D',
    color: '#F59E0B',
    fontWeight: 600,
  },
  targetSelectorBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#0E1116',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 14px',
    overflowX: 'auto',
  },
  selectorLabel: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  targetPillsList: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  targetPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 10px',
    borderRadius: 'var(--radius-xs)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  targetPillActive: {
    backgroundColor: '#181E27',
    borderColor: 'var(--accent-amber)',
    boxShadow: '0 0 10px rgba(245, 158, 11, 0.25)',
  },
  colorDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
  },
  pillName: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#F5F7FA',
  },
  pillBadge: {
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '340px minmax(0, 1fr)',
    gap: '16px',
    flex: 1,
  },
  intelligenceCard: {
    backgroundColor: '#0A0C0F',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  intelHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '12px',
  },
  intelAvatarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  intelAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  intelTargetName: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#F5F7FA',
  },
  intelBadge: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '1px',
  },
  statusPill: {
    fontSize: '10px',
    fontWeight: 600,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10B981',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    padding: '2px 6px',
    borderRadius: '3px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  metricItem: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-xs)',
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  metricLabel: {
    fontSize: '9.5px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  metricVal: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#F5F7FA',
  },
  metricValMono: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    fontWeight: 700,
    color: '#F5F7FA',
  },
  objectEvidenceCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  objEvidHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  objEvidTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#EF4444',
    letterSpacing: '0.04em',
  },
  objEvidDesc: {
    fontSize: '11.5px',
    color: '#E5E7EB',
    lineHeight: 1.4,
  },
  historyCard: {
    backgroundColor: '#0A0C0F',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  historyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '12px',
    marginBottom: '16px',
  },
  historyTitleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  historyTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#F5F7FA',
  },
  historySub: {
    fontSize: '11.5px',
    color: 'var(--text-secondary)',
  },
  historyStepCount: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    backgroundColor: '#12151A',
    color: 'var(--text-secondary)',
    padding: '2px 7px',
    borderRadius: '10px',
    border: '1px solid var(--border-subtle)',
  },
  pathContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  stepWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  stepNode: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: '#12151A',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  stepTimeBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 700,
    color: '#F59E0B',
    backgroundColor: '#08090B',
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid var(--border-default)',
    flexShrink: 0,
  },
  stepDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  stepDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  stepLocationRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  stepLocation: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#F5F7FA',
  },
  stepStatusBadge: {
    fontSize: '9.5px',
    fontWeight: 600,
    padding: '1px 5px',
    borderRadius: '3px',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#F59E0B',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  },
  stepAction: {
    fontSize: '11.5px',
    color: 'var(--text-secondary)',
  },
  arrowConnector: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '24px',
    justifyContent: 'center',
    gap: '2px',
  },
  connectorLine: {
    width: '1.5px',
    height: '10px',
    backgroundColor: 'rgba(245, 158, 11, 0.4)',
  },
};
