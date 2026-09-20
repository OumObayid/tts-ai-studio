import React from 'react';
import { NarrationStyleId } from '../types';
import { NARRATION_STYLES } from '../data/voices';
import { CheckCircle2 } from 'lucide-react';

interface StyleSelectorProps {
  selectedStyle: NarrationStyleId;
  onSelectStyle: (style: NarrationStyleId) => void;
  uiLang: 'ar' | 'fr';
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({
  selectedStyle,
  onSelectStyle,
  uiLang,
}) => {
  const isAr = uiLang === 'ar';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
            3
          </span>
          <span>{isAr ? 'أسلوب ونبرة الإلقاء' : '3. Style de narration'}</span>
        </label>
        <span className="text-xs text-slate-500">
          {isAr ? 'يحدد النغمة والإيقاع والتعبير' : 'Ajuste l\'intonation et l\'expressivité'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5">
        {NARRATION_STYLES.map((style) => {
          const isSelected = selectedStyle === style.id;
          return (
            <button
              key={style.id}
              id={`style-btn-${style.id}`}
              type="button"
              onClick={() => onSelectStyle(style.id)}
              className={`p-3 rounded-xl border text-start transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-slate-900 leading-tight">
                    {isAr ? style.labelAr : style.labelFr}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {isAr ? style.descriptionAr : style.descriptionFr}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
