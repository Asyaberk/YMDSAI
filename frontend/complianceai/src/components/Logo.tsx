import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function Logo({ className = "", size = 40, showText = true }: LogoProps) {
  const { t } = useLanguage();
  const checkSize = Math.round(size * 0.38);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon box */}
      <div
        className="relative flex items-center justify-center rounded-xl shadow-lg shadow-primary/30 overflow-hidden shrink-0"
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '68%', height: '68%' }}
        >
          {/* ── Graduation Cap (top, separate) ── */}
          {/* Mortarboard flat top */}
          <path
            d="M12 1.5L4.5 5.5L12 9.5L19.5 5.5L12 1.5Z"
            fill="white"
          />
          {/* Right side drop (standing post) */}
          <line x1="19.5" y1="5.5" x2="19.5" y2="8.5"
            stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          {/* Tassel ball */}
          <circle cx="19.5" cy="9" r="0.9" fill="rgba(255,255,255,0.85)" />

          {/* ── Open Book (bottom, separate) ── */}
          {/* Left page */}
          <path
            d="M2 12.5C2 12.5 4.5 11.5 6.5 11.5C8.5 11.5 10.5 12.5 10.5 12.5V21.5C10.5 21.5 8.5 20.5 6.5 20.5C4.5 20.5 2 21.5 2 21.5V12.5Z"
            fill="rgba(255,255,255,0.92)"
          />
          {/* Right page */}
          <path
            d="M22 12.5C22 12.5 19.5 11.5 17.5 11.5C15.5 11.5 13.5 12.5 13.5 12.5V21.5C13.5 21.5 15.5 20.5 17.5 20.5C19.5 20.5 22 21.5 22 21.5V12.5Z"
            fill="rgba(255,255,255,0.92)"
          />
          {/* Book spine */}
          <line x1="12" y1="12.5" x2="12" y2="21.5"
            stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        </svg>

        {/* Checkmark badge — bottom-right */}
        <div
          className="absolute bottom-0 right-0 bg-emerald-400 flex items-center justify-center rounded-tl-lg"
          style={{ width: checkSize, height: checkSize }}
        >
          <svg viewBox="0 0 10 10" fill="none" style={{ width: '65%', height: '65%' }}>
            <polyline
              points="1.5,5 3.8,7.5 8.5,2"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-extrabold text-slate-900 tracking-tight text-[1.1rem]">
            YMDS<span className="text-primary">AI</span>
          </span>
          <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-[0.18em] mt-[3px]">
            {t('logoSubtitle')}
          </span>
        </div>
      )}
    </div>
  );
}
