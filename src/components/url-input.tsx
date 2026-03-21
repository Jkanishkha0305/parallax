'use client';

import { useState } from 'react';

interface UrlInputProps {
  onSubmit: (url: string) => void;
}

export default function UrlInput({ onSubmit }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    
    onSubmit(finalUrl);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={`relative flex items-center gap-3 p-2 rounded-2xl transition-all duration-300 ${
        isFocused 
          ? 'bg-[#1a1a1a]/80' 
          : 'bg-[#111]'
      }`}>
        {/* Globe icon */}
        <div className={`pl-4 transition-colors ${isFocused ? 'text-purple-400' : 'text-[#666]'}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>
        
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Enter any URL to analyze..."
          className="flex-1 px-2 py-4 bg-transparent text-white placeholder-[#444] focus:outline-none text-lg"
        />
        
        <button
          type="submit"
          disabled={!url.trim()}
          className={`
            px-6 py-3 rounded-xl font-medium transition-all duration-300
            ${url.trim() 
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105' 
              : 'bg-[#222] text-[#666] cursor-not-allowed'
            }
          `}
        >
          Analyze
        </button>
      </div>
      
      {/* Hint text */}
      {url && (
        <p className="mt-3 text-sm text-[#666] text-center">
          Press Enter or click Analyze to start scanning with 5 AI personas
        </p>
      )}
    </form>
  );
}
