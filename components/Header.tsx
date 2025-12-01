import React from 'react';

interface HeaderProps {
  t: any;
  currentLang: 'en' | 'vn';
  onToggleLang: () => void;
}

export const Header: React.FC<HeaderProps> = ({ t, currentLang, onToggleLang }) => {
  return (
    <header className="w-full py-6 px-8 border-b border-slate-700 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">{t.header.title}</h1>
            <p className="text-xs text-slate-400">{t.header.author}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-2" title="Using Gemini's Fenrir Neural Voice">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {t.header.maleStyle}
            </span>
            <span className="flex items-center gap-2" title="Using Gemini's Kore Neural Voice">
              <span className="w-2 h-2 rounded-full bg-pink-500"></span>
              {t.header.femaleStyle}
            </span>
          </div>
          
          {/* Language Toggle */}
          <button 
            onClick={onToggleLang}
            className="relative inline-flex items-center h-6 rounded-full w-11 transition-colors bg-slate-700 focus:outline-none"
          >
            <span className={`${currentLang === 'en' ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
            <span className="absolute left-1.5 text-[8px] font-bold text-slate-400 pointer-events-none">VN</span>
            <span className="absolute right-1.5 text-[8px] font-bold text-slate-400 pointer-events-none">EN</span>
          </button>
        </div>
      </div>
    </header>
  );
};