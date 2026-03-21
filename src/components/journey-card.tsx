'use client';

import { useState } from 'react';
import { AgentStep, PersonaJourney, Persona } from '@/lib/types';

interface JourneyCardProps {
  persona: Persona;
  steps: AgentStep[];
  journey: PersonaJourney | null;
  isLoading: boolean;
  error: string | null;
}

const colorConfig: Record<string, { gradient: string; bg: string; text: string; border: string; glow: string }> = {
  blue: { gradient: 'from-blue-500/20', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' },
  pink: { gradient: 'from-pink-500/20', bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30', glow: 'shadow-pink-500/20' },
  amber: { gradient: 'from-amber-500/20', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'shadow-amber-500/20' },
  green: { gradient: 'from-green-500/20', bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', glow: 'shadow-green-500/20' },
  purple: { gradient: 'from-purple-500/20', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', glow: 'shadow-purple-500/20' },
};

export default function JourneyCard({ 
  persona, 
  steps, 
  journey, 
  isLoading, 
  error 
}: JourneyCardProps) {
  const [expanded, setExpanded] = useState(true);
  const config = colorConfig[persona.color];

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-400';
    if (score >= 4) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 7) return 'bg-green-500/20 border-green-500/30';
    if (score >= 4) return 'bg-amber-500/20 border-amber-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  return (
    <div className={`glass-card overflow-hidden transition-all duration-300 border ${config.border} ${isLoading ? config.glow : ''}`}>
      {/* Header */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.gradient} to-transparent flex items-center justify-center text-3xl ${isLoading ? 'animate-pulse' : ''}`}>
              {persona.emoji}
            </div>
            
            {/* Info */}
            <div>
              <h3 className="font-semibold text-lg text-white">{persona.name}</h3>
              <p className="text-sm text-[#666]">{persona.description}</p>
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-3">
            {isLoading && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg}`}>
                <div className={`w-2 h-2 rounded-full bg-${persona.color}-500 animate-pulse`} />
                <span className="text-sm text-[#888]">Analyzing...</span>
              </div>
            )}
            
            {journey && (
              <div className={`px-4 py-2 rounded-xl border ${getScoreBg(journey.overallScore)} ${getScoreColor(journey.overallScore)}`}>
                <span className="text-2xl font-bold">{journey.overallScore}</span>
                <span className="text-sm opacity-60">/10</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-5 bg-red-500/10 border-b border-red-500/20">
          <div className="flex items-center gap-3 text-red-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Steps Stream */}
      {steps.length > 0 && (
        <div className="border-b border-white/5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                <svg className={`w-4 h-4 ${config.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className="text-sm text-[#888]">
                {steps.length} step{steps.length !== 1 ? 's' : ''} captured
              </span>
            </div>
            <div className={`w-6 h-6 rounded-full bg-white/5 flex items-center justify-center transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
              <svg className="w-4 h-4 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {expanded && (
            <div className="px-4 pb-4 space-y-3 max-h-80 overflow-y-auto">
              {steps.map((step, idx) => (
                <div key={idx} className="flex gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                  {/* Screenshot */}
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1a1a] border border-white/5">
                    {step.screenshot && (
                      <img 
                        src={`data:image/jpeg;base64,${step.screenshot}`} 
                        alt={`Step ${step.stepNumber}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  
                  {/* Action info + Thought bubble */}
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-md ${config.bg} flex items-center justify-center text-xs font-medium ${config.text}`}>
                        {step.stepNumber}
                      </span>
                      <span className="text-xs text-[#555]">Step</span>
                    </div>
                    <p className="text-sm text-[#aaa] leading-relaxed">
                      {step.action.description}
                    </p>
                    {step.thought && (
                      <div className="flex items-start gap-2">
                        <div className={`w-6 h-6 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <span className="text-xs">{persona.emoji}</span>
                        </div>
                        <div className={`px-3 py-2 rounded-2xl rounded-tl-none ${config.bg} border ${config.border}`}>
                          <p className="text-xs text-[#ccc] leading-relaxed">{step.thought}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Final Summary */}
      {journey && (
        <div className="p-5 space-y-4">
          <p className="text-sm text-[#999] leading-relaxed">{journey.summary}</p>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Pain Points */}
            {journey.painPoints.length > 0 && (
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h4 className="text-xs font-medium text-red-400 uppercase tracking-wider">Pain Points</h4>
                </div>
                <ul className="space-y-1.5">
                  {journey.painPoints.map((point, idx) => (
                    <li key={idx} className="text-xs text-red-300/80 flex gap-2">
                      <span className="text-red-400/50">•</span>
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Highlights */}
            {journey.highlights.length > 0 && (
              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <h4 className="text-xs font-medium text-green-400 uppercase tracking-wider">Highlights</h4>
                </div>
                <ul className="space-y-1.5">
                  {journey.highlights.map((highlight, idx) => (
                    <li key={idx} className="text-xs text-green-300/80 flex gap-2">
                      <span className="text-green-400/50">•</span>
                      <span className="leading-relaxed">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && steps.length === 0 && !error && (
        <div className="p-8 text-center">
          <div className="inline-flex flex-col items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${config.gradient} to-transparent animate-pulse`}>
              <div className="w-full h-full flex items-center justify-center text-2xl">
                {persona.emoji}
              </div>
            </div>
            <div className="text-sm text-[#666]">Taking screenshots...</div>
          </div>
        </div>
      )}
    </div>
  );
}
