import { NextRequest } from 'next/server';
import { runAgentLoop } from '@/lib/agent-loop';
import { PERSONAS } from '@/lib/personas';
import { Persona } from '@/lib/types';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { url: rawUrl, personaId, personaData } = await req.json();

  // Normalize URL — add https:// if missing
  const url = rawUrl?.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  try {
    new URL(url);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), { status: 400 });
  }

  // Use provided personaData if available, otherwise look up from PERSONAS array
  const persona: Persona = personaData || PERSONAS.find(p => p.id === personaId);
  
  if (!persona) {
    return new Response(JSON.stringify({ error: 'Unknown persona' }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Run the agent loop WITHOUT a local browser
        // Gemini Computer Use API handles browser automation remotely
        const summary = await runAgentLoop(persona, url, (step) => {
          const data = JSON.stringify({ type: 'step', personaId, step });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        });

        const summaryData = JSON.stringify({
          type: 'summary',
          personaId,
          summary: summary.summary,
          overallScore: summary.overallScore,
          painPoints: summary.painPoints,
          highlights: summary.highlights,
        });
        controller.enqueue(encoder.encode(`data: ${summaryData}\n\n`));
      } catch (error) {
        const errorData = JSON.stringify({
          type: 'error',
          personaId,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
