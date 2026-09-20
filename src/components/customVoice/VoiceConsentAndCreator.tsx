import React, { useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Volume2,
  Play,
  Pause,
  ArrowRight,
  Fingerprint,
  Mic,
  Tag,
} from 'lucide-react';
import { CustomVoice } from '../../types';
import { safeFetchJson } from '../../utils/apiHelper';

interface VoiceConsentAndCreatorProps {
  audioBase64: string | null;
  mimeType: string;
  durationSeconds: number;
  fileName: string;
  onVoiceCreated: (voice: CustomVoice) => void;
  uiLang: 'ar' | 'fr';
}

export const VoiceConsentAndCreator: React.FC<VoiceConsentAndCreatorProps> = ({
  audioBase64,
  mimeType,
  durationSeconds,
  fileName,
  onVoiceCreated,
  uiLang,
}) => {
  const isAr = uiLang === 'ar';

  const [voiceName, setVoiceName] = useState('');
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdVoice, setCreatedVoice] = useState<CustomVoice | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const consentText = isAr
    ? 'أؤكد أن لدي الصلاحية الكاملة والتفويض لاستخدام هذا التسجيل الصوتي ولإنشاء نموذج صوت مخصص بالذكاء الاصطناعي بناءً عليه.'
    : "Je confirme que j'ai l'autorisation d'utiliser cet enregistrement vocal et de créer une voix personnalisée à partir de celui-ci.";

  const officialGoogleConsentStatement = isAr
    ? '« أنا صاحب هذا الصوت، وأوافق على استخدام هذا التسجيل لإنشاء نموذج صوت اصطناعي مخصص. »'
    : '« I am the owner of this voice, and I consent to Google using this voice to create a synthetic voice model. »';

  const quickNameSuggestions = isAr
    ? ['صوتي الشخصي', 'صوت الدارجة المغربية', 'راوي البودكاست', 'صوت إخباري رزين']
    : ['Ma voix', 'Voix Darija', 'Narrateur Podcast', 'Voix dynamique'];

  const handleCreateVoice = async () => {
    if (!audioBase64) return;
    if (!consentConfirmed) {
      setErrorMessage(
        isAr
          ? 'يرجى تأكيد الموافقة والتفويض للمتابعة.'
          : 'Veuillez confirmer votre consentement légal pour continuer.'
      );
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStep(1);

    // Simulated progress steps for smooth UX while backend processes
    const stepTimer1 = setTimeout(() => setProcessingStep(2), 1200);
    const stepTimer2 = setTimeout(() => setProcessingStep(3), 3200);
    const stepTimer3 = setTimeout(() => setProcessingStep(4), 5400);

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
            consentText,
            fileName,
            durationSeconds,
          }),
        },
        'Échec de la création de la voix.'
      );

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      if (!data?.success) {
        throw new Error(data?.error || 'Échec de la création de la voix.');
      }

      setCreatedVoice(data.voice);
      onVoiceCreated(data.voice);
    } catch (err: any) {
      console.error('Create custom voice error:', err);
      setErrorMessage(
        err?.message ||
          (isAr
            ? 'حدث خطأ أثناء معالجة واستنساخ الصوت. تحقق من اتصالك وحاول مرة أخرى.'
            : 'Erreur lors de la création de la voix personnalisée. Veuillez réessayer.')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg mt-5">
      {/* SECTION 2: CONSENTEMENT */}
      <div className="mb-6 pb-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-600/30 text-emerald-400 font-mono text-xs border border-emerald-500/30">
              2
            </span>
            <span>
              {isAr
                ? 'الخطوة 2: الموافقة والتفويض الرسمي'
                : 'Étape 2 : Consentement & Autorisation'}
            </span>
          </h3>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isAr ? 'إلزامي للأمان والخصوصية' : 'Obligatoire'}</span>
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          {isAr
            ? 'احتراماً لأخلاقيات الذكاء الاصطناعي وضوابط الأمان من Google، يجب التأكيد الصريح على ملكية الصوت أو حيازة الإذن القانوني لإنشاء نسخة صوتية توليدية.'
            : "Conformément aux normes d'éthique et aux protocoles Google Cloud Instant Custom Voice, la confirmation formelle d'autorisation est requise pour générer un clone vocal."}
        </p>

        {/* Official Google Statement Box */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 mb-3 text-xs text-slate-300 font-sans leading-relaxed">
          <div className="text-[11px] font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
            <Fingerprint className="w-3.5 h-3.5" />
            <span>{isAr ? 'بيان الموافقة الصوتي الرسمي:' : 'Déclaration de consentement officiel :'}</span>
          </div>
          <p className="italic text-slate-200">{officialGoogleConsentStatement}</p>
        </div>

        {/* Mandatory Checkbox */}
        <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:bg-slate-800 transition cursor-pointer">
          <input
            id="custom-voice-consent-checkbox"
            type="checkbox"
            checked={consentConfirmed}
            onChange={(e) => setConsentConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-emerald-500 accent-emerald-500 border-slate-600 focus:ring-emerald-400 cursor-pointer"
          />
          <span className="text-xs font-medium text-slate-200 leading-relaxed select-none">
            {consentText}
          </span>
        </label>
      </div>

      {/* SECTION 3: NOMMER LA VOIX & LANCER */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-violet-600/30 text-violet-400 font-mono text-xs border border-violet-500/30">
              3
            </span>
            <span>
              {isAr ? 'الخطوة 3: تسمية الصوت وإنشاء النموذج' : 'Étape 3 : Nommer & Créer la voix'}
            </span>
          </h3>
        </div>

        {/* Name input */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            {isAr ? 'اسم الصوت المخصص:' : 'Nom du profil vocal :'}
          </label>
          <input
            id="custom-voice-name-input"
            type="text"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder={isAr ? 'مثال: صوتي الشخصي، صوت الدارجة المغربية...' : 'Ex: Ma voix, Voix Darija, Voix Podcast...'}
            maxLength={40}
            className="w-full px-3.5 py-2.5 bg-slate-950/80 rounded-xl border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition"
          />
          {/* Suggestions */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Tag className="w-3 h-3 text-violet-400" />
              <span>{isAr ? 'اقتراحات:' : 'Suggestions :'}</span>
            </span>
            {quickNameSuggestions.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setVoiceName(sug)}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* PROCESSING INDICATOR WITH STEPS */}
        {isProcessing && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-violet-500/40 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
              <h4 className="font-bold text-sm text-white">
                {isAr
                  ? 'جاري تحليل واستنساخ البصمة الصوتية...'
                  : 'Création de votre voix personnalisée…'}
              </h4>
            </div>

            <div className="space-y-2 text-xs">
              <div className={`flex items-center gap-2 ${processingStep >= 1 ? 'text-violet-300 font-medium' : 'text-slate-600'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${processingStep > 1 ? 'bg-emerald-500 text-slate-950 font-bold' : processingStep === 1 ? 'bg-violet-600 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                  {processingStep > 1 ? '✓' : '1'}
                </span>
                <span>{isAr ? 'التحقق من جودة العينة الصوتية ومدى مطابقتها' : 'Vérification de la clarté de l\'échantillon'}</span>
              </div>

              <div className={`flex items-center gap-2 ${processingStep >= 2 ? 'text-violet-300 font-medium' : 'text-slate-600'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${processingStep > 2 ? 'bg-emerald-500 text-slate-950 font-bold' : processingStep === 2 ? 'bg-violet-600 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                  {processingStep > 2 ? '✓' : '2'}
                </span>
                <span>{isAr ? 'تحليل الترددات والخصائص الصوتية عبر Google Gemini Multimodal' : 'Analyse acoustique multimodale par IA Google'}</span>
              </div>

              <div className={`flex items-center gap-2 ${processingStep >= 3 ? 'text-violet-300 font-medium' : 'text-slate-600'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${processingStep > 3 ? 'bg-emerald-500 text-slate-950 font-bold' : processingStep === 3 ? 'bg-violet-600 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                  {processingStep > 3 ? '✓' : '3'}
                </span>
                <span>{isAr ? 'استخراج النبرة المغربية، مخارج الحروف، ونمط الإلقاء' : 'Extraction du timbre, du registre et de la prosodie maroco-arabe'}</span>
              </div>

              <div className={`flex items-center gap-2 ${processingStep >= 4 ? 'text-violet-300 font-medium' : 'text-slate-600'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${processingStep === 4 ? 'bg-violet-600 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                  4
                </span>
                <span>{isAr ? 'توليد العينة المعيارية وتجهيز الملف الصوتي المخصص' : 'Synthèse de l\'échantillon d\'étalonnage et finalisation'}</span>
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS CARD */}
        {createdVoice && (
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/50 mb-4 animate-fade-in">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>{isAr ? '✓ تم إنشاء الصوت المخصص بنجاح!' : '✓ Voix personnalisée prête !'}</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {createdVoice.name}
              </span>
            </div>

            {/* Acoustic DNA summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">{isAr ? 'الجنس والنوع' : 'Genre'}</div>
                <div className="font-semibold text-slate-200 capitalize">
                  {createdVoice.acousticProfile.gender === 'female' ? (isAr ? 'أنثى' : 'Femme') : (isAr ? 'ذكر' : 'Homme')}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">{isAr ? 'طبقة الصوت' : 'Registre'}</div>
                <div className="font-semibold text-slate-200 truncate">
                  {createdVoice.acousticProfile.pitchRegister || 'Médium'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">{isAr ? 'النبرة والصبغة' : 'Timbre'}</div>
                <div className="font-semibold text-slate-200 truncate">
                  {createdVoice.acousticProfile.timbreDescription || 'Naturel'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">{isAr ? 'اللكنة / اللهجة' : 'Accent'}</div>
                <div className="font-semibold text-slate-200 truncate">
                  {createdVoice.acousticProfile.accentOrDialect || 'Marocain'}
                </div>
              </div>
            </div>

            {/* Cloned preview player */}
            {createdVoice.previewAudioBase64 && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <audio
                  id="preview-cloned-audio-elem"
                  src={`data:audio/wav;base64,${createdVoice.previewAudioBase64}`}
                  onEnded={() => setIsPlayingPreview(false)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('preview-cloned-audio-elem') as HTMLAudioElement;
                    if (!el) return;
                    if (isPlayingPreview) {
                      el.pause();
                      setIsPlayingPreview(false);
                    } else {
                      el.play().then(() => setIsPlayingPreview(true)).catch(console.error);
                    }
                  }}
                  className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition cursor-pointer"
                >
                  {isPlayingPreview ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ms-0.5" />}
                </button>
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-slate-200">
                    {isAr ? 'استمع إلى عينة الصوت المستنسخ:' : 'Écouter l\'échantillon étalonné :'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isAr ? '« مرحباً بك، تم استنساخ وتحليل صوتك بنجاح... »' : '« Échantillon de salutation généré »'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACTION BUTTON */}
        {!createdVoice && (
          <button
            id="create-custom-voice-action-btn"
            type="button"
            onClick={handleCreateVoice}
            disabled={!audioBase64 || !consentConfirmed || isProcessing}
            className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {isAr ? 'جاري إنشاء صوتك المخصص…' : 'Création de votre voix personnalisée…'}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{isAr ? 'إنشاء صوتي' : 'Créer ma voix'}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
