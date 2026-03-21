import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const SuggestionSchema = z.object({
  suggestions: z.array(z.object({
    priority: z.enum(['high', 'medium', 'low']),
    issue: z.string().describe('The specific issue identified'),
    fix: z.string().describe('Concrete, actionable fix recommendation'),
    impact: z.string().describe('Expected impact if fixed'),
  })),
  summary: z.string().describe('Brief overall recommendation'),
});

interface JourneyInput {
  personaName: string;
  painPoints: string[];
  highlights: string[];
  overallScore: number;
}

export async function POST(req: NextRequest) {
  try {
    const { url, journeys } = await req.json();

    if (!journeys || !Array.isArray(journeys) || journeys.length === 0) {
      return new Response(JSON.stringify({ error: 'Journeys data is required' }), { status: 400 });
    }

    const journeyContext = journeys
      .map((j: JourneyInput) => `
Persona: ${j.personaName}
Score: ${j.overallScore}/10
Pain Points: ${j.painPoints.map(p => `- ${p}`).join('\n')}
Highlights: ${j.highlights.map(h => `- ${h}`).join('\n')}
`)
      .join('\n---\n');

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: SuggestionSchema,
      prompt: `You are a UX expert analyzing test results for ${url}.

Based on the following persona test journeys, generate actionable suggestions to improve the website:

${journeyContext}

Create 5-8 specific, actionable suggestions that address the pain points. Group by priority:
- HIGH: Critical issues affecting multiple personas or blocking core functionality
- MEDIUM: Important improvements that would significantly help
- LOW: Nice-to-have improvements

For each suggestion, explain:
1. The specific issue (what persona saw)
2. The concrete fix (what should be changed)
3. The expected impact (how users would benefit)

Format as a prioritized list with the most critical fixes first.`,
    });

    return Response.json(object);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate suggestions' }),
      { status: 500 }
    );
  }
}
