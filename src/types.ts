export type ArabicLanguage = 'fusha' | 'darija' | 'english';
export type VoiceLanguage = ArabicLanguage;

export interface TimestampCue {
  id: string;
  startSeconds: number;
  endSeconds: number;
  startTimeFormatted: string; // e.g. "00:00"
  endTimeFormatted: string;   // e.g. "00:04"
  text: string;
}

export type NarratorGender = 'male' | 'female' | 'child';

export type AgeProfile = 'young' | 'adult' | 'mature' | 'boy' | 'girl';

export type NarrationStyleId =
  | 'professional'
  | 'educational'
  | 'scientific'
  | 'warm'
  | 'surprised'
  | 'dynamic'
  | 'calm'
  | 'documentary'
  | 'social_media';

export interface NarrationStyle {
  id: NarrationStyleId;
  labelAr: string;
  labelFr: string;
  icon: string;
  descriptionAr: string;
  descriptionFr: string;
  promptGuidance: string;
}

export interface VoiceProfile {
  id: string;
  nameAr: string;
  nameFr: string;
  gender: NarratorGender;
  ageCategory: AgeProfile;
  ageLabelAr: string;
  ageLabelFr: string;
  geminiVoice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  taglineAr: string;
  taglineFr: string;
  avatarColor: string;
  badgeAr: string;
  badgeFr: string;
  pitchOffset?: number;
}

export interface VoiceParameters {
  speed: number;        // 0.75 - 1.5 (default: 1.0)
  pitch: number;        // -4 to +4 (default: 0)
  expressiveness: number; // 0 - 100% (default: 75)
  intonation: number;   // 0 - 100% (default: 80)
  volume: number;       // 0 - 100% (default: 100)
}

export interface TTSRequestPayload {
  text: string;
  language: ArabicLanguage;
  voiceId: string;
  gender: NarratorGender;
  ageCategory: AgeProfile;
  style: NarrationStyleId;
  parameters: VoiceParameters;
  customVoiceApplyModification?: boolean; // false: sans modification (pure), true: avec modification (styles/params)
  includeTimestamps?: boolean;
}

export interface TTSResponseData {
  audioBase64: string;
  audioUrl?: string;
  durationEstimateSeconds: number;
  sampleRate: number;
  voiceUsed: string;
  language: ArabicLanguage;
  style: NarrationStyleId;
  timestampCues?: TimestampCue[];
  cleanText?: string;
}

export interface GenerationHistoryItem {
  id: string;
  timestamp: number;
  text: string;
  language: ArabicLanguage;
  voiceNameAr: string;
  voiceNameFr: string;
  gender: NarratorGender;
  style: NarrationStyleId;
  audioBase64: string;
  durationSeconds: number;
  timestampCues?: TimestampCue[];
  cleanText?: string;
}

export interface SampleTextItem {
  id: string;
  language: ArabicLanguage;
  categoryAr: string;
  categoryFr: string;
  titleAr: string;
  titleFr: string;
  text: string;
  recommendedStyle: NarrationStyleId;
  recommendedGender: NarratorGender;
}

export interface CustomVoiceAcousticProfile {
  gender: NarratorGender;
  detectedLanguage: string;
  accentOrDialect: string;
  timbreDescription: string;
  pitchRegister: string;
  cadenceAndPacing: string;
  recommendedCarrierVoice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  acousticConditioningPrompt: string;
}

export interface CustomVoice {
  id: string;
  name: string;
  createdAt: number;
  audioFileName?: string;
  audioDurationSeconds?: number;
  audioSizeBytes?: number;
  mimeType?: string;
  status: 'ready' | 'processing' | 'error';
  consentConfirmed: boolean;
  consentTimestamp: number;
  consentText: string;
  acousticProfile: CustomVoiceAcousticProfile;
  previewAudioBase64?: string;
  googleCloudCloningKey?: string;
}
