import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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

  // Investigations Sessions
  recentInvestigations: InvestigationSession[];
  activeInvestigationId: string | null;
  selectInvestigationSession: (invId: string) => void;

  // Upload Simulation
  isUploading: boolean;
  uploadProgress: number;
  uploadStage: string;
  uploadCompletedSteps: string[];
  simulateFileUpload: (fileName?: string) => void;

  // Navigation helpers
  jumpToTimestamp: (sec: number, eventId?: string, targetTab?: NavigationTab) => void;
  openTimelineWithEvents: (eventIds: string[], targetTimeSec?: number) => void;
  openEvidenceForEvent: (event: TemporalEvent) => void;
  openTargetInTracking: (targetId: string) => void;

  // Insights
  insightAlerts: typeof MOCK_INSIGHT_ALERTS;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavigationTab>('upload');
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('incident');
  const [targetCategoryFilter, setTargetCategoryFilter] = useState<TargetCategory>('person');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('tgt-person-07');

  // Footage State (with localStorage persistence)
  const [footageList, setFootageList] = useState<Footage[]>(() => {
    try {
      const saved = localStorage.getItem('temporal_ai_footage');
      return saved ? JSON.parse(saved) : INITIAL_FOOTAGE_LIST;
    } catch {
      return INITIAL_FOOTAGE_LIST;
    }
  });

  const [activeFootageId, setActiveFootageId] = useState<string>('footage-1');

  useEffect(() => {
    try {
      localStorage.setItem('temporal_ai_footage', JSON.stringify(footageList));
    } catch (e) {
      console.warn('Failed to persist footage to localStorage', e);
    }
  }, [footageList]);

  const activeFootage = useMemo(() => {
    return footageList.find((f) => f.id === activeFootageId) || footageList[0] || INITIAL_FOOTAGE_LIST[0];
  }, [footageList, activeFootageId]);

  // Playback & Video state
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(127.4); // Start at restricted entry for wow factor
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

  // Events & Targets
  const events = useMemo(() => {
    if (activeFootageId === 'footage-1') {
      return MOCK_EVENTS;
    }
    
    // Generate dummy events for other footage based on active footage
    const dummyEvents: TemporalEvent[] = [];
    const count = activeFootage?.eventCount || 5;
    for (let i = 0; i < count; i++) {
      const min = Math.floor(i * 1.5);
      const sec = (i * 15) % 60;
      dummyEvents.push({
        id: `dummy-evt-${activeFootageId}-${i}`,
        timestamp: `0${min}:${sec < 10 ? '0'+sec : sec}.0`,
        timestampSec: min * 60 + sec,
        title: `Detected Event ${i + 1} in ${activeFootage?.title || 'Video'}`,
        description: `Auto-generated event description for ${activeFootage?.title || 'Video'} at minute ${min}.`,
        category: i % 3 === 0 ? 'security' : i % 2 === 0 ? 'interaction' : 'object',
        targetIds: [`tgt-dummy-${i}`],
        targetNames: [`Target #${i+1}`],
        location: `${activeFootage?.title || 'Sector'} Zone`,
        durationSec: 10 + i * 2,
        durationFormatted: `${10 + i * 2}s`,
        confidence: 85 + (i % 15),
        severity: i === 0 ? 'critical' : i === 2 ? 'warning' : 'info',
        evidenceStartSec: Math.max(0, min * 60 + sec - 5),
        evidenceEndSec: min * 60 + sec + 15,
        evidenceStartFormatted: `0${min}:${Math.max(0, sec - 5).toString().padStart(2, '0')}`,
        evidenceEndFormatted: `0${min}:${(sec + 15).toString().padStart(2, '0')}`,
      });
    }
    return dummyEvents;
  }, [activeFootageId, activeFootage]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>('evt-4');
  const [highlightedEventIds, setHighlightedEventIds] = useState<string[]>(['evt-2', 'evt-4']);
  const [allTargets] = useState<TargetEntity[]>(MOCK_TARGETS);

  const selectedEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  const selectedTarget = useMemo(() => {
    return allTargets.find((t) => t.id === selectedTargetId) || allTargets[0];
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
      text: 'TEMPORAL AI Engine initialized on Factory_Camera_01.mp4. 12 temporal events, 5 key targets, and perimeter anomalies indexed across 05:42 duration. Ask what happened, when it occurred, or inspect event sequences.',
    },
  ]);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [currentThinkingStep, setCurrentThinkingStep] = useState<string>('Analyzing temporal events...');

  // Recent Questions History
  const recentQuestions = useMemo(() => {
    return PRESET_QUESTIONS.map((pq) => ({
      id: pq.id,
      label: pq.shortLabel,
      timestampRef: pq.timestampRef,
      query: pq.question,
    }));
  }, []);

  // Investigation Sessions (with localStorage persistence)
  const [recentInvestigations, setRecentInvestigations] = useState<InvestigationSession[]>(() => {
    try {
      const saved = localStorage.getItem('temporal_ai_investigations');
      return saved ? JSON.parse(saved) : INITIAL_RECENT_INVESTIGATIONS;
    } catch {
      return INITIAL_RECENT_INVESTIGATIONS;
    }
  });

  const [activeInvestigationId, setActiveInvestigationId] = useState<string | null>('inv-1');

  useEffect(() => {
    try {
      localStorage.setItem('temporal_ai_investigations', JSON.stringify(recentInvestigations));
    } catch (e) {
      console.warn('Failed to persist investigations to localStorage', e);
    }
  }, [recentInvestigations]);

  // Upload Simulation State
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStage, setUploadStage] = useState<string>('Uploading video file...');
  const [uploadCompletedSteps, setUploadCompletedSteps] = useState<string[]>([]);

  const simulateFileUpload = (fileName?: string) => {
    const targetName = fileName || 'Factory_Camera_01_New.mp4';
    setIsUploading(true);
    setUploadProgress(10);
    setUploadStage('Uploading video evidence...');
    setUploadCompletedSteps([]);

    const steps = [
      { progress: 28, stage: 'Extracting video frames...', completed: '✓ Video uploaded' },
      { progress: 46, stage: 'Running object & vehicle detection...', completed: '✓ Frames extracted' },
      { progress: 68, stage: 'Tracking people & continuous trajectories...', completed: '✓ Objects detected' },
      { progress: 84, stage: 'Extracting temporal relationships & timestamps...', completed: '✓ People tracked' },
      { progress: 95, stage: 'Generating temporal index & Gantt intervals...', completed: '✓ Events generated' },
      { progress: 100, stage: 'Investigation workspace ready.', completed: '✓ Timeline ready' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        setUploadProgress(step.progress);
        setUploadStage(step.stage);
        setUploadCompletedSteps((prev) => [...prev, step.completed]);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsUploading(false);
          // Add newly uploaded footage to list if not existing
          const newFootage: Footage = {
            id: `footage-${Date.now()}`,
            title: targetName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
            filename: targetName,
            duration: '05:42',
            durationSec: 342,
            date: 'Just now',
            eventCount: 12,
            status: 'Analyzed',
            tags: ['Uploaded', 'Security', 'Factory'],
            resolution: '1920 × 1080',
            fps: 30,
            trackedPeopleCount: 4,
            trackedObjectsCount: 11,
            trackedVehiclesCount: 1,
            criticalEventsCount: 2,
            warningEventsCount: 2,
            isCustomUploaded: true,
          };
          setFootageList((prev) => [newFootage, ...prev]);
          setActiveFootageId(newFootage.id);
        }, 600);
      }
    }, 450);
  };

  // Chat message submission
  const sendChatMessage = (questionText: string) => {
    if (!questionText.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: questionText,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);
    setCurrentThinkingStep('Analyzing temporal events...');

    // Match preset or generate intelligent temporal AI response
    const qLower = questionText.toLowerCase();
    let matchedPreset = PRESET_QUESTIONS.find(
      (p) =>
        qLower.includes(p.shortLabel.toLowerCase()) ||
        qLower.includes(p.question.toLowerCase()) ||
        (qLower.includes('truck') && qLower.includes('restricted')) ||
        (qLower.includes('before') && qLower.includes('alarm')) ||
        (qLower.includes('untouched') || qLower.includes('2 minutes')) ||
        (qLower.includes('machine') && qLower.includes('stop')) ||
        (qLower.includes('same person') && qLower.includes('incident')) ||
        (qLower.includes('who entered') && qLower.includes('first'))
    );

    // If specific keyword matching
    if (!matchedPreset) {
      if (qLower.includes('truck') || qLower.includes('restricted')) {
        matchedPreset = PRESET_QUESTIONS[0];
      } else if (qLower.includes('alarm')) {
        matchedPreset = PRESET_QUESTIONS[1];
      } else if (qLower.includes('stop') || qLower.includes('machine')) {
        matchedPreset = PRESET_QUESTIONS[2];
      } else if (qLower.includes('untouched') || qLower.includes('box') || qLower.includes('object')) {
        matchedPreset = PRESET_QUESTIONS[3];
      } else if (qLower.includes('person') || qLower.includes('who')) {
        matchedPreset = PRESET_QUESTIONS[4];
      } else {
        matchedPreset = PRESET_QUESTIONS[0];
      }
    }

    // Step-by-step thinking simulation
    setTimeout(() => {
      setCurrentThinkingStep('Checking target history & spatial bounding...');
    }, 450);

    setTimeout(() => {
      setCurrentThinkingStep('Comparing timestamps & calculating temporal delta...');
    }, 900);

    setTimeout(() => {
      setIsThinking(false);
      const aiResponse: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: matchedPreset ? matchedPreset.answer.summary : `Temporal reasoning engine identified relevant events across Factory_Camera_01.mp4.`,
        answerData: matchedPreset ? matchedPreset.answer : PRESET_QUESTIONS[0].answer,
      };
      setChatMessages((prev) => [...prev, aiResponse]);
    }, 1350);
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

  const selectInvestigationSession = (invId: string) => {
    const inv = recentInvestigations.find((i) => i.id === invId);
    if (!inv) return;
    setActiveInvestigationId(invId);
    setActiveFootageId(inv.footageId);
    if (inv.activeMode) {
      setTimelineMode(inv.activeMode);
    }
    setActiveTab('timeline');
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
        ganttTracks: MOCK_GANTT_TRACKS,
        relationshipNodes: MOCK_RELATIONSHIP_NODES,
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
