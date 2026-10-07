import React from 'react';
import { useApp } from '../../context/AppContext';
import { VideoPlayer } from './VideoPlayer';
import { EventsPanel } from './EventsPanel';
import { Footage } from '../../types';
import { CheckCircle2, Play } from 'lucide-react';

export const VideoWorkspace: React.FC = () => {
  const { footageList, activeFootageId, setActiveFootageId } = useApp();

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.header}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>VIDEO ANALYSIS</h1>
            <p style={styles.subtitle}>
              Neural object tracking & trajectory-mapped CCTV streams from SQL Database.
            </p>
          </div>
          <div style={styles.mappedModeBadge}>
            <span style={styles.livePulseDot} />
            <span>MAPPED STREAM · OBJECT TRACKED</span>
          </div>
        </div>

        {/* Camera / Video Switcher Bar */}
        <div style={styles.cameraSwitcherBar}>
          <span style={styles.switcherLabel}>SELECT CAMERA:</span>
          <div style={styles.switcherList}>
            {footageList.map((f) => {
              const isActive = f.id === activeFootageId;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFootageId(f.id)}
                  style={{
                    ...styles.cameraBtn,
                    ...(isActive ? styles.cameraBtnActive : {}),
                  }}
                >
                  <span style={{ ...styles.cameraDot, backgroundColor: isActive ? '#F59E0B' : '#5B6270' }} />
                  <span style={styles.cameraName}>{f.title}</span>
                  <span style={styles.cameraEventsBadge}>{f.eventCount} events</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Analysis Area: Video + Events */}
      <div style={styles.topGrid}>
        {/* Left Column: Video Player */}
        <div style={styles.leftCol}>
          <VideoPlayer />
        </div>

        {/* Right Column: Events Panel */}
        <div style={styles.rightCol}>
          <EventsPanel />
        </div>
      </div>

      {/* Uploaded Footage Section */}
      <div style={styles.uploadedSection}>
        <h2 style={styles.sectionTitle}>UPLOADED FOOTAGE</h2>
        <div style={styles.footageGrid}>
          {footageList.map((footage) => (
            <CompactFootageCard
              key={footage.id}
              footage={footage}
              isSelected={footage.id === activeFootageId}
              onClick={() => setActiveFootageId(footage.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface CompactFootageCardProps {
  footage: Footage;
  isSelected: boolean;
  onClick: () => void;
}

const CompactFootageCard: React.FC<CompactFootageCardProps> = ({ footage, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.card,
        ...(isSelected ? styles.cardSelected : {}),
        textAlign: 'left',
      }}
    >
      <div style={styles.thumbnailContainer}>
        <div style={styles.thumbnailBg}>
          <div style={styles.gridOverlay} />
          <div style={styles.centerIcon}>
            <Play size={16} color={isSelected ? "#F59E0B" : "#9299A4"} fill={isSelected ? "rgba(245, 158, 11, 0.4)" : "rgba(146, 153, 164, 0.2)"} />
          </div>
          <div style={styles.durationBadge}>{footage.duration}</div>
        </div>
        {isSelected && (
          <div style={styles.selectedPill}>
            <CheckCircle2 size={10} color="#F59E0B" />
            <span>SELECTED</span>
          </div>
        )}
      </div>
      <div style={styles.cardInfo}>
        <div style={styles.cardTitle} title={footage.title}>
          {footage.title}
        </div>
        <div style={styles.cardEvents}>
          {footage.eventCount} events
        </div>
      </div>
    </button>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px 28px',
    height: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#F5F7FA',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '3px',
  },
  mappedModeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    padding: '4px 10px',
    borderRadius: '16px',
  },
  livePulseDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
    boxShadow: '0 0 8px rgba(16, 185, 129, 0.8)',
    display: 'inline-block',
  },
  cameraSwitcherBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    padding: '8px 12px',
    backgroundColor: '#0A0C0F',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
  },
  switcherLabel: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  switcherList: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  cameraBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  cameraBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    color: '#F59E0B',
    fontWeight: 600,
    boxShadow: '0 0 12px rgba(245, 158, 11, 0.15)',
  },
  cameraDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  cameraName: {
    maxWidth: '180px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cameraEventsBadge: {
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: '1px 5px',
    borderRadius: '3px',
    color: '#9299A4',
  },
  topGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 72%) minmax(28%, 1fr)',
    gap: '16px',
    minHeight: '520px',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  rightCol: {
    height: '100%',
    minHeight: '520px',
  },
  uploadedSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '8px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#F5F7FA',
  },
  footageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#0E1013',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  cardSelected: {
    borderColor: 'var(--accent-amber)',
    backgroundColor: '#15171a',
    boxShadow: '0 0 0 1px rgba(245, 158, 11, 0.3)',
  },
  thumbnailContainer: {
    height: '100px',
    position: 'relative',
    backgroundColor: '#050608',
  },
  thumbnailBg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0c0e12',
    backgroundImage: 'radial-gradient(ellipse at center, #171c24 0%, #080a0d 100%)',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
    backgroundSize: '16px 16px',
  },
  centerIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(18, 21, 26, 0.8)',
    border: '1px solid rgba(146, 153, 164, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  durationBadge: {
    position: 'absolute',
    bottom: '6px',
    right: '6px',
    fontSize: '9px',
    fontFamily: 'var(--font-mono)',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#F5F7FA',
    padding: '2px 5px',
    borderRadius: '3px',
    border: '1px solid #252A31',
    zIndex: 2,
  },
  selectedPill: {
    position: 'absolute',
    top: '6px',
    left: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '9px',
    fontWeight: 700,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    color: '#F59E0B',
    padding: '2px 6px',
    borderRadius: '3px',
    zIndex: 2,
  },
  cardInfo: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  cardTitle: {
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#F5F7FA',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardEvents: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
};
