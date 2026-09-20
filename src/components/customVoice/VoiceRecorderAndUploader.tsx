import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileAudio,
  Sparkles,
  Info,
} from 'lucide-react';

interface VoiceRecorderAndUploaderProps {
  audioBase64: string | null;
  mimeType: string;
  durationSeconds: number;
  fileName: string;
  fileSizeBytes: number;
  onAudioReady: (data: {
    audioBase64: string;
    mimeType: string;
    durationSeconds: number;
    fileName: string;
    fileSizeBytes: number;
  }) => void;
  onClearAudio: () => void;
  uiLang: 'ar' | 'fr';
}

export const VoiceRecorderAndUploader: React.FC<VoiceRecorderAndUploaderProps> = ({
  audioBase64,
  mimeType,
  durationSeconds,
  fileName,
  fileSizeBytes,
  onAudioReady,
  onClearAudio,
  uiLang,
}) => {
  const isAr = uiLang === 'ar';
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format file size
  const formatSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Format seconds mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Handle file selection (input or drop)
  const processFile = (file: File) => {
    setMicError(null);
    const validExtensions = ['wav', 'mp3', 'm4a', 'webm', 'ogg', 'aac', 'flac'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!file.type.startsWith('audio/') && !validExtensions.includes(ext)) {
      setMicError(
        isAr
          ? 'صيغة الملف غير مدعومة. يرجى اختيار ملف صوتي بتنسيق WAV أو MP3 أو M4A.'
          : 'Format de fichier non pris en charge. Veuillez fournir un fichier WAV, MP3 ou M4A.'
      );
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setMicError(
        isAr
          ? 'حجم الملف كبير جداً (أقصى حد هو 25 ميغابايت).'
          : 'Le fichier dépasse la taille maximale recommandée de 25 Mo.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      const base64Data = result.split(',')[1];
      const audio = new Audio(result);

      audio.onloadedmetadata = () => {
        const dur = audio.duration && !isNaN(audio.duration) ? audio.duration : 10;
        onAudioReady({
          audioBase64: base64Data,
          mimeType: file.type || 'audio/wav',
          durationSeconds: Math.round(dur * 10) / 10,
          fileName: file.name,
          fileSizeBytes: file.size,
        });
      };

      audio.onerror = () => {
        // Still allow file even if browser audio tag couldn't decode duration
        onAudioReady({
          audioBase64: base64Data,
          mimeType: file.type || 'audio/wav',
          durationSeconds: 10,
          fileName: file.name,
          fileSizeBytes: file.size,
        });
      };
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Start live microphone recording
  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    setRecordingTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // Try preferred types
      let mime = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mime = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mime = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        const reader = new FileReader();

        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          onAudioReady({
            audioBase64: base64Data,
            mimeType: mime,
            durationSeconds: recordingTime || 10,
            fileName: `enregistrement-vocal-${new Date().toISOString().slice(0, 10)}.webm`,
            fileSizeBytes: audioBlob.size,
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start(250);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setMicError(
        isAr
          ? 'تعذر الوصول إلى الميكروفون. يرجى السماح بالوصول في متصفحك أو رفع ملف صوتي جاهز.'
          : 'Impossible d\'accéder au microphone. Veuillez autoriser l\'accès dans le navigateur ou téléverser un fichier audio.'
      );
    }
  };

  // Stop live recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  // Toggle preview playback
  const togglePreviewPlay = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current
        .play()
        .then(() => setIsPlayingPreview(true))
        .catch((err) => console.error('Preview play error:', err));
    }
  };

  const isDurationOptimal = durationSeconds >= 5 && durationSeconds <= 60;

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-violet-600/30 text-violet-400 font-mono text-xs border border-violet-500/30">
            1
          </span>
          <span>
            {isAr ? 'الخطوة 1: تقديم العينة الصوتية' : 'Étape 1 : Fournir un échantillon vocal'}
          </span>
        </h3>
        <span className="text-xs text-violet-400 font-medium bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-500/20">
          {isAr ? 'موصى به: 10 إلى 30 ثانية' : 'Recommandé : 10 à 30 secondes'}
        </span>
      </div>

      <p className="text-xs text-slate-400 mb-4 leading-relaxed">
        {isAr
          ? 'قدم تسجيلاً صوتياً واضحاً بصوتك أو صوت المتحدث، في بيئة هادئة وبدون موسيقى خلفية، لتقوم خوارزميات الذكاء الاصطناعي بتحليل واستنساخ البصمة الصوتية بدقة.'
          : 'Téléversez ou enregistrez une voix claire, parlant naturellement sans musique de fond ni bruits parasites, pour permettre l\'analyse acoustique complète.'}
      </p>

      {/* Mode Selector Tabs (Upload vs Record) */}
      {!audioBase64 && (
        <div className="flex items-center gap-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/80 mb-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('upload');
              setMicError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{isAr ? 'رفع ملف صوتي (WAV, MP3, M4A)' : 'Téléverser un fichier audio'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('record');
              setMicError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'record'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>{isAr ? 'تسجيل مباشر بالميكروفون' : 'Enregistrer au micro'}</span>
          </button>
        </div>
      )}

      {/* Error display */}
      {micError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p>{micError}</p>
        </div>
      )}

      {/* UPLOAD MODE */}
      {!audioBase64 && activeTab === 'upload' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer flex flex-col items-center justify-center ${
            isDragging
              ? 'border-violet-400 bg-violet-900/20'
              : 'border-slate-700 hover:border-violet-500/60 bg-slate-950/40 hover:bg-slate-950/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg,.flac"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div className="w-14 h-14 rounded-2xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center mb-3 group-hover:scale-105 transition">
            <FileAudio className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold text-slate-200 mb-1">
            {isAr
              ? 'اسحب وأفلت الملف الصوتي هنا، أو اضغط للاختيار'
              : 'Glissez-déposez votre fichier audio ici, ou cliquez pour parcourir'}
          </p>
          <p className="text-xs text-slate-400 mb-3">
            {isAr
              ? 'الصيغ المدعومة: WAV, MP3, M4A, WEBM (الحد الأقصى 25 ميغابايت)'
              : 'Formats acceptés : WAV, MP3, M4A, WEBM, OGG (Max 25 Mo)'}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
            <Info className="w-3 h-3 text-violet-400" />
            <span>{isAr ? 'مدة مثالية: 10 إلى 30 ثانية من الكلام المتواصل' : 'Idéal : 10 à 30 secondes de parole fluide'}</span>
          </div>
        </div>
      )}

      {/* RECORD MODE */}
      {!audioBase64 && activeTab === 'record' && (
        <div className="border border-slate-700/80 bg-slate-950/60 rounded-2xl p-6 text-center flex flex-col items-center">
          {isRecording ? (
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center animate-ping absolute inset-0" />
                <div className="w-20 h-20 rounded-full bg-rose-600 text-white flex items-center justify-center relative shadow-lg shadow-rose-600/40">
                  <Mic className="w-8 h-8 animate-pulse" />
                </div>
              </div>
              <div className="text-2xl font-mono font-bold text-white mb-1">
                {formatTime(recordingTime)}
              </div>
              <p className="text-xs text-rose-300 mb-4 animate-pulse">
                {isAr ? 'جاري التسجيل... تكلم بصوت طبيعي وواضح' : 'Enregistrement en cours... Parlez calmement'}
              </p>
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>{isAr ? 'إيقاف التسجيل واعتماد العينة' : 'Arrêter et valider'}</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center mb-3">
                <Mic className="w-8 h-8 text-violet-400" />
              </div>
              <p className="text-sm font-semibold text-slate-200 mb-1">
                {isAr ? 'تسجيل مباشر عبر ميكروفون الجهاز' : 'Enregistrement direct au microphone'}
              </p>
              <p className="text-xs text-slate-400 mb-4 max-w-md">
                {isAr
                  ? 'انقر على الزر وتحدث لمدة 10 إلى 20 ثانية بأي نص بالدارجة المغربية أو العربية الفصحى بصوتك المعتاد.'
                  : 'Cliquez sur démarrer et lisez une courte phrase en Darija ou Arabe pendant 10 à 20 secondes.'}
              </p>
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>{isAr ? 'بدء التسجيل الآن' : 'Démarrer l\'enregistrement'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* AUDIO LOADED STATE */}
      {audioBase64 && (
        <div className="border border-violet-500/40 bg-violet-950/20 rounded-2xl p-5">
          <audio
            ref={previewAudioRef}
            src={`data:${mimeType};base64,${audioBase64}`}
            onEnded={() => setIsPlayingPreview(false)}
            className="hidden"
          />

          <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-white truncate max-w-xs">{fileName}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {isAr ? 'عينة جاهزة' : 'Échantillon prêt'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatSize(fileSizeBytes)} • {durationSeconds.toFixed(1)}s • {mimeType}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (previewAudioRef.current) previewAudioRef.current.pause();
                setIsPlayingPreview(false);
                onClearAudio();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition cursor-pointer"
              title={isAr ? 'تغيير العينة' : 'Changer l\'échantillon'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isAr ? 'استبدال' : 'Remplacer'}</span>
            </button>
          </div>

          {/* Mini Playback preview */}
          <div className="flex items-center gap-3 bg-slate-900/90 rounded-xl p-3 border border-slate-800">
            <button
              type="button"
              onClick={togglePreviewPlay}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer ${
                isPlayingPreview
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              }`}
            >
              {isPlayingPreview ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ms-0.5" />
              )}
            </button>
            <div className="flex-1">
              <div className="text-xs font-semibold text-slate-200">
                {isAr ? 'الاستماع إلى التسجيل الأصلي' : 'Écouter l\'enregistrement original'}
              </div>
              <div className="text-[11px] text-slate-400">
                {isPlayingPreview
                  ? isAr
                    ? 'جاري التشغيل...'
                    : 'Lecture en cours...'
                  : isAr
                  ? 'اضغط لتتأكد من وضوح الصوت وخلوه من الضوضاء'
                  : 'Vérifiez la clarté de la voix avant de procéder'}
              </div>
            </div>
            <div className="text-xs font-mono text-slate-400">
              {formatTime(durationSeconds)}
            </div>
          </div>

          {/* Duration Quality indicator */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            {isDurationOptimal ? (
              <span className="text-emerald-400 flex items-center gap-1.5 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isAr
                  ? 'المدة ممتازة لتحليل البصمة الصوتية (5-60 ثانية).'
                  : 'Durée optimale pour l\'analyse acoustique multimodale (5 à 60s).'}
              </span>
            ) : durationSeconds < 5 ? (
              <span className="text-amber-400 flex items-center gap-1.5 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                {isAr
                  ? 'تنبيه: التسجيل قصير (أقل من 5 ثوانٍ). يُفضل عينة من 10 ثوانٍ لدقة أعلى.'
                  : 'Attention : enregistrement court (< 5s). Un échantillon d\'au moins 10s offre une fidélité accrue.'}
              </span>
            ) : (
              <span className="text-slate-400 text-[11px]">
                {isAr ? 'مدة التسجيل مقبولة.' : 'Échantillon vocal valide.'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
