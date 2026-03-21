'use client';

import { useEffect, useState } from 'react';

interface ParallaxScoreProps {
  scores: number[];
}

export default function ParallaxScore({ scores }: ParallaxScoreProps) {
  const validScores = scores.filter(s => s > 0);
  const average = validScores.length > 0
    ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10
    : 0;
  
  const [displayScore, setDisplayScore] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (average > 0) {
      let current = 0;
      const increment = average / 30;
      const interval = setInterval(() => {
        current += increment;
        if (current >= average) {
          setDisplayScore(average);
          clearInterval(interval);
        } else {
          setDisplayScore(Math.round(current * 10) / 10);
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [average]);

  const getColor = (score: number) => {
    if (score >= 7) return { text: 'text-green-400', bg: 'from-green-500', to: 'to-emerald-600', ring: 'ring-green-500/30', glow: 'shadow-green-500/30' };
    if (score >= 4) return { text: 'text-amber-400', bg: 'from-amber-500', to: 'to-orange-600', ring: 'ring-amber-500/30', glow: 'shadow-amber-500/30' };
    return { text: 'text-red-400', bg: 'from-red-500', to: 'to-rose-600', ring: 'ring-red-500/30', glow: 'shadow-red-500/30' };
  };

  const colors = getColor(average);

  const getLabel = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 7) return 'Good';
    if (score >= 5) return 'Needs Work';
    if (score >= 4) return 'Problematic';
    return 'Critical';
  };

  if (validScores.length === 0) return null;

  return (
    <div className={`text-center transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`relative inline-block px-10 py-8 rounded-3xl bg-gradient-to-br ${colors.bg}/${mounted ? '15' : '5'} to-transparent border ${colors.ring} backdrop-blur-sm ${colors.glow}`}>
        {/* Animated rings */}
        <div className={`absolute inset-0 rounded-3xl border ${colors.ring} animate-ping opacity-20`} />
        
        {/* Content */}
        <div className="relative z-10">
          <div className="text-sm text-[#666] mb-2 tracking-wider uppercase">Parallax Score</div>
          
          <div className="flex items-baseline justify-center gap-2">
            <span className={`text-7xl font-bold ${colors.text} tabular-nums`}>
              {displayScore.toFixed(1)}
            </span>
            <span className="text-2xl text-[#555]">/10</span>
          </div>
          
          <div className={`mt-3 inline-block px-4 py-1.5 rounded-full bg-gradient-to-r ${colors.bg}/20 to-transparent border border-current/${colors.text.split('-')[1]}-500/20`}>
            <span className={`text-sm font-medium ${colors.text}`}>
              {getLabel(average)}
            </span>
          </div>
          
          <div className="mt-4 flex items-center justify-center gap-6 text-sm text-[#666]">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${average >= 7 ? 'bg-green-400' : average >= 4 ? 'bg-amber-400' : 'bg-red-400'}`} />
              <span>{validScores.length} personas</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Instant analysis</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
