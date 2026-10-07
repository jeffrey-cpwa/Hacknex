import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { UploadPage } from '../upload/UploadPage';
import { VideoWorkspace } from '../video/VideoWorkspace';
import { TimelinePage } from '../timeline/TimelinePage';
import { ChatPage } from '../chat/ChatPage';
import { EvidenceViewerModal } from '../evidence/EvidenceViewerModal';
import { GlobalSearchModal } from '../search/GlobalSearchModal';

export const AppShell: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    simulateFileUpload,
    isPlaying,
    setIsPlaying,
  } = useApp();

  const [isEditMode, setIsEditMode] = useState(false);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.key === '1') {
        setActiveTab('upload');
      } else if (e.key === '2') {
        setActiveTab('timeline');
      } else if (e.key === '3') {
        setActiveTab('video');
      } else if (e.key === '4') {
        setActiveTab('chat');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, setIsPlaying, setActiveTab]);

  return (
    <div style={styles.appContainer}>
      {/* Persistent Left Sidebar (230px) */}
      <Sidebar />

      {/* Main Content Workspace Column */}
      <div style={styles.mainWorkspace}>
        {/* Compact Top Header */}
        <TopHeader
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          onOpenUploadDialog={() => simulateFileUpload('Factory_Camera_01_New.mp4')}
        />

        {/* Dynamic Page Router */}
        <main style={styles.pageContent}>
          {activeTab === 'upload' && (
            <UploadPage
              isEditMode={isEditMode}
              setIsEditMode={setIsEditMode}
            />
          )}
          {activeTab === 'timeline' && <TimelinePage />}
          {activeTab === 'video' && <VideoWorkspace />}
          {activeTab === 'chat' && <ChatPage />}
        </main>
      </div>

      {/* Global Overlays & Modals */}
      <EvidenceViewerModal />
      <GlobalSearchModal />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-app)',
  },
  mainWorkspace: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    height: '100%',
    overflow: 'hidden',
    minWidth: 0,
  },
  pageContent: {
    flex: 1,
    height: 'calc(100vh - 52px)',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-app)',
    position: 'relative',
  },
};
