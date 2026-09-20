import React, { useState, useEffect } from 'react';
import {
  ArabicLanguage,
  NarratorGender,
  NarrationStyleId,
  VoiceProfile,
  VoiceParameters,
  TTSResponseData,
  GenerationHistoryItem,
  SampleTextItem,
  CustomVoice,
} from './types';
import { VOICE_PROFILES } from './data/voices';
import { Header } from './components/Header';
import { LanguageSelector } from './components/LanguageSelector';
import { NarratorSelector } from './components/NarratorSelector';
import { StyleSelector } from './components/StyleSelector';
import { CustomStylePromptInput } from './components/CustomStylePromptInput';
import { VoiceParametersPanel } from './components/VoiceParametersPanel';
import { TextInputArea } from './components/TextInputArea';
import { AudioPlayer } from './components/AudioPlayer';
import { SampleScriptsModal } from './components/SampleScriptsModal';
import { HistoryList } from './components/HistoryList';
import { CustomVoiceTab } from './components/customVoice/CustomVoiceTab';
import { UnifiedVoiceCreator } from './components/customVoice/UnifiedVoiceCreator';
import {
  getStoredCustomVoices,
  saveCustomVoice as persistCustomVoice,
  deleteCustomVoice as removeCustomVoice,
  syncCustomVoicesWithServer,
  customVoiceToVoiceProfile,
} from './utils/customVoiceStorage';
import { Sparkles, Play, Loader2, AlertCircle, Volume2, Mic, Info, Sliders, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';
import { safeFetchJson, ApiResponseError } from './utils/apiHelper';

const STORAGE_KEY_HISTORY = 'sawt_arabi_history_v1';

export default function App() {
  const [activeMainTab, setActiveMainTab] = useState<'tts' | 'custom-voice'>('tts');
  const [uiLang, setUiLang] = useState<'ar' | 'fr'>('ar');
  const [language, setLanguage] = useState<ArabicLanguage>('darija');
  const [gender, setGender] = useState<NarratorGender>('female');
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile>(
    VOICE_PROFILES.find((v) => v.id === 'female-young-kenza') || VOICE_PROFILES[0]
  );
  const [selectedStyle, setSelectedStyle] = useState<NarrationStyleId>('social_media');
  const [customStylePrompt, setCustomStylePrompt] = useState<string>('');
  const [parameters, setParameters] = useState<VoiceParameters>({
    speed: 1.0,
    pitch: 0,
    expressiveness: 80,
    intonation: 85,
    volume: 100,
  });

  // Custom Voices state
  const [customVoices, setCustomVoices] = useState<CustomVoice[]>([]);
  const [activeCustomVoice, setActiveCustomVoice] = useState<CustomVoice | null>(null);
  const [customVoiceApplyModification, setCustomVoiceApplyModification] = useState<boolean>(false);
  const [isQuickVoiceModalOpen, setIsQuickVoiceModalOpen] = useState<boolean>(false);

  const [text, setText] = useState<string>(
    'واش عمرك تساءلتي فين كيمشي الأكسجين ملي كتاخدي النفس؟ راه الجسم ديالنا بحال شي ماكينة عجيبة!'
  );

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isVocalizing, setIsVocalizing] = useState<boolean>(false);
  const [audioData, setAudioData] = useState<TTSResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quotaCountdown, setQuotaCountdown] = useState<number | null>(null);
  const [isDailyQuota, setIsDailyQuota] = useState<boolean>(false);
  const [quotaSuccessMsg, setQuotaSuccessMsg] = useState<string | null>(null);
  const [isSamplesModalOpen, setIsSamplesModalOpen] = useState<boolean>(false);
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);

  // Live countdown timer for rate limits / quota resets
  useEffect(() => {
    if (quotaCountdown === null || quotaCountdown <= 0) return;
    const timer = setInterval(() => {
      setQuotaCountdown((prev) => {
        if (prev === null || prev <= 1) {
          // The countdown has reached 0: automatically cease the warning and show success confirmation
          setError(null);
          setQuotaSuccessMsg(
            uiLang === 'ar'
              ? '✓ انتهى وقت الانتظار! تم تجديد الحصة ويمكنك الآن التوليد.'
              : '✓ Délai d’attente terminé ! Le quota est réinitialisé, vous pouvez générer.'
          );
          setTimeout(() => {
            setQuotaSuccessMsg(null);
          }, 6000);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [quotaCountdown, uiLang]);

  // Load history & custom voices from localStorage & sync with server
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load history from localStorage', e);
    }

    const loadedVoices = getStoredCustomVoices();
    setCustomVoices(loadedVoices);

    // Sync with server persistent storage
    syncCustomVoicesWithServer()
      .then((mergedVoices) => {
        if (mergedVoices && mergedVoices.length > 0) {
          setCustomVoices(mergedVoices);
        }
      })
      .catch((err) => console.warn('Server voice sync note:', err));
  }, []);

  // Save history to localStorage (quota-safe: keeps audio for latest 3 items only)
  const saveHistory = (newItem: GenerationHistoryItem) => {
    const updated = [newItem, ...history.slice(0, 19)];
    setHistory(updated);
    try {
      const quotaSafe = updated.map((item, idx) => ({
        ...item,
        audioBase64: idx < 3 ? item.audioBase64 : '',
      }));
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(quotaSafe));
    } catch (e) {
      console.warn('Failed to save history audio to localStorage, keeping metadata only', e);
      try {
        const metadataOnly = updated.map((item) => ({ ...item, audioBase64: '' }));
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(metadataOnly));
      } catch {
        // ignore
      }
    }
  };

  const handleSaveCustomVoice = (voice: CustomVoice) => {
    const updated = persistCustomVoice(voice);
    setCustomVoices(updated);
    setActiveCustomVoice(voice);
  };

  const handleDeleteCustomVoice = (id: string) => {
    const updated = removeCustomVoice(id);
    setCustomVoices(updated);
    if (activeCustomVoice?.id === id) {
      setActiveCustomVoice(null);
    }
  };

  const handleSelectCustomVoice = (voice: CustomVoice) => {
    setActiveCustomVoice(voice);
  };

  const handleSelectOfficialVoice = (voice: VoiceProfile) => {
    setSelectedVoice(voice);
    setActiveCustomVoice(null);
  };

  const handleLanguageChange = (newLang: ArabicLanguage) => {
    setLanguage(newLang);
    if (newLang === 'fusha') {
      setSelectedStyle('professional');
      if (text.includes('واش عمرك') || text.includes('كتاخدي')) {
        setText(
          'تُعتبر اللغة العربية واحدة من أعرق اللغات وأكثرها ثراءً في تاريخ البشرية، حيث تتميز بدقة التعبير وعمق المعاني.'
        );
      }
    } else {
      setSelectedStyle('social_media');
      if (text.includes('تُعتبر اللغة')) {
        setText(
          'واش عمرك تساءلتي فين كيمشي الأكسجين ملي كتاخدي النفس؟ راه الجسم ديالنا بحال شي ماكينة عجيبة!'
        );
      }
    }
  };

  const handleSelectSample = (sample: SampleTextItem) => {
    setText(sample.text);
    setSelectedStyle(sample.recommendedStyle);
    setGender(sample.recommendedGender);
    const matchingVoice = VOICE_PROFILES.find((v) => v.gender === sample.recommendedGender);
    if (matchingVoice) {
      setSelectedVoice(matchingVoice);
      setActiveCustomVoice(null);
    }
  };

  const handleVocalizeTashkeel = async () => {
    if (!text.trim() || isVocalizing) return;
    setIsVocalizing(true);
    setError(null);
    try {
      const data = await safeFetchJson<{ vocalizedText?: string; error?: string }>(
        '/api/tts/tashkeel',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language }),
        },
        uiLang === 'ar' ? 'تعذر إضافة التشكيل، يرجى المحاولة لاحقاً.' : 'Échec de l’ajout du tashkeel.'
      );
      if (data.vocalizedText) {
        setText(data.vocalizedText);
      }
    } catch (err: any) {
      setError(err?.message || (uiLang === 'ar' ? 'تعذر إضافة التشكيل، يرجى المحاولة لاحقاً.' : 'Erreur lors du tashkeel.'));
    } finally {
      setIsVocalizing(false);
    }
  };

  const handleGenerateTTS = async () => {
    if (!text.trim()) {
      setError(uiLang === 'ar' ? 'الرجاء إدخال نص باللغة العربية أولاً.' : 'Veuillez saisir un texte en arabe.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const data = await safeFetchJson<TTSResponseData>(
        '/api/tts/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text.trim(),
            language,
            voiceId: activeCustomVoice ? activeCustomVoice.id : selectedVoice.id,
            gender: activeCustomVoice ? activeCustomVoice.acousticProfile.gender : selectedVoice.gender,
            ageCategory: selectedVoice.ageCategory,
            style: selectedStyle,
            geminiVoice: selectedVoice.geminiVoice,
            parameters,
            customStylePrompt,
            customVoice: activeCustomVoice,
            customVoiceApplyModification,
          }),
        },
        uiLang === 'ar' ? 'فشل في توليد الصوت. يرجى التحقق من إعدادات المفتاح.' : 'Échec de la génération audio.'
      );

      setIsDailyQuota(false);
      setError(null);
      setQuotaCountdown(null);
      setAudioData(data);

      // Add to history
      const voiceNameAr = activeCustomVoice
        ? `${activeCustomVoice.name} ${customVoiceApplyModification ? '(مع تعديل الأسلوب)' : '(بدون تعديل - نبرة أصلية)'}`
        : selectedVoice.nameAr;
      const voiceNameFr = activeCustomVoice
        ? `${activeCustomVoice.name} ${customVoiceApplyModification ? '(Avec modif)' : '(Sans modif)'}`
        : selectedVoice.nameFr;

      const historyItem: GenerationHistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        text: text.trim(),
        language,
        voiceNameAr,
        voiceNameFr,
        gender: activeCustomVoice ? activeCustomVoice.acousticProfile.gender : selectedVoice.gender,
        style: selectedStyle,
        audioBase64: data.audioBase64,
        durationSeconds: data.durationEstimateSeconds || 2.5,
        timestampCues: data.timestampCues,
        cleanText: data.cleanText,
      };
      saveHistory(historyItem);
    } catch (err: any) {
      console.error('TTS Generation error:', err);
      const apiErr = err as ApiResponseError;
      if (apiErr.isDailyQuota) {
        setIsDailyQuota(true);
        setQuotaCountdown(null);
      } else if (apiErr.retryAfterSeconds) {
        setIsDailyQuota(false);
        setQuotaCountdown(apiErr.retryAfterSeconds);
      } else {
        setIsDailyQuota(false);
      }
      setError(err?.message || (uiLang === 'ar' ? 'حدث خطأ أثناء الاتصال بمحرك الصوت.' : 'Erreur lors de la génération audio.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const isAr = uiLang === 'ar';

  const currentDisplayVoice = activeCustomVoice
    ? customVoiceToVoiceProfile(activeCustomVoice)
    : selectedVoice;

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-slate-950"
    >
      {/* Header */}
      <Header
        uiLang={uiLang}
        onToggleUiLang={() => setUiLang(isAr ? 'fr' : 'ar')}
      />

      {/* Main Navigation Tabs */}
      <div className="bg-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              id="tab-btn-tts"
              type="button"
              onClick={() => setActiveMainTab('tts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeMainTab === 'tts'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>{isAr ? '🗣️ توليد الصوت (TTS)' : '🗣️ Synthèse vocale (TTS)'}</span>
            </button>

            <button
              id="tab-btn-custom-voice"
              type="button"
              onClick={() => setActiveMainTab('custom-voice')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeMainTab === 'custom-voice'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>{isAr ? '🎙️ الصوت المخصص / الاستنساخ' : '🎙️ Voix personnalisée'}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeMainTab === 'custom-voice'
                    ? 'bg-white text-violet-900 font-bold'
                    : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                }`}
              >
                {customVoices.length}
              </span>
            </button>
          </div>

          {activeCustomVoice && (
            <div className="hidden sm:flex items-center gap-2 text-xs bg-violet-900/30 text-violet-300 px-3 py-1 rounded-full border border-violet-800/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {isAr
                  ? `الصوت المفعّل: « ${activeCustomVoice.name} »`
                  : `Voix active : « ${activeCustomVoice.name} »`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Error Alert if any */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 flex items-start gap-3 text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{isAr ? 'تنبيه' : 'Erreur'}</p>
              <p className="text-xs text-rose-300 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs text-rose-400 hover:text-rose-200 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: STANDARD TTS STUDIO */}
        {activeMainTab === 'tts' && (
          <div>
            {/* Intro Banner */}
            <div className="mb-6 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 p-5 rounded-2xl border border-emerald-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <span>
                    {isAr
                      ? 'منصة توليد الأصوات العربية الطبيعية بالذكاء الاصطناعي'
                      : 'Générateur de voix arabe & darija marocain par IA'}
                  </span>
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {isAr
                    ? 'توليد صوتي حصري فائق النقاء للغة العربية الفصحى والدارجة المغربية الأصلية بنبرات متعددة: رجال، نساء وأطفال مع تحكم دقيق في الأسلوب والسرعة.'
                    : 'Synthèse vocale spécialisée exclusivement en Arabe classique et Darija marocaine avec voix d\'hommes, de femmes et d\'enfants.'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  🇲🇦 الدارجة المغربية
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  📜 الفصحى
                </span>
              </div>
            </div>

            {/* Active custom voice banner if selected */}
            {activeCustomVoice && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-violet-950/60 to-slate-900/90 border border-violet-500/50 shadow-lg space-y-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
                      🎙️
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{isAr ? 'الصوت المخصص قيد الاستخدام:' : 'Voix personnalisée active :'}</span>
                        <span className="text-violet-300 font-bold bg-violet-900/50 px-2.5 py-0.5 rounded-lg border border-violet-700/60">
                          {activeCustomVoice.name}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {activeCustomVoice.acousticProfile?.timbreDescription || 'Modèle de réplication vocale actif'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveCustomVoice(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
                  >
                    {isAr ? 'العودة للأصوات الرسمية' : 'Revenir aux voix officielles'}
                  </button>
                </div>

                {/* Direct Choice: Sans modification vs Avec modification */}
                <div className="pt-2.5 border-t border-violet-800/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-violet-200 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-violet-400" />
                      <span>{isAr ? 'اختر طريقة تحويل النص بصوتك:' : 'Mode d\'application de la voix pour la conversion :'}</span>
                    </span>
                    <span className="text-[11px] font-medium text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
                      {customVoiceApplyModification
                        ? (isAr ? 'وضع: مع تعديل الأسلوب والسرعة' : 'Mode : Avec modifications')
                        : (isAr ? 'وضع: بدون تعديل (النبرة الأصلية)' : 'Mode : Sans modification')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Option 1: Sans modification */}
                    <button
                      type="button"
                      onClick={() => setCustomVoiceApplyModification(false)}
                      className={`p-3 rounded-xl border text-start transition cursor-pointer flex items-start gap-2.5 ${
                        !customVoiceApplyModification
                          ? 'bg-violet-600/30 border-violet-400 text-white shadow-md ring-1 ring-violet-400/50'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <ShieldCheck className={`w-5 h-5 mt-0.5 shrink-0 ${!customVoiceApplyModification ? 'text-violet-300' : 'text-slate-500'}`} />
                      <div>
                        <div className="font-bold text-xs flex items-center gap-2">
                          <span>{isAr ? 'بدون تعديل (النبرة الأصلية)' : 'Sans modification (Voix pure)'}</span>
                          {!customVoiceApplyModification && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                              {isAr ? '✓ مفعّل' : '✓ Actif'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                          {isAr
                            ? 'نطق مطابق تماماً لصوتك ونبرتك الطبيعية المسجلة دون أي تكلّف أو تغيير في الأسلوب أو السرعة.'
                            : 'Lecture 100% fidèle au timbre, débit et intonation naturelle de votre enregistrement d\'origine.'}
                        </p>
                      </div>
                    </button>

                    {/* Option 2: Avec modification */}
                    <button
                      type="button"
                      onClick={() => setCustomVoiceApplyModification(true)}
                      className={`p-3 rounded-xl border text-start transition cursor-pointer flex items-start gap-2.5 ${
                        customVoiceApplyModification
                          ? 'bg-violet-600/30 border-violet-400 text-white shadow-md ring-1 ring-violet-400/50'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <Sliders className={`w-5 h-5 mt-0.5 shrink-0 ${customVoiceApplyModification ? 'text-violet-300' : 'text-slate-500'}`} />
                      <div>
                        <div className="font-bold text-xs flex items-center gap-2">
                          <span>{isAr ? 'مع تعديل وتخصيص الأسلوب' : 'Avec modification (Styles)'}</span>
                          {customVoiceApplyModification && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                              {isAr ? '✓ مفعّل' : '✓ Actif'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                          {isAr
                            ? 'دمج بصمة صوتك مع أنماط الأداء (وثائقي، حماسي...)، تعديل السرعة، وإضافة توجيهات أسلوبية.'
                            : 'Applique les styles de narration (documentaire, énergique...), ajuste la vitesse et les consignes.'}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Workspace Layout: Left/Main Workspace & Right Audio Studio */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Main Controls Column (7 cols on lg) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Step 1: Language Variant */}
                <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700/80 shadow-md">
                  <LanguageSelector
                    selectedLanguage={language}
                    onSelectLanguage={handleLanguageChange}
                    uiLang={uiLang}
                  />
                </div>

                {/* Step 2: Narrator Category & Voices */}
                <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700/80 shadow-md">
                  <NarratorSelector
                    selectedGender={gender}
                    onSelectGender={setGender}
                    selectedVoice={selectedVoice}
                    onSelectVoice={handleSelectOfficialVoice}
                    voices={VOICE_PROFILES}
                    uiLang={uiLang}
                    customVoices={customVoices}
                    activeCustomVoice={activeCustomVoice}
                    onSelectCustomVoice={handleSelectCustomVoice}
                    onOpenCustomVoiceTab={() => setActiveMainTab('custom-voice')}
                    onQuickCreateVoice={() => setIsQuickVoiceModalOpen(true)}
                    customVoiceApplyModification={customVoiceApplyModification}
                    onChangeCustomVoiceModification={setCustomVoiceApplyModification}
                  />
                </div>

                {/* Step 3: Narration Style */}
                <div className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700/80 shadow-md space-y-3">
                  {activeCustomVoice && !customVoiceApplyModification && (
                    <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-800/50 text-xs text-violet-300 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" />
                        <span>
                          {isAr
                            ? 'وضع «بدون تعديل» مفعّل: الصوت يقرأ بنبرته الطبيعية المباشرة دون تطبيق نمط تمثيلي.'
                            : 'Mode « Sans modification » actif : la voix lit dans son ton naturel d\'origine.'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomVoiceApplyModification(true)}
                        className="text-violet-400 hover:text-white underline font-bold cursor-pointer shrink-0"
                      >
                        {isAr ? 'تفعيل تعديل الأسلوب' : 'Activer les styles'}
                      </button>
                    </div>
                  )}
                  <StyleSelector
                    selectedStyle={selectedStyle}
                    onSelectStyle={setSelectedStyle}
                    uiLang={uiLang}
                  />
                </div>

                {/* Step 3.5: Custom Style & Intonation Prompt */}
                <div className={activeCustomVoice && !customVoiceApplyModification ? 'opacity-60' : ''}>
                  <CustomStylePromptInput
                    customStylePrompt={customStylePrompt}
                    onChangeCustomStylePrompt={setCustomStylePrompt}
                    language={language}
                    uiLang={uiLang}
                  />
                </div>

                {/* Step 4: Arabic Script Textarea */}
                <div>
                  <TextInputArea
                    text={text}
                    onChangeText={setText}
                    language={language}
                    onOpenSamples={() => setIsSamplesModalOpen(true)}
                    uiLang={uiLang}
                    onVocalizeText={handleVocalizeTashkeel}
                    isVocalizing={isVocalizing}
                  />
                </div>

                {/* Step 5: Precision Voice Parameters */}
                <div className="space-y-3">
                  {activeCustomVoice && !customVoiceApplyModification && (
                    <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-800/50 text-xs text-violet-300 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" />
                        <span>
                          {isAr
                            ? 'يتم اعتماد سرعة ونبرة الصوت الأصلية المسجلة. لتعديل السرعة والنبرة، فعّل وضع «مع تعديل».'
                            : 'La vitesse et le pitch originaux sont préservés. Activez « Avec modification » pour les ajuster.'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomVoiceApplyModification(true)}
                        className="text-violet-400 hover:text-white underline font-bold cursor-pointer shrink-0"
                      >
                        {isAr ? 'تفعيل التعديل' : 'Activer'}
                      </button>
                    </div>
                  )}
                  <VoiceParametersPanel
                    parameters={parameters}
                    onChangeParameters={setParameters}
                    uiLang={uiLang}
                  />
                </div>

                {/* Quota Success Notification when wait finishes */}
                {quotaSuccessMsg && (
                  <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/60 shadow-lg text-start space-y-1 animate-fade-in">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-emerald-300 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span>{quotaSuccessMsg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuotaSuccessMsg(null)}
                        className="text-emerald-400 hover:text-white text-xs px-2 py-1 rounded bg-emerald-900/60 hover:bg-emerald-800 transition cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Error & Quota Alert Banner */}
                {error && !quotaSuccessMsg && (
                  <div className={`p-4 rounded-2xl border shadow-lg text-start space-y-3 ${
                    isDailyQuota 
                      ? 'bg-rose-950/40 border-rose-500/50' 
                      : 'bg-amber-950/40 border-amber-500/50'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          isDailyQuota
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {quotaCountdown !== null && quotaCountdown > 0 ? (
                            <Clock className="w-4 h-4 animate-pulse text-amber-400" />
                          ) : (
                            <AlertCircle className={`w-4 h-4 ${isDailyQuota ? 'text-rose-400' : 'text-amber-400'}`} />
                          )}
                        </div>
                        <div>
                          <h4 className={`font-bold text-sm ${isDailyQuota ? 'text-rose-200' : 'text-amber-200'}`}>
                            {isDailyQuota
                              ? isAr
                                ? '⚠️ نفاد الحصة اليومية المجانية من Google (10 طلبات / 24 ساعة)'
                                : '⚠️ Quota journalier Google atteint (10 requêtes / 24h)'
                              : quotaCountdown !== null && quotaCountdown > 0
                              ? isAr
                                ? 'تم الوصول للحد المؤقت للطلبات (Google Free Tier)'
                                : 'Limite temporaire de requêtes par minute (Google Free Tier)'
                              : isAr
                              ? 'تنبيه'
                              : 'Notification'}
                          </h4>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {isDailyQuota
                              ? isAr
                                ? 'يحدد نموذج Google المجاني (gemini-3.1-flash-tts) حداً أقصاه 10 طلبات صوتية لكل 24 ساعة. يتجدد هذا الرصيد تلقائياً كل 24 ساعة (عند منتصف الليل بتوقيت UTC).'
                                : 'L’offre gratuite Google Gemini plafonne ce modèle de voix à 10 générations par 24 heures. Ce quota se réinitialise chaque jour à minuit UTC.'
                              : quotaCountdown !== null && quotaCountdown > 0
                              ? isAr
                                ? 'يقوم نموذج Google بإعادة ضبط الحصة تلقائياً. سيتفعّل زر التوليد تلقائياً بمجرد انتهاء العداد.'
                                : 'Le modèle Google réinitialise automatiquement son quota. Le bouton se débloquera dès la fin du compte à rebours.'
                              : error}
                          </p>

                          {isDailyQuota && (
                            <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
                              <p className="font-semibold text-emerald-400">
                                {isAr ? '💡 كيفية المتابعة وتخطي هذه الحدود :' : '💡 Comment continuer sans cette limite :'}
                              </p>
                              <ul className="list-disc list-inside space-y-1 text-slate-400">
                                <li>
                                  {isAr
                                    ? 'الاستماع وتحميل جميع المقاطع الصوتية المولدة سابقاً من سجل المحفوظات مجاناً وبدون أي استهلاك.'
                                    : 'Vous pouvez réécouter et exporter tous vos audios déjà générés ci-dessous sans consommer de quota.'}
                                </li>
                                <li>
                                  {isAr
                                    ? 'للاستخدام غير المحدود وتوليد أعداد لا نهائية، يمكن ربط مفتاح API مفعل الدفع (Pay-as-you-go) من لوحة Settings > Secrets.'
                                    : 'Pour générer sans restriction de 10 requêtes/jour, associez une clé API Google avec facturation dans Settings > Secrets.'}
                                </li>
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setIsDailyQuota(false);
                          setQuotaCountdown(null);
                        }}
                        className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 transition cursor-pointer shrink-0"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Countdown Progress */}
                    {quotaCountdown !== null && quotaCountdown > 0 && !isDailyQuota && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-amber-500/20 text-xs">
                        <div className="flex items-center gap-2 text-amber-300 font-mono font-bold">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          <span>
                            {isAr
                              ? `إعادة المحاولة متاحة بعد: ${quotaCountdown} ثانية`
                              : `Réessai disponible dans : ${quotaCountdown} s`}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {isAr
                            ? '💡 يتم إلغاء هذا التنبيه تلقائياً فور انتهاء الثواني'
                            : '💡 Cet avertissement disparaît automatiquement à 0s'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Big Action Button */}
                <button
                  id="generate-voice-btn"
                  type="button"
                  onClick={handleGenerateTTS}
                  disabled={isGenerating || !text.trim() || (quotaCountdown !== null && quotaCountdown > 0)}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-base shadow-xl transition-all transform active:scale-[0.99] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    activeCustomVoice
                      ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-600/30'
                      : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/25 border border-emerald-300/40'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>
                        {isAr ? 'جاري توليد النطق الطبيعي...' : 'Génération de la voix en cours...'}
                      </span>
                    </>
                  ) : quotaCountdown !== null && quotaCountdown > 0 ? (
                    <>
                      <Clock className="w-5 h-5 animate-pulse text-amber-950" />
                      <span>
                        {isAr
                          ? `يرجى الانتظار (${quotaCountdown} ثانية) لتجديد الحصة...`
                          : `Patientez (${quotaCountdown}s) pour le quota Google...`}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 fill-current" />
                      <span>
                        {activeCustomVoice
                          ? isAr
                            ? `توليد الصوت بـ « ${activeCustomVoice.name} » (${customVoiceApplyModification ? 'مع تعديل' : 'بدون تعديل'}) ▶`
                            : `Générer avec « ${activeCustomVoice.name} » (${customVoiceApplyModification ? 'Avec modif' : 'Sans modif'}) ▶`
                          : isAr
                          ? 'توليد الصوت بالذكاء الاصطناعي ▶'
                          : 'Générer la voix (TTS) ▶'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Player & Studio Column (5 cols on lg) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Audio Master Player Card */}
                <div className="sticky top-20">
                  <AudioPlayer
                    audioData={audioData}
                    selectedVoice={currentDisplayVoice}
                    uiLang={uiLang}
                    isGenerating={isGenerating}
                    currentText={text}
                  />

                  {/* History List */}
                  <HistoryList
                    history={history}
                    onPlayItem={(item) => {
                      setAudioData({
                        audioBase64: item.audioBase64,
                        audioUrl: `data:audio/wav;base64,${item.audioBase64}`,
                        durationEstimateSeconds: item.durationSeconds,
                        sampleRate: 24000,
                        voiceUsed: item.voiceNameFr,
                        language: item.language,
                        style: item.style,
                        timestampCues: item.timestampCues,
                        cleanText: item.cleanText,
                      });
                      setText(item.text);
                    }}
                    onDeleteItem={(id) => {
                      const updated = history.filter((h) => h.id !== id);
                      setHistory(updated);
                      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
                    }}
                    onClearAll={() => {
                      setHistory([]);
                      localStorage.removeItem(STORAGE_KEY_HISTORY);
                    }}
                    uiLang={uiLang}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOM VOICE / RÉPLICATION VOCALE */}
        {activeMainTab === 'custom-voice' && (
          <CustomVoiceTab
            customVoices={customVoices}
            activeCustomVoice={activeCustomVoice}
            onSelectCustomVoice={handleSelectCustomVoice}
            onSaveNewCustomVoice={handleSaveCustomVoice}
            onDeleteCustomVoice={handleDeleteCustomVoice}
            onSwitchToMainTTS={() => setActiveMainTab('tts')}
            uiLang={uiLang}
          />
        )}
      </main>

      {/* Sample Scripts Modal */}
      <SampleScriptsModal
        isOpen={isSamplesModalOpen}
        onClose={() => setIsSamplesModalOpen(false)}
        language={language}
        onSelectSample={handleSelectSample}
        uiLang={uiLang}
      />

      {/* Quick Voice Creation Modal (1-Step) */}
      {isQuickVoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <UnifiedVoiceCreator
              onVoiceCreated={(voice) => {
                handleSaveCustomVoice(voice);
                setIsQuickVoiceModalOpen(false);
              }}
              uiLang={uiLang}
              onCancel={() => setIsQuickVoiceModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

