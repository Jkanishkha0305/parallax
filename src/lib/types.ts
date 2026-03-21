export interface Persona {
  id: string;
  name: string;
  emoji: string;
  description: string;
  systemPrompt: string;
  color: string;
}

export interface AgentAction {
  type: 'click' | 'scroll' | 'type' | 'navigate' | 'done';
  selector?: string;
  text?: string;
  url?: string;
  direction?: 'up' | 'down';
}

export interface AgentStep {
  stepNumber: number;
  screenshot: string;
  observation: string;
  emotion: string;
  reasoning: string;
  action: AgentAction;
  score: number;
}

export interface PersonaJourney {
  personaId: string;
  steps: AgentStep[];
  overallScore: number;
  summary: string;
  painPoints: string[];
  highlights: string[];
}

export interface SSEStepEvent {
  type: 'step';
  personaId: string;
  step: AgentStep;
}

export interface SSESummaryEvent {
  type: 'summary';
  personaId: string;
  journey: PersonaJourney;
}

export interface SSEErrorEvent {
  type: 'error';
  personaId: string;
  message: string;
}
