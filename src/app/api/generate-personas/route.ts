import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const PersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  description: z.string(),
  color: z.string(),
  systemPrompt: z.string(),
});

const GeneratePersonasSchema = z.object({
  personas: z.array(PersonaSchema).length(5),
});

export async function POST(req: NextRequest) {
  try {
    const { audience } = await req.json();

    if (!audience || typeof audience !== 'string' || audience.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Audience is required' }), { status: 400 });
    }

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: GeneratePersonasSchema,
      prompt: `Generate 5 distinct user personas who match this target audience: ${audience}. Each persona should have a unique name, personality, tech comfort level, frustrations, and goals. The systemPrompt should describe how they navigate websites and what they look for. Make them realistic and diverse within the audience.

For each persona, use these colors in rotation: blue, pink, amber, green, purple. The id should be a slug like "custom-persona-1" etc.`,
    });

    return Response.json(object);
  } catch (error) {
    console.error('Error generating personas:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate personas' }),
      { status: 500 }
    );
  }
}
