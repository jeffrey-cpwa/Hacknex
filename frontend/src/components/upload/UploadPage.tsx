import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { FootageCard } from './FootageCard';
import { EditModeToolbar } from './EditModeToolbar';
import {
  UploadCloud,
  Film,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  SlidersHorizontal,
  FolderOpen,
  Filter,
  Search,
  Eye,
  Clock,
  MessageSquare,
  ArrowRight,
  Video,
} from 'lucide-react';
import { Footage } from '../../types';

interface UploadPageProps {
  isEditMode: boolean;
  setIsEditMode: (edit: boolean) => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ isEditMode, setIsEditMode }) => {
  const {
    footageList,
    activeFootageId,
    activeFootage,
    setActiveFootageId,
    setActiveTab,
    isUploading,
    uploadProgress,
    uploadStage,
    uploadCompletedSteps,
    simulateFileUpload,
    deleteFootage,
    updateFootageTags,
    renameFootage,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFootageIds, setSelectedFootageIds] = useState<string[]>([]);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Handle Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      simulateFileUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      simulateFileUpload(file);
    }
  };

  const handleOpenBrowse = () => {
    fileInputRef.current?.click();
  };

  // Card interactions
  const handleOpenFootage = (ftg: Footage) => {
    setActiveFootageId(ftg.id);
    setActiveTab('video');
  };

  const handlePreviewRawFootage = (ftg: Footage) => {
    setActiveFootageId(ftg.id);
  };

  const handleTimelineFootage = (ftg: Footage) => {
    setActiveFootageId(ftg.id);
    setActiveTab('timeline');
  };

  const handleAskAIFootage = (ftg: Footage) => {
    setActiveFootageId(ftg.id);
    setActiveTab('chat');
  };

  // Edit mode handlers
  const handleToggleCheck = (id: string) => {
    setSelectedFootageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedFootageIds.length === filteredFootage.length) {
      setSelectedFootageIds([]);
    } else {
      setSelectedFootageIds(filteredFootage.map((f) => f.id));
    }
  };

  const handleDeleteSelected = () => {
    if (confirm(`Delete ${selectedFootageIds.length} selected video footage recordings?`)) {
      selectedFootageIds.forEach((id) => deleteFootage(id));
      setSelectedFootageIds([]);
    }
  };

  const handleApplyTag = (tag: string) => {
    selectedFootageIds.forEach((id) => {
      const current = footageList.find((f) => f.id === id);
      if (current && !current.tags.includes(tag)) {
        updateFootageTags(id, [...current.tags, tag]);
      }
    });
  };

  const handleRenameSelected = () => {
    if (selectedFootageIds.length === 1) {
      const target = footageList.find((f) => f.id === selectedFootageIds[0]);
      if (target) {
        const newName = prompt('Enter new title for footage:', target.title);
        if (newName && newName.trim()) {
          renameFootage(target.id, newName.trim());
        }
      }
    }
  };

  // Tag filter list
  const filterTags = ['All', 'Security', 'Factory', 'Warehouse', 'Machine', 'Delivery', 'Incident'];

  // Filtered and Sorted footage
  const filteredFootage = footageList
    .filter((f) => {
      const matchesTag = selectedTagFilter === 'All' || f.tags.includes(selectedTagFilter);
      const matchesSearch =
        !searchFilter ||
        f.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        f.filename.toLowerCase().includes(searchFilter.toLowerCase());
      return matchesTag && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.durationSec - a.durationSec; // mock sort
      if (sortBy === 'oldest') return a.durationSec - b.durationSec;
      if (sortBy === 'duration') return b.durationSec - a.durationSec;
      if (sortBy === 'events') return b.eventCount - a.eventCount;
      return 0;
    });

  return (
    <div style={styles.container}>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="video/*,.mp4,.mov,.avi,.mkv"
      />

      {/* Page Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>FOOTAGE</h1>
          <p style={styles.subtitle}>Upload, organize and review your video evidence.</p>
        </div>
      </div>

      {/* Hero Upload Area / Processing Card */}
      {!isUploading ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            ...styles.dropzone,
            ...(isDragOver ? styles.dropzoneActive : {}),
          }}
          onClick={handleOpenBrowse}
        >
          <div style={styles.uploadIconBox}>
            <UploadCloud size={28} color="#F59E0B" />
          </div>
          <div style={styles.dropzoneHeading}>Upload your footage</div>
          <p style={styles.dropzoneText}>
            Drag and drop video here or <span style={styles.browseLink}>Browse Files</span>
          </p>
          <div style={styles.supportedFormats}>
            Supported formats: <strong style={{ color: '#9299A4' }}>MP4 · MOV · AVI · MKV</strong>
          </div>
        </div>
      ) : (
        /* Processing Card */
        <div style={styles.processingCard}>
          <div style={styles.processingHeader}>
            <div style={styles.processingTitleRow}>
              <div style={styles.processingIconBox}>
                <Cpu size={18} color="#F59E0B" />
              </div>
              <div>
                <div style={styles.processingFilename}>Factory_Camera_01.mp4</div>
                <div style={styles.processingStatusText}>{uploadStage}</div>
              </div>
            </div>
            <span style={styles.percentagePill}>{uploadProgress}%</span>
          </div>

          {/* Progress Bar */}
          <div style={styles.progressBarOuter}>
            <div
              style={{
                ...styles.progressBarInner,
                width: `${uploadProgress}%`,
              }}
            />
          </div>

          {/* Simulated Analysis Pipeline Steps */}
          <div style={styles.stepsGrid}>
            {[
              '✓ Video uploaded',
              '✓ Frames extracted',
              '✓ Objects detected',
              '✓ People tracked',
              '✓ Events generated',
              '✓ Timeline ready',
            ].map((step, idx) => {
              const isDone = uploadCompletedSteps.includes(step);
              return (
                <div
                  key={idx}
                  style={{
                    ...styles.stepItem,
                    color: isDone ? '#10B981' : '#5B6270',
                    backgroundColor: isDone ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    borderColor: isDone ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                  }}
                >
                  <CheckCircle2 size={12} color={isDone ? '#10B981' : '#373F4D'} />
                  <span>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Uploaded Video Preview: Raw Footage Viewer */}
      {activeFootage && (
        <div style={styles.rawPreviewContainer}>
          <div style={styles.previewHeader}>
            <div style={styles.previewHeaderLeft}>
              <div style={styles.rawFeedBadge}>
                <span style={styles.redDot} />
                <span>RAW CAMERA STREAM · SOURCE VIDEO</span>
              </div>
              <div style={styles.previewTitle}>{activeFootage.title}</div>
            </div>
            <div style={styles.previewHeaderRight}>
              <span style={styles.rawFilePill}>
                Raw File: {activeFootage.rawFilename || activeFootage.filename}
              </span>
              <button
                onClick={() => {
                  setActiveTab('video');
                }}
                style={styles.goToAnalysisBtn}
                title="Switch to Video Analysis to see mapped objects & bounding boxes"
              >
                <Film size={14} />
                <span>Analyze in Video Analysis (Mapped View) →</span>
              </button>
            </div>
          </div>

          <div style={styles.videoPlayerWrapper}>
            <video
              key={activeFootage.id + (activeFootage.rawVideoUrl || activeFootage.videoUrl)}
              src={`http://localhost:8000${activeFootage.rawVideoUrl || activeFootage.videoUrl || ('/api/videos/raw/' + (activeFootage.rawFilename || activeFootage.filename))}`}
              controls
              style={styles.rawVideoElement}
              playsInline
            />
          </div>

          <div style={styles.previewFooterBar}>
            <div style={styles.previewMetaGroup}>
              <span style={styles.metaBadge}>Duration: {activeFootage.duration}</span>
              <span style={styles.metaBadge}>FPS: {activeFootage.fps || 30}</span>
              <span style={styles.metaBadge}>Resolution: {activeFootage.resolution || '1920 × 1080'}</span>
              <span style={styles.metaBadgeEvents}>{activeFootage.eventCount} Filtered Events in SQL DB</span>
            </div>
            <div style={styles.previewActionsGroup}>
              <button
                onClick={() => {
                  setActiveTab('timeline');
                }}
                style={styles.previewActionBtn}
              >
                <Clock size={13} />
                <span>View Timeline</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('chat');
                }}
                style={styles.previewActionBtn}
              >
                <MessageSquare size={13} />
                <span>Ask AI</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECENT FOOTAGE Section */}
      <div style={styles.footageSection}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitleRow}>
            <h2 style={styles.sectionTitle}>RECENT FOOTAGE</h2>
            <span style={styles.footageCountBadge}>{filteredFootage.length} videos</span>
          </div>

          {/* Tag Filter Pills */}
          {!isEditMode && (
            <div style={styles.filterPills}>
              {filterTags.map((tag) => {
                const isActive = selectedTagFilter === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTagFilter(tag)}
                    style={{
                      ...styles.filterPill,
                      ...(isActive ? styles.filterPillActive : {}),
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Mode Toolbar */}
        {isEditMode && (
          <EditModeToolbar
            selectedCount={selectedFootageIds.length}
            totalCount={filteredFootage.length}
            allSelected={selectedFootageIds.length === filteredFootage.length && filteredFootage.length > 0}
            onToggleSelectAll={handleToggleSelectAll}
            onDeleteSelected={handleDeleteSelected}
            onApplyTag={handleApplyTag}
            sortBy={sortBy}
            setSortBy={setSortBy}
            searchFilter={searchFilter}
            setSearchFilter={setSearchFilter}
            onRenameSelected={handleRenameSelected}
          />
        )}

        {/* Footage Grid */}
        <div style={styles.grid}>
          {filteredFootage.map((footage) => (
            <FootageCard
              key={footage.id}
              footage={footage}
              isSelected={footage.id === activeFootageId}
              isEditMode={isEditMode}
              isChecked={selectedFootageIds.includes(footage.id)}
              onToggleCheck={() => handleToggleCheck(footage.id)}
              onOpen={() => handleOpenFootage(footage)}
              onPreviewRaw={() => handlePreviewRawFootage(footage)}
              onTimeline={() => handleTimelineFootage(footage)}
              onAskAI={() => handleAskAIFootage(footage)}
              onDelete={() => deleteFootage(footage.id)}
            />
          ))}
        </div>
      </div>
    </div>
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  dropzone: {
    backgroundColor: '#0C0E12',
    border: '2px dashed var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    padding: '36px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
  },
  dropzoneActive: {
    borderColor: 'var(--accent-amber)',
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
  },
  uploadIconBox: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '14px',
    boxShadow: '0 0 16px rgba(245, 158, 11, 0.12)',
  },
  dropzoneHeading: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#F5F7FA',
    marginBottom: '4px',
  },
  dropzoneText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '10px',
  },
  browseLink: {
    color: 'var(--accent-amber)',
    fontWeight: 600,
    textDecoration: 'underline',
  },
  supportedFormats: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  processingCard: {
    backgroundColor: '#0E1116',
    border: '1px solid var(--border-accent)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: 'var(--shadow-lg)',
  },
  processingHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  processingTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  processingIconBox: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingFilename: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#F5F7FA',
  },
  processingStatusText: {
    fontSize: '12px',
    color: 'var(--accent-amber)',
    marginTop: '2px',
  },
  percentagePill: {
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    fontWeight: 700,
    color: '#F59E0B',
    backgroundColor: '#08090B',
    padding: '4px 10px',
    borderRadius: '4px',
    border: '1px solid var(--border-default)',
  },
  progressBarOuter: {
    width: '100%',
    height: '6px',
    backgroundColor: '#161A22',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
    boxShadow: '0 0 10px rgba(245, 158, 11, 0.6)',
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    borderRadius: 'var(--radius-xs)',
    border: '1px solid transparent',
    fontSize: '11.5px',
    fontWeight: 500,
  },
  footageSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '10px',
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#F5F7FA',
  },
  footageCountBadge: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    backgroundColor: 'var(--bg-card)',
    padding: '2px 7px',
    borderRadius: '10px',
    border: '1px solid var(--border-subtle)',
  },
  filterPills: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  filterPill: {
    padding: '4px 9px',
    borderRadius: 'var(--radius-xs)',
    backgroundColor: 'transparent',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    fontSize: '11.5px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  filterPillActive: {
    backgroundColor: 'var(--bg-card)',
    borderColor: 'var(--accent-amber)',
    color: '#F59E0B',
    fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  rawPreviewContainer: {
    backgroundColor: '#0A0D12',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
    paddingBottom: '10px',
    borderBottom: '1px solid #1E232B',
  },
  previewHeaderLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  rawFeedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#EF4444',
  },
  redDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#EF4444',
    boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)',
    display: 'inline-block',
  },
  previewTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#F5F7FA',
  },
  previewHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  rawFilePill: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11.5px',
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    padding: '4px 10px',
    borderRadius: '4px',
  },
  goToAnalysisBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#F59E0B',
    color: '#08090B',
    fontWeight: 700,
    fontSize: '12px',
    padding: '8px 14px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 0 16px rgba(245, 158, 11, 0.35)',
  },
  videoPlayerWrapper: {
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#000000',
    border: '1px solid #202631',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    maxHeight: '440px',
  },
  rawVideoElement: {
    width: '100%',
    maxHeight: '440px',
    objectFit: 'contain',
    display: 'block',
    backgroundColor: '#000000',
  },
  previewFooterBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
    paddingTop: '8px',
  },
  previewMetaGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  metaBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: '#9299A4',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '3px 8px',
    borderRadius: '4px',
  },
  metaBadgeEvents: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    padding: '3px 8px',
    borderRadius: '4px',
    fontWeight: 600,
  },
  previewActionsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  previewActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11.5px',
    fontWeight: 600,
    color: '#D1D5DB',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    padding: '5px 10px',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};
