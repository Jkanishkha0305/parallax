import { GoogleGenAI, Content, Part, Environment } from '@google/genai';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { Page } from 'playwright';
import { Persona, AgentStep } from './types';
import { takeScreenshot, executeFunctionCall } from './browser';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });

const COMPUTER_USE_MODEL = 'gemini-2.5-computer-use-preview-10-2025';
const MAX_TURNS = 8;

const SummarySchema = z.object({
  overallScore: z.number().min(1).max(10),
  summary: z.string().describe('2-3 sentence overall verdict from the persona perspective'),
  painPoints: z.array(z.string()).describe('Top 3 friction points encountered'),
  highlights: z.array(z.string()).describe('Top 3 things done well'),
});

export async function runAgentLoop(
  page: Page,
  persona: Persona,
  url: string,
  onStep: (step: AgentStep) => void
): Promise<{ overallScore: number; summary: string; painPoints: string[]; highlights: string[] }> {

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  const initialScreenshot = await takeScreenshot(page);

  const contents: Content[] = [
    {
      role: 'user',
      parts: [
        {
          text: `${persona.systemPrompt}\n\nYou are now navigating: ${url}\n\nStart exploring this website as your persona. Take actions to investigate the site's usability from your perspective. After 6-8 actions, you will be asked to summarize your experience.`,
        },
        {
          inlineData: {
            mimeType: 'image/png',
            data: initialScreenshot,
          },
        },
      ] as Part[],
    },
  ];

  const stepHistory: AgentStep[] = [];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let response;
    try {
      response = await ai.models.generateContent({
        model: COMPUTER_USE_MODEL,
        contents,
        config: {
          tools: [{ computerUse: { environment: Environment.ENVIRONMENT_BROWSER } }],
        },
      });
    } catch (err) {
      console.error('Gemini Computer Use error:', err);
      break;
    }

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) break;

    contents.push({ role: 'model', parts: candidate.content.parts });

    const functionCallParts = candidate.content.parts.filter((p: Part) => p.functionCall);
    if (functionCallParts.length === 0) break;

    const functionResponseParts: Part[] = [];
    let stepDescription = '';

    for (const part of functionCallParts) {
      const fc = part.functionCall!;
      const result = await executeFunctionCall(page, fc.name!, fc.args as Record<string, unknown>);
      stepDescription = result.description;

      functionResponseParts.push({
        functionResponse: {
          name: fc.name!,
          response: { 
            success: result.success, 
            output: result.description,
            url: result.url || page.url()
          },
        },
      } as Part);
    }

    const screenshot = await takeScreenshot(page);

    const step: AgentStep = {
      stepNumber: turn + 1,
      screenshot,
      action: {
        name: functionCallParts[0]?.functionCall?.name || 'unknown',
        args: (functionCallParts[0]?.functionCall?.args as Record<string, unknown>) || {},
        description: stepDescription,
      },
    };

    stepHistory.push(step);
    onStep(step);

    contents.push({
      role: 'user',
      parts: [
        ...functionResponseParts,
        {
          inlineData: {
            mimeType: 'image/png',
            data: screenshot,
          },
        },
      ] as Part[],
    });
  }

  const journeyDescription = stepHistory
    .map(s => `Step ${s.stepNumber}: ${s.action.description}`)
    .join('\n');

  const { object: summary } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: SummarySchema,
    prompt: `${persona.systemPrompt}

You just navigated ${url}. Here is your journey:
${journeyDescription}

Now give your overall verdict from your persona's perspective. Be specific about what frustrated you and what worked well.`,
  });

  return summary;
}
