import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const ParseInputSchema = z.object({
  url: z.string().describe('The website URL extracted from the message'),
  intent: z.string().describe('What the user is complaining about or requesting'),
  context: z.string().describe('Additional context or details from the message'),
});

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Text is required' }), { status: 400 });
    }

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-20250514'),
      schema: ParseInputSchema,
      prompt: `Extract the website URL and the user's complaint from this message. The message could be a Slack message, support ticket, email, or bug report. If there's a plain URL with no complaint, set intent to 'General UX audit'. Always extract the most relevant URL.\n\nMessage:\n${text}`,
    });

    if (!object.url) {
      return new Response(JSON.stringify({ error: 'No URL found' }), { status: 400 });
    }

    return Response.json(object);
  } catch (error) {
    console.error('Error parsing input:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to parse input' }),
      { status: 500 }
    );
  }
}
