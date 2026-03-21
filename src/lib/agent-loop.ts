import { GoogleGenAI, Content, Part, Environment } from '@google/genai';
import { generateObject, generateText } from 'ai';
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
          text: `${persona.systemPrompt}\n\nYou are now navigating: ${url}\n\nExplore this website as your persona would. Use scroll, click, and navigate actions to investigate the layout, navigation, and content. Focus on observing the site — look around, explore menus, check different sections. Do NOT attempt to create accounts or submit personal data. After 6-8 actions you will summarize your experience.`,
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

    const parts = candidate.content.parts;
    // Log full part structure to diagnose safety acknowledgment
    console.log('PARTS FROM GEMINI:', JSON.stringify(parts, null, 2));
    const functionCalls = parts.filter(p => p.functionCall);
    if (functionCalls.length === 0) break;

    contents.push({ role: 'model', parts });

    const functionResponseParts: Part[] = [];
    let stepDescription = '';

    for (const part of functionCalls) {
      const fc = part.functionCall!;
      const result = await executeFunctionCall(page, fc.name!, fc.args as Record<string, unknown>);
      stepDescription = result.description;

      // Include id + acknowledged at both levels to satisfy Gemini CU safety requirement
      const functionResponsePart: Record<string, unknown> = {
        functionResponse: {
          name: fc.name!,
          // Echo back the function call id if present
          ...(fc.id ? { id: fc.id } : {}),
          response: {
            output: result.description,
            url: result.url || page.url(),
            success: result.success,
          },
        },
      };

      functionResponseParts.push(functionResponsePart as Part);
    }

    const screenshot = await takeScreenshot(page);

    let thought = '';
    try {
      const { text } = await generateText({
        model: google('gemini-2.5-flash'),
        prompt: `You are ${persona.name}. ${persona.description}. You just did: ${stepDescription} In ONE short sentence (max 12 words), what are you thinking right now? Be in character. Be specific. Use first person. Can include emoji. Examples: "Why do they need my LinkedIn just to sign up? 🤨" "Finally found the pricing page, took way too long 😤" "This loads so fast, I'm impressed! ⚡"`,
      });
      thought = text;
    } catch {
      thought = stepDescription;
    }

    const step: AgentStep = {
      stepNumber: turn + 1,
      screenshot,
      action: {
        name: functionCalls[0]?.functionCall?.name || 'unknown',
        args: (functionCalls[0]?.functionCall?.args as Record<string, unknown>) || {},
        description: stepDescription,
      },
      thought,
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
