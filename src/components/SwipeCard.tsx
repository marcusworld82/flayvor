import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  Heart,
  X,
  Undo2,
  Info,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Maximize2,
} from 'lucide-react';
import type { MediaRecord } from '../types';
import { formatDuration } from '../lib/utils';
import { cn } from '../lib/utils';

interface SwipeCardProps {
  media: MediaRecord;
  onSave: () => void;
  onPass: () => void;
  onUndo: () => void;
  onDetails: () => void;
  canUndo: boolean;
  isTop: boolean;
}

export function SwipeCard({
  media,
  onSave,
  onPass,
  onUndo,
  onDetails,
  canUndo,
  isTop,
}: SwipeCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  const saveOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);

  // Only the top card plays
  useEffect(() => {
    const v = videoRef.current;
    if (!v || media.type !== 'video') return;
    if (isTop) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
    return () => {
      v.pause();
    };
  }, [isTop, media.id, media.type]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      if (v.duration) setProgress(v.currentTime / v.duration);
    };
    v.addEventListener('timeupdate', onTime);
    return () => v.removeEventListener('timeupdate', onTime);
  }, [media.id]);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const threshold = 100;
      if (info.offset.x > threshold || info.velocity.x > 500) {
        animate(x, 400, { duration: 0.25 }).then(onSave);
      } else if (info.offset.x < -threshold || info.velocity.x < -500) {
        animate(x, -400, { duration: 0.25 }).then(onPass);
      } else {
        animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
      }
    },
    [onSave, onPass, x]
  );

  // Keyboard
  useEffect(() => {
    if (!isTop) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onSave();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPass();
      } else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (canUndo) onUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isTop, onSave, onPass, onUndo, canUndo]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * v.duration;
  };

  const enterFullscreen = () => {
    const v = videoRef.current;
    if (v?.requestFullscreen) v.requestFullscreen();
  };

  return (
    <motion.div
      className={cn(
        'absolute inset-0 touch-none select-none',
        isTop ? 'z-10' : 'z-0 pointer-events-none'
      )}
      style={{ x: isTop ? x : 0, rotate: isTop ? rotate : 0, opacity: isTop ? opacity : 0.6 }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={isTop ? handleDragEnd : undefined}
    >
      <div className="relative w-full h-full card-surface overflow-hidden flex flex-col">
        {/* Media */}
        <div className="relative flex-1 bg-black/5 dark:bg-black/40 flex items-center justify-center min-h-0">
          {media.type === 'image' ? (
            <img
              src={media.url}
              alt={media.filename ?? 'Reference'}
              className="max-w-full max-h-full object-contain"
              draggable={false}
            />
          ) : (
            <video
              ref={videoRef}
              src={media.url}
              className="max-w-full max-h-full object-contain"
              loop
              muted={muted}
              playsInline
              preload="metadata"
            />
          )}

          {/* Save / Pass overlays */}
          {isTop && (
            <>
              <motion.div
                className="absolute top-6 left-6 px-3 py-1.5 rounded-full border-2 border-emerald-500 text-emerald-600 font-semibold text-sm bg-white/90"
                style={{ opacity: saveOpacity }}
              >
                SAVE
              </motion.div>
              <motion.div
                className="absolute top-6 right-6 px-3 py-1.5 rounded-full border-2 border-rose-500 text-rose-600 font-semibold text-sm bg-white/90"
                style={{ opacity: passOpacity }}
              >
                PASS
              </motion.div>
            </>
          )}

          {/* Video controls */}
          {media.type === 'video' && isTop && (
            <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
              <div
                className="h-1 bg-white/30 rounded-full mb-2 cursor-pointer"
                onClick={seek}
              >
                <div
                  className="h-full bg-white rounded-full transition-[width]"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-2 text-white">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1.5 rounded-full hover:bg-white/20"
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 rounded-full hover:bg-white/20"
                  aria-label={muted ? 'Unmute' : 'Mute'}
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="text-xs tabular-nums ml-1">
                  {formatDuration(media.durationSec)}
                </span>
                <button
                  type="button"
                  onClick={enterFullscreen}
                  className="p-1.5 rounded-full hover:bg-white/20 ml-auto"
                  aria-label="Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Meta + actions */}
        <div className="p-4 flex items-center justify-between gap-3 border-t border-border">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {media.filename ?? media.sourceLabel ?? 'Reference'}
            </p>
            <p className="text-xs text-ink-muted">
              {media.sourceLabel ?? media.source}
              {media.width && media.height ? ` \u00b7 ${media.width}\u00d7${media.height}` : ''}
              {media.type === 'video' && media.durationSec
                ? ` \u00b7 ${formatDuration(media.durationSec)}`
                : ''}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="btn-ghost p-2.5"
              aria-label="Undo last swipe"
              title="Undo (\u2318Z)"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onPass}
              className="btn-ghost p-2.5 text-rose-600"
              aria-label="Pass"
              title="Pass (\u2190)"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onSave}
              className="btn-primary p-2.5"
              aria-label="Save"
              title="Save (\u2192)"
            >
              <Heart className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onDetails}
              className="btn-ghost p-2.5"
              aria-label="Details"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
