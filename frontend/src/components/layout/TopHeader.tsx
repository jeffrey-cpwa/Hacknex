import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  ChevronDown,
  Upload,
  Layers,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { TimelineMode } from '../../types';

interface TopHeaderProps {
  isEditMode?: boolean;
  setIsEditMode?: (edit: boolean) => void;
  onOpenUploadDialog?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  isEditMode,
  setIsEditMode,
  onOpenUploadDialog,
}) => {
  const {
    activeTab,
    timelineMode,
    setTimelineMode,
    setSearchOpen,
    backendOnline,
  } = useApp();

  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'upload':
        return 'UPLOAD FOOTAGE';
      case 'timeline':
        return 'TIMELINE';
      case 'video':
        return 'VIDEO ANALYSIS';
      case 'chat':
        return 'INVESTIGATION CHAT';
      default:
        return 'VIDEO ANALYSIS';
    }
  };

  const modeOptions: Array<{ id: TimelineMode; label: string; desc: string }> = [
    { id: 'incident', label: 'Incident Timeline', desc: 'Chronological event markers' },
    { id: 'gantt', label: 'Gantt Timeline', desc: 'Continuous duration intervals' },
    { id: 'target', label: 'Target Tracking', desc: 'Spatial trajectory & history' },
  ];

  return (
    <header style={styles.header}>
      {/* Left: Current Page Name & API Status */}
      <div style={styles.leftGroup}>
        <span style={styles.pageTitle}>{getPageTitle()}</span>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginLeft: '16px',
          padding: '2px 8px',
          borderRadius: '12px',
          backgroundColor: backendOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.1)',
          border: `1px solid ${backendOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`,
          fontSize: '11px',
          fontWeight: 600,
          color: backendOnline ? '#10B981' : '#94A3B8'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: backendOnline ? '#10B981' : '#94A3B8'
          }} />
          <span>{backendOnline ? 'FASTAPI + QWEN3:4B ONLINE' : 'LOCAL ENGINE'}</span>
        </div>
      </div>

      {/* Right: Search & Page Actions */}
      <div style={styles.rightGroup}>
        {/* Upload page actions (Edit & Upload) */}
        {activeTab === 'upload' && (
          <div style={styles.pageActionRow}>
            {setIsEditMode && (
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                style={{
                  ...styles.headerBtn,
                  ...(isEditMode ? styles.headerBtnActive : {}),
                }}
              >
                <SlidersHorizontal size={13} />
                <span>{isEditMode ? 'Done Editing' : 'Edit'}</span>
              </button>
            )}
            <button
              onClick={onOpenUploadDialog}
              className="btn btn-primary btn-sm"
              style={{ gap: '5px' }}
            >
              <Upload size={13} />
              <span>+ Upload Footage</span>
            </button>
          </div>
        )}

        {/* Timeline Mode Selector */}
        {activeTab === 'timeline' && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setModeDropdownOpen((prev) => !prev)}
              style={styles.modeDropdownBtn}
            >
              <Layers size={13} color="#F59E0B" />
              <span>
                MODE: <strong style={{ color: '#F59E0B' }}>{modeOptions.find((m) => m.id === timelineMode)?.label}</strong>
              </span>
              <ChevronDown size={13} />
            </button>

            {modeDropdownOpen && (
              <div style={styles.modeDropdownMenu}>
                <div style={styles.dropdownHeader}>TIMELINE MODES</div>
                {modeOptions.map((opt) => {
                  const isSelected = opt.id === timelineMode;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setTimelineMode(opt.id);
                        setModeDropdownOpen(false);
                      }}
                      style={{
                        ...styles.dropdownItem,
                        ...(isSelected ? styles.dropdownItemActive : {}),
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? '#F59E0B' : '#F5F7FA' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: '10px', color: '#9299A4' }}>
                          {opt.desc}
                        </div>
                      </div>
                      {isSelected && <Check size={13} color="#F59E0B" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Search Footage / Events Field */}
        <button
          onClick={() => setSearchOpen(true)}
          style={styles.searchTriggerBtn}
          title="Search footage, events... (Ctrl+K)"
        >
          <Search size={13} color="#9299A4" />
          <span style={styles.searchPlaceholder}>Search footage, events...</span>
          <kbd style={styles.kbd}>Ctrl K</kbd>
        </button>
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: '52px',
    backgroundColor: 'var(--bg-panel)',
    borderBottom: '1px solid var(--border-default)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 18px',
    flexShrink: 0,
    zIndex: 9,
    userSelect: 'none',
  },
  leftGroup: {
    display: 'flex',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#F5F7FA',
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  pageActionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 500,
    padding: '5px 10px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  headerBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'var(--accent-amber)',
    color: '#F59E0B',
  },
  modeDropdownBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '12px',
    fontWeight: 500,
    padding: '5px 12px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  searchTriggerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '5px 10px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    width: '230px',
  },
  searchPlaceholder: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    flex: 1,
    textAlign: 'left',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  kbd: {
    fontSize: '9.5px',
    fontFamily: 'var(--font-mono)',
    backgroundColor: '#08090B',
    color: 'var(--text-secondary)',
    padding: '1px 4px',
    borderRadius: '3px',
    border: '1px solid var(--border-default)',
  },
  modeDropdownMenu: {
    position: 'absolute',
    top: '110%',
    right: 0,
    width: '240px',
    backgroundColor: '#12151A',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    padding: '6px',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  dropdownHeader: {
    fontSize: '9.5px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    padding: '4px 6px',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 8px',
    borderRadius: 'var(--radius-xs)',
    border: '1px solid transparent',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    width: '100%',
  },
  dropdownItemActive: {
    backgroundColor: '#181E27',
    borderColor: 'var(--border-accent)',
  },
};
