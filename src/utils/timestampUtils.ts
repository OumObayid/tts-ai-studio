import { TimestampCue } from '../types';

/**
 * Regex to match various timestamp patterns like:
 * [00:12], [00:12.345], [01:23:45], (00:12), 00:12 - , etc.
 */
export const TIMESTAMP_REGEX = /\[\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?)\s*\]|\(\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?)\s*\)|^(\d{1,2}:\d{2}(?::\d{2})?)\s*[-:]\s*/gm;

/**
 * Checks if a string contains any timestamp tags
 */
export function hasTimestamps(text: string): boolean {
  if (!text) return false;
  return /\[\s*\d{1,2}:\d{2}/.test(text) || /\(\s*\d{1,2}:\d{2}/.test(text) || /^\d{1,2}:\d{2}\s*[-:]/m.test(text);
}

/**
 * Strips all timestamps from text so that TTS reads clean speech
 * without reciting numbers or brackets
 */
export function stripTimestamps(text: string): string {
  if (!text) return '';
  return text
    // Remove [00:00] or [00:00:00] or [00:00.000]
    .replace(/\[\s*\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?\s*\]/g, '')
    // Remove (00:00) or (00:00:00)
    .replace(/\(\s*\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?\s*\)/g, '')
    // Remove leading timestamp like "00:12 - " at line starts
    .replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?\s*[-:]\s*/gm, '')
    // Normalize spaces and clean blank lines
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Formats seconds into MM:SS
 */
export function formatSecondsToMMSS(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Formats seconds into HH:MM:SS,mmm (SRT format)
 */
export function formatSecondsToSrtTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00:00,000';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Formats seconds into HH:MM:SS.mmm (VTT format)
 */
export function formatSecondsToVttTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00:00.000';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

/**
 * Parses MM:SS or HH:MM:SS string to seconds
 */
export function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.trim().split(':').map((p) => parseFloat(p));
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  return 0;
}

/**
 * Splits text into natural speech segments (sentences/phrases)
 */
export function segmentText(text: string): string[] {
  const clean = stripTimestamps(text);
  if (!clean.trim()) return [];

  // Split by line breaks first, or sentence terminators (., !, ?, \n, ؛)
  const lines = clean.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const segments: string[] = [];

  for (const line of lines) {
    // If line has multiple sentences, split by punctuation
    const sentenceRegex = /[^.!?؟؛;]+(?:[.!?؟؛;]+(?:\s+|$)|$)/g;
    const matches = line.match(sentenceRegex);
    if (matches && matches.length > 0) {
      for (const m of matches) {
        const trimmed = m.trim();
        if (trimmed.length > 0) {
          segments.push(trimmed);
        }
      }
    } else {
      segments.push(line);
    }
  }

  return segments.length > 0 ? segments : [clean];
}

/**
 * Extracts or generates timestamp cues aligned with the audio duration
 */
export function extractOrGenerateTimestampCues(
  originalText: string,
  totalDurationSeconds: number = 10
): TimestampCue[] {
  const duration = Math.max(1, totalDurationSeconds);

  // Check if originalText had embedded timestamps like [00:00] Text ... [00:05] Next ...
  const lines = originalText.split('\n').map((l) => l.trim()).filter(Boolean);
  const explicitCues: { timeStr: string; text: string }[] = [];

  const lineTimeRegex = /^\[\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*\]\s*(.*)$/;
  let hasExplicit = false;

  for (const line of lines) {
    const match = line.match(lineTimeRegex);
    if (match) {
      hasExplicit = true;
      explicitCues.push({
        timeStr: match[1],
        text: match[2].trim(),
      });
    }
  }

  if (hasExplicit && explicitCues.length > 0) {
    const cues: TimestampCue[] = [];
    for (let i = 0; i < explicitCues.length; i++) {
      const current = explicitCues[i];
      const startSec = parseTimeToSeconds(current.timeStr);
      let endSec = duration;
      if (i < explicitCues.length - 1) {
        endSec = Math.min(duration, parseTimeToSeconds(explicitCues[i + 1].timeStr));
      }
      if (endSec <= startSec) {
        endSec = startSec + 3;
      }
      cues.push({
        id: `cue-${i}`,
        startSeconds: startSec,
        endSeconds: endSec,
        startTimeFormatted: formatSecondsToMMSS(startSec),
        endTimeFormatted: formatSecondsToMMSS(endSec),
        text: current.text || '(silence)',
      });
    }
    return cues;
  }

  // Otherwise, automatically distribute duration across segmented sentences
  const segments = segmentText(originalText);
  if (segments.length === 0) return [];

  // Calculate proportional durations based on character count / weight
  const totalChars = segments.reduce((sum, s) => sum + Math.max(1, s.length), 0);
  const cues: TimestampCue[] = [];
  let currentStart = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const weight = Math.max(1, seg.length) / totalChars;
    const segDuration = Math.max(1.2, duration * weight);
    const endSec = i === segments.length - 1 ? duration : Math.min(duration, currentStart + segDuration);

    cues.push({
      id: `cue-${i}`,
      startSeconds: parseFloat(currentStart.toFixed(2)),
      endSeconds: parseFloat(endSec.toFixed(2)),
      startTimeFormatted: formatSecondsToMMSS(currentStart),
      endTimeFormatted: formatSecondsToMMSS(endSec),
      text: seg,
    });

    currentStart = endSec;
  }

  return cues;
}

/**
 * Generate standard SRT subtitle content
 */
export function generateSrt(cues: TimestampCue[]): string {
  return cues
    .map((cue, index) => {
      const idx = index + 1;
      const start = formatSecondsToSrtTime(cue.startSeconds);
      const end = formatSecondsToSrtTime(cue.endSeconds);
      return `${idx}\n${start} --> ${end}\n${cue.text}\n`;
    })
    .join('\n');
}

/**
 * Generate WebVTT content
 */
export function generateVtt(cues: TimestampCue[]): string {
  const body = cues
    .map((cue) => {
      const start = formatSecondsToVttTime(cue.startSeconds);
      const end = formatSecondsToVttTime(cue.endSeconds);
      return `${start} --> ${end}\n${cue.text}\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${body}`;
}

/**
 * Format script with inline timestamps [MM:SS] Text
 */
export function formatScriptWithTimestamps(cues: TimestampCue[]): string {
  return cues.map((cue) => `[${cue.startTimeFormatted}] ${cue.text}`).join('\n');
}

/**
 * Adds estimated timestamp tags [00:00] to raw text based on normal speaking rate (~130 words per minute)
 */
export function addEstimatedTimestampsToText(text: string): string {
  const segments = segmentText(text);
  if (segments.length === 0) return text;

  let currentSec = 0;
  const resultLines: string[] = [];

  for (const seg of segments) {
    const words = seg.trim().split(/\s+/).length;
    // ~2.2 words per second in speech
    const duration = Math.max(2, Math.round(words / 2.2));
    resultLines.push(`[${formatSecondsToMMSS(currentSec)}] ${seg}`);
    currentSec += duration;
  }

  return resultLines.join('\n');
}
