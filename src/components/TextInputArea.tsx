import React, { useRef, useState } from 'react';
import { ArabicLanguage } from '../types';
import {
  FileText,
  Sparkles,
  BookOpen,
  Trash2,
  Copy,
  Check,
  Wand2,
  Info,
  Loader2,
  Clock,
  Clock8,
  Timer,
} from 'lucide-react';
import {
  hasTimestamps,
  stripTimestamps,
  addEstimatedTimestampsToText,
} from '../utils/timestampUtils';

interface TextInputAreaProps {
  text: string;
  onChangeText: (newText: string) => void;
  language: ArabicLanguage;
  onOpenSamples: () => void;
  uiLang: 'ar' | 'fr';
  onVocalizeText: () => Promise<void>;
  isVocalizing: boolean;
}

export const TextInputArea: React.FC<TextInputAreaProps> = ({
  text,
  onChangeText,
  language,
  onOpenSamples,
  uiLang,
  onVocalizeText,
  isVocalizing,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const [timestampNotice, setTimestampNotice] = useState<string | null>(null);
  const isAr = uiLang === 'ar';
  const isEnglish = language === 'english';
  const textHasTimestamps = hasTimestamps(text);

  const diacritics = [
    { char: 'َ', nameAr: 'فتحة', nameFr: 'Fatha' },
    { char: 'ُ', nameAr: 'ضمة', nameFr: 'Damma' },
    { char: 'ِ', nameAr: 'كسرة', nameFr: 'Kasra' },
    { char: 'ْ', nameAr: 'سكون', nameFr: 'Sukun' },
    { char: 'ّ', nameAr: 'شدة', nameFr: 'Shadda' },
    { char: 'ً', nameAr: 'تنوين فتح', nameFr: 'Tanwin Fath' },
    { char: 'ٌ', nameAr: 'تنوين ضم', nameFr: 'Tanwin Damm' },
    { char: 'ٍ', nameAr: 'تنوين كسر', nameFr: 'Tanwin Kasr' },
  ];

  const insertDiacritic = (dChar: string) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentText = el.value;

    const newText = currentText.substring(0, start) + dChar + currentText.substring(end);
    onChangeText(newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + dChar.length, start + dChar.length);
    }, 0);
  };

  const handleInsertTimestampAtCursor = () => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentText = el.value;
    const tag = '[00:00] ';

    const newText = currentText.substring(0, start) + tag + currentText.substring(end);
    onChangeText(newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleStripTimestamps = () => {
    const cleaned = stripTimestamps(text);
    onChangeText(cleaned);
    setTimestampNotice(
      isAr
        ? 'تمت إزالة جميع الطوابع الزمنية (بدون timestamp)'
        : 'Horodatages retirés (Sans timestamp)'
    );
    setTimeout(() => setTimestampNotice(null), 2500);
  };

  const handleAddEstimatedTimestamps = () => {
    const formatted = addEstimatedTimestampsToText(text);
    onChangeText(formatted);
    setTimestampNotice(
      isAr
        ? 'تمت إضافة الطوابع الزمنية التقديرية (مع timestamp)'
        : 'Horodatages estimés ajoutés (Avec timestamp)'
    );
    setTimeout(() => setTimestampNotice(null), 2500);
  };

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div className="w-full bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>
            {isEnglish
              ? (isAr ? 'نص السكربت بالإنجليزية' : 'Script en anglais')
              : (isAr ? 'نص السكربت العربي' : 'Script arabe à vocaliser')}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
            {language === 'english'
              ? (isAr ? 'الإنجليزية 🇬🇧' : 'English 🇬🇧')
              : language === 'darija'
              ? (isAr ? 'دارجة مغربية 🇲🇦' : 'Darija 🇲🇦')
              : (isAr ? 'فصحى 📜' : 'Fusha 📜')}
          </span>
        </label>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Timestamp Tools: Avec / Sans Timestamp */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200/80">
            {textHasTimestamps ? (
              <button
                id="btn-remove-timestamps"
                type="button"
                onClick={handleStripTimestamps}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-white hover:bg-rose-50 text-rose-700 hover:border-rose-300 text-xs font-semibold border border-slate-200 shadow-2xs transition cursor-pointer"
                title={isAr ? 'حذف علامات [00:00] من النص' : 'Supprimer les balises d\'horodatage [00:00]'}
              >
                <Clock8 className="w-3.5 h-3.5 text-rose-600" />
                <span>{isAr ? 'بدون توقيت (Sans timestamp)' : 'Sans timestamp'}</span>
              </button>
            ) : (
              <button
                id="btn-add-timestamps"
                type="button"
                onClick={handleAddEstimatedTimestamps}
                disabled={!text.trim()}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-white hover:bg-emerald-50 text-emerald-700 hover:border-emerald-300 text-xs font-semibold border border-slate-200 shadow-2xs transition cursor-pointer disabled:opacity-50"
                title={isAr ? 'توليد أوقات [00:00] لكل جملة بناءً على سرعة الإلقاء' : 'Générer des balises [00:00] par phrase'}
              >
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAr ? 'مع توقيت (Avec timestamp)' : 'Avec timestamp'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleInsertTimestampAtCursor}
              className="px-1.5 py-1 rounded-md text-slate-600 hover:bg-slate-200/70 text-xs font-mono font-medium transition cursor-pointer"
              title={isAr ? 'إدراج وسم [00:00] عند المؤشر' : 'Insérer [00:00]'}
            >
              + [00:00]
            </button>
          </div>

          {/* Tashkeel Auto-Diacritize (Arabic only) */}
          {!isEnglish && (
            <button
              type="button"
              onClick={onVocalizeText}
              disabled={!text.trim() || isVocalizing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              title={isAr ? 'إضافة التشكيل والحركات تلقائياً لضبط النطق' : 'Ajouter les voyelles / diacritiques (Tashkeel)'}
            >
              {isVocalizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <Wand2 className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>{isAr ? 'تشكيل ذكي ✨' : 'Tashkeel auto ✨'}</span>
            </button>
          )}

          {/* Sample Scripts Modal Button */}
          <button
            id="open-samples-btn"
            type="button"
            onClick={onOpenSamples}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-600" />
            <span>{isAr ? 'نماذج جاهزة' : 'Exemples'}</span>
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!text.trim()}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer disabled:opacity-40"
            title={isAr ? 'نسخ النص' : 'Copier le texte'}
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onClick={() => onChangeText('')}
            disabled={!text.trim()}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer disabled:opacity-40"
            title={isAr ? 'مسح النص' : 'Effacer'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Temporary confirmation toast if timestamp was toggled */}
      {timestampNotice && (
        <div className="mb-2.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium animate-in fade-in flex items-center justify-between">
          <span>✓ {timestampNotice}</span>
          <button
            type="button"
            onClick={() => setTimestampNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          id="script-textarea"
          dir={isEnglish ? 'ltr' : 'rtl'}
          rows={5}
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={
            isEnglish
              ? (isAr
                  ? 'Type your English script here... (You can use [00:00] timestamps if desired)'
                  : 'Saisissez votre texte en anglais... (avec ou sans [00:00] timestamps)')
              : language === 'darija'
              ? (isAr
                  ? 'اكتب نصك بالدارجة المغربية هنا... (مثال: واش عمرك تساءلتي فين كيمشي الأكسجين ملي كتاخدي النفس؟)'
                  : 'Saisissez votre script en Darija marocaine...')
              : (isAr
                  ? 'أدخل النص باللغة العربية الفصحى هنا... (مثال: يُعتبر النطق الواضح والترتيل الموزون أساس الإلقاء الصوتي المتقن...)'
                  : 'Saisissez votre script en arabe classique...')
          }
          className={`w-full p-4 text-slate-900 bg-slate-50/50 rounded-xl border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 text-lg leading-loose transition resize-y font-sans tracking-wide ${
            isEnglish ? 'text-left' : 'text-right'
          }`}
        />
      </div>

      {/* Quick Tashkeel / Diacritics Toolbar (Only in Arabic / Darija) */}
      {!isEnglish ? (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 me-1">
              {isAr ? 'شريط الحركات:' : 'Diacritiques:'}
            </span>
            {diacritics.map((d) => (
              <button
                key={d.nameAr}
                type="button"
                onClick={() => insertDiacritic(d.char)}
                title={isAr ? d.nameAr : d.nameFr}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 text-base font-bold transition cursor-pointer border border-slate-200/60"
              >
                ـ{d.char}
              </button>
            ))}
          </div>

          {/* Word & Char Counters */}
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>
              {wordCount} {isAr ? 'كلمة' : 'mots'}
            </span>
            <span>•</span>
            <span>
              {charCount} {isAr ? 'حرف' : 'caractères'}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Timer className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {isAr
                ? 'دعم كامل للطوابع الزمنية [00:00]: المحرك يقرأ النص بطلاقة ويولد تفريغاً متزامناً بالثواني'
                : 'Support complet des timestamps [00:00] : synchronisation mot à mot et export .SRT/.VTT'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>
              {wordCount} {isAr ? 'كلمة' : 'words'}
            </span>
            <span>•</span>
            <span>
              {charCount} {isAr ? 'حرف' : 'chars'}
            </span>
          </div>
        </div>
      )}

      {/* Strict Script Rule Banner */}
      <div className="mt-3 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100/80 flex items-start gap-2 text-xs text-emerald-900">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {isAr
            ? 'ملاحظة: يقوم المحرك بقراءة النص حرفياً بدون زيادة. عند استخدام طوابع زمنية [00:00]، يتم نطق الكلمات فقط دون تلاوة الأرقام، مع توفير توقيت زمني دقيق في المشغّل.'
            : 'Règle stricte: le moteur TTS prononce mot à mot exactement votre texte sans reformuler. Les balises [00:00] sont interprétées comme repères temporels sans être prononcées à voix haute.'}
        </p>
      </div>
    </div>
  );
};
