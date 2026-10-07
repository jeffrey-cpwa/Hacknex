import React, { useRef, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Layers,
  Check,
  Eye,
  Crosshair,
  ShieldAlert,
  Clock,
  Sparkles,
} from 'lucide-react';

export const VideoPlayer: React.FC = () => {
  const {
    activeFootage,
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
    selectedEvent,
  } = useApp();

  const [isMuted, setIsMuted] = useState(true);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Playback timer simulation
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeSec((prev) => {
          if (prev >= activeFootage.durationSec) {
            setIsPlaying(false);
            return 0;
          }
          return Math.min(activeFootage.durationSec, prev + 0.1 * playbackSpeed);
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, activeFootage.durationSec, setCurrentTimeSec, setIsPlaying]);

  // Format seconds to mm:ss.s
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTimeSec(parseFloat(e.target.value));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Determine active dynamic bounding boxes based on currentTimeSec
  // Person #07: 32s - 258s
  const isPerson07Active =
    overlaysEnabled &&
    overlayFilters.people &&
    currentTimeSec >= 32 &&
    currentTimeSec <= 258;

  // Truck #01: 74s - 312s
  const isTruck01Active =
    overlaysEnabled &&
    overlayFilters.vehicles &&
    currentTimeSec >= 74 &&
    currentTimeSec <= 312;

  // Box #04: 151s - 292s
  const isBox04Active =
    overlaysEnabled &&
    overlayFilters.objects &&
    currentTimeSec >= 151 &&
    currentTimeSec <= 292;

  // Machine #02: All time
  const isMachine02Active =
    overlaysEnabled &&
    overlayFilters.objects &&
    currentTimeSec >= 10;

  // Alarm active: 221s - 245s
  const isAlarmActive =
    currentTimeSec >= 221 && currentTimeSec <= 245;

  return (
    <div ref={containerRef} style={styles.playerContainer}>
      {/* Video Viewport Area */}
      <div style={styles.viewport}>
        {/* Synthetic Forensic Canvas Frame */}
        <div style={styles.sceneCanvas}>
          {/* Background Surveillance Simulation */}
          <div style={styles.cctvScene}>
            {/* Grid & scanline */}
            <div style={styles.scanlineOverlay} />
            <div style={styles.crosshairGrid} />

            {/* Warehouse Architectural Wireframe Layer */}
            <div style={styles.wireframeFacility}>
              {/* North Gate / Entrance (left) */}
              <div style={styles.zoneEntrance}>
                <span style={styles.zoneLabel}>ZONE 01: NORTH GATE</span>
              </div>
              {/* Loading Bay 2 (bottom left) */}
              <div style={styles.zoneLoadingBay}>
                <span style={styles.zoneLabel}>BAY 02: DOCKING RAMP</span>
              </div>
              {/* Restricted Zone B (center right) */}
              <div
                style={{
                  ...styles.zoneRestricted,
                  ...(isAlarmActive || (currentTimeSec >= 127 && currentTimeSec <= 258)
                    ? styles.zoneRestrictedBreached
                    : {}),
                }}
              >
                <span style={styles.zoneRestrictedLabel}>
                  {isAlarmActive ? '🚨 RESTRICTED ZONE B [BREACH ALERT]' : 'RESTRICTED ZONE B [RESTRICTED]'}
                </span>
              </div>
              {/* Machine Line Sector 4 (top right) */}
              <div style={styles.zoneMachinery}>
                <span style={styles.zoneLabel}>SECTOR 04: MACHINE #02 ASSEMBLY</span>
              </div>
            </div>

            {/* Dynamic Interactive Bounding Boxes */}
            {/* 1. Person #07 Bounding Box */}
            {isPerson07Active && (
              <div
                style={{
                  ...styles.boundingBox,
                  ...getPersonPosition(currentTimeSec),
                  borderColor: '#F59E0B',
                }}
              >
                <div style={{ ...styles.boxHeader, backgroundColor: '#F59E0B', color: '#000' }}>
                  <Crosshair size={9} />
                  <span>PERSON #07 [94%]</span>
                </div>
                <div style={styles.boxTrackingVector} />
              </div>
            )}

            {/* 2. Truck #01 Bounding Box */}
            {isTruck01Active && (
              <div
                style={{
                  ...styles.boundingBox,
                  left: '18%',
                  top: '52%',
                  width: '180px',
                  height: '110px',
                  borderColor: '#38BDF8',
                }}
              >
                <div style={{ ...styles.boxHeader, backgroundColor: '#38BDF8', color: '#000' }}>
                  <span>TRUCK #01 [LOGISTICS]</span>
                </div>
              </div>
            )}

            {/* 3. Box #04 Bounding Box (Unattended Package) */}
            {isBox04Active && (
              <div
                style={{
                  ...styles.boundingBox,
                  left: '68%',
                  top: '48%',
                  width: '65px',
                  height: '55px',
                  borderColor: '#EF4444',
                }}
              >
                <div style={{ ...styles.boxHeader, backgroundColor: '#EF4444', color: '#FFF' }}>
                  <span>BOX #04 [UNTOUCHED]</span>
                </div>
                {currentTimeSec >= 271 && (
                  <div style={styles.untouchedTimerPill}>
                    &gt;2m Untouched
                  </div>
                )}
              </div>
            )}

            {/* 4. Machine #02 Bounding Box */}
            {isMachine02Active && (
              <div
                style={{
                  ...styles.boundingBox,
                  left: '62%',
                  top: '22%',
                  width: '190px',
                  height: '130px',
                  borderColor: 'rgba(168, 85, 247, 0.6)',
                  borderStyle: 'dashed',
                }}
              >
                <div style={{ ...styles.boxHeader, backgroundColor: 'rgba(168, 85, 247, 0.8)', color: '#FFF' }}>
                  <span>MACHINE #02 [ACTIVE]</span>
                </div>
              </div>
            )}

            {/* Top HUD Metadata Overlay */}
            <div style={styles.viewportHudTop}>
              <div style={styles.hudTopLeft}>
                <span style={styles.recDot} />
                <span style={styles.hudFilename}>{activeFootage.filename}</span>
              </div>
              <div style={styles.hudTopRight}>
                <span style={styles.timecodeDisplay}>{formatTime(currentTimeSec)}</span>
                <span style={styles.durationTotal}>/ {activeFootage.duration}</span>
              </div>
            </div>

            {/* Critical Alert Banner if Alarm Active */}
            {isAlarmActive && (
              <div style={styles.alarmBanner}>
                <ShieldAlert size={16} />
                <span>CRITICAL INCIDENT: SAFETY ALARM TRIGGERED AT 03:41.0</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Controls Bar */}
      <div style={styles.controlsBar}>
        {/* Scrubber Range Bar */}
        <div style={styles.scrubberRow}>
          <input
            type="range"
            min={0}
            max={activeFootage.durationSec}
            step={0.1}
            value={currentTimeSec}
            onChange={handleSeek}
            style={styles.scrubberSlider}
          />
          {/* Timeline Event Tick Marks */}
          <div style={styles.ticksContainer}>
            {events.map((evt) => {
              const posPercent = (evt.timestampSec / activeFootage.durationSec) * 100;
              const isEventSelected = evt.id === selectedEvent?.id;
              return (
                <div
                  key={evt.id}
                  onClick={() => setCurrentTimeSec(evt.timestampSec)}
                  style={{
                    ...styles.eventTick,
                    left: `${posPercent}%`,
                    backgroundColor:
                      evt.severity === 'critical'
                        ? '#EF4444'
                        : evt.severity === 'warning'
                        ? '#F59E0B'
                        : '#38BDF8',
                    height: isEventSelected ? '10px' : '6px',
                    width: isEventSelected ? '3px' : '2px',
                  }}
                  title={`${evt.timestamp} - ${evt.title}`}
                />
              );
            })}
          </div>
        </div>

        {/* Action Controls Row */}
        <div style={styles.buttonsRow}>
          {/* Left: Play/Pause, Step 1s, Reset */}
          <div style={styles.btnGroup}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={styles.playBtn}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause size={16} color="#08090B" /> : <Play size={16} color="#08090B" fill="#08090B" />}
            </button>

            <button
              onClick={() => setCurrentTimeSec((prev) => Math.max(0, prev - 5))}
              style={styles.controlIconBtn}
              title="Skip -5s"
            >
              <RotateCcw size={13} />
            </button>

            {/* Time display */}
            <div style={styles.timecodePill}>
              <Clock size={12} color="#F59E0B" />
              <span style={styles.timecodeText}>{formatTime(currentTimeSec)}</span>
              <span style={styles.timecodeTotal}>/ {activeFootage.duration}</span>
            </div>
          </div>

          {/* Right: Overlays, Overlay Filters, Speed, Volume, Fullscreen */}
          <div style={styles.btnGroup}>
            {/* Direct Overlay Filter Pills */}
            <div style={styles.filterPillsRow}>
              <button
                onClick={() => toggleOverlayFilter('people')}
                style={{
                  ...styles.filterPill,
                  ...(overlayFilters.people ? styles.filterPillActive : {}),
                }}
              >
                People
              </button>
              <button
                onClick={() => toggleOverlayFilter('vehicles')}
                style={{
                  ...styles.filterPill,
                  ...(overlayFilters.vehicles ? styles.filterPillActive : {}),
                }}
              >
                Vehicles
              </button>
              <button
                onClick={() => toggleOverlayFilter('objects')}
                style={{
                  ...styles.filterPill,
                  ...(overlayFilters.objects ? styles.filterPillActive : {}),
                }}
              >
                Objects
              </button>
              <button
                onClick={() => toggleOverlayFilter('events')}
                style={{
                  ...styles.filterPill,
                  ...(overlayFilters.events ? styles.filterPillActive : {}),
                }}
              >
                Events
              </button>
            </div>

            {/* Speed Selector */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setSpeedMenuOpen((prev) => !prev)}
                style={styles.speedBtn}
              >
                <span>{playbackSpeed}x</span>
              </button>

              {speedMenuOpen && (
                <div style={styles.speedDropdown}>
                  {[0.5, 1.0, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setPlaybackSpeed(s);
                        setSpeedMenuOpen(false);
                      }}
                      style={{
                        ...styles.speedItem,
                        color: playbackSpeed === s ? '#F59E0B' : '#F5F7FA',
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mute Button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              style={styles.controlIconBtn}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              style={styles.controlIconBtn}
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper: Calculate Person #07 coordinate trajectory across the 05:42 timeline
function getPersonPosition(timeSec: number) {
  if (timeSec < 32) return { left: '8%', top: '25%', width: '45px', height: '80px' };
  if (timeSec < 74) {
    // Walking from Entrance to Warehouse
    const t = (timeSec - 32) / (74 - 32);
    return {
      left: `${8 + t * 14}%`,
      top: `${25 + t * 25}%`,
      width: '45px',
      height: '80px',
    };
  }
  if (timeSec < 127) {
    // Near Loading bay / Truck
    return { left: '26%', top: '56%', width: '48px', height: '85px' };
  }
  if (timeSec < 151) {
    // Entering restricted zone B
    const t = (timeSec - 127) / (151 - 127);
    return {
      left: `${26 + t * 40}%`,
      top: `${56 - t * 15}%`,
      width: '48px',
      height: '85px',
    };
  }
  if (timeSec < 221) {
    // Inside restricted zone / near machine
    return { left: '66%', top: '42%', width: '48px', height: '85px' };
  }
  // Exiting corridor
  return { left: '84%', top: '65%', width: '45px', height: '80px' };
}

const styles: Record<string, React.CSSProperties> = {
  playerContainer: {
    backgroundColor: '#0A0C0F',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-lg)',
  },
  viewport: {
    position: 'relative',
    width: '100%',
    height: '420px',
    backgroundColor: '#050608',
    overflow: 'hidden',
  },
  sceneCanvas: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cctvScene: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0b0e13',
    backgroundImage: 'radial-gradient(ellipse at 50% 40%, #151a24 0%, #07080b 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  scanlineOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
    backgroundSize: '100% 4px',
    pointerEvents: 'none',
    zIndex: 3,
    opacity: 0.6,
  },
  crosshairGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
    zIndex: 2,
  },
  wireframeFacility: {
    position: 'absolute',
    inset: 0,
    zIndex: 2,
    pointerEvents: 'none',
  },
  zoneEntrance: {
    position: 'absolute',
    left: '5%',
    top: '15%',
    width: '160px',
    height: '120px',
    border: '1px dashed rgba(255, 255, 255, 0.12)',
    padding: '6px',
  },
  zoneLoadingBay: {
    position: 'absolute',
    left: '12%',
    bottom: '12%',
    width: '260px',
    height: '160px',
    border: '1px dashed rgba(56, 189, 248, 0.25)',
    padding: '6px',
  },
  zoneRestricted: {
    position: 'absolute',
    right: '15%',
    top: '25%',
    width: '280px',
    height: '220px',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
    padding: '6px',
    transition: 'all 0.3s ease',
  },
  zoneRestrictedBreached: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    boxShadow: 'inset 0 0 20px rgba(239, 68, 68, 0.2)',
  },
  zoneMachinery: {
    position: 'absolute',
    right: '8%',
    top: '10%',
    width: '240px',
    height: '150px',
    border: '1px dashed rgba(168, 85, 247, 0.25)',
    padding: '6px',
  },
  zoneLabel: {
    fontSize: '9px',
    fontFamily: 'var(--font-mono)',
    color: '#9299A4',
    letterSpacing: '0.05em',
  },
  zoneRestrictedLabel: {
    fontSize: '9.5px',
    fontFamily: 'var(--font-mono)',
    color: '#EF4444',
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  boundingBox: {
    position: 'absolute',
    border: '1.5px solid',
    borderRadius: '2px',
    transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
    zIndex: 5,
    pointerEvents: 'none',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
  },
  boxHeader: {
    position: 'absolute',
    top: '-18px',
    left: '-1px',
    fontSize: '9.5px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    padding: '1px 5px',
    borderRadius: '2px 2px 0 0',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    whiteSpace: 'nowrap',
    letterSpacing: '0.04em',
  },
  boxTrackingVector: {
    position: 'absolute',
    bottom: '-12px',
    left: '50%',
    width: '1px',
    height: '12px',
    backgroundColor: 'var(--accent-amber)',
  },
  untouchedTimerPill: {
    position: 'absolute',
    bottom: '-20px',
    left: '0',
    backgroundColor: '#EF4444',
    color: '#FFF',
    fontSize: '9px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    padding: '1px 4px',
    borderRadius: '2px',
  },
  viewportHudTop: {
    position: 'absolute',
    top: '12px',
    left: '14px',
    right: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 6,
    pointerEvents: 'none',
  },
  hudTopLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(8, 9, 11, 0.75)',
    backdropFilter: 'blur(4px)',
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  recDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#EF4444',
    animation: 'pulseGlow 1.5s infinite',
  },
  hudFilename: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    color: '#F5F7FA',
    fontWeight: 600,
  },
  hudFps: {
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent-amber)',
  },
  hudResolution: {
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    color: '#9299A4',
  },
  hudTopRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(8, 9, 11, 0.75)',
    backdropFilter: 'blur(4px)',
    padding: '4px 10px',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  timecodeDisplay: {
    fontSize: '13px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    color: '#F59E0B',
    letterSpacing: '0.04em',
  },
  durationTotal: {
    fontSize: '11.5px',
    fontFamily: 'var(--font-mono)',
    color: '#9299A4',
  },
  alarmBanner: {
    position: 'absolute',
    bottom: '12px',
    left: '14px',
    right: '14px',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    color: '#FFFFFF',
    padding: '6px 12px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '11.5px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    zIndex: 6,
    boxShadow: '0 0 16px rgba(239, 68, 68, 0.6)',
  },
  controlsBar: {
    backgroundColor: '#0E1014',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderTop: '1px solid var(--border-default)',
  },
  scrubberRow: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  scrubberSlider: {
    width: '100%',
    cursor: 'pointer',
    zIndex: 3,
  },
  ticksContainer: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
  },
  eventTick: {
    position: 'absolute',
    borderRadius: '1px',
    transform: 'translateX(-50%)',
    pointerEvents: 'auto',
    cursor: 'pointer',
  },
  buttonsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btnGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  playBtn: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: '#F59E0B',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  controlIconBtn: {
    width: '30px',
    height: '30px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  timecodePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#08090B',
    border: '1px solid var(--border-subtle)',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  timecodeText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    fontWeight: 700,
    color: '#F59E0B',
  },
  timecodeTotal: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: '#9299A4',
  },
  filterPillsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#08090B',
    padding: '2px 4px',
    borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--border-subtle)',
  },
  filterPill: {
    fontSize: '11px',
    fontWeight: 500,
    padding: '3px 7px',
    borderRadius: '3px',
    border: '1px solid transparent',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  filterPillActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    color: '#F59E0B',
    fontWeight: 600,
  },
  filterMenuBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11.5px',
    padding: '5px 9px',
    borderRadius: 'var(--radius-xs)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  filterPopover: {
    position: 'absolute',
    bottom: '125%',
    right: 0,
    backgroundColor: '#12151A',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '10px',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 100,
    width: '210px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  filterPopoverHeader: {
    fontSize: '9.5px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    marginBottom: '2px',
  },
  filterCheckboxItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '3px 0',
  },
  checkboxInput: {
    cursor: 'pointer',
    accentColor: '#F59E0B',
  },
  speedBtn: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11.5px',
    fontWeight: 600,
    padding: '5px 8px',
    borderRadius: 'var(--radius-xs)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  speedDropdown: {
    position: 'absolute',
    bottom: '125%',
    right: 0,
    backgroundColor: '#12151A',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-sm)',
    padding: '4px',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  speedItem: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    padding: '4px 8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    textAlign: 'center',
  },
};
