/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, X, Volume2, VolumeX, Music, Maximize2, Minimize2, Sparkles, Clock, AlertCircle } from 'lucide-react';

interface RadioProgramPlayerProps {
  audioUrl: string;
  title: string;
  eyebrow: string;
  coverImageUrl?: string;
  durationLabel?: string;
  onClose: () => void;
}

export default function RadioProgramPlayer({
  audioUrl,
  title,
  eyebrow,
  coverImageUrl,
  durationLabel,
  onClose,
}: RadioProgramPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoadError(false);
    setPlayError(null);
    // Create new audio element
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      console.error('Audio load error');
      setLoadError(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audioRef.current = null;
    };
  }, [audioUrl]);

  // Handle Escape key to close the player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Restore focus on unmount
  useEffect(() => {
    const activeElement = document.activeElement as HTMLElement | null;
    return () => {
      if (activeElement && typeof activeElement.focus === 'function') {
        activeElement.focus();
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current || loadError) return;
    setPlayError(null);
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setPlayError(null);
        })
        .catch(err => {
          console.error('Playback failed:', err);
          setPlayError('Không thể phát tệp âm thanh này.');
          setIsPlaying(false);
        });
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    audioRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = Math.max(0, Math.min(1, clickX / rect.width));
    audioRef.current.currentTime = clickPercent * duration;
    setCurrentTime(clickPercent * duration);
  };

  const handleKeyDownProgress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    let nextTime = currentTime;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      nextTime = Math.min(duration, currentTime + 5);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      nextTime = Math.max(0, currentTime - 5);
    } else {
      return;
    }
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
    e.preventDefault();
  };

  const formatTime = (timeInSecs: number) => {
    if (isNaN(timeInSecs)) return '00:00';
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="fixed bottom-6 right-4 left-4 md:right-6 md:left-auto md:w-[420px] z-50 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-title"
      >
        <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-4 md:p-5 text-white flex flex-col space-y-3">
          
          {/* Header Metadata Info */}
          <div className="flex items-center justify-between space-x-3">
            <div className="flex items-center space-x-3 min-w-0">
              {coverImageUrl ? (
                <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-white/15">
                  <img 
                    src={coverImageUrl} 
                    alt="Cover" 
                    className={`h-full w-full object-cover ${isPlaying ? 'animate-spin [animation-duration:15s]' : ''}`}
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 border border-white/10 text-white">
                  <Music className={`h-5 w-5 ${isPlaying ? 'animate-bounce' : ''}`} />
                </div>
              )}
              
              <div className="min-w-0">
                <span className="flex items-center text-[9px] font-extrabold uppercase tracking-widest text-emerald-400">
                  <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
                  {eyebrow}
                </span>
                <h4 id="player-title" className="text-xs font-bold text-white leading-snug truncate mt-0.5" title={title}>
                  {title}
                </h4>
                {durationLabel && (
                  <span className="text-[10px] text-slate-400 flex items-center mt-0.5">
                    <Clock className="h-3 w-3 mr-1" />
                    Thời lượng: {durationLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Top Right Action Buttons */}
            <div className="flex items-center space-x-1 shrink-0">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                title={isExpanded ? "Thu nhỏ" : "Mở rộng"}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "Thu nhỏ thông tin chi tiết" : "Mở rộng thông tin chi tiết"}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/50"
                title="Đóng trình phát"
                aria-label="Đóng trình phát"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loadError && (
            <div className="text-[11px] text-red-400 flex items-center bg-red-950/20 p-2 rounded-lg border border-red-900/30">
              <AlertCircle className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              <span>Lỗi nạp tệp âm thanh. Vui lòng thử lại sau.</span>
            </div>
          )}

          {playError && (
            <div className="text-[11px] text-red-400 flex items-center bg-red-950/20 p-2 rounded-lg border border-red-900/30">
              <AlertCircle className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              <span>{playError}</span>
            </div>
          )}

          {/* Expanded detailed view */}
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="text-[11px] text-slate-300 leading-relaxed pt-1 border-t border-white/5"
            >
              Chương trình phát thanh măng non do các bạn Đội viên Liên đội biên tập và phát sóng, truyền tải các hoạt động, gương sáng học sinh học tốt rèn ngoan trong tuần học vừa qua.
            </motion.div>
          )}

          {/* Custom Controls Container */}
          <div className="space-y-2">
            {/* Play bar scrubber */}
            <div className="space-y-1">
              <div 
                ref={progressBarRef}
                onClick={handleProgressClick}
                onKeyDown={handleKeyDownProgress}
                className="h-1.5 w-full bg-white/10 rounded-full cursor-pointer relative overflow-hidden group/scrub focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                role="slider"
                aria-label="Thanh tiến trình"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration) || 100}
                aria-valuenow={Math.round(currentTime)}
                aria-valuetext={`${formatTime(currentTime)} trên ${formatTime(duration)}`}
                tabIndex={0}
              >
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-100 relative group-hover/scrub:bg-emerald-400" 
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Play Pause and Volume Row */}
            <div className="flex items-center justify-between pt-1">
              {/* Mute toggle button */}
              <button
                onClick={toggleMute}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              {/* Main Play / Pause Button */}
              <button
                onClick={togglePlay}
                disabled={loadError}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
                title={isPlaying ? "Tạm dừng" : "Phát sóng"}
                aria-label={isPlaying ? "Tạm dừng" : "Phát sóng"}
              >
                {isPlaying ? <Pause className="h-5 w-5 fill-current text-slate-950" /> : <Play className="h-5 w-5 fill-current text-slate-950 pl-0.5" />}
              </button>

              {/* Extra visualizer display */}
              <div className="flex space-x-0.5 items-end h-3 w-8 px-2">
                <span className={`w-0.5 bg-emerald-500 rounded-full ${isPlaying ? 'animate-[wave_1s_ease-in-out_infinite]' : 'h-1'}`} style={{ animationDelay: '0.1s' }} />
                <span className={`w-0.5 bg-emerald-500 rounded-full ${isPlaying ? 'animate-[wave_1s_ease-in-out_infinite]' : 'h-1.5'}`} style={{ animationDelay: '0.3s' }} />
                <span className={`w-0.5 bg-emerald-500 rounded-full ${isPlaying ? 'animate-[wave_1s_ease-in-out_infinite]' : 'h-0.5'}`} style={{ animationDelay: '0.5s' }} />
                <span className={`w-0.5 bg-emerald-500 rounded-full ${isPlaying ? 'animate-[wave_1s_ease-in-out_infinite]' : 'h-1'}`} style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
