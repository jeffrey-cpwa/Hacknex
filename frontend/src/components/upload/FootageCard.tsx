import React from 'react';
import { Footage } from '../../types';
import {
  Play,
  Clock,
  MessageSquare,
  MoreVertical,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Film,
  Calendar,
  Eye,
} from 'lucide-react';

interface FootageCardProps {
  footage: Footage;
  isSelected?: boolean;
  isEditMode?: boolean;
  isChecked?: boolean;
  onToggleCheck?: () => void;
  onOpen: () => void;
  onPreviewRaw?: () => void;
  onTimeline: () => void;
  onAskAI: () => void;
  onDelete?: () => void;
}

export const FootageCard: React.FC<FootageCardProps> = ({
  footage,
  isSelected,
  isEditMode,
  isChecked,
  onToggleCheck,
  onOpen,
  onPreviewRaw,
  onTimeline,
  onAskAI,
}) => {
  return (
    <div
      style={{
        ...styles.card,
        ...(isSelected ? styles.cardActive : {}),
        ...(isChecked ? styles.cardChecked : {}),
      }}
      className="footage-card"
    >
      {/* Thumbnail Area */}
      <div style={styles.thumbnailContainer} onClick={isEditMode ? onToggleCheck : (onPreviewRaw || onOpen)}>
        {/* Mock Forensic Video Frame Canvas */}
        <div style={styles.thumbnailBg}>
          <div style={styles.gridOverlay} />
          <div style={styles.hudHeader}>
            <span style={styles.hudBadge}>CCTV FEED</span>
          </div>
          <div style={styles.centerIcon}>
            <Play size={22} color="#F59E0B" fill="rgba(245, 158, 11, 0.4)" />
          </div>
          <div style={styles.hudFooter}>
            <span style={styles.durationBadge}>{footage.duration}</span>
            {footage.criticalEventsCount > 0 && (
              <span style={styles.alertCountBadge}>
                <AlertTriangle size={10} /> {footage.criticalEventsCount} alerts
              </span>
            )}
          </div>
        </div>

        {/* Edit mode checkbox */}
        {isEditMode && (
          <div
            style={styles.checkboxWrapper}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCheck?.();
            }}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={onToggleCheck}
              style={styles.checkbox}
            />
          </div>
        )}

        {/* Status Pill */}
        <div style={styles.statusPill}>
          <CheckCircle2 size={11} color="#10B981" />
          <span>{footage.status}</span>
        </div>
      </div>

      {/* Card Info */}
      <div style={styles.infoContainer}>
        <div style={styles.titleRow}>
          <div style={styles.title} title={footage.title}>
            {footage.title}
          </div>
          <span style={styles.filename} title={`Raw: ${footage.rawFilename || footage.filename} | Mapped: ${footage.mappedFilename || footage.filename}`}>
            {footage.rawFilename || footage.filename}
          </span>
        </div>

        {/* Stream Type Tags */}
        <div style={{ display: 'flex', gap: '6px', fontSize: '10px', marginTop: '2px', flexWrap: 'wrap' }}>
          <span style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.25)', fontFamily: 'var(--font-mono)' }}>
            Raw: {footage.rawFilename || footage.filename}
          </span>
          <span style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.25)', fontFamily: 'var(--font-mono)' }}>
            Mapped: {footage.mappedFilename || footage.filename}
          </span>
        </div>

        {/* Meta stats */}
        <div style={styles.metaRow}>
          <div style={styles.metaItem}>
            <Calendar size={11} color="#9299A4" />
            <span>{footage.date}</span>
          </div>
          <div style={styles.metaItem}>
            <Layers size={11} color="#F59E0B" />
            <span style={{ color: '#F59E0B', fontWeight: 600 }}>{footage.eventCount} events</span>
          </div>
        </div>

        {/* Tags */}
        <div style={styles.tagRow}>
          {footage.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} style={styles.tagBadge}>
              {tag}
            </span>
          ))}
          {footage.tags.length > 3 && (
            <span style={styles.tagBadge}>+{footage.tags.length - 3}</span>
          )}
        </div>

        {/* Hover Action Bar */}
        <div style={styles.actionBar}>
          <button
            onClick={onOpen}
            style={{ ...styles.actionBtn, ...styles.actionBtnPrimary }}
            title="Open in Video Analysis (Mapped View)"
          >
            <Film size={12} />
            <span>Video Analysis</span>
          </button>
          <button
            onClick={onPreviewRaw}
            style={styles.actionBtn}
            title="View Raw Uploaded Video"
          >
            <Eye size={12} />
            <span>Raw Preview</span>
          </button>
          <button
            onClick={onTimeline}
            style={styles.actionBtn}
            title="Explore Temporal Timeline"
          >
            <Clock size={12} />
            <span>Timeline</span>
          </button>
          <button
            onClick={onAskAI}
            style={styles.actionBtn}
            title="Ask AI Questions"
          >
            <MessageSquare size={12} />
            <span>Ask AI</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.2s ease',
    position: 'relative',
  },
  cardActive: {
    borderColor: 'var(--border-accent)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(245, 158, 11, 0.3)',
  },
  cardChecked: {
    borderColor: '#38BDF8',
    backgroundColor: '#151922',
  },
  thumbnailContainer: {
    height: '140px',
    position: 'relative',
    cursor: 'pointer',
    backgroundColor: '#050608',
  },
  thumbnailBg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0c0e12',
    backgroundImage: 'radial-gradient(ellipse at center, #171c24 0%, #080a0d 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '8px 10px',
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
    backgroundSize: '16px 16px',
    pointerEvents: 'none',
  },
  hudHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  hudBadge: {
    fontSize: '9px',
    fontFamily: 'var(--font-mono)',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: '1px 5px',
    borderRadius: '2px',
    letterSpacing: '0.05em',
  },
  hudResolution: {
    fontSize: '9.5px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
  centerIcon: {
    alignSelf: 'center',
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: 'rgba(18, 21, 26, 0.8)',
    border: '1px solid rgba(245, 158, 11, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    boxShadow: '0 0 14px rgba(245, 158, 11, 0.2)',
  },
  hudFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  durationBadge: {
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#F5F7FA',
    padding: '2px 6px',
    borderRadius: '3px',
    border: '1px solid #252A31',
  },
  alertCountBadge: {
    fontSize: '9.5px',
    fontWeight: 600,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#EF4444',
    padding: '2px 6px',
    borderRadius: '3px',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },
  checkboxWrapper: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    zIndex: 10,
    backgroundColor: 'rgba(8, 9, 11, 0.85)',
    padding: '4px',
    borderRadius: '4px',
    border: '1px solid var(--border-default)',
  },
  checkbox: {
    cursor: 'pointer',
    width: '14px',
    height: '14px',
    accentColor: '#F59E0B',
  },
  statusPill: {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    fontWeight: 600,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#10B981',
    padding: '1px 6px',
    borderRadius: '3px',
    zIndex: 2,
  },
  infoContainer: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  titleRow: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#F5F7FA',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  filename: {
    fontSize: '10.5px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
    marginTop: '1px',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  tagRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
  },
  tagBadge: {
    fontSize: '10px',
    backgroundColor: 'var(--bg-panel)',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-subtle)',
    padding: '1px 5px',
    borderRadius: '3px',
  },
  actionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginTop: '4px',
    paddingTop: '8px',
    borderTop: '1px solid var(--border-subtle)',
  },
  actionBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 500,
    padding: '5px 4px',
    borderRadius: 'var(--radius-xs)',
    backgroundColor: 'var(--bg-panel)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  actionBtnPrimary: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    color: '#F59E0B',
    fontWeight: 600,
  },
};
