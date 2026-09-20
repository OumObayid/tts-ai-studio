import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Download,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Sparkles,
  Music,
  Clock,
  FileText,
  Copy,
  Check,
  Subtitles,
} from 'lucide-react';
import { TTSResponseData, VoiceProfile, TimestampCue } from '../types';
import {
  extractOrGenerateTimestampCues,
  generateSrt,
  generateVtt,
  formatScriptWithTimestamps,
} from '../utils/timestampUtils';

interface AudioPlayerProps {
  audioData: TTSResponseData | null;
  selectedVoice: VoiceProfile;
  uiLang: 'ar' | 'fr';
  isGenerating: boolean;
  currentText?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioData,
  selectedVoice,
  uiLang,
  isGenerating,
  currentText,
}) => {
  const isAr = uiLang === 'ar';
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  // Timestamp view mode: 'with-timestamp' (avec) or 'without-timestamp' (sans)
  const [timestampMode, setTimestampMode] = useState<'with' | 'without'>('with');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Derive timestamp cues either from audioData or generate from text & duration
  const activeCues: TimestampCue[] = useMemo(() => {
    if (audioData?.timestampCues && audioData.timestampCues.length > 0) {
      return audioData.timestampCues;
    }
    const textToUse = currentText || audioData?.cleanText || '';
    if (!textToUse.trim()) return [];
    return extractOrGenerateTimestampCues(textToUse, duration || audioData?.durationEstimateSeconds || 10);
  }, [audioData, currentText, duration]);

  // Clean text without timestamps
  const cleanDisplayContent: string = useMemo(() => {
    if (audioData?.cleanText) return audioData.cleanText;
    if (activeCues.length > 0) return activeCues.map((c) => c.text).join(' ');
    return currentText || '';
  }, [audioData, activeCues, currentText]);

  // When audioData changes, auto-load
  useEffect(() => {
    if (audioData?.audioUrl && audioRef.current) {
      audioRef.current.src = audioData.audioUrl;
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [audioData]);

  // Audio Event Listeners
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || audioData?.durationEstimateSeconds || 0);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioData?.audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error('Audio playback error:', err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleSeekToCue = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
    if (!isPlaying) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioRef.current.muted = nextMuted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val > 0 && isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  const handleDownload = () => {
    if (!audioData?.audioBase64) return;
    const link = document.createElement('a');
    link.href = `data:audio/wav;base64,${audioData.audioBase64}`;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `sawt-${selectedVoice.nameFr.toLowerCase()}-${dateStr}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSrt = () => {
    if (activeCues.length === 0) return;
    const srtContent = generateSrt(activeCues);
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subtitles-${selectedVoice.nameFr.toLowerCase()}.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadVtt = () => {
    if (activeCues.length === 0) return;
    const vttContent = generateVtt(activeCues);
    const blob = new Blob([vttContent], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subtitles-${selectedVoice.nameFr.toLowerCase()}.vtt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyText = (content: string, label: string) => {
    navigator.clipboard.writeText(content);
    setCopiedNotification(label);
    setTimeout(() => setCopiedNotification(null), 2000);
  };

  // Waveform Canvas Rendering Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const numBars = 48;
      const barWidth = width / numBars - 2;
      const progress = duration > 0 ? currentTime / duration : 0;

      for (let i = 0; i < numBars; i++) {
        const barPos = i / numBars;
        let barHeight = 6;

        if (isPlaying) {
          const wave1 = Math.sin(phase + i * 0.25) * 16;
          const wave2 = Math.cos(phase * 1.2 + i * 0.4) * 12;
          barHeight = Math.max(6, Math.min(height - 10, 18 + wave1 + wave2));
        } else if (audioData) {
          const staticWave = Math.sin(i * 0.3) * 14 + Math.cos(i * 0.7) * 8;
          barHeight = Math.max(6, 16 + Math.abs(staticWave));
        }

        const isPassed = barPos <= progress;
        ctx.fillStyle = isPassed
          ? isPlaying
            ? '#10b981' // emerald-500
            : '#059669' // emerald-600
          : '#334155'; // slate-700

        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }

      if (isPlaying) {
        phase += 0.15;
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTime, duration, audioData]);

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-xl border border-slate-800 space-y-4">
      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      {/* Header Info */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${selectedVoice.avatarColor} flex items-center justify-center text-white font-bold shadow-md`}
          >
            {selectedVoice.nameAr[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">
                {selectedVoice.nameAr} ({selectedVoice.nameFr})
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {isAr ? selectedVoice.badgeAr : selectedVoice.badgeFr}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {audioData
                ? isAr
                  ? `ملف صوتي جاهز • ${duration.toFixed(1)} ثانية`
                  : `Audio généré • ${duration.toFixed(1)}s`
                : isAr
                ? 'في انتظار توليد الصوت...'
                : 'En attente de génération...'}
            </p>
          </div>
        </div>

        {/* Download Master Button */}
        <button
          id="download-master-audio-btn"
          type="button"
          onClick={handleDownload}
          disabled={!audioData?.audioBase64}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-600/20 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-950" />
          <span className="hidden sm:inline">
            {isAr ? 'تحميل Audio (WAV)' : 'Télécharger (WAV)'}
          </span>
        </button>
      </div>

      {/* Visualizer Waveform Canvas */}
      <div className="w-full bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={600}
          height={64}
          className="w-full h-16 max-w-full block"
        />
      </div>

      {/* Progress & Time bar */}
      <div>
        <input
          id="audio-seek-slider"
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          disabled={!audioData}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 disabled:opacity-40"
        />
        <div className="flex justify-between text-xs text-slate-400 font-mono mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        {/* Playback speed buttons */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
          {[0.8, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => changePlaybackRate(rate)}
              className={`px-2 py-1 rounded text-xs font-mono font-semibold transition cursor-pointer ${
                playbackRate === rate
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Center transport buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Skip Back 5s */}
          <button
            type="button"
            onClick={() => handleSkip(-5)}
            disabled={!audioData}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-30 cursor-pointer"
            title={isAr ? 'رجوع 5 ثوانٍ' : '-5s'}
          >
            <Rewind className="w-4 h-4" />
          </button>

          {/* Primary Play/Pause Button */}
          <button
            id="main-play-pause-btn"
            type="button"
            onClick={togglePlay}
            disabled={!audioData || isGenerating}
            className={`w-13 h-13 rounded-full flex items-center justify-center text-slate-950 font-bold transition-all shadow-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isPlaying
                ? 'bg-amber-400 hover:bg-amber-300 ring-4 ring-amber-400/20'
                : 'bg-emerald-400 hover:bg-emerald-300 ring-4 ring-emerald-400/20 shadow-emerald-500/20'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current text-slate-950" />
            ) : (
              <Play className="w-6 h-6 fill-current text-slate-950 ms-0.5" />
            )}
          </button>

          {/* Skip Forward 5s */}
          <button
            type="button"
            onClick={() => handleSkip(5)}
            disabled={!audioData}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-30 cursor-pointer"
            title={isAr ? 'تقديم 5 ثوانٍ' : '+5s'}
          >
            <FastForward className="w-4 h-4" />
          </button>
        </div>

        {/* Volume & Mute control */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TIMESTAMP & SUBTITLES SECTION: avec/sans timestamp Toggle & Interactive UI */}
      {/* ========================================================================= */}
      <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
        {/* Subtitle Header & Mode Switch */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Subtitles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">
              {isAr ? 'المزامنة والتفريغ الصوتي:' : 'Synchronisation & Horodatage :'}
            </span>
          </div>

          {/* Avec / Sans Timestamp Toggle Pills */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              id="view-with-timestamp-btn"
              type="button"
              onClick={() => setTimestampMode('with')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                timestampMode === 'with'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>{isAr ? 'مع التوقيت (Avec timestamp)' : 'Avec timestamp'}</span>
            </button>
            <button
              id="view-without-timestamp-btn"
              type="button"
              onClick={() => setTimestampMode('without')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                timestampMode === 'without'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>{isAr ? 'بدون توقيت (Sans timestamp)' : 'Sans timestamp'}</span>
            </button>
          </div>
        </div>

        {/* Copy confirmation notification */}
        {copiedNotification && (
          <div className="px-2.5 py-1 bg-emerald-950/80 border border-emerald-500/40 rounded-md text-[11px] text-emerald-300 flex items-center gap-1.5">
            <Check className="w-3 h-3" />
            <span>{copiedNotification}</span>
          </div>
        )}

        {/* MODE 1: AVEC TIMESTAMP (Interactive cue cards + Click-to-seek + SRT/VTT export) */}
        {timestampMode === 'with' && (
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2.5">
            {activeCues.length > 0 ? (
              <>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pe-1 divide-y divide-slate-900">
                  {activeCues.map((cue) => {
                    const isActive =
                      currentTime >= cue.startSeconds && currentTime < cue.endSeconds;
                    return (
                      <div
                        key={cue.id}
                        onClick={() => handleSeekToCue(cue.startSeconds)}
                        className={`p-2 rounded-lg transition-all cursor-pointer flex items-start gap-2 text-xs text-start ${
                          isActive
                            ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 shadow-xs ring-1 ring-emerald-500/40'
                            : 'hover:bg-slate-900/90 text-slate-300 border border-transparent'
                        }`}
                        title={isAr ? 'انقر للقفز إلى هذا المقطع في الصوت' : 'Cliquer pour écouter ce segment'}
                      >
                        {/* Time Pill */}
                        <span
                          className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] shrink-0 ${
                            isActive
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          [{cue.startTimeFormatted}]
                        </span>

                        {/* Text */}
                        <p className="leading-relaxed flex-1 font-medium">{cue.text}</p>

                        {/* Playing dot */}
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 mt-1" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Subtitle Export Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <span className="text-[11px] text-slate-500">
                    {activeCues.length} {isAr ? 'مقاطع متزامنة' : 'segments synchronisés'}
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Export SRT */}
                    <button
                      type="button"
                      onClick={handleDownloadSrt}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold border border-slate-700 transition cursor-pointer"
                      title={isAr ? 'تحميل كملف ترجمة SubRip (.srt)' : 'Télécharger sous-titres .SRT'}
                    >
                      ↓ .SRT
                    </button>

                    {/* Export VTT */}
                    <button
                      type="button"
                      onClick={handleDownloadVtt}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold border border-slate-700 transition cursor-pointer"
                      title={isAr ? 'تحميل كملف ترجمة ويب WebVTT (.vtt)' : 'Télécharger sous-titres .VTT'}
                    >
                      ↓ .VTT
                    </button>

                    {/* Copy with timestamps */}
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          formatScriptWithTimestamps(activeCues),
                          isAr ? 'تم نسخ النص مع التوقيت!' : 'Copié avec timestamps !'
                        )
                      }
                      className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{isAr ? 'نسخ مع التوقيت' : 'Copier avec time'}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500 py-2 text-center">
                {isAr
                  ? 'قم بتوليد الصوت أو كتابة نص لعرض التوقيت الزمني الدقيق.'
                  : 'Générez un audio pour afficher la synchronisation temporelle.'}
              </p>
            )}
          </div>
        )}

        {/* MODE 2: SANS TIMESTAMP (Pure clean text without [00:00] markers) */}
        {timestampMode === 'without' && (
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="max-h-40 overflow-y-auto p-2 bg-slate-900/60 rounded-lg text-xs leading-relaxed text-slate-300 font-sans">
              {cleanDisplayContent || (
                <span className="text-slate-500">
                  {isAr ? 'لا يوجد نص حالياً.' : 'Aucun texte disponible.'}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-[11px] text-slate-500">
                {isAr ? 'نص نقي بدون علامات توقيت' : 'Texte propre sans horodatage'}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopyText(
                    cleanDisplayContent,
                    isAr ? 'تم نسخ النص الخالص!' : 'Texte pur copié !'
                  )
                }
                disabled={!cleanDisplayContent}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold border border-slate-700 transition cursor-pointer disabled:opacity-40"
              >
                <Copy className="w-3 h-3" />
                <span>{isAr ? 'نسخ النص الخالص' : 'Copier le texte pur'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
