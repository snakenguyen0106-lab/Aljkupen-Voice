import React, { useState, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { DialogueEditor } from './components/DialogueEditor';
import { AudioController, AudioControllerHandle } from './components/AudioController';
import { SettingsPanel } from './components/SettingsPanel';
import { generateDialogueAudio } from './services/geminiService';
import { AudioSettings, AudioGenerationResult } from './types';

const TRANSLATIONS = {
  en: {
    header: {
      title: "Aljkupen Voice",
      author: "Author: Nguyen Thanh Phuong-THCS Hoa Thang",
      maleStyle: "Male: Christopher Style",
      femaleStyle: "Female: Ana Style"
    },
    editor: {
      title: "Script",
      aiWrite: "AI Write",
      assignSpeakers: "Assign Speakers",
      generateAudio: "Generate Audio",
      generating: "Generating...",
      view: "View",
      edit: "Edit",
      replay: "Replay from start",
      fullScreen: "Full Screen",
      exitFullScreen: "Exit Full Screen (Esc)",
      maleOnly: "Male Only (All)",
      femaleOnly: "Female Only (All)",
      maleFemale: "Male / Female (Alternate)",
      femaleMale: "Female / Male (Alternate)",
      placeholder: `1. Male: Hello! How are you doing *today*?\n2. Female: I'm doing *great*, thanks for asking!`,
      aiModal: {
        title: "Content Generator",
        style: "Style",
        length: "Length",
        language: "Language",
        topic: "Topic & Context",
        topicPlaceholder: "Describe your topic (e.g. Life in the year 3000, A debate about social media...)",
        cancel: "Cancel",
        create: "Create Content",
        styles: {
          conversation: "Conversation (2 Speakers)",
          monologue: "Monologue (1 Speaker)"
        },
        lengths: {
          short: "Short",
          medium: "Medium",
          long: "Long"
        }
      }
    },
    settings: {
      title: "Generation Settings",
      personas: "Voice Personas",
      maleVoice: "Male Voice",
      femaleVoice: "Female Voice",
      characteristics: "Speech Characteristics",
      speed: "Speaking Rate",
      pitch: "Pitch / Tone",
      speedLabels: ['Very Slow', 'Slow', 'Moderately Slow', 'Slightly Slow', 'Normal', 'Slightly Fast', 'Moderately Fast', 'Fast', 'Very Fast'],
      pitchLabels: ['Very Deep', 'Deep', 'Moderately Deep', 'Slightly Deep', 'Normal', 'Slightly High', 'Moderately High', 'High', 'Very High']
    },
    audio: {
      title: "Playback Control",
      synthesizing: "Synthesizing Voices...",
      processing: "Processing Speed...",
      generatePlay: "Generate & Play Audio",
      downloadMp3: "Download MP3",
      downloadWav: "Download WAV",
      speedSelect: "Playback Speed:",
      note: "Note: Downloaded file will use the selected playback speed.",
      visualization: "Audio visualization will appear here",
      timeStretch: "Time-Stretching Mode",
      timeStretchDesc: "Adjusts speed for both playback and download file"
    },
    instructions: {
      title: "INSTRUCTIONS",
      speakers: "Speakers: Use",
      male: "Male:",
      female: "Female:",
      or: "or",
      lists: "Numbered lists:",
      listsExample: "will be read as \"One. Hello\".",
      emphasis: "Wrap words in *asterisks* for emphasis.",
      speed: "Use Playback Speed to adjust download speed.",
      voices: "Try different Voice Names to change persona."
    }
  },
  vn: {
    header: {
      title: "Aljkupen Voice",
      author: "Tác giả: Nguyễn Thanh Phương-THCS Hòa Thắng",
      maleStyle: "Giọng Nam: Kiểu Christopher",
      femaleStyle: "Giọng Nữ: Kiểu Ana"
    },
    editor: {
      title: "Kịch bản",
      aiWrite: "Viết AI",
      assignSpeakers: "Gán vai",
      generateAudio: "Tạo Âm thanh",
      generating: "Đang tạo...",
      view: "Xem",
      edit: "Sửa",
      replay: "Phát lại từ đầu",
      fullScreen: "Toàn màn hình",
      exitFullScreen: "Thoát toàn màn hình (Esc)",
      maleOnly: "Chỉ Nam (Toàn bộ)",
      femaleOnly: "Chỉ Nữ (Toàn bộ)",
      maleFemale: "Nam / Nữ (Xen kẽ)",
      femaleMale: "Nữ / Nam (Xen kẽ)",
      placeholder: `1. Nam: Xin chào! Hôm nay bạn thế nào?\n2. Nữ: Tôi rất khỏe, cảm ơn bạn đã hỏi!`,
      aiModal: {
        title: "Tạo nội dung tự động",
        style: "Phong cách",
        length: "Độ dài",
        language: "Ngôn ngữ",
        topic: "Chủ đề & Bối cảnh",
        topicPlaceholder: "Mô tả chủ đề (vd: Cuộc sống năm 3000, Tranh luận về mạng xã hội...)",
        cancel: "Hủy",
        create: "Tạo nội dung",
        styles: {
          conversation: "Hội thoại (2 Người)",
          monologue: "Độc thoại (1 Người)"
        },
        lengths: {
          short: "Ngắn",
          medium: "Vừa",
          long: "Dài"
        }
      }
    },
    settings: {
      title: "Cài đặt tạo giọng",
      personas: "Nhân vật",
      maleVoice: "Giọng Nam",
      femaleVoice: "Giọng Nữ",
      characteristics: "Đặc điểm giọng nói",
      speed: "Tốc độ đọc",
      pitch: "Cao độ / Tông",
      speedLabels: ['Rất chậm', 'Chậm', 'Khá chậm', 'Hơi chậm', 'Bình thường', 'Hơi nhanh', 'Khá nhanh', 'Nhanh', 'Rất nhanh'],
      pitchLabels: ['Rất trầm', 'Trầm', 'Khá trầm', 'Hơi trầm', 'Bình thường', 'Hơi cao', 'Khá cao', 'Cao', 'Rất cao']
    },
    audio: {
      title: "Điều khiển phát",
      synthesizing: "Đang tổng hợp giọng...",
      processing: "Đang xử lý tốc độ...",
      generatePlay: "Tạo & Phát Âm thanh",
      downloadMp3: "Tải về MP3",
      downloadWav: "Tải về WAV",
      speedSelect: "Tốc độ phát:",
      note: "Lưu ý: File tải về sẽ áp dụng tốc độ phát bạn chọn.",
      visualization: "Trình hiển thị âm thanh sẽ hiện ở đây",
      timeStretch: "Chế độ Time-Stretching",
      timeStretchDesc: "Chỉnh tốc độ cho cả phát lại và file tải về"
    },
    instructions: {
      title: "HƯỚNG DẪN",
      speakers: "Người nói: Dùng",
      male: "Male: (hoặc Nam:, 1:)",
      female: "Female: (hoặc Nữ:, 2:)",
      or: "hoặc",
      lists: "Danh sách số:",
      listsExample: "sẽ được đọc là \"Một. Xin chào\".",
      emphasis: "Dùng dấu *sao* để nhấn mạnh từ.",
      speed: "Chỉnh tốc độ phát để áp dụng cho file tải về.",
      voices: "Thử các tên giọng khác nhau để đổi phong cách."
    }
  }
};

const DEFAULT_SCRIPT = `Nam: Aljkupen Voice biến văn bản thành giọng đọc sống động đa ngôn ngữ.
Nữ: Ứng dụng cho phép chọn giọng đọc và tùy chỉnh đặc điểm giọng nói (Speech Characteristics).
Nam: Đặc biệt, AI tích hợp giúp tạo nội dung theo đúng ý tưởng của bạn.
Nữ: Với Aljkupen Voice, kể chuyện, thuyết trình hay podcast đều trở nên cuốn hút hơn.`;

const App: React.FC = () => {
  const [language, setLanguage] = useState<'en' | 'vn'>('vn');
  const t = TRANSLATIONS[language];

  const [script, setScript] = useState<string>(DEFAULT_SCRIPT);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioResult, setAudioResult] = useState<AudioGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [activeMobileTab, setActiveMobileTab] = useState<'script' | 'controls'>('script');

  const [settings, setSettings] = useState<AudioSettings>({
    speed: 'Normal',
    pitch: 'Normal',
    maleVoice: 'Fenrir',
    femaleVoice: 'Kore'
  });

  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioControllerRef = useRef<AudioControllerHandle>(null);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'vn' : 'en');
  };

  const handleGenerate = useCallback(async () => {
    if (!script.trim()) return;

    setIsGenerating(true);
    setError(null);
    setAudioResult(null); 
    setIsPlaying(false);
    setCurrentTime(0);
    
    if (window.innerWidth < 1024) {
      setActiveMobileTab('controls');
    }

    try {
      const result = await generateDialogueAudio(script, settings);
      setAudioResult(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate audio. Please check your API key.");
    } finally {
      setIsGenerating(false);
    }
  }, [script, settings]);

  const handleTogglePlay = useCallback(() => {
    if (audioControllerRef.current) {
      audioControllerRef.current.togglePlay();
    }
  }, []);

  const handleReplay = useCallback(() => {
    if (audioControllerRef.current) {
      audioControllerRef.current.seekTo(0);
      audioControllerRef.current.play();
    }
  }, []);

  const handleSeek = useCallback((time: number) => {
    if (audioControllerRef.current) {
      audioControllerRef.current.seekTo(time);
      setCurrentTime(time);
    }
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-slate-200 overflow-hidden">
      <Header t={t} currentLang={language} onToggleLang={toggleLanguage} />

      {/* Main Content Area */}
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full h-[calc(100vh-80px)] lg:h-[calc(100vh-90px)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          
          {/* Column 1: Dialogue Editor */}
          <div className={`flex flex-col h-full transition-opacity duration-300 ${activeMobileTab === 'script' ? 'flex' : 'hidden lg:flex'}`}>
            <DialogueEditor 
              t={t}
              value={script} 
              onChange={setScript} 
              disabled={isGenerating}
              audioResult={audioResult}
              currentTime={currentTime}
              duration={audioResult?.buffer?.duration || 0}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              onReplay={handleReplay}
              onSeek={handleSeek}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </div>

          {/* Column 2: Settings & Controls */}
          <div className={`flex flex-col gap-6 h-full overflow-y-auto pb-20 lg:pb-0 custom-scrollbar ${activeMobileTab === 'controls' ? 'flex' : 'hidden lg:flex'}`}>
            <SettingsPanel 
              t={t}
              settings={settings}
              onChange={setSettings}
              disabled={isGenerating}
            />

            <AudioController 
              t={t}
              ref={audioControllerRef}
              audioUrl={audioResult?.audioUrl || null}
              downloadUrl={audioResult?.downloadUrl}
              downloadFilename={audioResult?.downloadFilename}
              audioBuffer={audioResult?.buffer} 
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
              onPlayStateChange={setIsPlaying}
              onTimeUpdate={handleTimeUpdate}
            />

            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              <h3 className="font-semibold text-slate-400 text-sm uppercase tracking-wide mb-2">{t.instructions.title}</h3>
              <ul className="list-disc list-inside text-sm text-slate-500 space-y-1 ml-1">
                <li>{t.instructions.speakers} <span className="text-indigo-400 font-mono">{t.instructions.male}</span> {t.instructions.or} <span className="text-pink-400 font-mono">{t.instructions.female}</span></li>
                <li>{t.instructions.lists} <span className="font-mono text-slate-300">1. Hello</span> {t.instructions.or} <span className="font-mono text-slate-300">2. Hi</span> {t.instructions.listsExample}</li>
                <li>{t.instructions.emphasis}</li>
                <li>{t.instructions.speed}</li>
                <li>{t.instructions.voices}</li>
              </ul>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-start gap-3 animate-pulse">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-bold">Error</p>
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 p-2 z-50 flex justify-around items-center safe-area-pb">
        <button 
          onClick={() => setActiveMobileTab('script')}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg w-full transition-colors ${activeMobileTab === 'script' ? 'text-indigo-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs font-medium">{t.editor.title}</span>
        </button>

        <button 
          onClick={() => setActiveMobileTab('controls')}
          className={`relative flex flex-col items-center gap-1 p-2 rounded-lg w-full transition-colors ${activeMobileTab === 'controls' ? 'text-indigo-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
        >
          {/* Notification Dot for Playing/Generating */}
          {(isPlaying || isGenerating || audioResult) && (
            <span className={`absolute top-2 right-[30%] w-2 h-2 rounded-full ${isGenerating ? 'bg-amber-500 animate-pulse' : (isPlaying ? 'bg-green-500' : 'bg-indigo-500')}`}></span>
          )}
          
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className="text-xs font-medium">Controls</span>
        </button>
      </div>
    </div>
  );
};

export default App;