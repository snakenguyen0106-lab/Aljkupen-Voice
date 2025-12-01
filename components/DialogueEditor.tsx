import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AudioGenerationResult } from '../types';
import { generateDialogueScript } from '../services/geminiService';

interface DialogueEditorProps {
  t: any;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  audioResult?: AudioGenerationResult | null;
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onReplay?: () => void;
  onSeek?: (time: number) => void;
  onGenerate?: () => void;
  isGenerating?: boolean;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const DialogueEditor: React.FC<DialogueEditorProps> = ({ 
  t,
  value, 
  onChange, 
  disabled, 
  audioResult, 
  currentTime = 0,
  duration = 0,
  isPlaying = false,
  onTogglePlay,
  onReplay,
  onSeek,
  onGenerate,
  isGenerating = false
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);
  const [showAutoAssignMenu, setShowAutoAssignMenu] = useState<boolean>(false);
  
  // AI Script Generation State
  const [showAIModal, setShowAIModal] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  
  // AI Options
  const [aiMode, setAiMode] = useState<string>('Dialogue');
  const [aiLength, setAiLength] = useState<string>('Medium');
  const [aiLanguage, setAiLanguage] = useState<string>('English');

  // Automatically switch to view mode when new audio is generated
  useEffect(() => {
    if (audioResult) {
      setIsEditing(false);
      setSelectedLineIndex(null); // Reset selection on new generation
    }
  }, [audioResult]);

  // Handle Escape key to exit full screen
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const applySpeakerPattern = (pattern: 'Male' | 'Female' | 'Male/Female' | 'Female/Male') => {
    const lines = value.split('\n');
    const newLines = lines.map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return '';

      // Extract existing content (remove previous speaker labels)
      let content = trimmed;
      
      const colonMatch = trimmed.match(/^.*?:\s*(.*)/);
      if (colonMatch) {
        content = colonMatch[1];
      }
      
      // Determine new speaker
      let newSpeaker = 'Male';
      if (pattern === 'Female') {
        newSpeaker = 'Female';
      } else if (pattern === 'Male/Female') {
        newSpeaker = index % 2 === 0 ? 'Male' : 'Female';
      } else if (pattern === 'Female/Male') {
        newSpeaker = index % 2 === 0 ? 'Female' : 'Male';
      }

      return `${newSpeaker}: ${content}`;
    });

    onChange(newLines.join('\n'));
    setShowAutoAssignMenu(false);
  };

  const handleAIGenerateScript = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingScript(true);
    try {
      const generatedScript = await generateDialogueScript(aiPrompt, {
        mode: aiMode,
        length: aiLength,
        language: aiLanguage
      });
      onChange(generatedScript);
      setShowAIModal(false);
    } catch (error) {
      alert("Failed to generate script. Please try again.");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  return (
    <div 
      className={`flex flex-col transition-all duration-300 bg-slate-800 border-slate-700 shadow-xl overflow-hidden
      ${isFullScreen 
        ? 'fixed inset-0 z-50 w-screen h-screen rounded-none border-0' 
        : 'relative h-full rounded-2xl border'}`}
    >
      
      {/* Header Bar */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-slate-700/50 bg-slate-900/30 shrink-0 gap-2 relative z-20">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-1.5 h-6 rounded-full shrink-0 ${audioResult && !isEditing ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-indigo-500'}`}></div>
          <div className="hidden sm:block truncate">
            <h2 className="text-base font-bold text-white tracking-tight">{t.editor.title}</h2>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-grow justify-end">
          
          {/* AI Write Button (Only in Edit Mode) */}
          {isEditing && (
            <button
              onClick={() => setShowAIModal(true)}
              title={t.editor.aiWrite}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-xs font-semibold text-indigo-200 transition-all border border-indigo-500/30 hover:border-indigo-400 shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="hidden sm:inline">{t.editor.aiWrite}</span>
            </button>
          )}

          {/* AUTO ASSIGN MENU (Only in Edit Mode) */}
          {isEditing && (
            <div className="relative">
              <button
                onClick={() => setShowAutoAssignMenu(!showAutoAssignMenu)}
                title={t.editor.assignSpeakers}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all border border-slate-600 hover:border-indigo-400 shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="hidden sm:inline">{t.editor.assignSpeakers}</span>
              </button>
              
              {showAutoAssignMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 overflow-hidden">
                  <button onClick={() => applySpeakerPattern('Male')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white border-b border-slate-700/50">
                    {t.editor.maleOnly}
                  </button>
                  <button onClick={() => applySpeakerPattern('Female')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white border-b border-slate-700/50">
                    {t.editor.femaleOnly}
                  </button>
                  <button onClick={() => applySpeakerPattern('Male/Female')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white border-b border-slate-700/50">
                    {t.editor.maleFemale}
                  </button>
                  <button onClick={() => applySpeakerPattern('Female/Male')} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white">
                    {t.editor.femaleMale}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* GENERATE AUDIO BUTTON (Primary Action) */}
          {onGenerate && (
            <button
              onClick={onGenerate}
              disabled={isGenerating || !value.trim()}
              title={t.editor.generateAudio}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-md
                ${isGenerating || !value.trim() 
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/20 border border-indigo-500/30'
                }`}
            >
              {isGenerating ? (
                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
              <span className="hidden sm:inline">{isGenerating ? t.editor.generating : t.editor.generateAudio}</span>
            </button>
          )}

          {/* PLAYBACK CONTROLS (Only in View/Result Mode) */}
          {audioResult && (
            <>
              {/* Divider */}
              <div className="w-px h-5 bg-slate-700 mx-1"></div>

              {/* Replay Button */}
              {onReplay && (
                <button
                  onClick={onReplay}
                  title={t.editor.replay}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}

              {/* Play/Pause Button */}
              {onTogglePlay && (
                <button
                  onClick={onTogglePlay}
                  title={isPlaying ? "Pause" : "Play"}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg text-white shadow-lg transition-all border shrink-0
                    ${isPlaying 
                      ? 'bg-amber-600 hover:bg-amber-500 border-amber-500/50' 
                      : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500/50'
                    }`}
                >
                  {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )}
              
              {/* Scrubber / Progress Bar */}
              <div className="flex-grow mx-2 max-w-[150px] sm:max-w-[250px] flex items-center gap-2">
                 <input 
                   type="range"
                   min="0"
                   max={duration || 100}
                   value={currentTime}
                   onChange={(e) => onSeek && onSeek(parseFloat(e.target.value))}
                   className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                 />
                 <span className="text-[10px] font-mono text-slate-400 min-w-[35px] hidden sm:block">
                   {formatTime(currentTime)}
                 </span>
              </div>
            </>
          )}

          {/* Edit/View Toggle */}
          {audioResult && (
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition-all border border-slate-600 hover:border-indigo-400 shrink-0"
            >
              {isEditing ? t.editor.view : t.editor.edit}
            </button>
          )}

          {/* Full Screen Toggle */}
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            title={isFullScreen ? t.editor.exitFullScreen : t.editor.fullScreen}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-600 hover:border-indigo-400 ml-1 shrink-0"
          >
            {isFullScreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Editor / Viewer Area */}
      <div className={`relative flex-grow overflow-hidden bg-slate-900/50 group ${isFullScreen ? 'p-8 pb-20' : 'min-h-[300px] pb-14 lg:pb-0'}`}>
        
        {/* AI GENERATOR MODAL OVERLAY */}
        {showAIModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-6 relative">
              <button 
                onClick={() => setShowAIModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              <h4 className="text-sm font-bold text-indigo-400 uppercase mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                   <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                </div>
                {t.editor.aiModal.title}
              </h4>
              
              {/* Options Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1.5">{t.editor.aiModal.style}</label>
                  <select 
                    value={aiMode}
                    onChange={(e) => setAiMode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 focus:border-indigo-500 outline-none hover:border-slate-500 transition-colors"
                  >
                    <option value="Dialogue">{t.editor.aiModal.styles.conversation}</option>
                    <option value="Monologue">{t.editor.aiModal.styles.monologue}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1.5">{t.editor.aiModal.length}</label>
                  <select 
                    value={aiLength}
                    onChange={(e) => setAiLength(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 focus:border-indigo-500 outline-none hover:border-slate-500 transition-colors"
                  >
                    <option value="Short">{t.editor.aiModal.lengths.short}</option>
                    <option value="Medium">{t.editor.aiModal.lengths.medium}</option>
                    <option value="Long">{t.editor.aiModal.lengths.long}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1.5">{t.editor.aiModal.language}</label>
                  <select 
                    value={aiLanguage}
                    onChange={(e) => setAiLanguage(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 focus:border-indigo-500 outline-none hover:border-slate-500 transition-colors"
                  >
                    <option value="English">English</option>
                    <option value="Vietnamese">Vietnamese</option>
                    <option value="French">French</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Spanish">Spanish</option>
                    <option value="German">German</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Korean">Korean</option>
                    <option value="Russian">Russian</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                 <label className="block text-[10px] text-slate-400 font-bold mb-1.5">{t.editor.aiModal.topic}</label>
                 <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={t.editor.aiModal.topicPlaceholder}
                  className="w-full h-28 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none resize-none placeholder-slate-600"
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setShowAIModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  {t.editor.aiModal.cancel}
                </button>
                <button 
                  onClick={handleAIGenerateScript}
                  disabled={isGeneratingScript || !aiPrompt.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20 transform transition-transform hover:scale-105"
                >
                  {isGeneratingScript ? (
                    <>
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t.editor.generating}
                    </>
                  ) : t.editor.aiModal.create}
                </button>
              </div>
            </div>
          </div>
        )}

        {isEditing ? (
           <>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              placeholder={t.editor.placeholder}
              className={`w-full h-full p-4 bg-transparent text-slate-300 placeholder-slate-600 focus:outline-none focus:bg-slate-900/80 transition-all resize-none font-mono leading-6 custom-scrollbar ${isFullScreen ? 'text-xl' : 'text-sm'}`}
              spellCheck={false}
            />
           </>
        ) : (
          <div className="w-full h-full overflow-y-auto p-2 space-y-1.5 scroll-smooth custom-scrollbar">
             {audioResult?.scriptLines.map((lineData, index) => {
               const isActive = index === selectedLineIndex;
               
               // Parse Speaker and Message
               const parts = lineData.line.split(/:(.+)/);
               const speakerName = parts[0];
               const message = parts[1] || lineData.line;
               
               const isMale = speakerName.toLowerCase().includes('male');
               const isFemale = speakerName.toLowerCase().includes('female');
               
               // Styling logic for Compact View
               let borderColor = 'border-transparent'; // Default transparent
               let bgColor = 'bg-transparent';
               let textColor = 'text-slate-500'; // Dim inactive text more
               let speakerColor = 'text-slate-600 border-slate-700/50';

               if (isMale) {
                  speakerColor = isActive ? 'text-indigo-300 border-indigo-500/50 bg-indigo-900/20' : 'text-slate-500 border-slate-700/50';
               } else if (isFemale) {
                  speakerColor = isActive ? 'text-pink-300 border-pink-500/50 bg-pink-900/20' : 'text-slate-500 border-slate-700/50';
               }

               if (isActive) {
                 borderColor = isMale ? 'border-indigo-500/40' : (isFemale ? 'border-pink-500/40' : 'border-slate-500');
                 bgColor = 'bg-slate-800'; // Highlight background
                 textColor = 'text-white';
               }

               // Adaptive font sizes for Full Screen mode to help students see from afar
               const containerPadding = isFullScreen ? 'px-6 py-4 border-l-8' : 'px-3 py-2 border-l-2';
               const speakerFontSize = isFullScreen ? 'text-sm' : 'text-[9px]';
               const messageFontSize = isFullScreen ? 'text-2xl md:text-3xl' : 'text-sm';
               const activeBorderWidth = isFullScreen ? 'pl-6' : 'pl-3';

               return (
                 <div 
                   key={index}
                   onClick={() => setSelectedLineIndex(index === selectedLineIndex ? null : index)} // Click to toggle highlight
                   className={`relative ${containerPadding} rounded-lg transition-all duration-200 group cursor-pointer ${isActive ? `${activeBorderWidth} bg-slate-800` : `border-l-transparent hover:bg-slate-800/60`}`}
                   style={{
                      borderLeftColor: isActive ? (isMale ? '#6366f1' : '#ec4899') : undefined
                   }}
                 >
                   <div className="flex flex-row items-baseline gap-4">
                     <span className={`flex-shrink-0 ${speakerFontSize} font-bold uppercase tracking-wider px-2 py-1 rounded border ${speakerColor} group-hover:border-slate-500 group-hover:text-slate-300 transition-colors duration-200`}>
                       {speakerName}
                     </span>
                     <p className={`${messageFontSize} leading-relaxed font-medium transition-colors duration-200 ${textColor} group-hover:text-white`}>
                       {message}
                     </p>
                   </div>
                 </div>
               );
             })}
             
             {/* Spacer to allow scrolling the last item to center */}
             <div className="h-[20%]" />
          </div>
        )}
      </div>
    </div>
  );
};