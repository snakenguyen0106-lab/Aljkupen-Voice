import { GoogleGenAI, Modality } from "@google/genai";
import { AudioGenerationResult, AudioSettings, ScriptTiming } from "../types";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Helper function to convert base64 string to Uint8Array
 */
const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Trims trailing silence (zeros) from the PCM data.
 * This fixes the issue where the progress bar keeps moving after audio ends.
 */
const trimSilence = (data: Uint8Array): Uint8Array => {
  let endIndex = data.length;
  // Iterate backwards, checking 16-bit samples (2 bytes)
  // We stop when we find a sample that isn't 0 (digital silence).
  while (endIndex >= 2) {
    if (data[endIndex - 1] !== 0 || data[endIndex - 2] !== 0) {
      break;
    }
    endIndex -= 2;
  }
  
  // Add a tiny buffer (e.g., 0.1s = ~4800 bytes at 24kHz 16-bit) to avoid abrupt cuts
  const padding = 1000; 
  const finalEnd = Math.min(data.length, endIndex + padding);
  
  return data.slice(0, finalEnd);
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

/**
 * Creates a valid WAV file Blob from raw PCM data or AudioBuffer.
 */
const createWavBlob = (data: Uint8Array | Float32Array, sampleRate: number = 24000): Blob => {
  const numChannels = 1; // Mono
  const bitsPerSample = 16; // 16-bit PCM
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = data.length * 2; // 2 bytes per sample for 16-bit
  
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM audio data
  let offset = 44;
  
  // If Uint8Array (Raw PCM from Gemini), it's already in the correct byte format (Int16 Little Endian)
  // We can just copy it directly into the buffer.
  if (data instanceof Uint8Array) {
     new Uint8Array(buffer, 44).set(data);
     return new Blob([buffer], { type: 'audio/wav' });
  }

  // If Float32Array (from AudioBuffer), we need to convert to Int16
  for (let i = 0; i < data.length; i++) {
    let sample = data[i];
    // Clamp and convert
    sample = Math.max(-1, Math.min(1, sample));
    sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, sample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
};

/**
 * Creates an MP3 Blob from AudioBuffer data using lamejs.
 */
const createMp3FromFloat32 = (channelData: Float32Array, sampleRate: number): Blob | null => {
  if (typeof (window as any).lamejs === 'undefined') {
    return null;
  }

  try {
    const lamejs = (window as any).lamejs;
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128); 
    
    // Convert Float32 to Int16
    const samples = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      let s = Math.max(-1, Math.min(1, channelData[i]));
      samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const mp3Data: Uint8Array[] = [];
    const sampleBlockSize = 1152;
    
    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const sampleChunk = samples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
    
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
    
    return new Blob(mp3Data, { type: 'audio/mp3' });
  } catch (e) {
    console.error("Error encoding MP3:", e);
    return null;
  }
};

/**
 * Preprocesses the script to handle line numbers, vocabulary lists, and speaker aliases.
 * Supported Male: Male, Nam, 1:
 * Supported Female: Female, Nữ, Nu, 2:
 */
const preprocessScript = (script: string): string => {
  return script.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // 1. Explicit Text Labels: "Male:", "Nam:", "Female:", "Nữ:", "Nu:"
    // Supports optional line number prefix inside: "1. Nam: Hello"
    const textLabelMatch = trimmed.match(/^(\d+[\.\)]?)?\s*(Male|Nam|Female|Nữ|Nu)\s*[:\.]\s*(.+)$/i);
    if (textLabelMatch) {
      const prefix = textLabelMatch[1] || "";
      const label = textLabelMatch[2].toLowerCase();
      const content = textLabelMatch[3];

      let speaker = 'Male';
      if (['female', 'nữ', 'nu'].includes(label)) {
        speaker = 'Female';
      }
      return `${speaker}: ${prefix} ${content}`.trim();
    }

    // 2. Numeric Start acting as Speaker or List
    // STRICT UPDATE: Only use 1/2 as speaker alias if followed by a COLON (:)
    // "1: Hello" -> Male: Hello
    // "2: Hello" -> Female: Hello
    // "1. Hello" -> Male: 1. Hello (Read as number)
    // "2. Hello" -> Male: 2. Hello (Read as number)
    const numberMatch = trimmed.match(/^(\d+)([\.\):]?)\s+(.+)$/);
    if (numberMatch) {
      const numStr = numberMatch[1]; // e.g. "1" or "2"
      const separator = numberMatch[2]; // "." or ":" or ""
      const content = numberMatch[3];

      // If separator is strictly ':', treat as Speaker Alias
      if (separator === ':') {
        let speaker = 'Male';
        if (numStr === '2') {
          speaker = 'Female';
        }
        return `${speaker}: ${content}`;
      }

      // Otherwise (e.g. "1." or "2."), treat as regular text content (list item)
      // Default to Male speaker for unlabeled list items
      return `Male: ${numStr}${separator} ${content}`;
    }

    // 3. Fallback for unlabeled text
    if (trimmed.length > 0 && !trimmed.includes(':')) {
       return `Male: ${trimmed}`;
    }

    return line;
  }).join('\n');
};

/**
 * Calculates estimated timings for each line for karaoke sync.
 * REVISED ALGORITHM: Significantly reduced weights and padding to prevent lag.
 */
const calculateScriptTimings = (processedScript: string, totalDuration: number): ScriptTiming[] => {
  const lines = processedScript.split('\n').filter(l => l.trim().length > 0);
  const result: ScriptTiming[] = [];
  
  // Removed large PAUSE_WEIGHT_CHARS (was 12) which caused short lines to hang.
  // Using minimal padding just to distinguish empty lines if any.
  const BASE_PADDING = 2; 

  let totalWeightedUnits = 0;
  
  const lineDetails = lines.map(line => {
    const parts = line.split(/:(.+)/); // Split on first colon
    if (parts.length < 2) return null;
    
    const speaker = parts[0].trim();
    const text = parts[1].trim();
    
    const charCount = text.length;
    // Count digits (e.g. "1") separately because saying "One" takes more time than 1 char.
    const digitCount = (text.match(/\d/g) || []).length;
    
    // Weight Formula:
    // Chars + (Digits * 3) + Base Padding.
    // This gives "1. Hello" (8 chars) a weight of 8 + 3 + 2 = 13 (vs 20 before).
    // This gives "Long sentence..." (50 chars) a weight of 50 + 0 + 2 = 52 (vs 62 before).
    // Ratio 13/52 = 25% (Faster transition) vs 20/62 = 32% (Slower transition).
    const weightedLength = charCount + (digitCount * 3) + BASE_PADDING;
    
    totalWeightedUnits += weightedLength;
    
    return { line, speaker, text, weightedLength };
  }).filter(l => l !== null);

  if (totalWeightedUnits === 0) return [];

  let currentTime = 0;
  lineDetails.forEach((details) => {
    if (!details) return;
    
    // Distribute duration based on weighted fraction
    const duration = (details.weightedLength / totalWeightedUnits) * totalDuration;
    
    result.push({
      line: details.line,
      speaker: details.speaker,
      startTime: currentTime,
      endTime: currentTime + duration
    });
    
    currentTime += duration;
  });

  return result;
};

/**
 * Takes an existing AudioBuffer and renders it at a new playback rate.
 * Returns new Blob URLs for the speed-altered audio.
 */
export const processAudioWithSpeed = async (
  originalBuffer: AudioBuffer, 
  speed: number
): Promise<{ audioUrl: string, downloadUrl: string, downloadFilename: string }> => {
  
  const offlineCtx = new OfflineAudioContext(
    originalBuffer.numberOfChannels,
    originalBuffer.duration * (1 / speed) * originalBuffer.sampleRate,
    originalBuffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = originalBuffer;
  source.playbackRate.value = speed;
  source.connect(offlineCtx.destination);
  source.start();

  const renderedBuffer = await offlineCtx.startRendering();
  const channelData = renderedBuffer.getChannelData(0); // Mono

  // Create new Wav Blob
  const wavBlob = createWavBlob(channelData, renderedBuffer.sampleRate);
  const audioUrl = URL.createObjectURL(wavBlob);

  // Create new MP3 Blob
  const mp3Blob = createMp3FromFloat32(channelData, renderedBuffer.sampleRate);
  
  let downloadUrl: string;
  let downloadFilename: string;

  if (mp3Blob) {
    downloadUrl = URL.createObjectURL(mp3Blob);
    downloadFilename = `dialogue_${speed}x.mp3`;
  } else {
    downloadUrl = audioUrl;
    downloadFilename = `dialogue_${speed}x.wav`;
  }

  return { audioUrl, downloadUrl, downloadFilename };
};

/**
 * Resolves the UI voice name to a valid Gemini API voice name and optional instruction.
 */
const resolveVoiceConfig = (uiVoiceName: string): { apiVoiceName: string, instruction?: string } => {
  switch (uiVoiceName) {
    case 'Child Male':
      return { 
        apiVoiceName: 'Puck', 
        instruction: 'Generate clear, natural English speech in a CHILD BOY voice. Style: cheerful, curious; pace slightly slower; pitch slightly higher. Accent: American English (en-US). Keep pronunciation suitable for kids learning English.' 
      };
    case 'Child Female':
      return { 
        apiVoiceName: 'Zephyr', 
        instruction: 'Generate clear, natural English speech in a CHILD GIRL voice. Style: friendly, encouraging; pace slightly slower; pitch moderately higher. Accent: American English (en-US). Keep pronunciation suitable for kids learning English.' 
      };
    default:
      return { apiVoiceName: uiVoiceName };
  }
};


/**
 * Generates audio from a dialogue script using Gemini 2.5 Flash TTS.
 */
export const generateDialogueAudio = async (script: string, settings: AudioSettings): Promise<AudioGenerationResult> => {
  try {
    let finalScript = preprocessScript(script);
    
    // Resolve voices (handle Child Voice logic)
    const maleConfig = resolveVoiceConfig(settings.maleVoice);
    const femaleConfig = resolveVoiceConfig(settings.femaleVoice);

    // Construct instructions for the model
    const instructions: string[] = [];
    
    if (settings.speed !== 'Normal') {
      instructions.push(`speaking with ${settings.speed} speed`);
    }
    if (settings.pitch !== 'Normal') {
      instructions.push(`speaking with ${settings.pitch} pitch`);
    }
    
    // Add specific child voice instructions if present
    if (maleConfig.instruction) instructions.push(maleConfig.instruction);
    if (femaleConfig.instruction) instructions.push(femaleConfig.instruction);

    // Always add emphasis instruction
    instructions.push("emphasizing words wrapped in *asterisks*");

    const instructionStr = instructions.length > 0 
      ? `[System Note: Read the following dialogue ${instructions.join(', ')}.]\n` 
      : '';

    const textToSend = `${instructionStr}${finalScript}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [
        {
          parts: [{ text: textToSend }] 
        }
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Male',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: maleConfig.apiVoiceName }
                }
              },
              {
                speaker: 'Female',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: femaleConfig.apiVoiceName }
                }
              }
            ]
          }
        }
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini API.");
    }

    const pcmData = base64ToUint8Array(base64Audio);
    
    // TRIM SILENCE: Remove trailing zeros to ensure audio ends exactly when speech ends
    const trimmedPcmData = trimSilence(pcmData);

    // 1. Initial WAV for playback
    // Create a Blob with valid WAV headers using the trimmed data.
    const wavBlob = createWavBlob(trimmedPcmData, 24000); 
    const audioUrl = URL.createObjectURL(wavBlob);

    // 2. Decode for Client-side Speed Processing / MP3 conversion / Sync Calculation
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // FIX: decodeAudioData requires a valid file format (WAV/MP3) with headers.
    const wavArrayBuffer = await wavBlob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(wavArrayBuffer);

    // Calculate Script Timing for Sync
    const scriptLines = calculateScriptTimings(finalScript, audioBuffer.duration);

    const channelData = audioBuffer.getChannelData(0);
    const mp3Blob = createMp3FromFloat32(channelData, audioBuffer.sampleRate);
    
    let downloadUrl: string;
    let downloadFilename: string;

    if (mp3Blob) {
      downloadUrl = URL.createObjectURL(mp3Blob);
      downloadFilename = 'dialogue.mp3';
    } else {
      downloadUrl = audioUrl;
      downloadFilename = 'dialogue.wav';
    }

    return { 
      audioUrl, 
      downloadUrl, 
      downloadFilename, 
      blob: wavBlob, 
      buffer: audioBuffer,
      scriptLines
    };

  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};

/**
 * Uses Gemini text model to generate a dialogue script based on a user topic.
 * Updated to support advanced configuration options.
 */
export const generateDialogueScript = async (
  topic: string, 
  options: { mode: string, length: string, language: string } = { mode: 'Dialogue', length: 'Medium', language: 'English' }
): Promise<string> => {
  try {
    const lengthMap: Record<string, string> = {
      'Short': 'approx 4-6 lines',
      'Medium': 'approx 12-16 lines',
      'Long': 'approx 25-30 lines'
    };

    const lengthInstruction = lengthMap[options.length] || 'approx 10 lines';
    
    let modeInstruction = '';
    if (options.mode === 'Monologue') {
      modeInstruction = 'Create a monologue script or narrative spoken by a single speaker. Use "Male:" or "Female:" for the speaker label throughout the text.';
    } else {
      modeInstruction = 'Create a natural dialogue between two people.';
    }

    const languageInstruction = options.language !== 'English' 
      ? `Write the content primarily in ${options.language}.` 
      : 'Write in English.';

    const systemPrompt = `You are a professional creative writer and scriptwriter with a deep understanding of diverse world views, social topics, and daily life nuances.
    
    Task: Write a script about: "${topic}".
    
    Configuration:
    - Mode: ${modeInstruction}
    - Length: ${lengthInstruction}
    - Language: ${languageInstruction}
    
    IMPORTANT FORMATTING RULES:
    1. Use STRICTLY the format: "Male: [text]" or "Female: [text]".
    2. Do NOT add any introduction, title, scene descriptions, or conclusion. Just the dialogue lines.
    3. Do NOT use Markdown code blocks (no \`\`\`).
    4. Ensure the content is engaging, culturally relevant, and suitable for the topic.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [{ text: systemPrompt }] 
        }
      ]
    });

    let text = response.text || "";
    // Clean up if markdown blocks still appear
    text = text.replace(/```(xml|json|text)?/g, '').replace(/```/g, '').trim();
    return text;
  } catch (error) {
    console.error("Script Generation Error:", error);
    throw error;
  }
};