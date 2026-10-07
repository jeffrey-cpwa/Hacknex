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
  Clock,
  Sparkles,
  Video,
  Check,
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
    events,
    selectedEvent,
  } = useApp();

  const [isMuted, setIsMuted] = useState(true);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Compute video URL from backend
  const videoSrc = activeFootage?.videoUrl
    ? `http://localhost:8000${activeFootage.videoUrl}`
    : activeFootage?.filename
    ? `http://localhost:8000/api/videos/${encodeURIComponent(activeFootage.filename)}`
    : 'http://localhost:8000/api/videos/marked_video.mp4';

  // Format seconds to MM:SS.S
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  // Sync external seek (e.g. from Chat evidence click or Timeline event click)
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTimeSec) > 0.5) {
      videoRef.current.currentTime = currentTimeSec;
    }
  }, [currentTimeSec]);

  // Sync playback state
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => setIsPlaying(false));
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // Sync playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Sync volume / muted
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTimeSec(videoRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTimeSec(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
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

  const durationSec = activeFootage?.durationSec || 15.23;

  return (
    <div ref={containerRef} style={styles.playerContainer}>
      {/* Actual HTML5 Video Viewport */}
      <div style={styles.viewport}>
        <video
          ref={videoRef}
          src={videoSrc}
          style={styles.actualVideo}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          playsInline
          muted={isMuted}
        />

        {/* Top HUD Overlay */}
        <div style={styles.viewportHudTop}>
          <div style={styles.hudTopLeft}>
            <span style={styles.recDot} />
            <span style={styles.hudFilename}>
              VIDEO ANALYSIS · {activeFootage?.title || 'Camera'} (MAPPED OBJECT TRACKED STREAM)
            </span>
          </div>
          <div style={styles.hudTopRight}>
            <span style={styles.timecodeDisplay}>{formatTime(currentTimeSec)}</span>
            <span style={styles.durationTotal}>/ {formatTime(durationSec)}</span>
          </div>
        </div>

        {/* Active Detected Event Badge */}
        {selectedEvent && (
          <div style={styles.activeEventBadge}>
            <Sparkles size={11} color="#F59E0B" />
            <span>{selectedEvent.title} ({selectedEvent.timestamp})</span>
          </div>
        )}
      </div>

      {/* Forensic Transport Scrubber & Playback Controls */}
      <div style={styles.controlsBar}>
        {/* Scrubber Timeline */}
        <div style={styles.scrubberRow}>
          <input
            type="range"
            min={0}
            max={durationSec}
            step={0.1}
            value={currentTimeSec}
            onChange={handleSeek}
            style={styles.rangeInput}
            aria-label="Timeline scrubber"
          />

          {/* Event markers on scrubber track */}
          <div style={styles.scrubberMarkers}>
            {events.map((evt) => {
              const posPercent = (evt.timestampSec / durationSec) * 100;
              if (posPercent < 0 || posPercent > 100) return null;
              return (
                <div
                  key={evt.id}
                  onClick={() => {
                    setCurrentTimeSec(evt.timestampSec);
                    if (videoRef.current) videoRef.current.currentTime = evt.timestampSec;
                  }}
                  title={`${evt.title} (${evt.timestamp})`}
                  style={{
                    ...styles.scrubberTick,
                    left: `${posPercent}%`,
                    backgroundColor: evt.severity === 'critical' ? '#EF4444' : evt.severity === 'warning' ? '#F59E0B' : '#38BDF8',
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div style={styles.actionRow}>
          {/* Left Controls */}
          <div style={styles.actionGroup}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="btn btn-primary btn-sm"
              style={{ width: '34px', height: '34px', padding: 0 }}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: '2px' }} />}
            </button>

            <button
              onClick={() => {
                setCurrentTimeSec(0);
                if (videoRef.current) videoRef.current.currentTime = 0;
              }}
              style={styles.iconBtn}
              title="Restart Video (00:00)"
            >
              <RotateCcw size={14} />
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              style={styles.iconBtn}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            <div style={styles.timecodePill}>
              <Clock size={12} color="#9299A4" />
              <span style={{ color: '#F5F7FA', fontWeight: 600 }}>{formatTime(currentTimeSec)}</span>
              <span style={{ color: '#9299A4' }}>/ {formatTime(durationSec)}</span>
            </div>
          </div>

          {/* Right Controls */}
          <div style={styles.actionGroup}>
            {/* Speed Selector */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
                style={styles.textBtn}
                title="Playback Speed"
              >
                <span>{playbackSpeed}x</span>
              </button>

              {speedMenuOpen && (
                <div style={styles.dropdownMenu}>
                  {[0.5, 1.0, 1.5, 2.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => {
                        setPlaybackSpeed(spd);
                        setSpeedMenuOpen(false);
                      }}
                      style={{
                        ...styles.dropdownItem,
                        color: playbackSpeed === spd ? '#F59E0B' : '#D1D5DB',
                      }}
                    >
                      <span>{spd}x</span>
                      {playbackSpeed === spd && <Check size={12} color="#F59E0B" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              style={styles.iconBtn}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  playerContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#08090B',
    position: 'relative',
    overflow: 'hidden',
  },
  viewport: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  actualVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: '#000',
  },
  viewportHudTop: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    pointerEvents: 'none',
    zIndex: 10,
  },
  hudTopLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(8, 9, 11, 0.75)',
    padding: '4px 10px',
    borderRadius: '4px',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  recDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#EF4444',
  },
  hudFilename: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#F5F7FA',
  },
  hudTopRight: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
    backgroundColor: 'rgba(8, 9, 11, 0.75)',
    padding: '4px 10px',
    borderRadius: '4px',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  timecodeDisplay: {
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'monospace',
    color: '#F59E0B',
  },
  durationTotal: {
    fontSize: '11px',
    color: '#9299A4',
    fontFamily: 'monospace',
  },
  activeEventBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(15, 18, 24, 0.85)',
    border: '1px solid rgba(245, 158, 11, 0.4)',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#F5F7FA',
    backdropFilter: 'blur(6px)',
    zIndex: 10,
  },
  controlsBar: {
    backgroundColor: '#0F1218',
    borderTop: '1px solid #1E232F',
    padding: '10px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexShrink: 0,
  },
  scrubberRow: {
    position: 'relative',
    height: '14px',
    display: 'flex',
    alignItems: 'center',
  },
  rangeInput: {
    width: '100%',
    cursor: 'pointer',
    accentColor: '#F59E0B',
  },
  scrubberMarkers: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    height: '10px',
  },
  scrubberTick: {
    position: 'absolute',
    width: '4px',
    height: '8px',
    borderRadius: '1px',
    transform: 'translateX(-50%)',
    pointerEvents: 'auto',
    cursor: 'pointer',
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  iconBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '4px',
    backgroundColor: '#161B22',
    border: '1px solid #28303F',
    color: '#D1D5DB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  textBtn: {
    height: '32px',
    padding: '0 10px',
    borderRadius: '4px',
    backgroundColor: '#161B22',
    border: '1px solid #28303F',
    color: '#D1D5DB',
    fontSize: '11px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  timecodePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 10px',
    height: '32px',
    borderRadius: '4px',
    backgroundColor: '#161B22',
    fontSize: '11px',
    fontFamily: 'monospace',
  },
  dropdownMenu: {
    position: 'absolute',
    bottom: '38px',
    right: 0,
    backgroundColor: '#161B22',
    border: '1px solid #28303F',
    borderRadius: '6px',
    padding: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    zIndex: 20,
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  },
  dropdownItem: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    fontSize: '11px',
    cursor: 'pointer',
    borderRadius: '4px',
  },
};
