'use client';

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

const colorConfig: Record<string, { border: string; gradient: string; glow: string; shadow: string }> = {
  blue: { 
    border: 'border-blue-500/50', 
    gradient: 'from-blue-500/20 to-blue-600/10', 
    glow: 'shadow-blue-500/20',
    shadow: 'hover:shadow-blue-500/30'
  },
  pink: { 
    border: 'border-pink-500/50', 
    gradient: 'from-pink-500/20 to-pink-600/10', 
    glow: 'shadow-pink-500/20',
    shadow: 'hover:shadow-pink-500/30'
  },
  amber: { 
    border: 'border-amber-500/50', 
    gradient: 'from-amber-500/20 to-amber-600/10', 
    glow: 'shadow-amber-500/20',
    shadow: 'hover:shadow-amber-500/30'
  },
  green: { 
    border: 'border-green-500/50', 
    gradient: 'from-green-500/20 to-green-600/10', 
    glow: 'shadow-green-500/20',
    shadow: 'hover:shadow-green-500/30'
  },
  purple: { 
    border: 'border-purple-500/50', 
    gradient: 'from-purple-500/20 to-purple-600/10', 
    glow: 'shadow-purple-500/20',
    shadow: 'hover:shadow-purple-500/30'
  },
};

interface PersonaPickerProps {
  selectedPersonas: string[];
  onToggle: (id: string) => void;
}

export default function PersonaPicker({ selectedPersonas, onToggle }: PersonaPickerProps) {
  const allSelected = selectedPersonas.length === PERSONAS.length;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">AI Personas</h2>
          <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full">
            {selectedPersonas.length} selected
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {PERSONAS.map((persona) => {
          const isSelected = selectedPersonas.includes(persona.id);
          const config = colorConfig[persona.color];
          
          return (
            <button
              key={persona.id}
              onClick={() => onToggle(persona.id)}
              className={`
                relative p-5 rounded-2xl text-left transition-all duration-300 overflow-hidden
                ${isSelected 
                  ? `bg-gradient-to-br ${config.gradient} border ${config.border} ${config.shadow} transform scale-105` 
                  : 'bg-[#111] border border-[#1e1e1e] hover:border-[#333]'
                }
              `}
            >
              {/* Selection indicator */}
              <div className={`
                absolute top-3 right-3 w-6 h-6 rounded-full border-2 transition-all duration-300
                ${isSelected 
                  ? `bg-${persona.color}-500 border-${persona.color}-500` 
                  : 'border-[#444]'
                }
              `}>
                {isSelected && (
                  <svg className="w-full h-full text-white p-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              
              {/* Emoji */}
              <div className={`text-4xl mb-3 ${isSelected ? 'scale-110' : ''} transition-transform duration-300`}>
                {persona.emoji}
              </div>
              
              {/* Name */}
              <h3 className={`font-semibold mb-1 ${isSelected ? 'text-white' : 'text-[#ccc]'}`}>
                {persona.name}
              </h3>
              
              {/* Description */}
              <p className="text-sm text-[#666] leading-relaxed">
                {persona.description}
              </p>
              
              {/* Selected glow effect */}
              {isSelected && (
                <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-50 pointer-events-none`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
