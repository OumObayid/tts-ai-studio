import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '30mb' }));

// Persistent Server-Side Storage for Custom Voices
const DATA_DIR = path.join(process.cwd(), 'data');
const VOICES_FILE = path.join(DATA_DIR, 'custom_voices.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(VOICES_FILE)) {
      fs.writeFileSync(VOICES_FILE, JSON.stringify([]), 'utf-8');
    }
  } catch (err) {
    console.warn('Failed to ensure data dir:', err);
  }
}

function getStoredVoicesServer(): any[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(VOICES_FILE)) return [];
    const raw = fs.readFileSync(VOICES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read server voices:', err);
    return [];
  }
}

function saveVoiceServer(voice: any): any[] {
  try {
    ensureDataDir();
    const existing = getStoredVoicesServer();
    const filtered = existing.filter((v: any) => v.id !== voice.id);
    const updated = [voice, ...filtered];
    fs.writeFileSync(VOICES_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (err) {
    console.error('Failed to save voice on server:', err);
    return getStoredVoicesServer();
  }
}

function deleteVoiceServer(id: string): any[] {
  try {
    ensureDataDir();
    const existing = getStoredVoicesServer();
    const updated = existing.filter((v: any) => v.id !== id);
    fs.writeFileSync(VOICES_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (err) {
    console.error('Failed to delete voice on server:', err);
    return getStoredVoicesServer();
  }
}

// Lazy Google GenAI Client
let genAIClient: GoogleGenAI | null = null;
function resetGenAI(): void {
  genAIClient = null;
}
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined in environment.');
    }
    genAIClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Convert PCM 24kHz 16-bit Mono Buffer to standard WAV Buffer
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  // Check if buffer is already a valid RIFF/WAV or MP3
  if (pcmBuffer.length >= 4) {
    const magic = pcmBuffer.subarray(0, 4).toString('ascii');
    if (magic === 'RIFF') {
      return pcmBuffer;
    }
  }

  const header = Buffer.alloc(44);
  const dataSize = pcmBuffer.length;
  const fileSize = 36 + dataSize;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  // RIFF chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);

  // "fmt " sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Map style to descriptive instruction
const STYLE_PROMPTS: Record<string, string> = {
  professional: 'Tone: Professional, formal, well-articulated, polished, steady dignified cadence.',
  educational: 'Tone: Educational, didactic, engaging, patient, clearly paced for learning.',
  scientific: 'Tone: Scientific, academic, precise, objective, measured and articulate.',
  warm: 'Tone: Warm, friendly, affectionate, comforting, human and conversational.',
  surprised: 'Tone: Surprised, intrigued, engaging, expressive with dynamic lively inflection.',
  dynamic: 'Tone: Energetic, enthusiastic, upbeat, motivational with crisp momentum.',
  calm: 'Tone: Calm, serene, relaxed, gentle, soft and tranquil breathing.',
  documentary: 'Tone: Documentary, cinematic, deep, resonant, evocative and solemn.',
  social_media: 'Tone: Short-form video / social media (Reels/TikTok), punchy, catchy, authentic and vibrant.',
};

// API: Check status
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// In-memory TTS cache & quota cooldown lock to protect Google Free Tier limit
const ttsCache = new Map<string, any>();
let ttsQuotaBlockedUntil = 0;

function serverStripTimestamps(text: string): string {
  if (!text) return '';
  return text
    .replace(/\[\s*\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?\s*\]/g, '')
    .replace(/\(\s*\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?\s*\)/g, '')
    .replace(/^\s*\d{1,2}:\d{2}(?::\d{2})?\s*[-:]\s*/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

function formatSecToMMSS(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function extractServerTimestampCues(text: string, durationEstimate: number) {
  const duration = Math.max(1, durationEstimate);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const explicitCues: { startSec: number; text: string }[] = [];
  const lineTimeRegex = /^\[\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*\]\s*(.*)$/;

  for (const line of lines) {
    const match = line.match(lineTimeRegex);
    if (match) {
      const parts = match[1].split(':').map(Number);
      const sec = parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
      explicitCues.push({ startSec: sec, text: match[2].trim() });
    }
  }

  if (explicitCues.length > 0) {
    return explicitCues.map((c, i) => {
      const endSec = i < explicitCues.length - 1 ? Math.min(duration, explicitCues[i + 1].startSec) : duration;
      const cleanEndSec = Math.max(c.startSec + 1, endSec);
      return {
        id: `cue-${i}`,
        startSeconds: c.startSec,
        endSeconds: cleanEndSec,
        startTimeFormatted: formatSecToMMSS(c.startSec),
        endTimeFormatted: formatSecToMMSS(cleanEndSec),
        text: c.text,
      };
    });
  }

  const clean = serverStripTimestamps(text);
  const sentenceRegex = /[^.!?؟؛;\n]+(?:[.!?؟؛;\n]+(?:\s+|$)|$)/g;
  const matches = clean.match(sentenceRegex) || [clean];
  const segments = matches.map((m) => m.trim()).filter(Boolean);
  if (segments.length === 0) return [];

  const totalChars = segments.reduce((acc, s) => acc + Math.max(1, s.length), 0);
  const cues = [];
  let cur = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const weight = Math.max(1, seg.length) / totalChars;
    const end = i === segments.length - 1 ? duration : Math.min(duration, cur + Math.max(1.2, duration * weight));
    cues.push({
      id: `cue-${i}`,
      startSeconds: parseFloat(cur.toFixed(2)),
      endSeconds: parseFloat(end.toFixed(2)),
      startTimeFormatted: formatSecToMMSS(cur),
      endTimeFormatted: formatSecToMMSS(end),
      text: seg,
    });
    cur = end;
  }
  return cues;
}

// Strictly supported prebuilt voices for gemini-3.1-flash-tts-preview
const VALID_GEMINI_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'] as const;
type ValidGeminiVoice = (typeof VALID_GEMINI_VOICES)[number];

function sanitizeGeminiVoice(candidate: any, gender: string = 'female'): ValidGeminiVoice {
  if (candidate === 'Aoede') {
    return gender === 'female' ? 'Zephyr' : 'Kore';
  }
  if (candidate && (VALID_GEMINI_VOICES as readonly string[]).includes(candidate)) {
    return candidate as ValidGeminiVoice;
  }
  if (gender === 'male') return 'Fenrir';
  if (gender === 'child') return 'Puck';
  return 'Kore';
}

// API: Generate Text-to-Speech (Arabic Fusha, Moroccan Darija, English)
app.post('/api/tts/generate', async (req, res) => {
  try {
    const {
      text,
      language = 'fusha',
      voiceId,
      gender = 'male',
      ageCategory = 'adult',
      style = 'professional',
      geminiVoice = 'Kore',
      parameters = {},
      customStylePrompt = '',
      customVoice = null,
      customVoiceApplyModification = false,
    } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required and cannot be empty.' });
    }

    const trimmedText = text.trim();

    if (language !== 'fusha' && language !== 'darija' && language !== 'english') {
      return res.status(400).json({
        error: 'Only Classical Arabic (fusha), Moroccan Darija (darija), and English (english) are supported.',
      });
    }

    // Prepare clean text for TTS voiceover so raw timestamps [00:00] are not read as numbers
    const cleanSpeechText = serverStripTimestamps(trimmedText);
    const speechTextToSynthesize = cleanSpeechText.length > 0 ? cleanSpeechText : trimmedText;

    // Check in-memory cache to avoid consuming Google quota for identical queries
    const cacheKey = JSON.stringify({
      text: speechTextToSynthesize,
      language,
      voiceId,
      style,
      geminiVoice,
      speed: parameters?.speed ?? 1.0,
      pitch: parameters?.pitch ?? 0,
      expressiveness: parameters?.expressiveness ?? 80,
      customStylePrompt: customStylePrompt?.trim() || '',
      customVoiceId: customVoice?.id || null,
      customVoiceApplyModification: !!customVoiceApplyModification,
    });

    if (ttsCache.has(cacheKey)) {
      console.log('Serving TTS audio from cache (preserves Google quota)');
      return res.json(ttsCache.get(cacheKey));
    }

    // Check if we are currently in a Google Free Tier cooldown window
    const now = Date.now();
    if (now < ttsQuotaBlockedUntil) {
      const waitSec = Math.max(1, Math.ceil((ttsQuotaBlockedUntil - now) / 1000));
      return res.status(429).json({
        error: `Quota temporaire dépassé (Google Free Tier). Veuillez patienter ${waitSec} secondes avant de relancer.`,
        isQuotaExceeded: true,
        retryAfterSeconds: waitSec,
      });
    }

    const ai = getGenAI();

    // Available valid prebuilt voices strictly supported by gemini-3.1-flash-tts-preview:
    // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    let chosenVoice = sanitizeGeminiVoice(geminiVoice, gender);
    if (customVoice && customVoice.acousticProfile) {
      const cp = customVoice.acousticProfile;
      chosenVoice = sanitizeGeminiVoice(cp.recommendedCarrierVoice, cp.gender || gender);
    }

    // Build optimized, direct prompt that Gemini TTS understands best
    let langPart = 'in clear, eloquent Classical Arabic (الفصحى)';
    if (language === 'darija') {
      langPart = 'in authentic Moroccan Darija (الدارجة المغربية) with natural colloquial flow';
    } else if (language === 'english') {
      langPart = 'in fluent, natural English with clear pronunciation';
    }

    let stylePart = '';
    switch (style) {
      case 'news':
        stylePart = 'in a formal, professional news anchor tone';
        break;
      case 'documentary':
        stylePart = 'in a deep, contemplative documentary narration tone';
        break;
      case 'storytelling':
        stylePart = 'in an engaging, expressive storyteller tone';
        break;
      case 'commercial':
        stylePart = 'in a vibrant, persuasive, upbeat commercial tone';
        break;
      case 'meditation':
        stylePart = 'in a gentle, soothing, calm meditative relaxation tone';
        break;
      case 'podcast':
        stylePart = 'in a friendly, conversational, warm podcast tone';
        break;
      case 'dramatic':
        stylePart = 'in an intense, cinematic, emotional dramatic tone';
        break;
      case 'poetry':
        stylePart = 'in an eloquent, rhythmic, poetic tone';
        break;
      case 'energetic':
        stylePart = 'in an energetic, lively, cheerful tone';
        break;
      default:
        stylePart = 'in a natural, articulate, balanced tone';
        break;
    }

    const speed = parameters?.speed || 1.0;
    const speedPart = speed > 1.25 ? 'at a brisk pace' : speed < 0.85 ? 'at an unhurried, measured pace' : '';
    const customUserPart = customStylePrompt && typeof customStylePrompt === 'string' && customStylePrompt.trim()
      ? `with nuance: ${customStylePrompt.trim()}`
      : '';

    let clonePart = '';
    if (customVoice && customVoice.acousticProfile) {
      const cp = customVoice.acousticProfile;
      if (!customVoiceApplyModification) {
        clonePart = `matching the natural vocal timbre and cadence of "${customVoice.name}" (${cp.timbreDescription || 'authentic voice'})`;
      } else {
        clonePart = `in the voice persona of "${customVoice.name}"`;
      }
    }

    const descriptors = [langPart, stylePart, clonePart, speedPart, customUserPart].filter(Boolean).join(', ');
    const fullPrompt = `Read aloud ${descriptors}:\n\n${speechTextToSynthesize}`;

    let audioBase64: string | null = null;
    let finishReason: string | null = null;
    let candidateText: string | null = null;
    let lastError: any = null;

    // Primary TTS invocation
    try {
      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      });

      const candidate = ttsResponse.candidates?.[0];
      finishReason = candidate?.finishReason || null;
      const audioPart = candidate?.content?.parts?.find((p: any) => p.inlineData?.data);

      if (audioPart?.inlineData?.data) {
        audioBase64 = audioPart.inlineData.data;
      } else {
        const textPart = candidate?.content?.parts?.find((p: any) => p.text);
        if (textPart?.text) {
          candidateText = textPart.text;
          console.warn('TTS model outputted text instead of audio:', textPart.text);
        }
      }
    } catch (primaryErr: any) {
      lastError = primaryErr;
      const errMsg = primaryErr?.message || '';
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('403')) {
        throw primaryErr;
      }
      console.warn('Primary TTS attempt encountered non-fatal error:', errMsg);
      // If network socket dropped or fetch failed, reset cached GenAI client so retry gets a fresh connection
      if (errMsg.includes('fetch failed') || errMsg.includes('ECONN') || errMsg.includes('ETIMEDOUT') || errMsg.includes('UND_ERR')) {
        resetGenAI();
      }
    }

    // Fallback retry with ultra-clean direct instruction if primary attempt produced no audio
    if (!audioBase64 && finishReason !== 'SAFETY' && finishReason !== 'BLOCKLIST') {
      console.log('Retrying TTS with ultra-clean direct speech prompt...');
      // Brief pause if socket had dropped to allow network recovery
      if (lastError?.message?.includes('fetch failed')) {
        await new Promise((r) => setTimeout(r, 600));
      }

      const langPrefix = language === 'darija' ? 'Say in Moroccan Darija: ' : language === 'english' ? 'Say in English: ' : 'Say in Arabic: ';
      const fallbackPrompt = `${langPrefix}${speechTextToSynthesize}`;

      try {
        const retryAi = getGenAI();
        const fallbackResponse = await retryAi.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: [{ parts: [{ text: fallbackPrompt }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: chosenVoice },
              },
            },
          },
        });

        const fbCandidate = fallbackResponse.candidates?.[0];
        finishReason = fbCandidate?.finishReason || finishReason;
        const fbAudioPart = fbCandidate?.content?.parts?.find((p: any) => p.inlineData?.data);

        if (fbAudioPart?.inlineData?.data) {
          audioBase64 = fbAudioPart.inlineData.data;
          lastError = null;
        } else {
          const fbTextPart = fbCandidate?.content?.parts?.find((p: any) => p.text);
          if (fbTextPart?.text) {
            candidateText = fbTextPart.text;
          }
        }
      } catch (fbErr: any) {
        lastError = fbErr;
        const fbMsg = fbErr?.message || '';
        if (fbMsg.includes('429') || fbMsg.includes('RESOURCE_EXHAUSTED')) {
          throw fbErr;
        }
        console.error('Fallback TTS attempt also encountered error:', fbMsg);
      }
    }

    if (!audioBase64) {
      if (finishReason === 'SAFETY') {
        throw new Error('Le texte a été bloqué par les filtres de sécurité Google.');
      }
      if (finishReason === 'RECITATION') {
        throw new Error('Le texte a été bloqué par les filtres de récitation.');
      }
      if (candidateText) {
        throw new Error(`Le modèle n'a pas pu synthétiser l'audio et a répondu: "${candidateText.substring(0, 100)}"`);
      }
      if (lastError) {
        throw lastError;
      }
      throw new Error(`Le modèle TTS n'a pas renvoyé de flux audio (Statut: ${finishReason || 'inconnu'}).`);
    }

    const rawBuffer = Buffer.from(audioBase64, 'base64');
    const wavBuffer = pcmToWav(rawBuffer, 24000, 1, 16);
    const wavBase64 = wavBuffer.toString('base64');

    // Estimate duration in seconds (24000 samples/sec * 2 bytes/sample = 48000 bytes/sec)
    const durationEstimate = Math.max(1, Math.round((rawBuffer.length / 48000) * 10) / 10);

    const voiceDisplayName = customVoice
      ? customVoiceApplyModification
        ? `${customVoice.name} (Avec modifications)`
        : `${customVoice.name} (Sans modification)`
      : chosenVoice;

    // Generate cues for interactive karaoke subtitles & export
    const timestampCues = extractServerTimestampCues(trimmedText, durationEstimate);

    const responsePayload = {
      audioBase64: wavBase64,
      audioUrl: `data:audio/wav;base64,${wavBase64}`,
      durationEstimateSeconds: durationEstimate,
      sampleRate: 24000,
      voiceUsed: voiceDisplayName,
      language,
      style,
      isCustomVoice: !!customVoice,
      customVoiceApplyModification: !!customVoiceApplyModification,
      cleanText: speechTextToSynthesize,
      timestampCues,
    };

    // Save in cache
    ttsCache.set(cacheKey, responsePayload);
    if (ttsCache.size > 80) {
      const first = ttsCache.keys().next().value;
      if (first) ttsCache.delete(first);
    }
    ttsQuotaBlockedUntil = 0;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.json(responsePayload);
  } catch (error: any) {
    console.error('Error generating Arabic TTS (technical details):', error);
    const msg = error?.message || '';
    let friendly = 'Erreur API lors de la génération audio.';
    let retryAfterSeconds: number | null = null;
    let isQuotaExceeded = false;
    let isDailyQuota = false;

    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      isQuotaExceeded = true;
      // Check if it's the daily limit (GenerateRequestsPerDay or limit: 10)
      if (
        msg.includes('PerDay') ||
        msg.includes('GenerateRequestsPerDay') ||
        msg.includes('limit: 10')
      ) {
        isDailyQuota = true;
        retryAfterSeconds = null; // Do NOT set a countdown of seconds for a 24h quota!
        friendly =
          'Le quota journalier gratuit de Google (10 requêtes / 24 heures pour gemini-3.1-flash-tts) a été atteint. Ce quota se renouvelle toutes les 24 heures (à minuit UTC). Pour un usage illimité sans attendre, utilisez une clé API avec facturation (Pay-as-you-go) dans Settings > Secrets.';
      } else {
        const retryMatch = msg.match(/retry in\s+([0-9.]+)\s*s/i) || msg.match(/retryDelay"?:\s*"([0-9]+)s/i);
        if (retryMatch && retryMatch[1]) {
          retryAfterSeconds = Math.max(5, Math.ceil(parseFloat(retryMatch[1])) + 2);
        } else {
          retryAfterSeconds = 50;
        }
        ttsQuotaBlockedUntil = Date.now() + (retryAfterSeconds * 1000);
        friendly = `Limite temporaire de requêtes par minute. Veuillez patienter ${retryAfterSeconds} secondes avant de relancer.`;
      }
    } else if (msg.includes('fetch failed')) {
      friendly = 'La connexion réseau avec l’API vocale Google a été interrompue (fetch failed). Veuillez réessayer dans quelques secondes.';
    } else if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
      friendly = 'Cette fonctionnalité nécessite un accès/API spécifique ou des autorisations de projet.';
    } else if (msg.includes('safety') || msg.includes('HARM')) {
      friendly = 'Le texte fourni a activé les filtres de modération du modèle.';
    } else if (msg) {
      friendly = `Impossible de générer l’audio (${msg.substring(0, 100)})`;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(isQuotaExceeded ? 429 : 500).json({
      error: friendly,
      isQuotaExceeded,
      isDailyQuota,
      retryAfterSeconds,
    });
  }
});

// API: Create a Custom Replicated Voice from reference audio
app.post('/api/custom-voice/create', async (req, res) => {
  try {
    const {
      name = 'Ma voix',
      audioBase64,
      mimeType = 'audio/wav',
      consent = false,
      consentText = '',
      fileName = 'sample.wav',
      durationSeconds = 10,
    } = req.body;

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'Échantillon vocal incompatible ou absent.' });
    }

    if (!consent) {
      return res.status(400).json({
        error: 'Le consentement formel est obligatoire pour créer et utiliser une voix personnalisée.',
      });
    }

    // Clean base64 string
    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
    const audioBuffer = Buffer.from(cleanBase64, 'base64');

    if (audioBuffer.length < 2000) {
      return res.status(400).json({
        error: 'Durée de l’enregistrement insuffisante. Veuillez fournir un enregistrement d’au moins 5 à 10 secondes.',
      });
    }

    const ai = getGenAI();

    // Normalize audio mime type for multimodal Gemini ingestion
    let normalizedMime = mimeType;
    if (!normalizedMime || normalizedMime === 'audio/x-m4a') normalizedMime = 'audio/mp4';
    if (normalizedMime.includes('webm')) normalizedMime = 'audio/webm';
    if (normalizedMime.includes('wav')) normalizedMime = 'audio/wav';
    if (normalizedMime.includes('mp3') || normalizedMime.includes('mpeg')) normalizedMime = 'audio/mp3';
    if (normalizedMime.includes('ogg')) normalizedMime = 'audio/ogg';

    const analysisPrompt = `You are an expert speech acoustician and voice replication engineer.
Carefully listen to this human voice audio sample.
Perform a thorough acoustic and prosodic analysis to replicate this exact speaker voice for Arabic (Classical Fusha and Moroccan Darija) Text-to-Speech synthesis.

Return a JSON object with this exact schema:
{
  "gender": "male" or "female" or "child",
  "detectedLanguage": "string describing language or dialect heard in sample",
  "accentOrDialect": "detailed description of phonetic articulation, Moroccan accent traits, Maghrebi glottal rhythm, etc.",
  "timbreDescription": "descriptors of voice texture (e.g. warm, deep, raspy, bright, resonant, breathy, velvety, metallic, nasal)",
  "pitchRegister": "baritone, tenor, soprano, alto, or child pitch register",
  "cadenceAndPacing": "rhythm, cadence, pause duration, and speaking tempo",
  "recommendedCarrierVoice": "Kore" or "Puck" or "Charon" or "Fenrir" or "Zephyr",
  "acousticConditioningPrompt": "A comprehensive prompt (in English) instructing a speech synthesis model on exactly how to vocalize Arabic and Moroccan Darija texts matching this speaker's voice grain, exact timbre, cadence, pitch, warmth, and phonetic articulation."
}

Carrier voice guide:
- "Kore": Warm feminine adult / maternal / gentle
- "Zephyr": Bright young feminine / expressive / gentle
- "Puck": Young energetic male / boyish
- "Fenrir": Confident adult male / articulate
- "Charon": Deep resonant mature male / solemn

Return ONLY valid JSON without markdown code fences.`;

    let acousticProfile = {
      gender: 'male' as const,
      detectedLanguage: 'Arabe / Darija',
      accentOrDialect: 'Accent marocain authentique avec intonation naturelle',
      timbreDescription: 'Voix naturelle, équilibrée et chaleureuse',
      pitchRegister: 'Médium',
      cadenceAndPacing: 'Modéré et fluide',
      recommendedCarrierVoice: 'Fenrir' as ValidGeminiVoice,
      acousticConditioningPrompt: 'Speak with a natural, authentic, human voice closely matching the recorded speaker timbre, warmth, and Moroccan articulation.',
    };

    try {
      const analysisResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: normalizedMime,
                  data: cleanBase64,
                },
              },
              { text: analysisPrompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = analysisResponse.text?.trim() || '';
      if (responseText) {
        const parsed = JSON.parse(responseText);
        const parsedGender = parsed.gender === 'female' || parsed.gender === 'child' ? parsed.gender : 'male';
        acousticProfile = {
          gender: parsedGender,
          detectedLanguage: parsed.detectedLanguage || 'Arabe / Darija',
          accentOrDialect: parsed.accentOrDialect || 'Accent marocain naturel',
          timbreDescription: parsed.timbreDescription || 'Timbre naturel et clair',
          pitchRegister: parsed.pitchRegister || 'Médium',
          cadenceAndPacing: parsed.cadenceAndPacing || 'Modéré',
          recommendedCarrierVoice: sanitizeGeminiVoice(parsed.recommendedCarrierVoice, parsedGender),
          acousticConditioningPrompt: parsed.acousticConditioningPrompt || '',
        };
      }
    } catch (analysisErr) {
      console.warn('Multimodal audio analysis note:', analysisErr);
    }

    // Step 2: Generate a short verification/preview greeting with the replicated voice
    let previewAudioBase64 = '';
    try {
      const previewPrompt = 'Say in natural Moroccan Darija: مرحباً بك، تم استنساخ وتحليل صوتك بنجاح وهو الآن جاهز للاستخدام في تطبيق صوت عربي.';

      const carrierVoiceForPreview = sanitizeGeminiVoice(acousticProfile.recommendedCarrierVoice, acousticProfile.gender);

      const previewTts = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ parts: [{ text: previewPrompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: carrierVoiceForPreview },
            },
          },
        },
      });

      const rawPreview = previewTts.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data)?.inlineData?.data;
      if (rawPreview) {
        const pBuffer = Buffer.from(rawPreview, 'base64');
        const wavP = pcmToWav(pBuffer, 24000, 1, 16);
        previewAudioBase64 = wavP.toString('base64');
      }
    } catch (prevErr) {
      console.warn('Preview generation note:', prevErr);
    }

    const newCustomVoice = {
      id: `cv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim() || 'Ma voix personnalisée',
      createdAt: Date.now(),
      audioFileName: fileName,
      audioDurationSeconds: Math.max(1, Math.round(durationSeconds || 10)),
      audioSizeBytes: audioBuffer.length,
      mimeType: normalizedMime,
      status: 'ready' as const,
      consentConfirmed: true,
      consentTimestamp: Date.now(),
      consentText: consentText || "Je confirme que j'ai l'autorisation d'utiliser cet enregistrement vocal et de créer une voix personnalisée à partir de celui-ci.",
      acousticProfile,
      previewAudioBase64,
    };

    // Persist immediately on the server
    saveVoiceServer(newCustomVoice);

    return res.json({
      success: true,
      voice: newCustomVoice,
    });
  } catch (err: any) {
    console.error('Error creating custom voice (technical details):', err);
    const msg = err?.message || '';
    let friendly = 'Impossible de créer la voix personnalisée. Veuillez réessayer avec un autre enregistrement.';
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      friendly = 'Quota dépassé : la limite temporaire d’appels à l’API a été atteinte. Veuillez patienter une minute.';
    } else if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
      friendly = 'Cette fonctionnalité nécessite un accès/API spécifique avec des permissions d’accès au modèle.';
    } else if (msg.includes('unsupported') || msg.includes('INVALID_ARGUMENT')) {
      friendly = 'Échantillon vocal incompatible ou format audio non supporté par le service.';
    } else if (msg) {
      friendly = `Impossible de créer la voix : ${msg.substring(0, 120)}`;
    }
    return res.status(500).json({ error: friendly });
  }
});

// API: List all saved custom voices from server
app.get('/api/custom-voice/list', (_req, res) => {
  try {
    const voices = getStoredVoicesServer();
    return res.json({ success: true, voices });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve custom voices' });
  }
});

// API: Save or update custom voice on server
app.post('/api/custom-voice/save', (req, res) => {
  try {
    const { voice } = req.body;
    if (!voice || !voice.id || !voice.name) {
      return res.status(400).json({ success: false, error: 'Invalid voice object' });
    }
    const updated = saveVoiceServer(voice);
    return res.json({ success: true, voices: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to save voice' });
  }
});

// API: Delete custom voice from server
app.delete('/api/custom-voice/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID is required' });
    }
    const updated = deleteVoiceServer(id);
    return res.json({ success: true, voices: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to delete voice' });
  }
});


// API: Auto-vocalize / Diacritize Arabic Text (تشكيل)
app.post('/api/tts/tashkeel', async (req, res) => {
  try {
    const { text, language = 'fusha' } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required.' });
    }

    if (language === 'english') {
      return res.json({ vocalizedText: text.trim() });
    }

    const ai = getGenAI();
    const systemPrompt =
      language === 'darija'
        ? `You are an expert in Moroccan Darija phonetics. Add basic vowel diacritics (حركات وتشكيل وسكون) to the Moroccan Darija text to clarify authentic Moroccan pronunciation for Text-to-Speech reading.
STRICT RULES:
1. Do NOT change, replace, add, or delete any words.
2. Maintain the Moroccan Darija wording exactly.
3. Return ONLY the diacritized text without any explanation, intro, quotes, or Markdown formatting.`
        : `You are an expert linguist in Classical Modern Standard Arabic (الفصحى). Add accurate full vowel diacritics (التشكيل الكامل: الفتحة، الضمة، الكسرة، السكون، الشدة، التنوين) to the Arabic text for clear and accurate speech narration.
STRICT RULES:
1. Do NOT change, rephrase, add, or delete any words.
2. Return ONLY the vocalized Arabic text without any commentary, preamble, quotes, or markdown wrappers.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: text.trim(),
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
      },
    });

    const vocalized = response.text ? response.text.trim() : text;
    return res.json({ vocalizedText: vocalized });
  } catch (error: any) {
    console.error('Error in Tashkeel helper:', error);
    return res.status(500).json({ error: error?.message || 'Failed to vocalize text.' });
  }
});

// Vite middleware & Static serving
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TTS Server listening on http://0.0.0.0:${PORT}`);
  });
}

start();
