import React from 'react';
import { Sparkles, MessageSquareQuote, Lightbulb, X } from 'lucide-react';
import { ArabicLanguage } from '../types';

interface CustomStylePromptInputProps {
  customStylePrompt: string;
  onChangeCustomStylePrompt: (val: string) => void;
  language: ArabicLanguage;
  uiLang: 'ar' | 'fr';
}

export const CustomStylePromptInput: React.FC<CustomStylePromptInputProps> = ({
  customStylePrompt,
  onChangeCustomStylePrompt,
  language,
  uiLang,
}) => {
  const isAr = uiLang === 'ar';

  const quickPresets = [
    {
      id: 'relaxation',
      labelAr: '😌 هادئ جداً للاسترخاء والتأمل',
      labelFr: '😌 Très lent et apaisant pour la relaxation',
      prompt:
        uiLang === 'ar'
          ? 'صوت بطيء جداً، مهدئ، ناعم ودافئ يساعد على الاسترخاء والتأمل بهدوء تام'
          : 'La voix doit être très lente, douce et apaisante pour de la relaxation et la méditation profonde',
    },
    {
      id: 'whisper',
      labelAr: '🤫 نبرة هامسة للمساعدة على النوم',
      labelFr: '🤫 Chuchotée pour aider à dormir',
      prompt:
        uiLang === 'ar'
          ? 'نبرة هامسة وخافتة جداً، مريحة للنفس وتساعد على النوم السريع والراحة'
          : 'La voix doit être chuchotée, douce et feutrée pour aider à dormir paisiblement',
    },
    {
      id: 'suspense',
      labelAr: '🎬 مشوق وغامض كالأفلام الوثائقية',
      labelFr: '🎬 Mystérieux et plein de suspense',
      prompt:
        uiLang === 'ar'
          ? 'نبرة مشوقة، عميقة وممتلئة بالغموض مع وقفات درامية مثيرة'
          : 'Ton plein de suspense, mystérieux avec des pauses dramatiques captivantes',
    },
    {
      id: 'enthusiastic_story',
      labelAr: '🔥 حماسي وسريع للإعلانات والريلز',
      labelFr: '🔥 Énergique et accrocheur pour Reels',
      prompt:
        uiLang === 'ar'
          ? 'إيقاع سريع وحيوي، نبرة مشجعة وجذابة تشد انتباه المشاهد من أول ثانية'
          : 'Rythme rapide, dynamique et percutant avec une intonation enthousiaste et captivante',
    },
  ];

  return (
    <div className="w-full bg-slate-850 bg-slate-800/90 p-5 rounded-2xl border border-slate-700/80 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
            ★
          </span>
          <span>
            {isAr
              ? 'توجيهات مخصصة لأسلوب ونبرة الصوت (Prompt de style)'
              : 'Prompt de style & intonation sur-mesure'}
          </span>
        </label>
        <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
          {isAr ? 'اختياري / متقدم' : 'Optionnel / Avancé'}
        </span>
      </div>

      <p className="text-xs text-slate-300 mb-3 leading-relaxed">
        {isAr
          ? 'اكتب هنا تعليماتك الدقيقة للنبرة وطريقة الإلقاء (مثال: "صوت هامس وناعم يساعد على النوم"، أو "صوت متهدج ومؤثر جداً"، أو "نبرة بطيئة ومطمئنة للاسترخاء").'
          : 'Indiquez ici vos consignes d\'intonation spécifiques (ex: "La voix doit être très lente et apaisante pour de la relaxation", "La voix doit être chuchotée pour aider à dormir", etc.).'}
      </p>

      {/* Input textarea */}
      <div className="relative">
        <textarea
          id="custom-style-prompt-input"
          rows={3}
          value={customStylePrompt}
          onChange={(e) => onChangeCustomStylePrompt(e.target.value)}
          placeholder={
            isAr
              ? 'أدخل تعليمات النبرة والأسلوب هنا... (مثال: اجعل الصوت بطيئاً جداً وناعماً للاسترخاء والتأمل)'
              : 'Ex: La voix doit être très lente et apaisante pour de la relaxation, avec des respirations douces...'
          }
          className="w-full p-3.5 text-sm text-slate-100 bg-slate-900/90 rounded-xl border border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition resize-y font-sans placeholder:text-slate-500"
        />

        {customStylePrompt.trim() && (
          <button
            type="button"
            onClick={() => onChangeCustomStylePrompt('')}
            className="absolute top-2.5 end-2.5 p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition cursor-pointer"
            title={isAr ? 'مسح' : 'Effacer'}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Prompt Presets */}
      <div className="mt-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span>{isAr ? 'أمثلة سريعة وجاهزة:' : 'Suggestions rapides :'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChangeCustomStylePrompt(preset.prompt)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer text-start flex items-center gap-1.5"
            >
              <span>{isAr ? preset.labelAr : preset.labelFr}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
