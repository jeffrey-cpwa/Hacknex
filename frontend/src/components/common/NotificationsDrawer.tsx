import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  Info,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { insightAlerts, jumpToTimestamp, activeFootage } = useApp();

  if (!isOpen) return null;

  const criticalCount = insightAlerts.filter((a) => a.type === 'critical').length;
  const warningCount = insightAlerts.filter((a) => a.type === 'warning').length;
  const infoCount = insightAlerts.filter((a) => a.type === 'info').length;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitleRow}>
            <div style={styles.iconBox}>
              <ShieldAlert size={16} color="#EF4444" />
            </div>
            <div>
              <div style={styles.title}>INCIDENT ALERTS & INSIGHTS</div>
              <div style={styles.subtitle}>{activeFootage.filename} · Active Stream</div>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>

        {/* Top Summary Metrics */}
        <div style={styles.summaryBar}>
          <div style={{ ...styles.summaryItem, borderColor: 'rgba(239, 68, 68, 0.4)' }}>
            <span style={{ ...styles.summaryCount, color: '#EF4444' }}>{criticalCount}</span>
            <span style={styles.summaryLabel}>CRITICAL</span>
          </div>
          <div style={{ ...styles.summaryItem, borderColor: 'rgba(245, 158, 11, 0.4)' }}>
            <span style={{ ...styles.summaryCount, color: '#F59E0B' }}>{warningCount}</span>
            <span style={styles.summaryLabel}>WARNINGS</span>
          </div>
          <div style={{ ...styles.summaryItem, borderColor: 'rgba(56, 189, 248, 0.4)' }}>
            <span style={{ ...styles.summaryCount, color: '#38BDF8' }}>{infoCount}</span>
            <span style={styles.summaryLabel}>INFORMATIONAL</span>
          </div>
        </div>

        {/* Alerts Stream */}
        <div style={styles.alertsList}>
          {insightAlerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => {
                jumpToTimestamp(alert.timestampSec, alert.eventId, 'timeline');
                onClose();
              }}
              style={{
                ...styles.alertCard,
                borderColor:
                  alert.type === 'critical'
                    ? 'rgba(239, 68, 68, 0.35)'
                    : alert.type === 'warning'
                    ? 'rgba(245, 158, 11, 0.35)'
                    : 'rgba(56, 189, 248, 0.3)',
              }}
            >
              <div style={styles.alertCardTop}>
                <div style={styles.alertTypeRow}>
                  {alert.type === 'critical' && (
                    <span style={styles.criticalBadge}>HIGH CRITICAL</span>
                  )}
                  {alert.type === 'warning' && (
                    <span style={styles.warningBadge}>MEDIUM WARNING</span>
                  )}
                  {alert.type === 'info' && (
                    <span style={styles.infoBadge}>INFO LOG</span>
                  )}
                </div>
                <span style={styles.alertTimestamp}>{alert.timestamp}</span>
              </div>

              <div style={styles.alertTitle}>{alert.title}</div>

              <div style={styles.alertMetaRow}>
                <span>Target: <strong>{alert.target}</strong></span>
                <span>Loc: {alert.location}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  drawer: {
    width: '380px',
    height: '100%',
    backgroundColor: '#0E1116',
    borderLeft: '1px solid var(--border-default)',
    boxShadow: 'var(--shadow-lg)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0C0F',
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconBox: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#F5F7FA',
  },
  subtitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  summaryBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#0A0C0F',
    borderBottom: '1px solid var(--border-subtle)',
  },
  summaryItem: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid',
    borderRadius: 'var(--radius-xs)',
    padding: '6px 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  summaryCount: {
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    fontWeight: 700,
  },
  summaryLabel: {
    fontSize: '8.5px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '0.06em',
  },
  alertsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  alertCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid',
    borderRadius: 'var(--radius-sm)',
    padding: '12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    transition: 'all 0.15s ease',
  },
  alertCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertTypeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  criticalBadge: {
    fontSize: '9px',
    fontWeight: 700,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#EF4444',
    padding: '1px 5px',
    borderRadius: '2px',
  },
  warningBadge: {
    fontSize: '9px',
    fontWeight: 700,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#F59E0B',
    padding: '1px 5px',
    borderRadius: '2px',
  },
  infoBadge: {
    fontSize: '9px',
    fontWeight: 700,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    color: '#38BDF8',
    padding: '1px 5px',
    borderRadius: '2px',
  },
  alertTimestamp: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 700,
    color: '#F59E0B',
  },
  alertTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#F5F7FA',
  },
  alertMetaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
};
