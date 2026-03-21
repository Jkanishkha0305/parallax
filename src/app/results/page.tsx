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

interface Suggestion {
  priority: 'high' | 'medium' | 'low';
  issue: string;
  fix: string;
  impact: string;
}

interface SuggestionsResponse {
  suggestions: Suggestion[];
  summary: string;
}

interface RepoSuggestion {
  file: string;
  issue: string;
  suggestion: string;
}

interface RepoAnalysis {
  repo: {
    name: string;
    description: string;
    language: string;
    stars: number;
    url: string;
  };
  suggestions: {
    relevantFiles: { path: string; reason: string; priority: string }[];
    summary: string;
    potentialFixes: RepoSuggestion[];
  };
}

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url') || '';
  const personaIdsString = searchParams.get('personas') || '';
  const personaIds = personaIdsString ? personaIdsString.split(',') : [];
  const isCustom = searchParams.get('custom') === 'true';

  const [personaStates, setPersonaStates] = useState<Record<string, PersonaState>>({});
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [mounted, setMounted] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // GitHub integration
  const [githubUrl, setGithubUrl] = useState('');
  const [repoAnalysis, setRepoAnalysis] = useState<RepoAnalysis | null>(null);
  const [isAnalyzingRepo, setIsAnalyzingRepo] = useState(false);
  const [showRepoSection, setShowRepoSection] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!personaIdsString) return;

    let activePersonas: Persona[];
    
    if (isCustom) {
      try {
        const stored = localStorage.getItem('custom-personas');
        if (stored) {
          activePersonas = JSON.parse(stored);
        } else {
          activePersonas = PERSONAS.filter(p => personaIds.includes(p.id));
        }
      } catch {
        activePersonas = PERSONAS.filter(p => personaIds.includes(p.id));
      }
    } else {
      activePersonas = PERSONAS.filter(p => personaIds.includes(p.id));
    }

    setPersonas(activePersonas);

    const initialStates: Record<string, PersonaState> = {};
    activePersonas.forEach(persona => {
      initialStates[persona.id] = {
        steps: [],
        journey: null,
        isLoading: personaIds.includes(persona.id),
        error: null,
      };
    });
    setPersonaStates(initialStates);
  }, [personaIdsString, isCustom]);

  useEffect(() => {
    if (!url || !personaIdsString || personas.length === 0) return;
    personaIds.forEach((personaId) => {
      const persona = personas.find(p => p.id === personaId);
      if (persona) {
        runPersonaStream(personaId, url, persona);
      }
    });
  }, [url, personaIdsString, personas]);

  const runPersonaStream = async (personaId: string, targetUrl: string, persona: Persona) => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, personaId, personaData: persona }),
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

  const generateSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const journeys = selectedPersonas
        .map(p => personaStates[p.id]?.journey)
        .filter(Boolean)
        .map(j => ({
          personaName: j!.personaId,
          painPoints: j!.painPoints,
          highlights: j!.highlights,
          overallScore: j!.overallScore,
        }));

      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, journeys }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const analyzeRepo = async () => {
    if (!githubUrl.trim()) return;
    setIsAnalyzingRepo(true);
    try {
      const allPainPoints = selectedPersonas
        .flatMap(p => personaStates[p.id]?.journey?.painPoints || []);
      
      const response = await fetch('/api/analyze-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUrl: githubUrl.trim(), painPoints: allPainPoints }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze repository');
      }

      const data = await response.json();
      setRepoAnalysis(data);
    } catch (error) {
      console.error('Error analyzing repo:', error);
    } finally {
      setIsAnalyzingRepo(false);
    }
  };

  const selectedPersonas = personas.filter(p => personaIds.includes(p.id));
  const scores = Object.values(personaStates)
    .map(s => s.journey?.overallScore || 0)
    .filter(s => s > 0);
  const loadingCount = Object.values(personaStates).filter(s => s.isLoading).length;
  const isComplete = loadingCount === 0 && scores.length > 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: '🔴' };
      case 'medium': return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: '🟡' };
      case 'low': return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: '🟢' };
      default: return { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white', icon: '⚪' };
    }
  };

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
          {isCustom && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
              <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm text-purple-400">Custom Personas</span>
            </div>
          )}
        </div>

        {/* Overall Score */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
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

        {/* All Complete - Actions */}
        {isComplete && (
          <div className="mt-12 animate-fade-in-up">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 text-[#666]">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Analysis complete • {selectedPersonas.length} personas analyzed
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              {/* Get Suggestions Button */}
              {!showSuggestions && (
                <button
                  onClick={generateSuggestions}
                  disabled={isLoadingSuggestions}
                  className="group relative px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isLoadingSuggestions ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    )}
                    AI Suggestions
                  </span>
                </button>
              )}

              {/* GitHub Integration Button */}
              {!showRepoSection && (
                <button
                  onClick={() => setShowRepoSection(true)}
                  className="group relative px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 border border-gray-600"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Connect GitHub
                  </span>
                </button>
              )}
            </div>

            {/* Suggestions Panel */}
            {showSuggestions && suggestions && (
              <div className="mt-8 text-left max-w-3xl mx-auto">
                <div className="glass-card p-6 border border-amber-500/20">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">AI Suggestions</h2>
                      <p className="text-sm text-[#666]">Actionable fixes based on persona feedback</p>
                    </div>
                    <button
                      onClick={() => setShowSuggestions(false)}
                      className="ml-auto text-[#666] hover:text-white transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="mb-6 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <p className="text-amber-200">{suggestions.summary}</p>
                  </div>

                  <div className="space-y-4">
                    {suggestions.suggestions.map((suggestion, idx) => {
                      const colors = getPriorityColor(suggestion.priority);
                      return (
                        <div key={idx} className={`p-4 rounded-xl ${colors.bg} border ${colors.border}`}>
                          <div className="flex items-start gap-3">
                            <span className="text-xl">{colors.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs font-medium uppercase ${colors.text}`}>
                                  {suggestion.priority} priority
                                </span>
                              </div>
                              <h4 className="font-medium text-white mb-2">{suggestion.issue}</h4>
                              <p className="text-sm text-[#999] mb-2">
                                <span className="text-purple-400 font-medium">Fix: </span>
                                {suggestion.fix}
                              </p>
                              <p className="text-sm text-[#777]">
                                <span className="text-green-400 font-medium">Impact: </span>
                                {suggestion.impact}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* GitHub Integration Section */}
            {showRepoSection && (
              <div className="mt-8 text-left max-w-3xl mx-auto">
                <div className="glass-card p-6 border border-gray-500/20">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">GitHub Integration</h2>
                      <p className="text-sm text-[#666]">Connect your repo to get file-specific suggestions</p>
                    </div>
                    <button
                      onClick={() => setShowRepoSection(false)}
                      className="ml-auto text-[#666] hover:text-white transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* GitHub URL Input */}
                  <div className="flex gap-3 mb-6">
                    <input
                      type="text"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/owner/repo"
                      className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-white placeholder-[#444] focus:outline-none focus:border-gray-500"
                    />
                    <button
                      onClick={analyzeRepo}
                      disabled={isAnalyzingRepo || !githubUrl.trim()}
                      className="px-6 py-3 bg-white text-black font-medium rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isAnalyzingRepo ? 'Analyzing...' : 'Analyze'}
                    </button>
                  </div>

                  {/* Repo Analysis Results */}
                  {repoAnalysis && (
                    <div className="space-y-4">
                      {/* Repo Info */}
                      <div className="p-4 bg-gray-500/10 rounded-xl border border-gray-500/20">
                        <div className="flex items-center gap-3 mb-2">
                          <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          <a href={repoAnalysis.repo.url} target="_blank" rel="noopener noreferrer" className="text-white font-medium hover:text-purple-400 transition-colors">
                            {repoAnalysis.repo.name}
                          </a>
                          <span className="text-sm text-[#666]">
                            ⭐ {repoAnalysis.repo.stars} • {repoAnalysis.repo.language}
                          </span>
                        </div>
                        <p className="text-sm text-[#888]">{repoAnalysis.repo.description || 'No description'}</p>
                      </div>

                      {/* Summary */}
                      <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <p className="text-purple-200">{repoAnalysis.suggestions.summary}</p>
                      </div>

                      {/* Relevant Files */}
                      {repoAnalysis.suggestions.relevantFiles.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-[#999] mb-3">Files to Review</h4>
                          <div className="space-y-2">
                            {repoAnalysis.suggestions.relevantFiles.map((file, idx) => {
                              const colors = getPriorityColor(file.priority);
                              return (
                                <div key={idx} className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <code className="text-sm text-white font-mono">{file.path}</code>
                                    <span className={`text-xs ${colors.text}`}>{file.priority}</span>
                                  </div>
                                  <p className="text-xs text-[#888]">{file.reason}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Potential Fixes */}
                      {repoAnalysis.suggestions.potentialFixes.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-[#999] mb-3">Suggested Changes</h4>
                          <div className="space-y-3">
                            {repoAnalysis.suggestions.potentialFixes.map((fix, idx) => (
                              <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <div className="flex items-start gap-2">
                                  <code className="text-xs text-purple-400 font-mono bg-purple-500/10 px-2 py-1 rounded">{fix.file}</code>
                                </div>
                                <p className="text-sm text-[#999] mt-2">
                                  <span className="text-amber-400 font-medium">Issue: </span>
                                  {fix.issue}
                                </p>
                                <p className="text-sm text-[#aaa] mt-1">
                                  <span className="text-green-400 font-medium">Suggestion: </span>
                                  {fix.suggestion}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
