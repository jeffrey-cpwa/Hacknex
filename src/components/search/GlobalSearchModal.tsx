import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  X,
  Clock,
  ShieldAlert,
  User,
  Box,
  Truck,
  Video,
  Layers,
  ArrowRight,
  Command,
} from 'lucide-react';
import { GlobalSearchResult } from '../../types';

export const GlobalSearchModal: React.FC = () => {
  const {
    searchOpen,
    setSearchOpen,
    searchQuery,
    setSearchQuery,
    searchResults,
    jumpToTimestamp,
    openTargetInTracking,
    setActiveTab,
    setTimelineMode,
    setActiveFootageId,
  } = useApp();

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  // Global hotkey Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  if (!searchOpen) return null;

  const handleSelectResult = (result: GlobalSearchResult) => {
    setSearchOpen(false);
    if (result.footageId) {
      setActiveFootageId(result.footageId);
    }

    if (result.type === 'event' && result.timestampSec !== undefined) {
      jumpToTimestamp(result.timestampSec, result.eventId, result.tab);
      if (result.mode) setTimelineMode(result.mode);
    } else if (result.type === 'target' || result.type === 'object') {
      if (result.targetId) {
        openTargetInTracking(result.targetId);
      }
    } else {
      setActiveTab(result.tab);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'event':
        return ShieldAlert;
      case 'target':
        return User;
      case 'object':
        return Box;
      case 'video':
        return Video;
      default:
        return Clock;
    }
  };

  return (
    <div style={styles.backdrop} onClick={() => setSearchOpen(false)}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Search Input Header */}
        <div style={styles.searchHeader}>
          <Search size={18} color="#F59E0B" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search events, targets, objects, videos, timestamps (e.g. restricted, alarm, person 07)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={styles.clearBtn}>
              <X size={15} />
            </button>
          )}
          <span style={styles.escBadge}>ESC</span>
        </div>

        {/* Results Stream */}
        <div style={styles.resultsBody}>
          {searchQuery.trim() ? (
            searchResults.length > 0 ? (
              <div style={styles.resultsList}>
                <div style={styles.resultsHeader}>
                  MATCHING FORENSIC INTELLIGENCE ({searchResults.length})
                </div>
                {searchResults.map((res) => {
                  const Icon = getResultIcon(res.type);
                  return (
                    <div
                      key={res.id}
                      onClick={() => handleSelectResult(res)}
                      style={styles.resultItem}
                      className="search-item"
                    >
                      <div
                        style={{
                          ...styles.iconBox,
                          backgroundColor:
                            res.type === 'event'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : res.type === 'object'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(56, 189, 248, 0.12)',
                        }}
                      >
                        <Icon
                          size={14}
                          color={
                            res.type === 'event'
                              ? '#EF4444'
                              : res.type === 'object'
                              ? '#F59E0B'
                              : '#38BDF8'
                          }
                        />
                      </div>

                      <div style={styles.resultInfo}>
                        <div style={styles.resultTitleRow}>
                          <span style={styles.resultTypeBadge}>{res.type.toUpperCase()}</span>
                          <span style={styles.resultTitle}>{res.title}</span>
                        </div>
                        <span style={styles.resultSubtitle}>{res.subtitle}</span>
                      </div>

                      <div style={styles.resultAction}>
                        <span>Jump</span>
                        <ArrowRight size={12} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={styles.noResults}>
                <span>No intelligence found matching "{searchQuery}".</span>
              </div>
            )
          ) : (
            <div style={styles.quickSuggestions}>
              <div style={styles.resultsHeader}>QUICK SEARCH SUGGESTIONS</div>
              <div style={styles.suggestionTags}>
                {['restricted', 'truck', 'alarm', 'person 07', 'machine', 'box 04'].map(
                  (term) => (
                    <button
                      key={term}
                      onClick={() => setSearchQuery(term)}
                      style={styles.termPill}
                    >
                      <Search size={11} />
                      <span>{term}</span>
                    </button>
                  )
                )}
              </div>
            </div>
          )}
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
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '100px',
    zIndex: 1000,
  },
  modal: {
    width: '90%',
    maxWidth: '620px',
    backgroundColor: '#0E1116',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  searchHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 18px',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: '#0A0C0F',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#F5F7FA',
    fontSize: '14px',
    fontWeight: 500,
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  escBadge: {
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    backgroundColor: '#161920',
    color: 'var(--text-muted)',
    padding: '2px 6px',
    borderRadius: '3px',
    border: '1px solid var(--border-subtle)',
  },
  resultsBody: {
    maxHeight: '380px',
    overflowY: 'auto',
    padding: '12px 16px',
  },
  resultsHeader: {
    fontSize: '9.5px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    marginBottom: '10px',
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  iconBox: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resultInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  resultTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  resultTypeBadge: {
    fontSize: '8.5px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: '1px 4px',
    borderRadius: '2px',
  },
  resultTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#F5F7FA',
  },
  resultSubtitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  resultAction: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  noResults: {
    padding: '24px 0',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '12.5px',
  },
  quickSuggestions: {
    padding: '6px 0',
  },
  suggestionTags: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  termPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: 'var(--radius-xs)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};
