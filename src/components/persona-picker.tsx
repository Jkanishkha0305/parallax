'use client';

import { useState } from 'react';

interface Persona {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

const PERSONAS: Persona[] = [
  {
    id: 'speedrun-steve',
    name: 'Speedrun Steve',
    emoji: '🏃',
    description: 'Power user who wants to get things done in minimum clicks',
    color: 'blue',
  },
  {
    id: 'confused-clara',
    name: 'Confused Clara',
    emoji: '😕',
    description: "First-time user who finds most tech confusing",
    color: 'pink',
  },
  {
    id: 'skeptical-sam',
    name: 'Skeptical Sam',
    emoji: '🔒',
    description: 'Privacy-conscious user who questions everything',
    color: 'amber',
  },
  {
    id: 'accessible-alex',
    name: 'Accessible Alex',
    emoji: '♿',
    description: 'User who navigates primarily with keyboard and screen reader',
    color: 'green',
  },
  {
    id: 'global-gita',
    name: 'Global Gita',
    emoji: '🌍',
    description: 'Non-English speaker from India navigating a US-centric site',
    color: 'purple',
  },
];

const colorClasses: Record<string, string> = {
  blue: 'border-l-blue-500',
  pink: 'border-l-pink-500',
  amber: 'border-l-amber-500',
  green: 'border-l-green-500',
  purple: 'border-l-purple-500',
};

interface PersonaPickerProps {
  selectedPersonas: string[];
  onToggle: (id: string) => void;
}

export default function PersonaPicker({ selectedPersonas, onToggle }: PersonaPickerProps) {
  const allSelected = selectedPersonas.length === PERSONAS.length;
  const toggleAll = () => {
    if (allSelected) {
      PERSONAS.forEach(p => onToggle(p.id));
    } else {
      PERSONAS.forEach(p => {
        if (!selectedPersonas.includes(p.id)) onToggle(p.id);
      });
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Select AI Personas</h2>
        <button
          onClick={toggleAll}
          className="text-sm text-[#888] hover:text-white transition-colors"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PERSONAS.map((persona) => {
          const isSelected = selectedPersonas.includes(persona.id);
          return (
            <button
              key={persona.id}
              onClick={() => onToggle(persona.id)}
              className={`
                text-left p-4 rounded-lg bg-[#111] border-l-4 transition-all
                ${colorClasses[persona.color]}
                ${isSelected 
                  ? 'ring-1 ring-white/30 bg-[#1a1a1a]' 
                  : 'border-[#222] hover:border-[#444]'
                }
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{persona.emoji}</span>
                <span className="font-semibold">{persona.name}</span>
              </div>
              <p className="text-sm text-[#888]">{persona.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
