import React from 'react';
import { ArabicLanguage } from '../types';
import { Sparkles, CheckCircle2 } from 'lucide-react';

interface LanguageSelectorProps {
  selectedLanguage: ArabicLanguage;
  onSelectLanguage: (lang: ArabicLanguage) => void;
  uiLang: 'ar' | 'fr';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onSelectLanguage,
  uiLang,
}) => {
  const isAr = uiLang === 'ar';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
            1
          </span>
          <span>{isAr ? 'اختر المتغير اللغوي' : '1. Variante linguistique'}</span>
        </label>
        <span className="text-xs text-slate-500">
          {isAr ? 'الفصحى، الدارجة المغربية، أو الإنجليزية' : 'Fusha, Darija marocaine ou Anglais'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Option 1: الفصحى */}
        <button
          id="select-lang-fusha"
          type="button"
          onClick={() => onSelectLanguage('fusha')}
          className={`relative p-3.5 rounded-xl text-start transition-all cursor-pointer border ${
            selectedLanguage === 'fusha'
              ? 'bg-emerald-50/70 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base shrink-0 ${
                  selectedLanguage === 'fusha'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                ف
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex flex-wrap items-center gap-1.5">
                  <span>الفصحى</span>
                  <span className="text-xs font-normal text-slate-500">
                    (Arabe classique)
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {isAr
                    ? 'نطق فصيح ومتقن للتعليم، التقارير والمحتوى المعرفي'
                    : 'Élocution claire et soignée pour l\'éducatif et le documentaire.'}
                </p>
              </div>
            </div>
            {selectedLanguage === 'fusha' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
          </div>
        </button>

        {/* Option 2: الدارجة المغربية */}
        <button
          id="select-lang-darija"
          type="button"
          onClick={() => onSelectLanguage('darija')}
          className={`relative p-3.5 rounded-xl text-start transition-all cursor-pointer border ${
            selectedLanguage === 'darija'
              ? 'bg-emerald-50/70 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base shrink-0 ${
                  selectedLanguage === 'darija'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                🇲🇦
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex flex-wrap items-center gap-1.5">
                  <span>الدارجة المغربية</span>
                  <span className="text-xs font-normal text-slate-500">
                    (Darija)
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {isAr
                    ? 'نبرة وإيقاع مغربي أصيل وعفوي للسوشيال ميديا والإعلانات'
                    : 'Intonation et débit marocains authentiques pour Reels et pub.'}
                </p>
              </div>
            </div>
            {selectedLanguage === 'darija' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
          </div>
        </button>

        {/* Option 3: الإنجليزية */}
        <button
          id="select-lang-english"
          type="button"
          onClick={() => onSelectLanguage('english')}
          className={`relative p-3.5 rounded-xl text-start transition-all cursor-pointer border ${
            selectedLanguage === 'english'
              ? 'bg-emerald-50/70 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base shrink-0 ${
                  selectedLanguage === 'english'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                🇬🇧
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex flex-wrap items-center gap-1.5">
                  <span>الإنجليزية</span>
                  <span className="text-xs font-normal text-slate-500">
                    (English)
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {isAr
                    ? 'نطق إنجليزي فصيح وطبيعي مع دعم التوقيت وتفريغ الكلمات'
                    : 'Prononciation anglaise fluide et naturelle avec synchronisation.'}
                </p>
              </div>
            </div>
            {selectedLanguage === 'english' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
          </div>
        </button>
      </div>
    </div>
  );
};
