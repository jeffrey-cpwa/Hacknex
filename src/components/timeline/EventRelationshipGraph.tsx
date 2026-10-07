import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GitCommit,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Truck,
  Box,
  User,
  Cpu,
  Layers,
} from 'lucide-react';

export const EventRelationshipGraph: React.FC = () => {
  const {
    relationshipNodes,
    jumpToTimestamp,
    openEvidenceForEvent,
    events,
  } = useApp();

  const [isExpanded, setIsExpanded] = useState(true);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'vehicle':
        return Truck;
      case 'interaction':
        return User;
      case 'security':
        return ShieldAlert;
      case 'object':
        return Box;
      case 'alarm':
        return ShieldAlert;
      default:
        return Clock;
    }
  };

  return (
    <div style={styles.container}>
      {/* Expandable Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={styles.header}
        title="Toggle Temporal Relationship Graph"
      >
        <div style={styles.headerLeft}>
          <div style={styles.iconBox}>
            <GitCommit size={15} color="#F59E0B" />
          </div>
          <div>
            <div style={styles.title}>EVENT RELATIONSHIPS & TEMPORAL CAUSALITY</div>
            <div style={styles.subtitle}>
              Causal graph linking preceding triggers, order of arrival, and threshold alerts
            </div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.nodeCountPill}>
            {relationshipNodes.length} Linked Milestones
          </span>
          <button style={styles.toggleBtn}>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Graph Visual Canvas */}
      {isExpanded && (
        <div style={styles.graphBody}>
          <div style={styles.nodesTrack}>
            {relationshipNodes.map((node, index) => {
              const Icon = getCategoryIcon(node.category);
              const isLast = index === relationshipNodes.length - 1;

              return (
                <React.Fragment key={node.id}>
                  {/* Event Node */}
                  <div
                    onClick={() => {
                      const ev = events.find((e) => e.id === node.eventId);
                      if (ev) {
                        jumpToTimestamp(node.timestampSec, node.eventId);
                      }
                    }}
                    style={{
                      ...styles.nodeCard,
                      borderColor:
                        node.severity === 'critical'
                          ? '#EF4444'
                          : node.severity === 'warning'
                          ? '#F59E0B'
                          : 'var(--border-default)',
                    }}
                    className="rel-node"
                    title={`Click to jump to ${node.timestamp} (${node.title})`}
                  >
                    <div style={styles.nodeHeader}>
                      <Icon
                        size={12}
                        color={
                          node.severity === 'critical'
                            ? '#EF4444'
                            : node.severity === 'warning'
                            ? '#F59E0B'
                            : '#38BDF8'
                        }
                      />
                      <span style={styles.nodeTime}>{node.timestamp}</span>
                    </div>
                    <div style={styles.nodeTitle}>{node.title}</div>
                    <div style={styles.nodeTarget}>{node.target}</div>
                  </div>

                  {/* Relationship Connector Pill */}
                  {!isLast && node.relationToNext && (
                    <div style={styles.connectorContainer}>
                      <div style={styles.relationPill}>
                        <span style={styles.relationType}>{node.relationToNext.type}</span>
                        <span style={styles.relationDelta}>
                          {node.relationToNext.deltaFormatted}
                        </span>
                      </div>
                      <div style={styles.arrowLine}>
                        <div style={styles.line} />
                        <ArrowRight size={12} color="var(--accent-amber)" />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Reasoning summary footnote */}
          <div style={styles.reasoningFootnote}>
            <Sparkles size={13} color="#F59E0B" />
            <span>
              <strong>Temporal Reasoning:</strong> Person #07 entered restricted zone 53.2s after Truck #01 docked at Bay 2, deposited Box #04, and the safety alarm tripped 1m 10s later.
            </span>
          </div>
        </div>
      )}
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
    boxShadow: 'var(--shadow-md)',
  },
  header: {
    padding: '12px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0E1116',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border-subtle)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconBox: {
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#F5F7FA',
    letterSpacing: '0.04em',
  },
  subtitle: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  nodeCountPill: {
    fontSize: '10.5px',
    fontFamily: 'var(--font-mono)',
    backgroundColor: '#12151A',
    color: 'var(--text-secondary)',
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid var(--border-subtle)',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  graphBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: '#08090B',
  },
  nodesTrack: {
    display: 'flex',
    alignItems: 'center',
    overflowX: 'auto',
    padding: '10px 4px',
    gap: '4px',
  },
  nodeCard: {
    width: '150px',
    backgroundColor: '#12151A',
    border: '1.5px solid var(--border-default)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  nodeHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nodeTime: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#F59E0B',
  },
  nodeTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#F5F7FA',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  nodeTarget: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  connectorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 8px',
    flexShrink: 0,
    gap: '4px',
  },
  relationPill: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#151922',
    border: '1px solid var(--border-default)',
    borderRadius: '4px',
    padding: '3px 8px',
    textAlign: 'center',
  },
  relationType: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#F59E0B',
    letterSpacing: '0.06em',
  },
  relationDelta: {
    fontSize: '9.5px',
    fontFamily: 'var(--font-mono)',
    color: '#9299A4',
    whiteSpace: 'nowrap',
  },
  arrowLine: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  line: {
    width: '36px',
    height: '1px',
    backgroundColor: 'rgba(245, 158, 11, 0.4)',
  },
  reasoningFootnote: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    borderRadius: 'var(--radius-xs)',
    padding: '8px 12px',
    fontSize: '11.5px',
    color: 'var(--text-secondary)',
  },
};
