import React from 'react';
import { GenerationHistoryItem } from '../types';
import { Play, Download, Trash2, Clock, Volume2 } from 'lucide-react';

interface HistoryListProps {
  history: GenerationHistoryItem[];
  onPlayItem: (item: GenerationHistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  uiLang: 'ar' | 'fr';
}

export const HistoryList: React.FC<HistoryListProps> = ({
  history,
  onPlayItem,
  onDeleteItem,
  onClearAll,
  uiLang,
}) => {
  const isAr = uiLang === 'ar';

  if (history.length === 0) {
    return null;
  }

  const handleDownload = (item: GenerationHistoryItem) => {
    const link = document.createElement('a');
    link.href = `data:audio/wav;base64,${item.audioBase64}`;
    link.download = `sawt-arabi-${item.voiceNameFr.toLowerCase()}-${item.id}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mt-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">
            {isAr ? 'سجل التسجيلات المولدة' : 'Historique des générations'}
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
            {history.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{isAr ? 'مسح السجل' : 'Tout effacer'}</span>
        </button>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {history.map((item) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-white transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  {item.voiceNameAr} ({item.voiceNameFr})
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
                  {item.language === 'english'
                    ? (isAr ? 'إنجليزية 🇬🇧' : 'Anglais 🇬🇧')
                    : item.language === 'darija'
                    ? (isAr ? 'دارجة مغربية' : 'Darija')
                    : (isAr ? 'فصحى' : 'Fusha')}
                </span>
                {item.timestampCues && item.timestampCues.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                    ⏱ {item.timestampCues.length} cues
                  </span>
                )}
                <span className="text-[11px] text-slate-400 font-mono">
                  {item.durationSeconds.toFixed(1)}s
                </span>
              </div>
              <p className="text-xs text-slate-600 line-clamp-1 font-normal font-sans">
                « {item.text} »
              </p>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-center">
              {/* Play */}
              <button
                type="button"
                onClick={() => onPlayItem(item)}
                className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer shadow-xs"
                title={isAr ? 'استماع' : 'Écouter'}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>

              {/* Download */}
              <button
                type="button"
                onClick={() => handleDownload(item)}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                title={isAr ? 'تحميل' : 'Télécharger'}
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => onDeleteItem(item.id)}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title={isAr ? 'حذف' : 'Supprimer'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
