import { NextRequest } from 'next/server';
import { launchBrowser, createContext } from '@/lib/browser';
import { runAgentLoop } from '@/lib/agent-loop';
import { PERSONAS } from '@/lib/personas';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { url, personaId } = await req.json();

  const persona = PERSONAS.find(p => p.id === personaId);
  if (!persona) {
    return new Response(JSON.stringify({ error: 'Unknown persona' }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let browser;
      let context;
      try {
        browser = await launchBrowser();
        context = await createContext(browser);
        const page = await context.newPage();

        const summary = await runAgentLoop(page, persona, url, (step) => {
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
        if (context) await context.close();
        if (browser) await browser.close();
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
