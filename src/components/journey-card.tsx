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

const colorClasses: Record<string, string> = {
  blue: 'border-l-blue-500',
  pink: 'border-l-pink-500',
  amber: 'border-l-amber-500',
  green: 'border-l-green-500',
  purple: 'border-l-purple-500',
};

const colorDot: Record<string, string> = {
  blue: 'bg-blue-500',
  pink: 'bg-pink-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
};

export default function JourneyCard({ 
  persona, 
  steps, 
  journey, 
  isLoading, 
  error 
}: JourneyCardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`bg-[#111] rounded-lg border-l-4 ${colorClasses[persona.color]} overflow-hidden`}>
      {/* Header */}
      <div className="p-4 border-b border-[#222]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{persona.emoji}</span>
            <div>
              <h3 className="font-semibold text-white">{persona.name}</h3>
              <p className="text-sm text-[#666]">{persona.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-[#888]">
                <div className={`w-2 h-2 rounded-full ${colorDot[persona.color]} animate-pulse`} />
                Navigating...
              </div>
            )}
            {journey && (
              <div className="text-2xl font-bold text-white">
                {journey.overallScore}/10
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 text-red-400 text-sm">
          Error: {error}
        </div>
      )}

      {/* Steps Stream */}
      {steps.length > 0 && (
        <div className="border-b border-[#222]">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full p-3 text-left text-sm text-[#888] hover:text-white flex items-center justify-between"
          >
            <span>{steps.length} step{steps.length !== 1 ? 's' : ''} • Click to {expanded ? 'collapse' : 'expand'}</span>
            <span>{expanded ? '▼' : '▶'}</span>
          </button>
          
          {expanded && (
            <div className="space-y-3 p-4 pt-0 max-h-96 overflow-y-auto">
              {steps.map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  {/* Screenshot */}
                  <div className="w-32 h-20 bg-[#1a1a1a] rounded overflow-hidden flex-shrink-0">
                    {step.screenshot && (
                      <img 
                        src={`data:image/png;base64,${step.screenshot}`} 
                        alt={`Step ${step.stepNumber}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  {/* Action */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#666] mb-1">
                      Step {step.stepNumber}
                    </div>
                    <div className="text-sm text-white truncate">
                      {step.action.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Final Summary */}
      {journey && (
        <div className="p-4">
          <p className="text-sm text-[#aaa] mb-3">{journey.summary}</p>
          
          {journey.painPoints.length > 0 && (
            <div className="mb-2">
              <h4 className="text-xs text-[#666] uppercase mb-1">Pain Points</h4>
              <ul className="text-sm text-red-400">
                {journey.painPoints.map((point, idx) => (
                  <li key={idx}>• {point}</li>
                ))}
              </ul>
            </div>
          )}
          
          {journey.highlights.length > 0 && (
            <div>
              <h4 className="text-xs text-[#666] uppercase mb-1">Highlights</h4>
              <ul className="text-sm text-green-400">
                {journey.highlights.map((highlight, idx) => (
                  <li key={idx}>• {highlight}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && steps.length === 0 && !error && (
        <div className="p-8 text-center">
          <div className="animate-pulse text-[#666]">
            Agent is analyzing the site...
          </div>
        </div>
      )}
    </div>
  );
}
