'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UrlInput from '@/components/url-input';
import PersonaPicker from '@/components/persona-picker';
import { Persona } from '@/lib/types';

const ALL_PERSONAS_IDS = [
  'speedrun-steve',
  'confused-clara', 
  'skeptical-sam',
  'accessible-alex',
  'global-gita',
];

const DEMO_URLS = [
  { url: 'https://stripe.com', label: 'Stripe', emoji: '💳' },
  { url: 'https://linear.app', label: 'Linear', emoji: '📋' },
  { url: 'https://vercel.com', label: 'Vercel', emoji: '▲' },
];

export default function Home() {
  const router = useRouter();
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(ALL_PERSONAS_IDS);
  const [url, setUrl] = useState('');
  const [audience, setAudience] = useState('');
  const [customPersonas, setCustomPersonas] = useState<Persona[] | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTogglePersona = (id: string) => {
    if (customPersonas) {
      setSelectedPersonas(prev => 
        prev.includes(id) 
          ? prev.filter(p => p !== id)
          : [...prev, id]
      );
    } else {
      setSelectedPersonas(prev => 
        prev.includes(id) 
          ? prev.filter(p => p !== id)
          : [...prev, id]
      );
    }
  };

  const handleLaunch = async (inputUrl: string) => {
    if (selectedPersonas.length === 0) return;
    
    const finalUrl = inputUrl || url;
    if (!finalUrl) return;

    if (audience.trim()) {
      setIsGenerating(true);
      try {
        const response = await fetch('/api/generate-personas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audience: audience.trim() }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate personas');
        }

        const data = await response.json();
        const generatedPersonas = data.personas;
        
        localStorage.setItem('custom-personas', JSON.stringify(generatedPersonas));
        setCustomPersonas(generatedPersonas);
        
        const params = new URLSearchParams({
          url: finalUrl,
          personas: generatedPersonas.map((p: Persona) => p.id).join(','),
          custom: 'true',
        });
        router.push(`/results?${params.toString()}`);
      } catch (error) {
        console.error('Error generating personas:', error);
        setIsGenerating(false);
      }
    } else {
      const params = new URLSearchParams({
        url: finalUrl,
        personas: selectedPersonas.join(','),
      });
      router.push(`/results?${params.toString()}`);
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center px-6 py-24 transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Logo/Brand */}
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center animate-pulse-glow">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h1 className="text-6xl md:text-7xl font-bold mb-4 tracking-tight">
            <span className="gradient-text">Parallax</span>
          </h1>
          <p className="text-xl text-[#9ca3af] max-w-2xl leading-relaxed">
            AI persona agents that navigate your product and report real friction.{' '}
            <span className="text-white">In seconds.</span>
          </p>
        </div>

        {/* URL Input */}
        <div className="mb-4 w-full max-w-2xl animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="glass-card p-2">
            <UrlInput onSubmit={(u) => setUrl(u)} />
          </div>
        </div>

        {/* Demo URLs */}
        <div className="mb-8 flex flex-wrap justify-center gap-3 animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
          <span className="text-sm text-[#666]">Try:</span>
          {DEMO_URLS.map((demo) => (
            <button
              key={demo.url}
              onClick={() => setUrl(demo.url)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 ${
                url === demo.url 
                  ? 'bg-purple-500/30 text-white border border-purple-500/50' 
                  : 'bg-white/5 text-[#888] border border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="mr-1">{demo.emoji}</span>
              {demo.label}
            </button>
          ))}
        </div>

        {/* Target Audience Input */}
        <div className="mb-8 w-full max-w-2xl animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
          <div className="glass-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <label className="text-sm font-medium text-[#9ca3af]">Target Audience (optional)</label>
            </div>
            <textarea
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. college students in India, elderly Japanese users, startup CTOs..."
              className="w-full px-4 py-3 bg-[#1a1a1a]/50 border border-[#333] rounded-xl text-white placeholder-[#444] focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
              rows={2}
            />
            <p className="mt-2 text-xs text-[#666]">
              Leave blank to use default personas, or describe your target users to generate custom AI agents
            </p>
          </div>
        </div>

        {/* Persona Picker */}
        <div className="mb-12 w-full max-w-4xl animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <PersonaPicker 
            selectedPersonas={selectedPersonas}
            onToggle={handleTogglePersona}
          />
        </div>

        {/* Launch Button */}
        {(selectedPersonas.length > 0 && url || audience.trim()) && (
          <div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <button
              onClick={() => handleLaunch(url)}
              disabled={isGenerating || !url}
              className="group relative px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 animate-pulse-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="relative z-10 flex items-center gap-3">
                {isGenerating ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating Personas...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Launch {selectedPersonas.length} Agent{selectedPersonas.length > 1 ? 's' : ''}
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>
        )}

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          {[
            { icon: '👁️', title: 'Real Navigation', desc: 'Agents actually click, scroll, and interact' },
            { icon: '🎭', title: '5 Personas', desc: 'Different user perspectives in one scan' },
            { icon: '⚡', title: 'Instant Results', desc: 'Get UX feedback in under 60 seconds' },
          ].map((feature, idx) => (
            <div key={idx} className="glass-card p-6 text-center hover:border-purple-500/30 transition-all duration-300">
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
              <p className="text-sm text-[#6b7280]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
