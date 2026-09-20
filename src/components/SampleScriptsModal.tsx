import React from 'react';
import { ArabicLanguage, SampleTextItem } from '../types';
import { SAMPLE_TEXTS } from '../data/sampleTexts';
import { X, Sparkles, ArrowRight, BookOpen } from 'lucide-react';

interface SampleScriptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: ArabicLanguage;
  onSelectSample: (sample: SampleTextItem) => void;
  uiLang: 'ar' | 'fr';
}

export const SampleScriptsModal: React.FC<SampleScriptsModalProps> = ({
  isOpen,
  onClose,
  language,
  onSelectSample,
  uiLang,
}) => {
  if (!isOpen) return null;

  const isAr = uiLang === 'ar';
  const filteredSamples = SAMPLE_TEXTS.filter((s) => s.language === language);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isAr
                  ? `نماذج جاهزة (${
                      language === 'english'
                        ? 'اللغة الإنجليزية'
                        : language === 'darija'
                        ? 'الدارجة المغربية'
                        : 'الفصحى'
                    })`
                  : `Textes d'exemples (${
                      language === 'english'
                        ? 'Anglais'
                        : language === 'darija'
                        ? 'Darija marocaine'
                        : 'Arabe classique'
                    })`}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'اختر نصاً حقيقياً لتجربة النطق وجودة الأداء الصوتي فوراً'
                  : 'Cliquez pour insérer un script optimisé et tester la prononciation'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="p-6 overflow-y-auto space-y-3.5 divide-y divide-slate-100">
          {filteredSamples.map((sample) => (
            <div
              key={sample.id}
              className="pt-3 first:pt-0 group p-3.5 rounded-xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/30 transition cursor-pointer"
              onClick={() => {
                onSelectSample(sample);
                onClose();
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                  {isAr ? sample.categoryAr : sample.categoryFr}
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  {isAr ? sample.titleAr : sample.titleFr}
                </span>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed font-normal bg-white p-3 rounded-lg border border-slate-100 group-hover:border-emerald-200">
                « {sample.text} »
              </p>
              <div className="mt-2.5 flex items-center justify-end">
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 group-hover:underline">
                  <span>{isAr ? 'استخدام هذا النص' : 'Insérer ce texte'}</span>
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
