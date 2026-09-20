import React, { useState } from 'react';
import {
  Mic,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  Sparkles,
  Volume2,
  Calendar,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { CustomVoice } from '../../types';

interface VoiceLibraryProps {
  customVoices: CustomVoice[];
  activeCustomVoiceId: string | null;
  onSelectVoiceForTTS: (voice: CustomVoice) => void;
  onDeleteVoice: (id: string) => void;
  onAddNewVoiceClick: () => void;
  uiLang: 'ar' | 'fr';
}

export const VoiceLibrary: React.FC<VoiceLibraryProps> = ({
  customVoices,
  activeCustomVoiceId,
  onSelectVoiceForTTS,
  onDeleteVoice,
  onAddNewVoiceClick,
  uiLang,
}) => {
  const isAr = uiLang === 'ar';
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const togglePlayPreview = (voice: CustomVoice) => {
    if (!voice.previewAudioBase64) return;
    const audioEl = document.getElementById(`audio-preview-${voice.id}`) as HTMLAudioElement;
    if (!audioEl) return;

    if (playingVoiceId === voice.id) {
      audioEl.pause();
      setPlayingVoiceId(null);
    } else {
      // Pause any other playing audio
      document.querySelectorAll('audio').forEach((a) => a.pause());
      audioEl.currentTime = 0;
      audioEl
        .play()
        .then(() => setPlayingVoiceId(voice.id))
        .catch(console.error);
    }
  };

  const formatDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
              <Mic className="w-3.5 h-3.5" />
            </span>
            <span>{isAr ? 'أصواتي (مكتبة الأصوات)' : 'Mes voix'}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? `إجمالي الأصوات المحفوظة: ${customVoices.length}`
              : `${customVoices.length} voix personnalisée(s) enregistrée(s)`}
          </p>
        </div>

        <button
          type="button"
          onClick={onAddNewVoiceClick}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? '+ إضافة صوت جديد' : '+ Nouvelle voix'}</span>
        </button>
      </div>

      {customVoices.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-violet-900/30 text-violet-400 border border-violet-800/40 flex items-center justify-center mb-3">
            <Mic className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200 mb-1">
            {isAr ? 'لا توجد أصوات مخصصة حالياً' : 'Aucune voix personnalisée pour le moment'}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            {isAr
              ? 'قم برفع ملف صوتي أو التسجيل بالميكروفون أعلاه لإنشاء أول نموذج صوت مخصص لك.'
              : 'Téléversez un enregistrement ou utilisez votre micro pour créer votre premier clone vocal.'}
          </p>
          <button
            type="button"
            onClick={onAddNewVoiceClick}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition cursor-pointer"
          >
            {isAr ? 'إنشاء صوت جديد الآن' : 'Créer une voix maintenant'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {customVoices.map((voice) => {
            const isActive = activeCustomVoiceId === voice.id;
            const isPlaying = playingVoiceId === voice.id;

            return (
              <div
                key={voice.id}
                className={`p-4 rounded-xl border text-start transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-violet-950/30 border-violet-500 ring-1 ring-violet-500 shadow-md'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                {voice.previewAudioBase64 && (
                  <audio
                    id={`audio-preview-${voice.id}`}
                    src={`data:audio/wav;base64,${voice.previewAudioBase64}`}
                    onEnded={() => setPlayingVoiceId(null)}
                    className="hidden"
                  />
                )}

                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                        {voice.name[0] || '🎙️'}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white flex items-center gap-2">
                          <span>{voice.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {isAr ? '✓ جاهزة' : '✓ Prête'}
                          </span>
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{isAr ? `أُنشئت في ${formatDate(voice.createdAt)}` : `Créée le ${formatDate(voice.createdAt)}`}</span>
                          </span>
                          <span>•</span>
                          <span>{voice.audioDurationSeconds || 10}s</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acoustic details chips */}
                  <div className="flex flex-wrap gap-1.5 my-2.5">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/80">
                      {voice.acousticProfile?.gender === 'female' ? (isAr ? 'أنثى' : 'Femme') : (isAr ? 'ذكر' : 'Homme')}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/80">
                      {voice.acousticProfile?.pitchRegister || 'Médium'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-violet-900/30 text-violet-300 border border-violet-800/40 truncate max-w-[150px]">
                      {voice.acousticProfile?.accentOrDialect || 'Marocain'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                    {voice.acousticProfile?.timbreDescription || 'Voix personnalisée répliquée par IA Google.'}
                  </p>
                </div>

                {/* Card Actions: [Utiliser] [Prévisualiser] [Supprimer] */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* [Utiliser] */}
                    <button
                      type="button"
                      onClick={() => onSelectVoiceForTTS(voice)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-violet-600 hover:bg-violet-500 text-white shadow-sm shadow-violet-600/20'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{isActive ? (isAr ? '✓ قيد الاستخدام' : '✓ Utilisée') : (isAr ? 'استخدام' : 'Utiliser')}</span>
                    </button>

                    {/* [Prévisualiser] */}
                    <button
                      type="button"
                      onClick={() => togglePlayPreview(voice)}
                      disabled={!voice.previewAudioBase64}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-40 ${
                        isPlaying
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ms-0.5" />}
                      <span>{isPlaying ? (isAr ? 'إيقاف' : 'Pause') : (isAr ? 'معاينة' : 'Prévisualiser')}</span>
                    </button>
                  </div>

                  {/* [Supprimer] */}
                  <button
                    type="button"
                    onClick={() => onDeleteVoice(voice.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                    title={isAr ? 'حذف الصوت' : 'Supprimer'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'حذف' : 'Supprimer'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
