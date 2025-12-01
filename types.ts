export enum SpeakerType {
  MALE = 'Male',
  FEMALE = 'Female'
}

export interface DialogueLine {
  speaker: SpeakerType | string;
  text: string;
}

export interface ScriptTiming {
  line: string;
  speaker: string;
  startTime: number;
  endTime: number;
}

export interface AudioGenerationResult {
  audioUrl: string; // WAV URL for efficient browser playback
  downloadUrl: string; // MP3 URL for user download
  downloadFilename: string;
  blob: Blob;
  buffer: AudioBuffer; // Raw AudioBuffer for client-side processing (speed/pitch)
  scriptLines: ScriptTiming[]; // For syncing text with audio
}

export interface AudioSettings {
  speed: string; // e.g., 'Very Slow', 'Normal', 'Fast'
  pitch: string; // e.g., 'Deep', 'Normal', 'High'
  maleVoice: string; // e.g., 'Fenrir'
  femaleVoice: string; // e.g., 'Kore'
}