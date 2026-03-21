'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import UrlInput from '@/components/url-input';
import PersonaPicker from '@/components/persona-picker';

const ALL_PERSONAS = [
  'speedrun-steve',
  'confused-clara', 
  'skeptical-sam',
  'accessible-alex',
  'global-gita',
];

export default function Home() {
  const router = useRouter();
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(ALL_PERSONAS);
  const [url, setUrl] = useState('');

  const handleTogglePersona = (id: string) => {
    setSelectedPersonas(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const handleLaunch = (url: string) => {
    if (selectedPersonas.length === 0) return;
    const params = new URLSearchParams({
      url,
      personas: selectedPersonas.join(','),
    });
    router.push(`/results?${params.toString()}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-white">Parallax</span>
        </h1>
        <p className="text-xl text-[#888] max-w-xl">
          AI persona agents that navigate your product and report real friction
        </p>
      </div>

      {/* URL Input */}
      <div className="mb-12 w-full flex justify-center">
        <UrlInput onSubmit={(u) => setUrl(u)} />
      </div>

      {/* Persona Picker */}
      <PersonaPicker 
        selectedPersonas={selectedPersonas}
        onToggle={handleTogglePersona}
      />

      {/* Launch Button (when personas selected) */}
      {selectedPersonas.length > 0 && url && (
        <div className="mt-8">
          <button
            onClick={() => handleLaunch(url)}
            className="px-8 py-3 bg-white text-black font-semibold rounded-lg hover:bg-[#e0e0e0] transition-colors"
          >
            Launch {selectedPersonas.length} Agent{selectedPersonas.length > 1 ? 's' : ''}
          </button>
        </div>
      )}
    </main>
  );
}
