import React, { useState } from 'react';
import { NarratorGender, VoiceProfile, CustomVoice } from '../types';
import { User, UserCheck, Sparkles, Volume2, Mic, Plus, Sliders, CheckCircle2, ShieldCheck } from 'lucide-react';

interface NarratorSelectorProps {
  selectedGender: NarratorGender;
  onSelectGender: (gender: NarratorGender) => void;
  selectedVoice: VoiceProfile;
  onSelectVoice: (voice: VoiceProfile) => void;
  voices: VoiceProfile[];
  uiLang: 'ar' | 'fr';
  customVoices?: CustomVoice[];
  activeCustomVoice?: CustomVoice | null;
  onSelectCustomVoice?: (voice: CustomVoice) => void;
  onOpenCustomVoiceTab?: () => void;
  onQuickCreateVoice?: () => void;
  customVoiceApplyModification?: boolean;
  onChangeCustomVoiceModification?: (applyMod: boolean) => void;
}

export const NarratorSelector: React.FC<NarratorSelectorProps> = ({
  selectedGender,
  onSelectGender,
  selectedVoice,
  onSelectVoice,
  voices,
  uiLang,
  customVoices = [],
  activeCustomVoice = null,
  onSelectCustomVoice,
  onOpenCustomVoiceTab,
  onQuickCreateVoice,
  customVoiceApplyModification = false,
  onChangeCustomVoiceModification,
}) => {
  const isAr = uiLang === 'ar';
  const [voiceSource, setVoiceSource] = useState<'official' | 'custom'>(
    activeCustomVoice ? 'custom' : 'official'
  );

  const genderTabs: { id: NarratorGender; labelAr: string; labelFr: string; icon: string; count: number }[] = [
    { id: 'male', labelAr: '👨 رجل (Homme)', labelFr: '👨 Homme', icon: '👨', count: 3 },
    { id: 'female', labelAr: '👩 امرأة (Femme)', labelFr: '👩 Femme', icon: '👩', count: 3 },
    { id: 'child', labelAr: '👦 طفل (Enfant)', labelFr: '👦 Enfant', icon: '👦', count: 2 },
  ];

  const filteredVoices = voices.filter((v) => v.gender === selectedGender);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
            2
          </span>
          <span>{isAr ? 'الصوت والراوي' : '2. Voix'}</span>
        </label>

        {/* Source Toggle: Voix Google existantes vs Voix personnalisées */}
        <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setVoiceSource('official')}
            className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
              voiceSource === 'official'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isAr ? `أصوات Google المتوفرة (${voices.length})` : `Voix Google existantes (${voices.length})`}
          </button>
          <button
            type="button"
            onClick={() => setVoiceSource('custom')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
              voiceSource === 'custom'
                ? 'bg-violet-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mic className="w-3 h-3" />
            <span>
              {isAr
                ? `أصوات مخصصة (${customVoices.length})`
                : `Voix personnalisées (${customVoices.length})`}
            </span>
          </button>
        </div>
      </div>

      {voiceSource === 'official' ? (
        <>
          {/* Gender Switcher Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 mb-3.5">
            {genderTabs.map((tab) => {
              const isActive = selectedGender === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-gender-${tab.id}`}
                  type="button"
                  onClick={() => {
                    onSelectGender(tab.id);
                    const firstMatching = voices.find((v) => v.gender === tab.id);
                    if (firstMatching) onSelectVoice(firstMatching);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <span className="text-base leading-none">{tab.icon}</span>
                  <span>{isAr ? tab.labelAr : tab.labelFr}</span>
                </button>
              );
            })}
          </div>

          {/* Voice Profiles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredVoices.map((voice) => {
              const isSelected = selectedVoice.id === voice.id && !activeCustomVoice;
              return (
                <div
                  key={voice.id}
                  id={`voice-card-${voice.id}`}
                  onClick={() => onSelectVoice(voice)}
                  className={`p-3.5 rounded-xl border text-start transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-50/60 border-emerald-500 ring-1 ring-emerald-500 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-full bg-gradient-to-tr ${voice.avatarColor} text-white flex items-center justify-center font-bold text-sm shadow-xs`}
                        >
                          {voice.nameAr[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <span>{voice.nameAr}</span>
                            <span className="text-xs font-normal text-slate-500">
                              ({voice.nameFr})
                            </span>
                          </h4>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {isAr ? voice.ageLabelAr : voice.ageLabelFr}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isSelected
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isAr ? voice.badgeAr : voice.badgeFr}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      {isAr ? voice.taglineAr : voice.taglineFr}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{isSelected ? (isAr ? 'الصوت المفعّل' : 'Voix active') : (isAr ? 'اضغط للاختيار' : 'Sélectionner')}</span>
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {voice.geminiVoice}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Custom Voices Grid */
        <div>
          {customVoices.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-2">
                <Mic className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-800 mb-1">
                {isAr ? 'لم تقم بإنشاء صوت مخصص بعد' : 'Aucune voix personnalisée créée'}
              </p>
              <p className="text-xs text-slate-500 mb-3 max-w-sm">
                {isAr
                  ? 'أنشئ صوتك في خطوة واحدة واستخدمه مباشرة في قراءة نصوصك.'
                  : 'Créez votre voix en 1 étape simple et utilisez-la directement pour lire vos scripts.'}
              </p>
              <button
                type="button"
                onClick={onQuickCreateVoice || onOpenCustomVoiceTab}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-violet-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? '⚡ إنشاء صوت في خطوة واحدة' : '⚡ Créer ma voix en 1 clic'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-xs text-slate-600 font-medium">
                  {isAr ? `أصواتك الجاهزة (${customVoices.length})` : `Vos voix disponibles (${customVoices.length})`}
                </span>
                <button
                  type="button"
                  onClick={onQuickCreateVoice || onOpenCustomVoiceTab}
                  className="text-xs text-violet-600 hover:text-violet-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAr ? 'صوت جديد (1 نقرة)' : 'Nouvelle voix (1 clic)'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {customVoices.map((cv) => {
                  const isSelected = activeCustomVoice?.id === cv.id;
                  return (
                    <div
                      key={cv.id}
                      onClick={() => onSelectCustomVoice && onSelectCustomVoice(cv)}
                      className={`p-3.5 rounded-xl border text-start transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-violet-50/70 border-violet-500 ring-1 ring-violet-500 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                              {cv.name[0] || '🎙️'}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">{cv.name}</h4>
                              <span className="text-[11px] text-slate-500">
                                {cv.acousticProfile?.pitchRegister || 'Médium'}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium">
                            {isAr ? '✓ جاهز' : '✓ Prête'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                          {cv.acousticProfile?.timbreDescription || 'Voix personnalisée répliquée par IA Google.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 text-violet-600 font-medium">
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{isSelected ? (isAr ? 'الصوت المفعّل' : 'Voix active') : (isAr ? 'اضغط للاختيار' : 'Sélectionner')}</span>
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {cv.audioDurationSeconds || 10}s
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeCustomVoice && onChangeCustomVoiceModification && (
                <div className="p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-violet-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-violet-400" />
                      <span>
                        {isAr
                          ? `طريقة تطبيق صوت « ${activeCustomVoice.name} »:`
                          : `Application de la voix « ${activeCustomVoice.name} » :`}
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {customVoiceApplyModification
                        ? (isAr ? 'مع تعديل الأسلوب' : 'Avec modifications')
                        : (isAr ? 'بدون تعديل (أصلي)' : 'Sans modification')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Option 1: Sans modification */}
                    <button
                      type="button"
                      onClick={() => onChangeCustomVoiceModification(false)}
                      className={`p-2.5 rounded-lg border text-start transition cursor-pointer flex items-start gap-2 ${
                        !customVoiceApplyModification
                          ? 'bg-violet-600/30 border-violet-400 text-white shadow-xs'
                          : 'bg-slate-900/40 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                    >
                      <ShieldCheck className={`w-4 h-4 mt-0.5 shrink-0 ${!customVoiceApplyModification ? 'text-violet-300' : 'text-slate-500'}`} />
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <span>{isAr ? 'بدون تعديل (النبرة الأصلية)' : 'Sans modification (Voix pure)'}</span>
                          {!customVoiceApplyModification && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                              {isAr ? 'مفعّل' : 'Actif'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                          {isAr
                            ? 'نطق مطابق تماماً لصوتك ونبرتك الطبيعية المسجلة دون أي تكلّف أو تغيير.'
                            : 'Lecture 100% fidèle au timbre et débit naturel de l\'enregistrement.'}
                        </p>
                      </div>
                    </button>

                    {/* Option 2: Avec modification */}
                    <button
                      type="button"
                      onClick={() => onChangeCustomVoiceModification(true)}
                      className={`p-2.5 rounded-lg border text-start transition cursor-pointer flex items-start gap-2 ${
                        customVoiceApplyModification
                          ? 'bg-violet-600/30 border-violet-400 text-white shadow-xs'
                          : 'bg-slate-900/40 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                    >
                      <Sliders className={`w-4 h-4 mt-0.5 shrink-0 ${customVoiceApplyModification ? 'text-violet-300' : 'text-slate-500'}`} />
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <span>{isAr ? 'مع تعديل وتخصيص الأسلوب' : 'Avec modification (Styles)'}</span>
                          {customVoiceApplyModification && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                              {isAr ? 'مفعّل' : 'Actif'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                          {isAr
                            ? 'تطبيق أنماط الأداء (وثائقي، حماسي...)، تعديل السرعة والتوجيهات.'
                            : 'Permet d\'appliquer les styles, ajuster la vitesse et les instructions.'}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {onOpenCustomVoiceTab && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={onOpenCustomVoiceTab}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isAr ? 'إدارة الأصوات في لوحة الاستنساخ ↗' : 'Gérer toutes mes voix dans l\'onglet Voix personnalisée ↗'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

