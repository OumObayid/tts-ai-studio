import { CustomVoice, VoiceProfile } from '../types';

const STORAGE_KEY = 'sawt_arabi_custom_voices_v1';
const HISTORY_STORAGE_KEY = 'sawt_arabi_history_v1';

// Strips heavy base64 strings to ensure voices take <1KB in localStorage and never hit quota limits
function sanitizeVoiceForStorage(voice: CustomVoice): CustomVoice {
  return {
    ...voice,
    // Do not store hundreds of kilobytes of audio preview in localStorage
    previewAudioBase64: undefined,
  };
}

// Emergency cleanup of history audio to free up localStorage space if quota is tight
function freeStorageSpace() {
  try {
    const rawHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (rawHistory) {
      const parsed = JSON.parse(rawHistory);
      if (Array.isArray(parsed)) {
        // Strip audioBase64 from history items to free up 3-5 MB instantly
        const lightweightHistory = parsed.map((item: any) => ({
          ...item,
          audioBase64: '',
        }));
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(lightweightHistory));
      }
    }
  } catch (e) {
    // If still fails, clear history so custom voices always take priority
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export function getStoredCustomVoices(): CustomVoice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load custom voices from localStorage:', err);
    return [];
  }
}

export function saveCustomVoice(voice: CustomVoice): CustomVoice[] {
  const sanitized = sanitizeVoiceForStorage(voice);
  const existing = getStoredCustomVoices();
  const filtered = existing.filter((v) => v.id !== voice.id);
  // Keep original voice (with preview if any) in memory, and sanitized in storage
  const updatedState = [voice, ...filtered];
  const updatedStorage = [sanitized, ...filtered.map(sanitizeVoiceForStorage)];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStorage));
  } catch (err: any) {
    console.warn('LocalStorage quota limit reached, cleaning space...', err);
    freeStorageSpace();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStorage));
    } catch (retryErr) {
      console.error('Failed to save to localStorage after freeing space:', retryErr);
    }
  }

  // Asynchronously persist on server for permanent backup
  fetch('/api/custom-voice/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voice: sanitized }),
  }).catch((serverErr) => {
    console.warn('Failed to backup voice to server:', serverErr);
  });

  // Always return updated list with the new voice so React state never drops it
  return updatedState;
}

export function deleteCustomVoice(id: string): CustomVoice[] {
  const existing = getStoredCustomVoices();
  const updated = existing.filter((v) => v.id !== id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update localStorage after delete:', err);
  }

  // Delete from server as well
  fetch(`/api/custom-voice/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).catch((serverErr) => {
    console.warn('Failed to delete voice on server:', serverErr);
  });

  return updated;
}

// Synchronize voices between server and client on load
export async function syncCustomVoicesWithServer(): Promise<CustomVoice[]> {
  const localVoices = getStoredCustomVoices();

  try {
    const res = await fetch('/api/custom-voice/list');
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) return localVoices;
    const data = await res.json();
    if (!data.success || !Array.isArray(data.voices)) return localVoices;

    const serverVoices: CustomVoice[] = data.voices;
    const map = new Map<string, CustomVoice>();

    // Add server voices first
    for (const v of serverVoices) {
      map.set(v.id, v);
    }

    // Add or override with local voices
    for (const v of localVoices) {
      map.set(v.id, v);
    }

    const merged = Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // Save merged to local storage safely
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged.map(sanitizeVoiceForStorage)));
    } catch (e) {
      freeStorageSpace();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged.map(sanitizeVoiceForStorage)));
      } catch {
        // ignore
      }
    }

    return merged;
  } catch (err) {
    console.warn('Could not sync with server voices:', err);
    return localVoices;
  }
}

export function customVoiceToVoiceProfile(cv: CustomVoice): VoiceProfile {
  const gender = cv.acousticProfile?.gender || 'male';
  let carrier = cv.acousticProfile?.recommendedCarrierVoice || (gender === 'female' ? 'Kore' : 'Fenrir');
  if ((carrier as any) === 'Aoede') {
    carrier = gender === 'female' ? 'Zephyr' : 'Kore';
  }

  return {
    id: cv.id,
    nameAr: cv.name,
    nameFr: cv.name,
    gender,
    ageCategory: 'adult',
    ageLabelAr: 'صوت مخصص (مستنسخ)',
    ageLabelFr: 'Voix personnalisée (réplique)',
    geminiVoice: carrier,
    taglineAr: cv.acousticProfile?.timbreDescription || 'بصمة صوتية مخصصة مستنسخة بالذكاء الاصطناعي',
    taglineFr: cv.acousticProfile?.timbreDescription || 'Empreinte vocale répliquée par IA Google',
    avatarColor: 'from-violet-600 via-purple-600 to-indigo-700',
    badgeAr: '🎙️ صوت مستنسخ',
    badgeFr: '🎙️ Voix répliquée',
  };
}
