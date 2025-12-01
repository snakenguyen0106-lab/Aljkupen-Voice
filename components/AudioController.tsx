import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { processAudioWithSpeed } from '../services/geminiService';

export interface AudioControllerHandle {
  togglePlay: () => void;
  seekTo: (time: number) => void;
  play: () => void;
}

interface AudioControllerProps {
  t: any;
  audioUrl: string | null;
  downloadUrl?: string | null;
  downloadFilename?: string;
  isGenerating: boolean;
  onGenerate: () => void;
  autoPlay?: boolean;
  audioBuffer?: AudioBuffer;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onTimeUpdate?: (time: number) => void;
}

export const AudioController = forwardRef<AudioControllerHandle, AudioControllerProps>(({ 
  t,
  audioUrl: initialAudioUrl, 
  downloadUrl: initialDownloadUrl,
  downloadFilename: initialDownloadFilename = 'dialogue.wav',
  isGenerating, 
  onGenerate,
  autoPlay = true,
  audioBuffer,
  onPlayStateChange,
  onTimeUpdate
}, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(initialAudioUrl);
  const [currentDownloadUrl, setCurrentDownloadUrl] = useState<string | null>(initialDownloadUrl);
  const [currentFilename, setCurrentFilename] = useState<string>(initialDownloadFilename);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useImperativeHandle(ref, () => ({
    togglePlay: () => {
      if (audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play().catch(err => console.error("Playback failed:", err));
        } else {
          audioRef.current.pause();
        }
      }
    },
    seekTo: (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
      }
    },
    play: () => {
       if (audioRef.current) {
        audioRef.current.play().catch(err => console.error("Playback failed:", err));
       }
    }
  }));

  useEffect(() => {
    setCurrentAudioUrl(initialAudioUrl);
    setCurrentDownloadUrl(initialDownloadUrl);
    setCurrentFilename(initialDownloadFilename);
    setPlaybackSpeed(1);
  }, [initialAudioUrl, initialDownloadUrl, initialDownloadFilename]);

  useEffect(() => {
    const updateSpeed = async () => {
      if (!audioBuffer) return;
      if (audioRef.current) {
        audioRef.current.playbackRate = playbackSpeed;
      }
      if (playbackSpeed === 1) {
        setCurrentAudioUrl(initialAudioUrl);
        setCurrentDownloadUrl(initialDownloadUrl);
        setCurrentFilename(initialDownloadFilename);
        return;
      }
      setIsProcessing(true);
      try {
        const result = await processAudioWithSpeed(audioBuffer, playbackSpeed);
        setCurrentAudioUrl(result.audioUrl);
        setCurrentDownloadUrl(result.downloadUrl);
        setCurrentFilename(result.downloadFilename);
      } catch (err) {
        console.error("Error processing audio speed:", err);
      } finally {
        setIsProcessing(false);
      }
    };
    updateSpeed();
  }, [playbackSpeed, audioBuffer, initialAudioUrl, initialDownloadUrl, initialDownloadFilename]);

  useEffect(() => {
    if (currentAudioUrl && audioRef.current && autoPlay && playbackSpeed === 1) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => console.log("Auto-play prevented:", e));
      }
    }
  }, [currentAudioUrl, autoPlay, playbackSpeed]);

  const handleCanPlay = () => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  };

  const handlePlay = () => onPlayStateChange && onPlayStateChange(true);
  const handlePause = () => onPlayStateChange && onPlayStateChange(false);
  const handleEnded = () => onPlayStateChange && onPlayStateChange(false);
  
  const handleTimeUpdate = () => {
    if (audioRef.current && onTimeUpdate) {
      onTimeUpdate(audioRef.current.currentTime);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-white">{t.audio.title}</h2>
        {(isGenerating || isProcessing) && (
          <span className="flex items-center gap-2 text-indigo-400 text-sm animate-pulse">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {isGenerating ? t.audio.synthesizing : t.audio.processing}
          </span>
        )}
      </div>

      <div className="space-y-6">
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className={`w-full py-4 rounded-lg font-bold text-white text-lg shadow-lg transform transition-all duration-200 
            ${isGenerating 
              ? 'bg-slate-600 cursor-not-allowed opacity-50' 
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:scale-[1.02] hover:shadow-indigo-500/25 active:scale-[0.98]'
            }`}
        >
          {isGenerating ? t.audio.synthesizing : t.audio.generatePlay}
        </button>

        {currentAudioUrl ? (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
             
             {/* Time Stretching Controls */}
             <div className="mb-4 bg-slate-700/30 p-3 rounded-lg border border-slate-600/50">
               <div className="flex justify-between items-center mb-2">
                 <label className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                   </svg>
                   {t.audio.timeStretch}
                 </label>
                 <span className="text-xs font-mono text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded">
                   {playbackSpeed}x
                 </span>
               </div>
               
               <p className="text-[10px] text-slate-400 mb-3">
                 {t.audio.timeStretchDesc}
               </p>

               <div className="flex items-center gap-4">
                 <div className="flex-grow">
                   <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                    disabled={isProcessing}
                    className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                   />
                   <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                     <span>0.5x</span>
                     <span>1.0x</span>
                     <span>2.0x</span>
                   </div>
                 </div>

                 <div className="flex-shrink-0">
                   <select 
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                      disabled={isProcessing}
                      className="bg-slate-800 border border-slate-600 text-xs text-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-500"
                   >
                     <option value="0.5">0.5x</option>
                     <option value="0.75">0.75x</option>
                     <option value="0.85">0.85x</option>
                     <option value="0.9">0.9x</option>
                     <option value="0.95">0.95x</option>
                     <option value="1">1.0x</option>
                     <option value="1.25">1.25x</option>
                     <option value="1.5">1.5x</option>
                     <option value="2">2.0x</option>
                   </select>
                 </div>
               </div>
             </div>

             <audio 
              key={currentAudioUrl}
              ref={audioRef} 
              controls 
              onCanPlay={handleCanPlay}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              onTimeUpdate={handleTimeUpdate}
              className="w-full mb-4 accent-indigo-500"
              src={currentAudioUrl}
            />
            
            <a 
              href={currentDownloadUrl || currentAudioUrl} 
              download={currentFilename}
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-indigo-500 transition-all text-sm font-medium group ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {currentFilename.endsWith('.mp3') 
                ? `${t.audio.downloadMp3} (${playbackSpeed}x)` 
                : `${t.audio.downloadWav} (${playbackSpeed}x)`}
            </a>
            
            {playbackSpeed !== 1 && (
              <p className="text-center text-xs text-slate-500 mt-2">
                {t.audio.note}
              </p>
            )}
          </div>
        ) : (
          <div className="h-24 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 bg-slate-800/50">
            <span className="text-sm">{t.audio.visualization}</span>
          </div>
        )}
      </div>
    </div>
  );
});