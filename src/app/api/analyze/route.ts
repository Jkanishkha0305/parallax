import { NextRequest } from 'next/server';
import { launchBrowser, createContext } from '@/lib/browser';
import { runAgentLoop } from '@/lib/agent-loop';
import { PERSONAS } from '@/lib/personas';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { url: rawUrl, personaId } = await req.json();

  // Normalize URL — add https:// if missing
  const url = rawUrl?.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  try {
    new URL(url);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), { status: 400 });
  }

  const persona = PERSONAS.find(p => p.id === personaId);
  if (!persona) {
    return new Response(JSON.stringify({ error: 'Unknown persona' }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let browser;
      let context;

      // Keepalive ping every 15s to prevent Vercel from dropping the connection
      const keepalive = setInterval(() => {
        try { controller.enqueue(encoder.encode(': ping\n\n')); } catch {}
      }, 15000);

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
        clearInterval(keepalive);
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
