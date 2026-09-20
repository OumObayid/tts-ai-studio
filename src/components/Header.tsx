import React from 'react';
import { Volume2, Sparkles, Languages, Radio } from 'lucide-react';

interface HeaderProps {
  uiLang: 'ar' | 'fr';
  onToggleUiLang: () => void;
}

export const Header: React.FC<HeaderProps> = ({ uiLang, onToggleUiLang }) => {
  const isAr = uiLang === 'ar';

  return (
    <header className="w-full bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-bold">
            <Volume2 className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>{isAr ? 'صوت عربي' : 'Sawt Arabi'}</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  TTS AI
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              {isAr
                ? 'الفصحى والدارجة المغربية • أصوات طبيعية وواقعية'
                : 'Arabe classique & Darija marocaine • Voix ultra-naturelles'}
            </p>
          </div>
        </div>

        {/* Status Pill & UI Language Toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{isAr ? 'محرك صوتي عالي الدقة' : 'Moteur vocal HD'}</span>
          </div>

          <button
            id="toggle-ui-lang-btn"
            type="button"
            onClick={onToggleUiLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
            title={isAr ? 'Changer la langue de l\'interface' : 'تغيير لغة الواجهة'}
          >
            <Languages className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isAr ? 'Français' : 'العربية'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
