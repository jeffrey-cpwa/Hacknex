import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Play,
  Pause,
  Clock,
  Layers,
  Sparkles,
  ShieldAlert,
  Crosshair,
  Maximize2,
  CheckCircle2,
  Share2,
  Download,
} from 'lucide-react';

export const EvidenceViewerModal: React.FC = () => {
  const {
    evidenceModalOpen,
    evidenceData,
    closeEvidenceModal,
    openTimelineWithEvents,
  } = useApp();

  const [isPlaying, setIsPlaying] = useState(true);
  const [clipTimeSec, setClipTimeSec] = useState(0);

  useEffect(() => {
    if (evidenceData) {
      setClipTimeSec(evidenceData.startSec);
    }
  }, [evidenceData]);

  useEffect(() => {
    let interval: any = null;
    if (evidenceModalOpen && isPlaying && evidenceData) {
      interval = setInterval(() => {
        setClipTimeSec((prev) => {
          if (prev >= evidenceData.endSec) {
            return evidenceData.startSec; // Loop within evidence window
          }
          return Math.min(evidenceData.endSec, prev + 0.1);
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [evidenceModalOpen, isPlaying, evidenceData]);

  if (!evidenceModalOpen || !evidenceData) return null;

  const handleOpenTimeline = () => {
    closeEvidenceModal();
    openTimelineWithEvents(
      evidenceData.primaryEventId ? [evidenceData.primaryEventId] : ['evt-2', 'evt-4'],
      evidenceData.startSec
    );
  };

  const formatSec = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const clipDuration = evidenceData.endSec - evidenceData.startSec;
  const progressPct =
    clipDuration > 0
      ? ((clipTimeSec - evidenceData.startSec) / clipDuration) * 100
      : 0;

  return (
    <div style={styles.backdrop} onClick={closeEvidenceModal}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div style={styles.modalHeader}>
          <div style={styles.modalTitleRow}>
            <div style={styles.evidenceIconBox}>
              <ShieldAlert size={16} color="#F59E0B" />
            </div>
            <div>
              <div style={styles.modalTitle}>EVIDENCE VIEWER</div>
              <div style={styles.modalSubtitle}>
                Targeted Segment: {evidenceData.startFormatted} — {evidenceData.endFormatted} ({evidenceData.footageTitle})
              </div>
            </div>
          </div>

          <div style={styles.headerActions}>
            <span style={styles.confidencePill}>
              Confidence: <strong style={{ color: '#10B981' }}>{evidenceData.confidence}%</strong>
            </span>
            <button onClick={closeEvidenceModal} style={styles.closeBtn}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Video Clip Screen Area */}
        <div style={styles.videoClipArea}>
          <div style={styles.clipScene}>
            {/* Scanline and Grid */}
            <div style={styles.scanline} />
            <div style={styles.gridOverlay} />

            {/* Target Bounding Box on Evidence Frame */}
            <div style={styles.targetBoundingBox}>
              <div style={styles.boundingHeader}>
                <Crosshair size={10} />
                <span>{evidenceData.targetName || 'TARGET #07'} [EVIDENCE TRACK]</span>
              </div>
            </div>

            {/* Top Info HUD */}
            <div style={styles.clipHud}>
              <span style={styles.clipHudBadge}>EVIDENCE_PLAYBACK_LOOP</span>
              <span style={styles.clipHudTime}>{formatSec(clipTimeSec)}</span>
            </div>
          </div>

          {/* Clip Scrubber Bar */}
          <div style={styles.scrubberBar}>
            <div style={styles.scrubberTrack}>
              <div style={{ ...styles.scrubberFill, width: `${progressPct}%` }} />
            </div>
            <div style={styles.scrubberMetaRow}>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                style={styles.playBtnSmall}
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} fill="#FFF" />}
              </button>
              <span style={styles.scrubberRange}>
                {evidenceData.startFormatted} — {evidenceData.endFormatted} (Window: {Math.round(clipDuration)}s)
              </span>
            </div>
          </div>
        </div>

        {/* Micro-steps Breakdown */}
        <div style={styles.microStepsSection}>
          <div style={styles.microStepsTitle}>RELEVANT EVIDENCE MOMENTS</div>
          <div style={styles.stepsList}>
            {evidenceData.microSteps.map((step, idx) => (
              <div
                key={idx}
                onClick={() => setClipTimeSec(step.timestampSec)}
                style={{
                  ...styles.stepCard,
                  ...(step.highlight ? styles.stepCardHighlight : {}),
                }}
              >
                <span style={styles.stepTimestamp}>{step.timestamp}</span>
                <span style={styles.stepDesc}>{step.description}</span>
                {step.highlight && (
                  <span style={styles.keyMomentBadge}>KEY MOMENT</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={styles.modalFooter}>
          <button
            onClick={() => alert(`Forensic clip exported to /exports/evidence_${Date.now()}.mp4`)}
            className="btn btn-sm"
          >
            <Download size={13} />
            <span>Export Evidence Clip</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={closeEvidenceModal} className="btn btn-sm">
              Close
            </button>
            <button
              onClick={handleOpenTimeline}
              className="btn btn-primary btn-sm"
              style={{ gap: '6px' }}
            >
              <Clock size={13} />
              <span>Open Full Timeline</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '90%',
    maxWidth: '680px',
    backgroundColor: '#0E1116',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
  },
  modalHeader: {
    padding: '14px 18px',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0C0F',
  },
  modalTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  evidenceIconBox: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#F5F7FA',
  },
  modalSubtitle: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  confidencePill: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-card)',
    padding: '2px 8px',
    borderRadius: '10px',
    border: '1px solid var(--border-subtle)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  videoClipArea: {
    backgroundColor: '#050608',
    display: 'flex',
    flexDirection: 'column',
  },
  clipScene: {
    height: '240px',
    backgroundColor: '#090C10',
    backgroundImage: 'radial-gradient(ellipse at center, #151a24 0%, #06080b 100%)',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanline: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%)',
    backgroundSize: '100% 4px',
    pointerEvents: 'none',
    zIndex: 2,
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
    backgroundSize: '24px 24px',
    pointerEvents: 'none',
  },
  targetBoundingBox: {
    position: 'relative',
    width: '120px',
    height: '150px',
    border: '2px solid #F59E0B',
    borderRadius: '2px',
    boxShadow: '0 0 16px rgba(245, 158, 11, 0.4)',
    zIndex: 4,
  },
  boundingHeader: {
    position: 'absolute',
    top: '-20px',
    left: '-2px',
    backgroundColor: '#F59E0B',
    color: '#000',
    fontFamily: 'var(--font-mono)',
    fontSize: '9.5px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '2px 2px 0 0',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
  },
  clipHud: {
    position: 'absolute',
    top: '10px',
    left: '12px',
    right: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 5,
  },
  clipHudBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    color: '#F59E0B',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: '2px 6px',
    borderRadius: '3px',
    border: '1px solid #252A31',
  },
  clipHudTime: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    fontWeight: 700,
    color: '#F5F7FA',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: '2px 8px',
    borderRadius: '3px',
    border: '1px solid #252A31',
  },
  scrubberBar: {
    padding: '8px 14px',
    backgroundColor: '#0A0C0F',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  scrubberTrack: {
    width: '100%',
    height: '4px',
    backgroundColor: '#1C222D',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  scrubberFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: '2px',
  },
  scrubberMetaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playBtnSmall: {
    background: 'none',
    border: 'none',
    color: '#F5F7FA',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  scrubberRange: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10.5px',
    color: 'var(--text-muted)',
  },
  microStepsSection: {
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  microStepsTitle: {
    fontSize: '9.5px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
  },
  stepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  stepCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-xs)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
  },
  stepCardHighlight: {
    backgroundColor: '#181E28',
    borderColor: 'var(--border-accent)',
    boxShadow: '0 0 10px rgba(245, 158, 11, 0.15)',
  },
  stepTimestamp: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 700,
    color: '#F59E0B',
  },
  stepDesc: {
    fontSize: '12px',
    color: '#F5F7FA',
    flex: 1,
  },
  keyMomentBadge: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '1px 5px',
    borderRadius: '2px',
  },
  modalFooter: {
    padding: '12px 18px',
    borderTop: '1px solid var(--border-subtle)',
    backgroundColor: '#0A0C0F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
};
