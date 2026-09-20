import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Upload,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  FileAudio,
  Volume2,
  Zap,
  Tag,
} from 'lucide-react';
import { CustomVoice } from '../../types';
import { safeFetchJson } from '../../utils/apiHelper';

interface UnifiedVoiceCreatorProps {
  onVoiceCreated: (voice: CustomVoice) => void;
  uiLang: 'ar' | 'fr';
  onCancel?: () => void;
  defaultName?: string;
}

export const UnifiedVoiceCreator: React.FC<UnifiedVoiceCreatorProps> = ({
  onVoiceCreated,
  uiLang,
  onCancel,
  defaultName,
}) => {
  const isAr = uiLang === 'ar';

  // Form State
  const [voiceName, setVoiceName] = useState(defaultName || (isAr ? 'صوتي الجديد' : 'Ma nouvelle voix'));
  const [activeTab, setActiveTab] = useState<'record' | 'upload' | 'sample'>('record');
  const [consentConfirmed, setConsentConfirmed] = useState(true);

  // Audio State
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('audio/wav');
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(0);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  // Processing & Playback State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  const quickNames = isAr
    ? ['صوتي الشخصي', 'صوت الدارجة المغربية', 'راوي هادئ', 'نبرة حماسية']
    : ['Ma voix', 'Voix Darija', 'Narrateur calme', 'Voix dynamique'];

  // Start live microphone recording
  const startRecording = async () => {
    setMicError(null);
    setErrorMessage(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

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
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        const reader = new FileReader();

        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          setAudioBase64(base64);
          setMimeType(mime);
          setDurationSeconds(recordingSeconds || 8);
          setFileName(`enregistrement-${Date.now().toString().slice(-4)}.webm`);
          setFileSizeBytes(audioBlob.size);
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start(250);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setMicError(
        isAr
          ? 'تعذر تشغيل الميكروفون. يمكنك رفع ملف صوتي جاهز أو استخدام عينة اختبار سريعة.'
          : 'Impossible d’accéder au micro. Vous pouvez importer un fichier ou charger un extrait de test.'
      );
    }
  };

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

  // Handle uploaded file
  const handleFile = (file: File) => {
    setMicError(null);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;
      const base64 = result.split(',')[1];
      const audio = new Audio(result);

      audio.onloadedmetadata = () => {
        const dur = audio.duration && !isNaN(audio.duration) ? audio.duration : 10;
        setAudioBase64(base64);
        setMimeType(file.type || 'audio/wav');
        setDurationSeconds(Math.round(dur * 10) / 10);
        setFileName(file.name);
        setFileSizeBytes(file.size);
      };

      audio.onerror = () => {
        setAudioBase64(base64);
        setMimeType(file.type || 'audio/wav');
        setDurationSeconds(10);
        setFileName(file.name);
        setFileSizeBytes(file.size);
      };
    };
    reader.readAsDataURL(file);
  };

  // 1-Click Instant Sample Generator
  const handleLoadSample = async (sampleType: 'darija' | 'fusha') => {
    setIsLoadingSample(true);
    setErrorMessage(null);
    try {
      const sampleText =
        sampleType === 'darija'
          ? 'السلام عليكم، هادا تسجيل صوتي حقيقي بالدارجة المغربية، النطق واضح والنبرة طبيعية ومريحة.'
          : 'مرحباً بكم، هذا تسجيل صوتي حقيقي باللغة العربية الفصحى يهدف إلى استنساخ نبرة طبيعية ورصينة.';

      const data = await safeFetchJson<any>(
        '/api/tts/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: sampleText,
            language: sampleType,
            gender: sampleType === 'darija' ? 'female' : 'male',
            style: 'natural',
            geminiVoice: sampleType === 'darija' ? 'Kore' : 'Fenrir',
          }),
        },
        'Erreur lors du chargement de l’extrait'
      );

      if (!data?.audioBase64) {
        throw new Error(data?.error || 'Erreur lors du chargement de l’extrait');
      }

      setAudioBase64(data.audioBase64);
      setMimeType('audio/wav');
      setDurationSeconds(data.durationEstimateSeconds || 6);
      setFileName(`echantillon-${sampleType}.wav`);
      setFileSizeBytes(120000);
      if (!voiceName || voiceName === 'Ma nouvelle voix' || voiceName === 'صوتي الجديد') {
        setVoiceName(sampleType === 'darija' ? (isAr ? 'صوت الدارجة المغربية' : 'Voix Darija') : (isAr ? 'صوت الفصحى الرصين' : 'Voix Fusha'));
      }
    } catch (err: any) {
      console.error('Error fetching sample:', err);
      setErrorMessage(isAr ? 'فشل تحميل العينة، يرجى المحاولة لاحقاً.' : 'Échec du chargement de l’extrait.');
    } finally {
      setIsLoadingSample(false);
    }
  };

  // Playback reference audio
  const togglePlayAudio = () => {
    if (!audioBase64) return;
    if (isPlayingAudio && audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }

    if (!audioElementRef.current) {
      audioElementRef.current = new Audio();
      audioElementRef.current.onended = () => setIsPlayingAudio(false);
    }

    audioElementRef.current.src = `data:${mimeType};base64,${audioBase64}`;
    audioElementRef.current.play();
    setIsPlayingAudio(true);
  };

  const handleClear = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setAudioBase64(null);
    setFileName('');
    setDurationSeconds(0);
    setIsPlayingAudio(false);
  };

  // Main Submit: 1-Click creation
  const handleCreate = async () => {
    if (!audioBase64) {
      setErrorMessage(isAr ? 'يرجى تسجيل أو اختيار مقطع صوتي أولاً.' : 'Veuillez enregistrer ou sélectionner un audio d’abord.');
      return;
    }
    if (!consentConfirmed) {
      setErrorMessage(isAr ? 'يرجى تأكيد الموافقة للمتابعة.' : 'Veuillez cocher la case d’autorisation.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const data = await safeFetchJson<any>(
        '/api/custom-voice/create',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: voiceName.trim() || (isAr ? 'صوتي المخصص' : 'Ma voix personnalisée'),
            audioBase64,
            mimeType,
            consent: true,
            consentText: "J'autorise l'utilisation de cet enregistrement pour répliquer ma voix avec l'IA.",
            fileName: fileName || 'voice-sample.wav',
            durationSeconds: durationSeconds || 10,
          }),
        },
        'Erreur lors de la création de la voix.'
      );

      if (!data?.success) {
        throw new Error(data?.error || 'Erreur lors de la création de la voix.');
      }

      setSuccessMessage(isAr ? `✓ تم إنشاء وتفعيل الصوت « ${data.voice.name} » بنجاح!` : `✓ Voix « ${data.voice.name} » créée et activée avec succès !`);
      setTimeout(() => {
        onVoiceCreated(data.voice);
      }, 600);
    } catch (err: any) {
      console.error('Create voice error:', err);
      setErrorMessage(err?.message || (isAr ? 'تعذر إنشاء الصوت، يرجى المحاولة مجدداً.' : 'Impossible de créer la voix. Veuillez réessayer.'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-violet-800/50 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
      {/* Background soft glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-600/30">
            <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{isAr ? 'إنشاء صوت مخصص في خطوة واحدة' : 'Créer ma voix en 1 étape simple'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                {isAr ? 'سريع ومباشر' : 'Rapide & Direct'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr
                ? 'سجل صوتك أو اختر ملفاً، وسيقوم الذكاء الاصطناعي بتحليله وتفعيله فوراً لقراءة نصوصك.'
                : 'Enregistrez ou fournissez un extrait vocal : l’IA extrait votre profil acoustique et l’active immédiatement.'}
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            {isAr ? 'إلغاء' : 'Fermer'}
          </button>
        )}
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="mb-5 p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl flex items-center gap-2.5 text-emerald-300 text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-5 p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-2xl flex items-center gap-2.5 text-rose-300 text-xs sm:text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      <div className="space-y-5">
        {/* FIELD 1: Voice Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-violet-400" />
              <span>{isAr ? 'اسم الصوت' : 'Nom de votre voix'}</span>
            </span>
            <span className="text-[11px] text-slate-500">
              {isAr ? 'لتسهيل اختياره في قائمة الرواة' : 'Visible dans votre liste de narrateurs'}
            </span>
          </label>
          <input
            type="text"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder={isAr ? 'مثال: صوتي الشخصي، صوت الدارجة...' : 'Ex: Ma voix, Voix Darija, Podcast...'}
            className="w-full px-4 py-2.5 bg-slate-950/80 rounded-xl border border-slate-700/80 text-white text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
          />
          {/* Quick chips */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-[11px] text-slate-500 me-1">{isAr ? 'اقتراحات:' : 'Suggestions :'}</span>
            {quickNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setVoiceName(name)}
                className="text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* FIELD 2: Audio Source Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            {isAr ? 'العينة الصوتية (اختر الطريقة الأنسب لك):' : 'Échantillon vocal (choisissez le mode qui vous convient) :'}
          </label>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mb-3.5">
            <button
              type="button"
              onClick={() => setActiveTab('record')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'record'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{isAr ? 'تسجيل مباشر' : 'Micro en direct'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isAr ? 'رفع ملف' : 'Importer fichier'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sample')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'sample'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'عينة تجريبية' : 'Extrait test (1 clic)'}</span>
            </button>
          </div>

          {/* TAB 1: Live Record */}
          {activeTab === 'record' && (
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-center">
              {!isRecording ? (
                <div className="flex flex-col items-center justify-center py-2">
                  <button
                    type="button"
                    onClick={startRecording}
                    className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer mb-2"
                  >
                    <Mic className="w-7 h-7" />
                  </button>
                  <p className="text-xs font-semibold text-slate-200">
                    {isAr ? 'اضغط لبدء التسجيل بميكروفونك' : 'Cliquez pour enregistrer votre voix'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                    {isAr
                      ? 'تحدث بنبرتك الطبيعية لمدة 5 إلى 15 ثانية (مثلاً: « السلام عليكم، هذا صوتي المخصص... »)'
                      : 'Parlez naturellement pendant 5 à 15 secondes (ex: « Bonjour, voici ma voix pour la synthèse... »)'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="relative mb-3">
                    <div className="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center animate-pulse shadow-lg shadow-rose-600/40">
                      <Mic className="w-7 h-7" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
                    </span>
                  </div>
                  <div className="font-mono text-xl font-bold text-white mb-2">
                    00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-600 transition cursor-pointer"
                  >
                    {isAr ? '⏹️ إيقاف واعتماد التسجيل' : '⏹️ Arrêter et utiliser cet enregistrement'}
                  </button>
                </div>
              )}
              {micError && <p className="text-xs text-rose-400 mt-2">{micError}</p>}
            </div>
          )}

          {/* TAB 2: Upload File */}
          {activeTab === 'upload' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className="p-6 bg-slate-950/60 rounded-2xl border-2 border-dashed border-slate-700 hover:border-violet-500 text-center cursor-pointer transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <FileAudio className="w-8 h-8 text-violet-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-200">
                {isAr ? 'اسحب ملفك الصوتي إلى هنا أو اضغط للاختيار' : 'Glissez-déposez votre fichier audio ou cliquez'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {isAr ? 'صيغ مدعومة: WAV, MP3, M4A, WebM (حتى 25 ميغابايت)' : 'Formats acceptés : WAV, MP3, M4A, WebM (jusqu’à 25 Mo)'}
              </p>
            </div>
          )}

          {/* TAB 3: Ready Sample (Zero friction test) */}
          {activeTab === 'sample' && (
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
              <p className="text-xs text-slate-300 mb-3">
                {isAr
                  ? 'لا تملك تسجيلاً جاهزاً؟ اختر عينة لتجربة ميزة الاستنساخ فوراً بدون ميكروفون:'
                  : 'Pas de micro ou de fichier sous la main ? Chargez un extrait authentique en 1 clic pour tester :'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleLoadSample('darija')}
                  disabled={isLoadingSample}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition cursor-pointer disabled:opacity-50 text-start"
                >
                  <span className="text-lg">🇲🇦</span>
                  <div>
                    <div className="font-bold">{isAr ? 'عينة دارجة مغربية (10 ث)' : 'Extrait Darija marocaine (10s)'}</div>
                    <div className="text-[10px] text-slate-400">{isAr ? 'نطق محلي مغربي طبيعي' : 'Échantillon Darija prêt à l’emploi'}</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleLoadSample('fusha')}
                  disabled={isLoadingSample}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition cursor-pointer disabled:opacity-50 text-start"
                >
                  <span className="text-lg">📜</span>
                  <div>
                    <div className="font-bold">{isAr ? 'عينة عربية فصحى (10 ث)' : 'Extrait Arabe classique (10s)'}</div>
                    <div className="text-[10px] text-slate-400">{isAr ? 'نبرة رصينة ومخارج حروف واضحة' : 'Échantillon Fusha prêt à l’emploi'}</div>
                  </div>
                </button>
              </div>
              {isLoadingSample && (
                <div className="flex items-center justify-center gap-2 text-xs text-violet-400 mt-3 font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? 'جاري تجهيز العينة الصوتية...' : 'Préparation de l’extrait audio...'}</span>
                </div>
              )}
            </div>
          )}

          {/* Audio Selected Summary Bar */}
          {audioBase64 && (
            <div className="mt-3 p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="truncate text-xs">
                  <span className="font-bold text-white block truncate">{fileName || 'Audio prêt'}</span>
                  <span className="text-emerald-300/80 text-[11px]">
                    {durationSeconds}s • {isAr ? 'جاهز للاستنساخ' : 'Prêt pour l’analyse'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 transition cursor-pointer"
                >
                  {isPlayingAudio ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlayingAudio ? (isAr ? 'إيقاف' : 'Pause') : (isAr ? 'استماع' : 'Écouter')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title={isAr ? 'حذف وتغيير' : 'Changer'}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FIELD 3: Consent Checkbox */}
        <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300 leading-relaxed">
            <input
              type="checkbox"
              checked={consentConfirmed}
              onChange={(e) => setConsentConfirmed(e.target.checked)}
              className="mt-0.5 rounded text-violet-600 focus:ring-violet-500 bg-slate-900 border-slate-700 cursor-pointer w-4 h-4"
            />
            <span>
              {isAr
                ? 'أؤكد أن لدي الصلاحية لاستخدام هذا التسجيل الصوتي لإنشاء نموذج صوت اصطناعي بالذكاء الاصطناعي.'
                : "J'autorise l'utilisation de cet enregistrement pour répliquer ma voix avec l'IA Google."}
            </span>
          </label>
        </div>

        {/* PRIMARY ACTION BUTTON */}
        <button
          type="button"
          onClick={handleCreate}
          disabled={isProcessing || !audioBase64 || !consentConfirmed}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-violet-600/30 transition-all active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isAr ? 'جاري تحليل النبرة وإنشاء الصوت بالذكاء الاصطناعي...' : 'Création de votre voix personnalisée…'}</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
              <span>{isAr ? '⚡ إنشاء واستخدام الصوت فوراً' : '⚡ Créer ma voix personnalisée'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
