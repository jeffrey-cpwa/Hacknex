import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import * as api from '../services/api';
import {
  NavigationTab,
  TimelineMode,
  TargetCategory,
  Footage,
  TemporalEvent,
  TargetEntity,
  GanttTrack,
  TemporalRelationshipNode,
  InvestigationSession,
  ChatMessage,
  EvidenceData,
  GlobalSearchResult,
} from '../types';
import {
  INITIAL_FOOTAGE_LIST,
  MOCK_EVENTS,
  MOCK_TARGETS,
  MOCK_GANTT_TRACKS,
  MOCK_RELATIONSHIP_NODES,
  PRESET_QUESTIONS,
  INITIAL_RECENT_INVESTIGATIONS,
  MOCK_INSIGHT_ALERTS,
} from '../data/mockData';

interface AppContextType {
  backendOnline?: boolean;
  // Navigation
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  timelineMode: TimelineMode;
  setTimelineMode: (mode: TimelineMode) => void;

  // Footage
  activeFootageId: string;
  activeFootage: Footage;
  footageList: Footage[];
  setActiveFootageId: (id: string) => void;
  deleteFootage: (id: string) => void;
  updateFootageTags: (id: string, tags: string[]) => void;
  renameFootage: (id: string, newTitle: string) => void;

  // Video & Playback
  currentTimeSec: number;
  setCurrentTimeSec: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  overlaysEnabled: boolean;
  setOverlaysEnabled: (enabled: boolean) => void;
  overlayFilters: {
    people: boolean;
    vehicles: boolean;
    objects: boolean;
    events: boolean;
  };
  toggleOverlayFilter: (key: 'people' | 'vehicles' | 'objects' | 'events') => void;

  // Events & Targets
  events: TemporalEvent[];
  selectedEventId: string | null;
  selectedEvent: TemporalEvent | null;
  setSelectedEventId: (id: string | null) => void;
  highlightedEventIds: string[];
  setHighlightedEventIds: (ids: string[]) => void;

  allTargets: TargetEntity[];
  selectedTargetId: string;
  selectedTarget: TargetEntity | null;
  setSelectedTargetId: (id: string) => void;
  targetCategoryFilter: TargetCategory;
  setTargetCategoryFilter: (cat: TargetCategory) => void;

  ganttTracks: GanttTrack[];
  relationshipNodes: TemporalRelationshipNode[];

  // Evidence Modal
  evidenceModalOpen: boolean;
  evidenceData: EvidenceData | null;
  openEvidenceModal: (data: EvidenceData) => void;
  closeEvidenceModal: () => void;

  // Global Search
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: GlobalSearchResult[];

  // Chat
  chatMessages: ChatMessage[];
  isThinking: boolean;
  currentThinkingStep: string;
  sendChatMessage: (text: string) => void;
  askPresetQuestion: (questionId: string) => void;
  recentQuestions: Array<{ id: string; label: string; timestampRef: string; query: string }>;

  // Investigations Sessions (Previous Chats)
  recentInvestigations: InvestigationSession[];
  activeInvestigationId: string | null;
  selectInvestigationSession: (invId: string) => void;
  startNewChat: () => void;

  // Upload Simulation
  isUploading: boolean;
  uploadProgress: number;
  uploadStage: string;
  uploadCompletedSteps: string[];
  simulateFileUpload: (fileInput?: string | File) => void;

  // Navigation helpers
  jumpToTimestamp: (sec: number, eventId?: string, targetTab?: NavigationTab) => void;
  openTimelineWithEvents: (eventIds: string[], targetTimeSec?: number) => void;
  openEvidenceForEvent: (event: TemporalEvent) => void;
  openTargetInTracking: (targetId: string) => void;

  // Insights
  insightAlerts: typeof MOCK_INSIGHT_ALERTS;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Default placeholder for actual tracked CCTV video
const DEFAULT_TRACKED_VIDEO: Footage = {
  id: 'video-cctv-01',
  title: 'Main Entrance Surveillance (Camera 01)',
  filename: 'marked_video.mp4',
  videoUrl: '/api/videos/marked_video.mp4',
  rawFilename: 'test.mp4',
  rawVideoUrl: '/api/videos/raw/test.mp4',
  mappedFilename: 'marked_video.mp4',
  duration: '00:15.2',
  durationSec: 15.23,
  date: 'Today',
  eventCount: 8,
  status: 'Analyzed',
  tags: ['Surveillance', 'Camera 01', 'Object Tracked'],
  resolution: '1920 × 1080',
  fps: 30,
  trackedPeopleCount: 3,
  trackedObjectsCount: 0,
  trackedVehiclesCount: 0,
  criticalEventsCount: 0,
  warningEventsCount: 1,
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavigationTab>('video');
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('incident');
  const [targetCategoryFilter, setTargetCategoryFilter] = useState<TargetCategory>('person');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('person_1');

  // Footage State (loaded dynamically from SQL Database)
  const [footageList, setFootageList] = useState<Footage[]>([DEFAULT_TRACKED_VIDEO]);
  const [activeFootageId, setActiveFootageId] = useState<string>('video-cctv-01');

  const activeFootage = useMemo(() => {
    return footageList.find((f) => f.id === activeFootageId) || footageList[0] || DEFAULT_TRACKED_VIDEO;
  }, [footageList, activeFootageId]);

  // Actual Playback & Video state
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [overlaysEnabled, setOverlaysEnabled] = useState<boolean>(true);
  const [overlayFilters, setOverlayFilters] = useState({
    people: true,
    vehicles: true,
    objects: true,
    events: true,
  });

  const toggleOverlayFilter = (key: 'people' | 'vehicles' | 'objects' | 'events') => {
    setOverlayFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Events & Targets (Strictly from SQL Database)
  const [events, setEvents] = useState<TemporalEvent[]>([]);
  const [allTargets, setAllTargets] = useState<TargetEntity[]>([]);
  const [ganttTracks, setGanttTracks] = useState<GanttTrack[]>([]);
  const [relationshipNodes, setRelationshipNodes] = useState<TemporalRelationshipNode[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>('E0001');
  const [highlightedEventIds, setHighlightedEventIds] = useState<string[]>([]);

  // Backend Sync: Initial Mount
  useEffect(() => {
    let isMounted = true;
    async function loadBackendData() {
      try {
        const health = await api.checkBackendHealth();
        if (health && isMounted) {
          setBackendOnline(true);
        }

        const footages = await api.fetchFootageList();
        if (footages && footages.length > 0 && isMounted) {
          setFootageList(footages);
          if (!footages.some((f) => f.id === activeFootageId)) {
            setActiveFootageId(footages[0].id);
          }
        }

        const sessions = await api.fetchChatSessions();
        if (sessions && sessions.length > 0 && isMounted) {
          setRecentInvestigations(sessions);
          setActiveInvestigationId(sessions[0].id);
          const firstSess = await api.fetchChatMessages(sessions[0].id);
          if (firstSess && firstSess.messages && firstSess.messages.length > 0 && isMounted) {
            setChatMessages(firstSess.messages);
          }
        }

        const targets = await api.fetchTargets();
        if (targets && targets.length > 0 && isMounted) {
          setAllTargets(targets);
          if (targets[0]) setSelectedTargetId(targets[0].id);
        }

        const tracks = await api.fetchGanttTracks();
        if (tracks && tracks.length > 0 && isMounted) {
          setGanttTracks(tracks);
        }

        const rels = await api.fetchRelationshipNodes();
        if (rels && rels.length > 0 && isMounted) {
          setRelationshipNodes(rels);
        }

        const evs = await api.fetchEvents(activeFootageId);
        if (evs && evs.length > 0 && isMounted) {
          setEvents(evs);
          if (evs[0]) setSelectedEventId(evs[0].id);
        }
      } catch (err) {
        console.warn('Backend sync error:', err);
      }
    }
    loadBackendData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch events when activeFootageId changes
  useEffect(() => {
    let isMounted = true;
    async function syncEvents() {
      try {
        const [evs, tgts, gTracks, rNodes] = await Promise.all([
          api.fetchEvents(activeFootageId),
          api.fetchTargets(activeFootageId),
          api.fetchGanttTracks(activeFootageId),
          api.fetchRelationshipNodes(activeFootageId),
        ]);

        if (isMounted) {
          if (evs) {
            setEvents(evs);
            if (evs[0]) {
              setSelectedEventId(evs[0].id);
            }
          }
          if (tgts) {
            setAllTargets(tgts);
            if (tgts[0]) {
              setSelectedTargetId(tgts[0].id);
            }
          }
          if (gTracks) {
            setGanttTracks(gTracks);
          }
          if (rNodes) {
            setRelationshipNodes(rNodes);
          }
        }
      } catch (err) {
        console.warn('Failed to sync events for footage:', err);
      }
    }
    syncEvents();
    return () => {
      isMounted = false;
    };
  }, [activeFootageId]);

  const selectedEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || events[0] || null;
  }, [events, selectedEventId]);

  const selectedTarget = useMemo(() => {
    return allTargets.find((t) => t.id === selectedTargetId) || allTargets[0] || null;
  }, [allTargets, selectedTargetId]);

  // Evidence Modal State
  const [evidenceModalOpen, setEvidenceModalOpen] = useState<boolean>(false);
  const [evidenceData, setEvidenceData] = useState<EvidenceData | null>(null);

  const openEvidenceModal = (data: EvidenceData) => {
    setEvidenceData(data);
    setEvidenceModalOpen(true);
  };

  const closeEvidenceModal = () => {
    setEvidenceModalOpen(false);
  };

  // Global Search State
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const searchResults: GlobalSearchResult[] = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: GlobalSearchResult[] = [];

    // Search events
    events.forEach((evt) => {
      if (
        evt.title.toLowerCase().includes(query) ||
        evt.description.toLowerCase().includes(query) ||
        evt.location.toLowerCase().includes(query) ||
        evt.targetNames.some((n) => n.toLowerCase().includes(query)) ||
        evt.timestamp.includes(query)
      ) {
        results.push({
          id: `sr-evt-${evt.id}`,
          type: 'event',
          title: evt.title,
          subtitle: `${evt.timestamp} · ${evt.location}`,
          timestamp: evt.timestamp,
          timestampSec: evt.timestampSec,
          eventId: evt.id,
          footageId: activeFootageId,
          tab: 'timeline',
          mode: 'incident',
        });
      }
    });

    // Search targets
    allTargets.forEach((tgt) => {
      if (tgt.name.toLowerCase().includes(query) || tgt.type.toLowerCase().includes(query) || tgt.badge.toLowerCase().includes(query)) {
        results.push({
          id: `sr-tgt-${tgt.id}`,
          type: tgt.type === 'object' ? 'object' : 'target',
          title: tgt.name,
          subtitle: `${tgt.badge} · Visible: ${tgt.totalDuration}`,
          targetId: tgt.id,
          tab: 'timeline',
          mode: 'target',
        });
      }
    });

    // Search footage
    footageList.forEach((ftg) => {
      if (ftg.title.toLowerCase().includes(query) || ftg.filename.toLowerCase().includes(query) || ftg.tags.some((t) => t.toLowerCase().includes(query))) {
        results.push({
          id: `sr-ftg-${ftg.id}`,
          type: 'video',
          title: ftg.title,
          subtitle: `${ftg.duration} · ${ftg.eventCount} events · ${ftg.tags.join(', ')}`,
          footageId: ftg.id,
          tab: 'video',
        });
      }
    });

    return results.slice(0, 8);
  }, [searchQuery, events, allTargets, footageList, activeFootageId]);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-initial-ai',
      sender: 'ai',
      timestamp: '10:45 AM',
      text: 'TEMPORAL AI Investigation initialized on actual tracked video marked_video.mp4. All people, trajectories, and events are indexed from SQL Database. Ask when people entered, left, or what happened in the footage.',
    },
  ]);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [currentThinkingStep, setCurrentThinkingStep] = useState<string>('Analyzing temporal query...');

  // Recent Questions History
  const recentQuestions = useMemo(() => {
    return [
      { id: 'q1', label: 'Person 2 Leave', timestampRef: '00:07.3', query: 'When did Person 2 leave?' },
      { id: 'q2', label: 'Person 2 Enter', timestampRef: '00:04.2', query: 'When did Person 2 enter?' },
      { id: 'q3', label: 'First Entry', timestampRef: '00:03.4', query: 'Who entered first?' },
      { id: 'q4', label: 'First Departure', timestampRef: '00:05.5', query: 'Who left first?' },
      { id: 'q5', label: 'Person 1 Presence', timestampRef: '00:07.4', query: 'How long did Person 1 stay?' },
    ];
  }, []);

  // Investigation Sessions (Previous Chats from SQL Database)
  const [recentInvestigations, setRecentInvestigations] = useState<InvestigationSession[]>([]);
  const [activeInvestigationId, setActiveInvestigationId] = useState<string | null>('inv-session-01');

  // Select a previous chat from the sidebar
  const selectInvestigationSession = async (invId: string) => {
    setActiveInvestigationId(invId);
    setActiveTab('chat');
    try {
      const sessData = await api.fetchChatMessages(invId);
      if (sessData && sessData.messages && sessData.messages.length > 0) {
        setChatMessages(sessData.messages);
      }
    } catch (err) {
      console.warn('Failed to load session messages:', err);
    }
  };

  // Start a fresh chat session
  const startNewChat = async () => {
    try {
      const newSess = await api.createChatSession('New Investigation', activeFootageId);
      if (newSess) {
        setActiveInvestigationId(newSess.id);
        setChatMessages([
          {
            id: `msg-${Date.now()}-ai`,
            sender: 'ai',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `New investigation started on ${activeFootage?.title || 'actual footage'}. Ask anything about people, events, or timestamps in this video.`,
          },
        ]);
        setActiveTab('chat');
        const sessions = await api.fetchChatSessions();
        if (sessions) setRecentInvestigations(sessions);
      }
    } catch (err) {
      console.warn('Error starting new chat session:', err);
    }
  };

  // Upload and Filtration Engine State
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStage, setUploadStage] = useState<string>('Ready');
  const [uploadCompletedSteps, setUploadCompletedSteps] = useState<string[]>([]);

  const simulateFileUpload = async (fileInput?: string | File) => {
    setIsUploading(true);
    setUploadProgress(10);
    setUploadStage('Frontend sending video stream to backend...');
    setUploadCompletedSteps(['✓ Video stream sent']);

    try {
      await new Promise((r) => setTimeout(r, 400));
      setUploadProgress(35);
      setUploadStage('Backend engine identifying and tracking objects & persons (YOLO + ByteTrack)...');
      setUploadCompletedSteps((prev) => [...prev, '✓ Objects & persons tracked']);

      await new Promise((r) => setTimeout(r, 600));
      setUploadProgress(65);
      setUploadStage('Sending raw detection data as JSON to filtration engine...');
      setUploadCompletedSteps((prev) => [...prev, '✓ Raw tracking JSON formatted']);

      let createdFootage: Footage | null = null;
      if (fileInput instanceof File) {
        createdFootage = await api.uploadVideoAPI(fileInput);
      } else {
        const dummyFile = new File(['dummy_video_stream'], fileInput || 'uploaded_cctv.mp4', { type: 'video/mp4' });
        createdFootage = await api.uploadVideoAPI(dummyFile);
      }

      await new Promise((r) => setTimeout(r, 500));
      setUploadProgress(85);
      setUploadStage('Filtration engine cleaning, deduplicating, and persisting into SQL Database...');
      setUploadCompletedSteps((prev) => [...prev, '✓ Filtered events stored in SQL Database']);

      await new Promise((r) => setTimeout(r, 400));
      setUploadProgress(100);
      setUploadStage('Complete! Ready for video playback and AI chat.');
      setUploadCompletedSteps((prev) => [...prev, '✓ Timeline & RAG index updated']);

      // Refresh all database-backed resources
      const [footages, evts, tgts, gantt, rels] = await Promise.all([
        api.fetchFootageList(),
        api.fetchEvents(createdFootage?.id),
        api.fetchTargets(createdFootage?.id),
        api.fetchGanttTracks(createdFootage?.id),
        api.fetchRelationshipNodes(createdFootage?.id),
      ]);

      if (footages && footages.length > 0) setFootageList(footages);
      if (evts) setEvents(evts);
      if (tgts) setAllTargets(tgts);
      if (gantt) setGanttTracks(gantt);
      if (rels) setRelationshipNodes(rels);

      if (createdFootage) {
        setActiveFootageId(createdFootage.id);
      }

      setTimeout(() => {
        setIsUploading(false);
        setActiveTab('video');
      }, 700);

    } catch (err) {
      console.error('Error during video upload & filtration flow:', err);
      setIsUploading(false);
    }
  };

  // Chat state and conversational session memory
  const [chatSession, setChatSession] = useState<Record<string, any>>({});

  // Chat message submission with real Temporal RAG + Qwen3:4b
  const sendChatMessage = async (questionText: string) => {
    if (!questionText.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: questionText,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);
    setCurrentThinkingStep('Querying Temporal RAG against SQL Database...');

    const timer1 = setTimeout(() => {
      setCurrentThinkingStep('Retrieving verified ground truth timestamps...');
    }, 450);

    const timer2 = setTimeout(() => {
      setCurrentThinkingStep('Synthesizing natural response via Qwen3:4b...');
    }, 900);

    try {
      const response = await api.sendChatMessageAPI(
        questionText,
        chatSession,
        activeFootageId,
        activeInvestigationId || undefined
      );
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsThinking(false);

      if (response && response.text) {
        if ((response as any).session) {
          setChatSession((response as any).session);
        }
        if ((response as any).sessionId && !activeInvestigationId) {
          setActiveInvestigationId((response as any).sessionId);
        }
        setChatMessages((prev) => [...prev, response]);

        // Refresh previous chats in sidebar
        const updatedSessions = await api.fetchChatSessions();
        if (updatedSessions) {
          setRecentInvestigations(updatedSessions);
        }
      }
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsThinking(false);
      console.error('Chat error:', err);

      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Error connecting to Qwen3:4b backend. Make sure the FastAPI backend is running at http://localhost:8000.`,
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    }
  };

  const askPresetQuestion = (questionId: string) => {
    const preset = PRESET_QUESTIONS.find((p) => p.id === questionId);
    if (preset) {
      sendChatMessage(preset.question);
    }
  };

  // Helper Navigation Functions
  const jumpToTimestamp = (sec: number, eventId?: string, targetTab?: NavigationTab) => {
    setCurrentTimeSec(sec);
    if (eventId) {
      setSelectedEventId(eventId);
    }
    if (targetTab) {
      setActiveTab(targetTab);
    }
  };

  const openTimelineWithEvents = (eventIds: string[], targetTimeSec?: number) => {
    setActiveTab('timeline');
    setTimelineMode('incident');
    setHighlightedEventIds(eventIds);
    if (eventIds.length > 0) {
      setSelectedEventId(eventIds[0]);
    }
    if (targetTimeSec !== undefined) {
      setCurrentTimeSec(targetTimeSec);
    } else if (eventIds.length > 0) {
      const found = events.find((e) => e.id === eventIds[0]);
      if (found) {
        setCurrentTimeSec(found.timestampSec);
      }
    }
  };

  const openEvidenceForEvent = (event: TemporalEvent) => {
    openEvidenceModal({
      title: event.title,
      footageId: activeFootageId,
      footageTitle: activeFootage.title,
      startSec: event.evidenceStartSec,
      endSec: event.evidenceEndSec,
      startFormatted: event.evidenceStartFormatted,
      endFormatted: event.evidenceEndFormatted,
      primaryEventId: event.id,
      targetName: event.targetNames[0],
      targetId: event.targetIds[0],
      confidence: event.confidence,
      description: event.description,
      microSteps: event.evidenceKeyframes
        ? event.evidenceKeyframes.map((k, i) => ({
            timestamp: k.timestamp,
            timestampSec: event.evidenceStartSec + i * 2,
            description: k.description,
            highlight: i === 1,
          }))
        : [
            { timestamp: event.evidenceStartFormatted, timestampSec: event.evidenceStartSec, description: `Pre-event baseline in ${event.location}` },
            { timestamp: event.timestamp.substring(0, 5), timestampSec: event.timestampSec, description: event.title, highlight: true },
            { timestamp: event.evidenceEndFormatted, timestampSec: event.evidenceEndSec, description: `Post-event boundary tracking` },
          ],
    });
  };

  const openTargetInTracking = (targetId: string) => {
    setSelectedTargetId(targetId);
    const tgt = allTargets.find((t) => t.id === targetId);
    if (tgt) {
      setTargetCategoryFilter(tgt.type);
    }
    setActiveTab('timeline');
    setTimelineMode('target');
  };

  const deleteFootage = (id: string) => {
    setFootageList((prev) => prev.filter((f) => f.id !== id));
    if (activeFootageId === id) {
      const remaining = footageList.filter((f) => f.id !== id);
      if (remaining.length > 0) {
        setActiveFootageId(remaining[0].id);
      }
    }
  };

  const updateFootageTags = (id: string, tags: string[]) => {
    setFootageList((prev) => prev.map((f) => (f.id === id ? { ...f, tags } : f)));
  };

  const renameFootage = (id: string, newTitle: string) => {
    setFootageList((prev) => prev.map((f) => (f.id === id ? { ...f, title: newTitle } : f)));
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        timelineMode,
        setTimelineMode,
        activeFootageId,
        activeFootage,
        footageList,
        setActiveFootageId,
        deleteFootage,
        updateFootageTags,
        renameFootage,
        currentTimeSec,
        setCurrentTimeSec,
        isPlaying,
        setIsPlaying,
        playbackSpeed,
        setPlaybackSpeed,
        overlaysEnabled,
        setOverlaysEnabled,
        overlayFilters,
        toggleOverlayFilter,
        events,
        selectedEventId,
        selectedEvent,
        setSelectedEventId,
        highlightedEventIds,
        setHighlightedEventIds,
        allTargets,
        selectedTargetId,
        selectedTarget,
        setSelectedTargetId,
        targetCategoryFilter,
        setTargetCategoryFilter,
        ganttTracks,
        relationshipNodes,
        backendOnline,
        evidenceModalOpen,
        evidenceData,
        openEvidenceModal,
        closeEvidenceModal,
        searchOpen,
        setSearchOpen,
        searchQuery,
        setSearchQuery,
        searchResults,
        chatMessages,
        isThinking,
        currentThinkingStep,
        sendChatMessage,
        askPresetQuestion,
        recentQuestions,
        recentInvestigations,
        activeInvestigationId,
        selectInvestigationSession,
        startNewChat,
        isUploading,
        uploadProgress,
        uploadStage,
        uploadCompletedSteps,
        simulateFileUpload,
        jumpToTimestamp,
        openTimelineWithEvents,
        openEvidenceForEvent,
        openTargetInTracking,
        insightAlerts: MOCK_INSIGHT_ALERTS,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
