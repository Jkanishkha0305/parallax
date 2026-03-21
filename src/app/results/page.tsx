'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PERSONAS } from '@/lib/personas';
import { AgentStep, PersonaJourney, Persona } from '@/lib/types';
import JourneyCard from '@/components/journey-card';
import ParallaxScore from '@/components/parallax-score';

interface PersonaState {
  steps: AgentStep[];
  journey: PersonaJourney | null;
  isLoading: boolean;
  error: string | null;
}

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url') || '';
  const personaIdsString = searchParams.get('personas') || '';
  const personaIds = personaIdsString ? personaIdsString.split(',') : [];

  const [personaStates, setPersonaStates] = useState<Record<string, PersonaState>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const initialStates: Record<string, PersonaState> = {};
    PERSONAS.forEach(persona => {
      initialStates[persona.id] = {
        steps: [],
        journey: null,
        isLoading: personaIds.includes(persona.id),
        error: null,
      };
    });
    setPersonaStates(initialStates);
  }, [personaIdsString]);

  useEffect(() => {
    if (!url || !personaIdsString) return;
    personaIds.forEach((personaId) => {
      runPersonaStream(personaId, url);
    });
  }, [url, personaIdsString]);

  const runPersonaStream = async (personaId: string, targetUrl: string) => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, personaId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'step') {
                setPersonaStates(prev => ({
                  ...prev,
                  [personaId]: {
                    ...prev[personaId],
                    steps: [...prev[personaId].steps, data.step],
                  },
                }));
              } else if (data.type === 'summary') {
                setPersonaStates(prev => ({
                  ...prev,
                  [personaId]: {
                    ...prev[personaId],
                    journey: {
                      personaId,
                      steps: prev[personaId].steps,
                      overallScore: data.overallScore,
                      summary: data.summary,
                      painPoints: data.painPoints,
                      highlights: data.highlights,
                    },
                    isLoading: false,
                  },
                }));
              } else if (data.type === 'error') {
                setPersonaStates(prev => ({
                  ...prev,
                  [personaId]: {
                    ...prev[personaId],
                    error: data.message,
                    isLoading: false,
                  },
                }));
              }
            } catch (e) {
              // Skip parse errors
            }
          }
        }
      }
    } catch (error) {
      setPersonaStates(prev => ({
        ...prev,
        [personaId]: {
          ...prev[personaId],
          error: error instanceof Error ? error.message : 'Unknown error',
          isLoading: false,
        },
      }));
    }
  };

  const selectedPersonas = PERSONAS.filter(p => personaIds.includes(p.id));
  const scores = Object.values(personaStates)
    .map(s => s.journey?.overallScore || 0)
    .filter(s => s > 0);
  const loadingCount = Object.values(personaStates).filter(s => s.isLoading).length;

  return (
    <main className={`min-h-screen relative transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 px-6 py-12 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold gradient-text">Analysis Results</h1>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
            <svg className="w-4 h-4 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p className="text-[#888] text-sm break-all">{url}</p>
          </div>
        </div>

        {/* Overall Score */}
        <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <ParallaxScore scores={scores} />
        </div>

        {/* Loading Status */}
        {loadingCount > 0 && (
          <div className="mb-8 text-center animate-fade-in-up">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-purple-500/10 rounded-full border border-purple-500/20">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[#ccc]">
                {loadingCount} agent{loadingCount > 1 ? 's' : ''} navigating the site...
              </span>
            </div>
          </div>
        )}

        {/* Persona Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {selectedPersonas.map((persona, idx) => (
            <div 
              key={persona.id} 
              className="animate-fade-in-up"
              style={{ animationDelay: `${0.2 + idx * 0.1}s` }}
            >
              <JourneyCard
                persona={persona}
                steps={personaStates[persona.id]?.steps || []}
                journey={personaStates[persona.id]?.journey || null}
                isLoading={personaStates[persona.id]?.isLoading || false}
                error={personaStates[persona.id]?.error || null}
              />
            </div>
          ))}
        </div>

        {/* All Complete */}
        {loadingCount === 0 && scores.length > 0 && (
          <div className="mt-12 text-center animate-fade-in-up">
            <div className="inline-flex items-center gap-2 text-[#666]">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Analysis complete • {selectedPersonas.length} personas analyzed
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
