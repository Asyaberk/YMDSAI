import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function Logo({ className = "", size = 40, showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div 
        className="relative flex items-center justify-center bg-primary rounded-xl shadow-lg shadow-primary/20"
        style={{ width: size, height: size }}
      >
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-3/5 h-3/5 text-white"
        >
          <path 
            d="M12 6.00012L12 18.0001M12 6.00012C12 6.00012 11 4.00012 8 4.00012C5 4.00012 3 6.00012 3 6.00012V18.0001C3 18.0001 5 16.0001 8 16.0001C11 16.0001 12 18.0001 12 18.0001M12 6.00012C12 6.00012 13 4.00012 16 4.00012C19 4.00012 21 6.00012 21 6.00012V18.0001C21 18.0001 19 16.0001 16 16.0001C13 16.0001 12 18.0001 12 18.0001" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M14 2L16 4L14 6" 
            className="animate-pulse opacity-70"
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ transform: 'scale(0.5) translate(25px, -15px)' }}
          />
        </svg>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-academic rounded-full border-2 border-white animate-bounce" />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 tracking-tight leading-none text-lg">
            Mevzuat<span className="text-primary">AI</span>
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 leading-none">
            YÖK Denetim Sistemi
          </span>
        </div>
      )}
    </div>
  );
}
