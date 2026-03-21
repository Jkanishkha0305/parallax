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
  const personaIds = searchParams.get('personas')?.split(',') || [];

  const [personaStates, setPersonaStates] = useState<Record<string, PersonaState>>({});
  const [urlToAnalyze, setUrlToAnalyze] = useState(url);

  // Initialize states
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
  }, [personaIds]);

  // Run SSE streams
  useEffect(() => {
    if (!url || personaIds.length === 0) return;

    personaIds.forEach((personaId) => {
      runPersonaStream(personaId, url);
    });
  }, [url, personaIds]);

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

  return (
    <main className="min-h-screen px-6 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Parallax Results</h1>
        <p className="text-[#888] break-all">{urlToAnalyze}</p>
      </div>

      {/* Overall Score */}
      <ParallaxScore scores={scores} />

      {/* Persona Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {selectedPersonas.map(persona => (
          <JourneyCard
            key={persona.id}
            persona={persona}
            steps={personaStates[persona.id]?.steps || []}
            journey={personaStates[persona.id]?.journey || null}
            isLoading={personaStates[persona.id]?.isLoading || false}
            error={personaStates[persona.id]?.error || null}
          />
        ))}
      </div>

      {/* All Loading */}
      {Object.values(personaStates).some(s => s.isLoading) && (
        <div className="text-center mt-8 text-[#666]">
          Agents are navigating the site...
        </div>
      )}
    </main>
  );
}
