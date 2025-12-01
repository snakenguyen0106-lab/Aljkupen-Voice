import React from 'react';
import { AudioSettings } from '../types';

interface SettingsPanelProps {
  t: any;
  settings: AudioSettings;
  onChange: (settings: AudioSettings) => void;
  disabled: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ t, settings, onChange, disabled }) => {
  
  // Logic values (English) for the API
  const speedValues = [
    'Very Slow', 'Slow', 'Moderately Slow', 'Slightly Slow', 'Normal', 
    'Slightly Fast', 'Moderately Fast', 'Fast', 'Very Fast'
  ];

  const pitchValues = [
    'Very Deep', 'Deep', 'Moderately Deep', 'Slightly Deep', 'Normal', 
    'Slightly High', 'Moderately High', 'High', 'Very High'
  ];
  
  // Display values (Translated) for the UI
  const speedLabels = t.settings.speedLabels;
  const pitchLabels = t.settings.pitchLabels;
  
  // Categorized Gemini Voices
  const maleOptions = ['Puck', 'Charon', 'Fenrir', 'Child Male'];
  const femaleOptions = ['Kore', 'Zephyr', 'Child Female'];

  const getSpeedIndex = () => {
    const idx = speedValues.indexOf(settings.speed);
    return idx === -1 ? 4 : idx;
  };
  
  const getPitchIndex = () => {
    const idx = pitchValues.indexOf(settings.pitch);
    return idx === -1 ? 4 : idx;
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value);
    onChange({ ...settings, speed: speedValues[index] });
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value);
    onChange({ ...settings, pitch: pitchValues[index] });
  };

  const handleMaleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...settings, maleVoice: e.target.value });
  };

  const handleFemaleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...settings, femaleVoice: e.target.value });
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        {t.settings.title}
      </h3>
      
      <div className="space-y-6">
        
        {/* Voice Personas Section */}
        <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-700/50">
          <h4 className="text-xs font-bold text-indigo-300 mb-3 uppercase tracking-wider flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            {t.settings.personas}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t.settings.maleVoice}</label>
                <select
                  value={settings.maleVoice}
                  onChange={handleMaleVoiceChange}
                  disabled={disabled}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 disabled:opacity-50"
                >
                  {maleOptions.map(voice => (
                    <option key={`male-${voice}`} value={voice}>{voice}</option>
                  ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t.settings.femaleVoice}</label>
                <select
                  value={settings.femaleVoice}
                  onChange={handleFemaleVoiceChange}
                  disabled={disabled}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 disabled:opacity-50"
                >
                  {femaleOptions.map(voice => (
                    <option key={`female-${voice}`} value={voice}>{voice}</option>
                  ))}
                </select>
             </div>
          </div>
        </div>

        {/* Speech Characteristics Section */}
        <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-700/50">
          <h4 className="text-xs font-bold text-pink-300 mb-3 uppercase tracking-wider flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
            </svg>
            {t.settings.characteristics}
          </h4>
          
          <div className="space-y-6">
            {/* Speed Control */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">{t.settings.speed}</label>
                <span className="text-xs font-mono text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded">
                  {speedLabels[getSpeedIndex()]}
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="8" 
                  step="1"
                  value={getSpeedIndex()}
                  onChange={handleSpeedChange}
                  disabled={disabled}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50 z-10 relative"
                />
                {/* Ticks for visual reference */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-1 pointer-events-none opacity-30">
                   {[...Array(9)].map((_, i) => <div key={i} className="w-0.5 h-1 bg-slate-400"></div>)}
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1 font-medium">
                <span>{speedLabels[0]}</span>
                <span className="text-slate-400">{speedLabels[4]}</span>
                <span>{speedLabels[8]}</span>
              </div>
            </div>

            {/* Pitch Control */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">{t.settings.pitch}</label>
                <span className="text-xs font-mono text-indigo-300 bg-indigo-900/30 px-2 py-0.5 rounded">
                  {pitchLabels[getPitchIndex()]}
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="1"
                  value={getPitchIndex()}
                  onChange={handlePitchChange}
                  disabled={disabled}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50 z-10 relative"
                />
                 {/* Ticks for visual reference */}
                 <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-1 pointer-events-none opacity-30">
                   {[...Array(9)].map((_, i) => <div key={i} className="w-0.5 h-1 bg-slate-400"></div>)}
                </div>
              </div>
               <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1 font-medium">
                <span>{pitchLabels[0]}</span>
                <span className="text-slate-400">{pitchLabels[4]}</span>
                <span>{pitchLabels[8]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};