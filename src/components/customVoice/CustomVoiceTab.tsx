import React, { useState, useEffect } from 'react';
import {
  Mic,
  Sparkles,
  Volume2,
  RefreshCw,
  Download,
  Play,
  Pause,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  FileText,
  Plus,
  Zap,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { CustomVoice, TTSResponseData } from '../../types';
import { safeFetchJson, ApiResponseError } from '../../utils/apiHelper';
import { UnifiedVoiceCreator } from './UnifiedVoiceCreator';
import { VoiceLibrary } from './VoiceLibrary';

interface CustomVoiceTabProps {
  customVoices: CustomVoice[];
  activeCustomVoice: CustomVoice | null;
  onSelectCustomVoice: (voice: CustomVoice) => void;
  onSaveNewCustomVoice: (voice: CustomVoice) => void;
  onDeleteCustomVoice: (id: string) => void;
  onSwitchToMainTTS: () => void;
  uiLang: 'ar' | 'fr';
}

export const CustomVoiceTab: React.FC<CustomVoiceTabProps> = ({
  customVoices,
  activeCustomVoice,
  onSelectCustomVoice,
  onSaveNewCustomVoice,
  onDeleteCustomVoice,
  onSwitchToMainTTS,
  uiLang,
}) => {
  const isAr = uiLang === 'ar';

  const [showAddSection, setShowAddSection] = useState<boolean>(customVoices.length === 0);

  // Quick Test TTS State with selected custom voice
  const [testText, setTestText] = useState(
    'شنو كيطرى إلا زدت شوية ديال القهوة على الصابون البلدي؟ جرب هاد الفكرة وشوف النتيجة العجيبة!'
  );
  const [testLanguage, setTestLanguage] = useState<'darija' | 'fusha'>('darija');
  const [testSpeed, setTestSpeed] = useState<number>(1.0);
  const [testStylePrompt, setTestStylePrompt] = useState<string>('');
  const [testApplyModification, setTestApplyModification] = useState<boolean>(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState<boolean>(false);
  const [testAudioData, setTestAudioData] = useState<TTSResponseData | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testQuotaCountdown, setTestQuotaCountdown] = useState<number | null>(null);

  // Live timer for test tab quota countdown
  useEffect(() => {
    if (testQuotaCountdown === null || testQuotaCountdown <= 0) return;
    const timer = setInterval(() => {
      setTestQuotaCountdown((prev) => {
        if (prev === null || prev <= 1) {
          setTestError(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [testQuotaCountdown]);

  const handleVoiceCreated = (newVoice: CustomVoice) => {
    onSaveNewCustomVoice(newVoice);
    onSelectCustomVoice(newVoice);
    setShowAddSection(false);
  };

  const handleGenerateTest = async () => {
    if (!activeCustomVoice) return;
    if (!testText.trim()) return;

    setIsGeneratingTest(true);
    setTestError(null);

    try {
      const data = await safeFetchJson<TTSResponseData>(
        '/api/tts/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: testText.trim(),
            language: testLanguage,
            customVoice: activeCustomVoice,
            customVoiceApplyModification: testApplyModification,
            customStylePrompt: testApplyModification ? testStylePrompt : '',
            parameters: {
              speed: testApplyModification ? testSpeed : 1.0,
              expressiveness: 80,
            },
          }),
        },
        'Erreur de génération audio avec la voix personnalisée.'
      );

      setTestQuotaCountdown(null);
      setTestAudioData(data);
    } catch (err: any) {
      console.error('Test generation error:', err);
      const apiErr = err as ApiResponseError;
      if (apiErr.isDailyQuota) {
        setTestQuotaCountdown(null);
      } else if (apiErr.retryAfterSeconds) {
        setTestQuotaCountdown(apiErr.retryAfterSeconds);
      }
      setTestError(err?.message || 'Erreur lors de la génération avec la voix personnalisée.');
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const sampleTestPrompts = [
    {
      lang: 'darija' as const,
      labelAr: '🇲🇦 تجربة بالدارجة المغربية',
      labelFr: '🇲🇦 Test en Darija marocaine',
      text: 'شنو كيطرى إلا زدت شوية ديال القهوة على الصابون البلدي؟ جرب هاد الفكرة وشوف النتيجة العجيبة!',
    },
    {
      lang: 'fusha' as const,
      labelAr: '📜 تجربة بالعربية الفصحى',
      labelFr: '📜 Test en Arabe classique',
      text: 'إن الذكاء الاصطناعي الصوتي يفتح آفاقاً جديدة للتواصل الإنساني الراقي والتعبير الأصيل.',
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-violet-950/60 via-slate-900 to-indigo-950/60 p-6 rounded-3xl border border-violet-800/40 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-600/30">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white">
                  {isAr ? '🎙️ الصوت المخصص والاستنساخ الصوتي' : '🎙️ Voix personnalisée & Réplication vocale'}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold">
                  Google Voice AI
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {isAr
                  ? 'أنشئ نموذجاً صوتياً فريداً انطلاقاً من تسجيل صوتي قصير، واستخدمه لنطق نصوصك بالدارجة المغربية أو الفصحى بنبرتك وهويتك الصوتية.'
                  : 'Créez votre propre modèle vocal basé sur votre échantillon, analysé par IA multimodale, et générez des narrations en Darija ou Arabe avec votre identité vocale.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddSection(!showAddSection)}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {showAddSection
                  ? isAr
                    ? 'إخفاء نموذج الإنشاء'
                    : 'Masquer le créateur'
                  : isAr
                  ? 'إنشاء صوت جديد'
                  : 'Créer une voix'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* UNIFIED DIRECT CREATOR */}
      {showAddSection && (
        <div className="animate-fade-in">
          <UnifiedVoiceCreator
            onVoiceCreated={handleVoiceCreated}
            uiLang={uiLang}
            onCancel={customVoices.length > 0 ? () => setShowAddSection(false) : undefined}
          />
        </div>
      )}

      {/* BIBLIOTHÈQUE DES VOIX */}
      <VoiceLibrary
        customVoices={customVoices}
        activeCustomVoiceId={activeCustomVoice?.id || null}
        onSelectVoiceForTTS={onSelectCustomVoice}
        onDeleteVoice={onDeleteCustomVoice}
        onAddNewVoiceClick={() => setShowAddSection(true)}
        uiLang={uiLang}
      />

      {/* TEST DIRECT AVEC LA VOIX ACTIVE */}
      {activeCustomVoice && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-600/30 text-emerald-400 font-mono text-xs border border-emerald-500/30">
                  <Volume2 className="w-3.5 h-3.5" />
                </span>
                <h3 className="text-base font-bold text-white">
                  {isAr
                    ? `اختبار مباشر مع الصوت المخصص: « ${activeCustomVoice.name} »`
                    : `Test direct avec la voix « ${activeCustomVoice.name} »`}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isAr
                  ? 'جرب نطق أي نص فوراً بهذا الصوت للتأكد من النبرة والجودة، أو انتقل إلى الواجهة الكاملة.'
                  : 'Testez immédiatement votre voix personnalisée sur du texte en Darija ou Arabe.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onSwitchToMainTTS}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <span>{isAr ? 'الانتقال إلى لوحة TTS الكاملة' : 'Ouvrir dans le studio TTS complet'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">
              {isAr ? 'نصوص سريعة للاختبار:' : 'Exemples rapides :'}
            </span>
            {sampleTestPrompts.map((p) => (
              <button
                key={p.lang}
                type="button"
                onClick={() => {
                  setTestLanguage(p.lang);
                  setTestText(p.text);
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer"
              >
                {isAr ? p.labelAr : p.labelFr}
              </button>
            ))}
          </div>

          {/* Text Input */}
          <div className="mb-4">
            <textarea
              rows={3}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder={isAr ? 'اكتب النص هنا للتوليد بصوتك...' : 'Écrivez le texte à synthétiser...'}
              className="w-full p-3.5 bg-slate-950/90 rounded-2xl border border-slate-700 text-slate-100 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition resize-y"
            />
          </div>

          {/* Voice Application Mode (Sans modif vs Avec modif) */}
          <div className="mb-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <label className="block text-xs font-bold text-slate-300 mb-2">
              {isAr ? 'طريقة تطبيق الصوت المخصص أثناء التحويل:' : 'Mode d\'application de la voix personnalisée :'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTestApplyModification(false)}
                className={`p-2.5 rounded-lg border text-start transition cursor-pointer flex items-start gap-2 ${
                  !testApplyModification
                    ? 'bg-violet-600/30 border-violet-400 text-white'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 mt-0.5 shrink-0 ${!testApplyModification ? 'text-violet-300' : 'text-slate-500'}`} />
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>{isAr ? 'بدون تعديل (النبرة الأصلية)' : 'Sans modification (Voix originale pure)'}</span>
                    {!testApplyModification && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                        {isAr ? 'مفعّل' : 'Actif'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isAr
                      ? 'مطابق للتسجيل الصوتي الأصلي دون تدخل أسلوبي أو تغيير في السرعة.'
                      : 'Lecture 100% fidèle au timbre et débit original de votre enregistrement.'}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTestApplyModification(true)}
                className={`p-2.5 rounded-lg border text-start transition cursor-pointer flex items-start gap-2 ${
                  testApplyModification
                    ? 'bg-violet-600/30 border-violet-400 text-white'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className={`w-4 h-4 mt-0.5 shrink-0 ${testApplyModification ? 'text-violet-300' : 'text-slate-500'}`} />
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>{isAr ? 'مع تعديل وتخصيص الأسلوب' : 'Avec modification (Styles & Réglages)'}</span>
                    {testApplyModification && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                        {isAr ? 'مفعّل' : 'Actif'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isAr
                      ? 'تفعيل تعديل السرعة والأسلوب وإضافة توجيهات أسلوبية خاصة.'
                      : 'Permet d\'ajuster la vitesse, le style et les consignes d\'expression.'}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {/* Language Selector */}
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                {isAr ? 'اللغة / اللهجة' : 'Langue'}
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setTestLanguage('darija')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    testLanguage === 'darija'
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  الدارجة المغربية
                </button>
                <button
                  type="button"
                  onClick={() => setTestLanguage('fusha')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    testLanguage === 'fusha'
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  الفصحى
                </button>
              </div>
            </div>

            {/* Speed Selector */}
            <div className={`p-3 bg-slate-950/70 rounded-xl border border-slate-800 transition ${!testApplyModification ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-400">
                  {isAr ? `السرعة: ${testSpeed}x` : `Vitesse : ${testSpeed}x`}
                </label>
                {!testApplyModification && (
                  <span className="text-[10px] text-amber-400/90 font-medium">
                    {isAr ? '(أصلية 1.0x)' : '(Originale)'}
                  </span>
                )}
              </div>
              <input
                type="range"
                min="0.75"
                max="1.3"
                step="0.05"
                disabled={!testApplyModification}
                value={testSpeed}
                onChange={(e) => setTestSpeed(parseFloat(e.target.value))}
                className="w-full accent-violet-500 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {/* Style Prompt */}
            <div className={`p-3 bg-slate-950/70 rounded-xl border border-slate-800 transition ${!testApplyModification ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-400">
                  {isAr ? 'نبرة مخصصة (اختياري)' : 'Style vocal (optionnel)'}
                </label>
                {!testApplyModification && (
                  <span className="text-[10px] text-amber-400/90 font-medium">
                    {isAr ? '(معطّل بدون تعديل)' : '(Désactivé)'}
                  </span>
                )}
              </div>
              <input
                type="text"
                disabled={!testApplyModification}
                value={testStylePrompt}
                onChange={(e) => setTestStylePrompt(e.target.value)}
                placeholder={isAr ? 'مثال: نبرة مرحة وهادئة' : 'Ex: Posé et chaleureux'}
                className="w-full px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Test Error & Quota */}
          {testError && (
            <div className="p-3.5 mb-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-slate-300 leading-relaxed">{testError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTestError(null);
                    setTestQuotaCountdown(null);
                  }}
                  className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>
              {testQuotaCountdown !== null && testQuotaCountdown > 0 && (
                <div className="flex items-center gap-2 pt-1.5 border-t border-amber-500/20 text-amber-300 font-mono font-bold">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  <span>
                    {isAr
                      ? `إعادة المحاولة متاحة خلال: ${testQuotaCountdown} ثانية`
                      : `Réessai disponible dans : ${testQuotaCountdown}s`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Generate Button */}
          <div className="flex items-center gap-3">
            <button
              id="generate-custom-voice-tts-btn"
              type="button"
              onClick={handleGenerateTest}
              disabled={isGeneratingTest || !testText.trim() || (testQuotaCountdown !== null && testQuotaCountdown > 0)}
              className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGeneratingTest ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isAr ? 'جاري توليد الصوت بنموذجك المخصص...' : 'Génération avec votre voix en cours…'}</span>
                </>
              ) : testQuotaCountdown !== null && testQuotaCountdown > 0 ? (
                <>
                  <Clock className="w-4 h-4 animate-pulse text-amber-900" />
                  <span>{isAr ? `يرجى الانتظار (${testQuotaCountdown} ثانية)...` : `Patientez (${testQuotaCountdown}s)...`}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isAr
                      ? `توليد الصوت الآن بـ « ${activeCustomVoice.name} »`
                      : `Générer avec « ${activeCustomVoice.name} »`}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Direct Audio Player if generated */}
          {testAudioData?.audioUrl && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 animate-fade-in flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <audio controls src={testAudioData.audioUrl} className="w-full sm:w-72 h-10 accent-emerald-500" />
              </div>

              <a
                href={testAudioData.audioUrl}
                download={`custom-voice-${activeCustomVoice.name}-${Date.now()}.wav`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>{isAr ? 'تحميل ملف WAV' : 'Télécharger WAV'}</span>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
