import React, { useState } from 'react';
import {
  X,
  Settings,
  Sliders,
  Cpu,
  Database,
  Eye,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [confidenceThreshold, setConfidenceThreshold] = useState(90);
  const [hudScanlines, setHudScanlines] = useState(true);
  const [highContrastHud, setHighContrastHud] = useState(true);
  const [autoLoopEvidence, setAutoLoopEvidence] = useState(true);

  if (!isOpen) return null;

  const handleResetData = () => {
    if (confirm('Reset mock investigation data to initial state?')) {
      localStorage.removeItem('temporal_ai_footage');
      localStorage.removeItem('temporal_ai_investigations');
      window.location.reload();
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <div style={styles.iconBox}>
              <Settings size={16} color="#F59E0B" />
            </div>
            <div>
              <div style={styles.title}>FORENSIC ENGINE PREFERENCES</div>
              <div style={styles.subtitle}>TEMPORAL AI v2.4 Neural Configuration</div>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>

        {/* Settings Body */}
        <div style={styles.body}>
          {/* Section 1: Vision & Detection Settings */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <Cpu size={13} color="#F59E0B" />
              <span>COMPUTER VISION & TEMPORAL ENGINE</span>
            </div>

            <div style={styles.settingItem}>
              <div style={styles.settingText}>
                <span style={styles.settingLabel}>Re-ID Confidence Filter Threshold</span>
                <span style={styles.settingSub}>
                  Minimum detection confidence required for automated incident flag
                </span>
              </div>
              <div style={styles.sliderGroup}>
                <input
                  type="range"
                  min={80}
                  max={99}
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                  style={{ width: '100px' }}
                />
                <span style={styles.thresholdVal}>{confidenceThreshold}%</span>
              </div>
            </div>

            <div style={styles.settingItem}>
              <div style={styles.settingText}>
                <span style={styles.settingLabel}>Surveillance Scanlines & HUD Overlays</span>
                <span style={styles.settingSub}>
                  Render high-tech CCTV raster overlay in video viewport
                </span>
              </div>
              <input
                type="checkbox"
                checked={hudScanlines}
                onChange={() => setHudScanlines(!hudScanlines)}
                style={styles.checkbox}
              />
            </div>

            <div style={styles.settingItem}>
              <div style={styles.settingText}>
                <span style={styles.settingLabel}>Evidence Looping Clip Playback</span>
                <span style={styles.settingSub}>
                  Continuously loop targeted timestamps inside Evidence Viewer
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoLoopEvidence}
                onChange={() => setAutoLoopEvidence(!autoLoopEvidence)}
                style={styles.checkbox}
              />
            </div>
          </div>

          {/* Section 2: Storage & Session Management */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <Database size={13} color="#F59E0B" />
              <span>LOCAL SESSION CACHE & PERSISTENCE</span>
            </div>

            <div style={styles.settingItem}>
              <div style={styles.settingText}>
                <span style={styles.settingLabel}>Reset Local Mock Storage</span>
                <span style={styles.settingSub}>
                  Restore original mock video evidence and timeline investigations
                </span>
              </div>
              <button onClick={handleResetData} className="btn btn-sm btn-danger">
                <RotateCcw size={12} />
                <span>Reset Demo State</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} className="btn btn-primary btn-sm">
            <span>Save & Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '90%',
    maxWidth: '560px',
    backgroundColor: '#0E1116',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0C0F',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconBox: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '13.5px',
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
  body: {
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '10px',
    fontWeight: 700,
    color: '#F59E0B',
    letterSpacing: '0.08em',
  },
  settingItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-xs)',
    padding: '10px 12px',
  },
  settingText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  settingLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#F5F7FA',
  },
  settingSub: {
    fontSize: '10.5px',
    color: 'var(--text-muted)',
  },
  sliderGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  thresholdVal: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11.5px',
    fontWeight: 700,
    color: '#F59E0B',
    width: '32px',
  },
  checkbox: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    accentColor: '#F59E0B',
  },
  footer: {
    padding: '12px 20px',
    borderTop: '1px solid var(--border-subtle)',
    backgroundColor: '#0A0C0F',
    display: 'flex',
    justifyContent: 'flex-end',
  },
};
