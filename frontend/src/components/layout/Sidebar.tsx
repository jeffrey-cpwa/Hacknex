import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  UploadCloud,
  Clock,
  Video,
  MessageSquare,
  Shield,
  ChevronRight,
  Layers,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { NavigationTab } from '../../types';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    recentInvestigations,
    activeInvestigationId,
    selectInvestigationSession,
    startNewChat,
  } = useApp();

  const navItems: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ElementType;
  }> = [
    { id: 'video', label: 'Actual Video Player', icon: Video },
    { id: 'timeline', label: 'Timeline & Targets', icon: Clock },
    { id: 'chat', label: 'AI Video Chat', icon: MessageSquare },
    { id: 'upload', label: 'Upload Video', icon: UploadCloud },
  ];

  return (
    <aside style={styles.sidebar}>
      {/* Brand Header */}
      <div style={styles.brandContainer}>
        <div style={styles.logoRow}>
          <div style={styles.logoIconBox}>
            <Shield size={17} color="#F59E0B" strokeWidth={2.5} />
          </div>
          <div style={styles.brandTitle}>CCTV ANALYSIS</div>
        </div>
      </div>

      {/* Primary Navigation */}
      <div style={styles.navSection}>
        <div style={styles.sectionLabel}>WORKSPACE</div>
        <nav style={styles.navList}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'chat' && activeTab === 'chat') {
                    startNewChat();
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                style={{
                  ...styles.navButton,
                  ...(isActive ? styles.navButtonActive : {}),
                }}
                className="btn-nav"
              >
                <div style={styles.navButtonLeft}>
                  <Icon
                    size={16}
                    color={isActive ? '#F59E0B' : '#9299A4'}
                    style={{ flexShrink: 0 }}
                  />
                  <span
                    style={{
                      ...styles.navLabel,
                      color: isActive ? '#FFFFFF' : '#D1D5DB',
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Analytics & Engine Tools */}
      <div style={styles.navSection}>
        <div style={styles.sectionLabel}>ANALYTICS ENGINE</div>
        <nav style={styles.navList}>
          <a
            href="http://localhost:8000/filtration/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...styles.navButton,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            className="btn-nav"
            title="Open Data Filtration Engine Dashboard"
          >
            <div style={styles.navButtonLeft}>
              <Filter size={15} color="#38BDF8" style={{ flexShrink: 0 }} />
              <span style={{ ...styles.navLabel, color: '#E0F2FE', fontWeight: 500 }}>
                Filtration Engine
              </span>
            </div>
            <ExternalLink size={12} color="#38BDF8" />
          </a>
        </nav>
      </div>

      {/* Previous Investigations (Chats from SQL Database) */}
      <div style={styles.investigationsSection}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '6px' }}>
          <div style={styles.sectionLabel}>PREVIOUS CHATS</div>
          <button
            onClick={() => startNewChat()}
            style={{
              background: 'none',
              border: 'none',
              color: '#F59E0B',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 4px',
            }}
            title="Start New Chat Investigation"
          >
            + New
          </button>
        </div>

        <div style={styles.investigationsList}>
          {recentInvestigations.map((inv) => {
            const isActive = activeInvestigationId === inv.id;
            return (
              <div
                key={inv.id}
                onClick={() => selectInvestigationSession(inv.id)}
                style={{
                  ...styles.investigationCard,
                  ...(isActive ? styles.investigationCardActive : {}),
                }}
                title={`Open ${inv.title}`}
              >
                <div style={styles.invTitleRow}>
                  <span
                    style={{
                      ...styles.invTitle,
                      color: isActive ? '#F59E0B' : '#E5E7EB',
                    }}
                  >
                    {inv.title}
                  </span>
                  <ChevronRight size={12} color={isActive ? '#F59E0B' : '#5B6270'} />
                </div>
                <div style={styles.invMetaRow}>
                  <span style={styles.invDate}>{inv.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '230px',
    height: '100%',
    backgroundColor: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border-default)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    userSelect: 'none',
    zIndex: 10,
  },
  brandContainer: {
    padding: '16px 18px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoIconBox: {
    width: '28px',
    height: '28px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: '13.5px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#F5F7FA',
  },
  navSection: {
    padding: '14px 12px 10px 12px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  sectionLabel: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    marginBottom: '8px',
    paddingLeft: '6px',
  },
  navList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '10px 12px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    borderLeft: '2px solid transparent',
  },
  navButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderLeft: '2px solid var(--accent-amber)',
  },
  navButtonLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  navLabel: {
    fontSize: '13px',
    letterSpacing: '-0.01em',
  },
  investigationsSection: {
    padding: '14px 12px',
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
  },
  investigationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  investigationCard: {
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  investigationCardActive: {
    backgroundColor: '#181D25',
    borderColor: 'var(--border-accent)',
  },
  invTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '3px',
  },
  invTitle: {
    fontSize: '11.5px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  invMetaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  invDate: {
    color: 'var(--text-muted)',
  },
};
