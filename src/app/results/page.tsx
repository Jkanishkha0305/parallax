'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PERSONAS } from '@/lib/personas';
import { AgentStep, PersonaJourney, Persona } from '@/lib/types';
import JourneyCard from '@/components/journey-card';
import ParallaxScore from '@/components/parallax-score';

type Tab = 'personas' | 'suggestions' | 'github';

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

function ResultsContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url') || '';
  const intent = searchParams.get('intent') || '';
  const personaIdsString = searchParams.get('personas') || '';
  const personaIds = personaIdsString ? personaIdsString.split(',') : [];
  const isCustom = searchParams.get('custom') === 'true';
  const ghTokenParam = searchParams.get('ghToken') || '';
  const ghRepoParam = searchParams.get('ghRepo') || '';

  const [activeTab, setActiveTab] = useState<Tab>('personas');
  const [personaStates, setPersonaStates] = useState<Record<string, PersonaState>>({});
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [mounted, setMounted] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  // GitHub integration
  const [githubToken, setGithubToken] = useState(ghTokenParam);
  const [githubUrl, setGithubUrl] = useState(ghRepoParam);
  const [repoAnalysis, setRepoAnalysis] = useState<RepoAnalysis | null>(null);
  const [isAnalyzingRepo, setIsAnalyzingRepo] = useState(false);
  const [isFilingIssue, setIsFilingIssue] = useState(false);
  const [filedIssueUrl, setFiledIssueUrl] = useState('');
  const [githubError, setGithubError] = useState<string | null>(null);
  const [githubSuccess, setGithubSuccess] = useState<{ issueUrl: string; issueNumber: number } | null>(null);

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
      if (persona) runPersonaStream(personaId, url, persona, intent);
    });
  }, [url, personaIdsString, personas, intent]);

  const runPersonaStream = async (personaId: string, targetUrl: string, persona: Persona, intentParam: string = '') => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, personaId, personaData: persona, intent: intentParam }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'step') {
                setPersonaStates(prev => ({
                  ...prev,
                  [personaId]: {
                    ...prev[personaId],
                    steps: [...(prev[personaId]?.steps || []), data.step],
                  },
                }));
              } else if (data.type === 'summary') {
                setPersonaStates(prev => ({
                  ...prev,
                  [personaId]: {
                    ...prev[personaId],
                    journey: {
                      personaId: data.personaId,
                      steps: prev[personaId]?.steps || [],
                      overallScore: data.overallScore,
                      summary: data.summary,
                      painPoints: data.painPoints || [],
                      highlights: data.highlights || [],
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
              console.error('SSE parse error:', e, 'Raw data:', line);
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

      if (!response.ok) throw new Error('Failed to generate suggestions');
      const data = await response.json();
      setSuggestions(data);
      setActiveTab('suggestions');
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const analyzeRepo = async () => {
    if (!githubUrl.trim()) return;
    
    const allPainPoints = selectedPersonas
      .flatMap(p => personaStates[p.id]?.journey?.painPoints || []);
    
    if (allPainPoints.length === 0) {
      alert('Please wait for at least one persona to complete analysis before linking to GitHub');
      return;
    }
    
    setIsAnalyzingRepo(true);
    setGithubError(null);
    setGithubSuccess(null);
    try {
      const response = await fetch('/api/analyze-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUrl: githubUrl.trim(), painPoints: allPainPoints }),
      });

      if (!response.ok) throw new Error('Failed to analyze repository');
      const data = await response.json();
      setRepoAnalysis(data);
    } catch (error) {
      console.error('Error analyzing repo:', error);
    } finally {
      setIsAnalyzingRepo(false);
    }
  };

  const fileGitHubIssues = async () => {
    if (!githubToken || !githubUrl) return;

    setIsFilingIssue(true);
    setGithubError(null);

    try {
      const findings = selectedPersonas
        .map(p => {
          const j = personaStates[p.id]?.journey;
          if (!j) return '';
          return `### ${p.emoji} ${p.name} (Score: ${j.overallScore}/10)\n${j.painPoints.map(pp => '- ' + pp).join('\n')}`;
        }).filter(Boolean).join('\n\n');

      const body = `## Context\n${intent ? `User reported: "${decodeURIComponent(intent)}"` : 'General UX audit'}\nAnalyzed: ${url}\n\n## Findings\n${findings}\n\n---\n*Filed by [Parallax](https://parallax-ux.vercel.app)*`;

      const response = await fetch('/api/create-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: githubUrl,
          title: 'UX Issues: ' + url,
          body,
          token: githubToken,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      const data = await response.json();
      setFiledIssueUrl(data.issueUrl);
    } catch (error) {
      alert('Failed to file issue: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsFilingIssue(false);
    }
  };

  const selectedPersonas = personas.filter(p => personaIds.includes(p.id));
  const scores = Object.values(personaStates)
    .map(s => s.journey?.overallScore || 0)
    .filter(s => s > 0);
  const loadingCount = Object.values(personaStates).filter(s => s.isLoading).length;
  const isComplete = loadingCount === 0 && scores.length > 0;

  // Auto-file GitHub issue when analysis completes and token+repo were provided
  const [autoFiled, setAutoFiled] = useState(false);
  useEffect(() => {
    if (isComplete && githubToken && githubUrl && !filedIssueUrl && !autoFiled && !isFilingIssue) {
      setAutoFiled(true);
      fileGitHubIssues();
    }
  }, [isComplete, githubToken, githubUrl, filedIssueUrl, autoFiled, isFilingIssue]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: '🔴' };
      case 'medium': return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: '🟡' };
      case 'low': return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: '🟢' };
      default: return { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white', icon: '⚪' };
    }
  };

  const tabs = [
    { id: 'personas' as Tab, label: 'Personas', icon: '👥', count: selectedPersonas.length },
    { id: 'suggestions' as Tab, label: 'Suggestions', icon: '💡', hasButton: true },
    { id: 'github' as Tab, label: 'GitHub', icon: '⌨️', count: repoAnalysis ? 1 : 0 },
  ];

  return (
    <main className={`min-h-screen transition-all duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-[#030712]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4">
          {/* Top row: Logo + URL */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Parallax</h1>
                {isCustom && <span className="text-xs text-purple-400">Custom Personas</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 max-w-xs">
              <svg className="w-4 h-4 text-[#666] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-xs text-[#888] truncate">{url}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const colors = tab.id === 'personas' ? 'from-blue-500 to-cyan-500' : tab.id === 'suggestions' ? 'from-amber-500 to-orange-500' : 'from-gray-500 to-gray-700';
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2.5
                    ${isActive 
                      ? 'text-white' 
                      : 'text-[#888] hover:text-white'
                    }
                  `}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r ${colors} rounded-xl opacity-20" />
                  )}
                  <span className={`relative z-10 flex items-center gap-2`}>
                    <span className={`text-lg ${isActive ? 'scale-110' : ''} transition-transform`}>{tab.icon}</span>
                    <span className="relative z-10">{tab.label}</span>
                    {(tab.count ?? 0) > 0 && (
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        isActive ? 'bg-white/25' : 'bg-white/10'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </span>
                  {isActive && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${colors} rounded-xl -z-10 blur-sm opacity-30`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Score - Always visible */}
        <div className="mb-8">
          <ParallaxScore scores={scores} />
        </div>

        {intent && (
          <div className="mb-6 p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <span className="text-purple-400 font-medium">Testing because: </span>
            <span className="text-white">{decodeURIComponent(intent)}</span>
          </div>
        )}

        {/* Auto-filing status */}
        {githubToken && githubUrl && !filedIssueUrl && (
          <div className="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center gap-3">
            {isComplete ? (
              isFilingIssue ? (
                <>
                  <svg className="w-5 h-5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-blue-400">Auto-filing GitHub issue...</span>
                </>
              ) : (
                <>
                  <span className="text-blue-400">Preparing to file GitHub issue...</span>
                </>
              )
            ) : (
              <>
                <span className="text-blue-400">Will auto-file GitHub issue when analysis completes</span>
              </>
            )}
          </div>
        )}

        {filedIssueUrl && (
          <div className="mb-6 p-4 bg-green-500/10 rounded-xl border border-green-500/20 flex items-center gap-3">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-400">Issue auto-filed! </span>
            <a href={filedIssueUrl} target="_blank" className="text-white underline hover:text-purple-300">{filedIssueUrl}</a>
          </div>
        )}

        {/* Loading Status */}
        {loadingCount > 0 && (
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 px-5 py-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm text-[#ccc]">
                {loadingCount} agent{loadingCount > 1 ? 's' : ''} navigating...
              </span>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'personas' && (
          <div className="space-y-6">
            {/* Persona Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {selectedPersonas.map((persona) => (
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

            {/* Generate Suggestions Button */}
            {isComplete && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={generateSuggestions}
                  disabled={isLoadingSuggestions}
                  className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-2xl shadow-lg shadow-amber-500/20 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingSuggestions ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Get AI Suggestions
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="max-w-3xl mx-auto">
            {!suggestions ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No suggestions yet</h3>
                <p className="text-[#666] mb-6">Run the analysis first, then generate AI-powered suggestions</p>
                <button
                  onClick={() => setActiveTab('personas')}
                  className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                >
                  View Personas
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary */}
                <div className="p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20">
                  <p className="text-amber-200 leading-relaxed">{suggestions.summary}</p>
                </div>

                {/* Suggestions List */}
                <div className="space-y-3">
                  {suggestions.suggestions.map((suggestion, idx) => {
                    const colors = getPriorityColor(suggestion.priority);
                    return (
                      <div key={idx} className={`p-5 rounded-xl ${colors.bg} border ${colors.border}`}>
                        <div className="flex gap-4">
                          <span className="text-2xl">{colors.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-semibold uppercase ${colors.text}`}>{suggestion.priority}</span>
                            </div>
                            <h4 className="font-semibold text-white mb-3">{suggestion.issue}</h4>
                            <div className="space-y-2 text-sm">
                              <p>
                                <span className="text-purple-400 font-medium">Fix: </span>
                                <span className="text-[#aaa]">{suggestion.fix}</span>
                              </p>
                              <p>
                                <span className="text-green-400 font-medium">Impact: </span>
                                <span className="text-[#888]">{suggestion.impact}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'github' && (
          <div className="max-w-3xl mx-auto">
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">File GitHub Issues</h3>
                  <p className="text-sm text-[#666]">Create issues from persona findings</p>
                </div>
              </div>

              {filedIssueUrl ? (
                <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                  <span className="text-green-400">Issue filed! </span>
                  <a href={filedIssueUrl} target="_blank" className="text-white underline">{filedIssueUrl}</a>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm text-[#888] mb-2">
                        GitHub Token
                        <a 
                          href="https://github.com/settings/tokens/new?scopes=repo" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-2 text-purple-400 hover:text-purple-300 text-xs"
                        >
                          Get a token
                        </a>
                      </label>
                      <input
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="ghp_..."
                        className="w-full px-4 py-3 bg-[#111] border border-[#333] rounded-xl text-white placeholder-[#444] focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#888] mb-2">Repository URL</label>
                      <input
                        type="text"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/owner/repo"
                        className="w-full px-4 py-3 bg-[#111] border border-[#333] rounded-xl text-white placeholder-[#444] focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  </div>

                  {githubError && (
                    <div className="mb-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                      <span className="text-red-400 text-sm">{githubError}</span>
                    </div>
                  )}

                  <button
                    onClick={fileGitHubIssues}
                    disabled={isFilingIssue || !githubToken || !githubUrl}
                    className="px-6 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-500 disabled:opacity-50 transition-colors"
                  >
                    {isFilingIssue ? 'Filing...' : 'File GitHub Issue'}
                  </button>

                  {repoAnalysis && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <h4 className="text-sm font-medium text-[#999] mb-3">Repo Analysis</h4>
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-3 mb-2">
                          <svg className="w-5 h-5 text-[#666]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          <a href={repoAnalysis.repo.url} target="_blank" rel="noopener noreferrer" className="text-white font-medium hover:text-purple-400">
                            {repoAnalysis.repo.name}
                          </a>
                        </div>
                        <p className="text-sm text-[#888]">{repoAnalysis.suggestions.summary}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Complete Status */}
        {isComplete && (
          <div className="text-center mt-8 pt-8 border-t border-white/5">
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

function LoadingFallback() {
  return (
    <main className="min-h-screen bg-[#030712] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse" />
        <div className="text-[#666]">Loading results...</div>
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResultsContent />
    </Suspense>
  );
}
