export interface Persona {
  id: string;
  name: string;
  emoji: string;
  description: string;
  systemPrompt: string;
  color: string;
}

export interface AgentAction {
  name: string;
  args: Record<string, unknown>;
  description: string;
}

export interface AgentStep {
  stepNumber: number;
  screenshot: string;
  action: AgentAction;
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
