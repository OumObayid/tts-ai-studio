import React from 'react';
import { VoiceParameters } from '../types';
import { Sliders, Gauge, Activity, Volume2, Music, RotateCcw } from 'lucide-react';

interface VoiceParametersPanelProps {
  parameters: VoiceParameters;
  onChangeParameters: (params: VoiceParameters) => void;
  uiLang: 'ar' | 'fr';
}

export const VoiceParametersPanel: React.FC<VoiceParametersPanelProps> = ({
  parameters,
  onChangeParameters,
  uiLang,
}) => {
  const isAr = uiLang === 'ar';

  const handleReset = () => {
    onChangeParameters({
      speed: 1.0,
      pitch: 0,
      expressiveness: 75,
      intonation: 80,
      volume: 100,
    });
  };

  return (
    <div className="w-full bg-slate-50/80 p-4 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between mb-3.5">
        <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <span>{isAr ? 'معايير وضبط الصوت الدقيق' : 'Paramètres fins de la voix'}</span>
        </label>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition"
          title={isAr ? 'إعادة ضبط للافتراضي' : 'Réinitialiser'}
        >
          <RotateCcw className="w-3 h-3" />
          <span>{isAr ? 'افتراضي' : 'Défaut'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Speed (السرعة) */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isAr ? 'سرعة الكلام' : 'Vitesse'}</span>
            </span>
            <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
              {parameters.speed.toFixed(2)}x
            </span>
          </div>
          <input
            id="slider-speed"
            type="range"
            min="0.75"
            max="1.4"
            step="0.05"
            value={parameters.speed}
            onChange={(e) =>
              onChangeParameters({
                ...parameters,
                speed: parseFloat(e.target.value),
              })
            }
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>{isAr ? 'بطيء ومتأنٍ' : '0.75x'}</span>
            <span>{isAr ? 'سريع وحيوي' : '1.40x'}</span>
          </div>
        </div>

        {/* Pitch (طبقة الصوت / Hauteur) */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isAr ? 'طبقة الصوت (الحدة)' : 'Hauteur'}</span>
            </span>
            <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
              {parameters.pitch > 0 ? `+${parameters.pitch}` : parameters.pitch}
            </span>
          </div>
          <input
            id="slider-pitch"
            type="range"
            min="-3"
            max="3"
            step="1"
            value={parameters.pitch}
            onChange={(e) =>
              onChangeParameters({
                ...parameters,
                pitch: parseInt(e.target.value, 10),
              })
            }
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>{isAr ? 'أكثر عمقاً' : 'Grave'}</span>
            <span>{isAr ? 'أكثر حدة' : 'Aigu'}</span>
          </div>
        </div>

        {/* Expressiveness (درجة التعبير / Expressivité) */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isAr ? 'درجة التعبير' : 'Expressivité'}</span>
            </span>
            <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
              {parameters.expressiveness}%
            </span>
          </div>
          <input
            id="slider-expressiveness"
            type="range"
            min="20"
            max="100"
            step="5"
            value={parameters.expressiveness}
            onChange={(e) =>
              onChangeParameters({
                ...parameters,
                expressiveness: parseInt(e.target.value, 10),
              })
            }
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>{isAr ? 'هادئ ومحايد' : '20%'}</span>
            <span>{isAr ? 'تعبيري وعاطفي' : '100%'}</span>
          </div>
        </div>

        {/* Volume (مستوى الصوت) */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isAr ? 'مستوى الصوت' : 'Volume'}</span>
            </span>
            <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
              {parameters.volume}%
            </span>
          </div>
          <input
            id="slider-volume"
            type="range"
            min="20"
            max="100"
            step="5"
            value={parameters.volume}
            onChange={(e) =>
              onChangeParameters({
                ...parameters,
                volume: parseInt(e.target.value, 10),
              })
            }
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>20%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
