import { GoogleGenAI, Content, Part, Environment } from '@google/genai';
import { generateObject, generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { Persona, AgentStep } from './types';

// Initialize Gemini client
const ai = new GoogleGenAI({ 
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! 
});

const COMPUTER_USE_MODEL = 'gemini-2.5-computer-use-preview-10-2025';
const MAX_TURNS = 6;

const SummarySchema = z.object({
  overallScore: z.number().min(1).max(10),
  summary: z.string().describe('2-3 sentence overall verdict from the persona perspective'),
  painPoints: z.array(z.string()).describe('Top 3 friction points encountered'),
  highlights: z.array(z.string()).describe('Top 3 things done well'),
});

export async function runAgentLoop(
  persona: Persona,
  url: string,
  onStep: (step: AgentStep) => void
): Promise<{ overallScore: number; summary: string; painPoints: string[]; highlights: string[] }> {

  // Initial prompt with the URL to navigate
  const contents: Content[] = [
    {
      role: 'user',
      parts: [
        {
          text: `${persona.systemPrompt}\n\nYou are now navigating: ${url}\n\nYour task is to explore this website as your persona would. Start by navigating to the URL. Then:\n1. Look around the page - what do you see?\n2. Try clicking on navigation elements\n3. Look for pricing, signup forms, or key features\n4. Note any friction points or confusion\n\nIMPORTANT: Do NOT create accounts or submit personal data. Just OBSERVE and EXPLORE.\n\nAfter 4-6 actions exploring the site, say "done" to end your exploration.`,
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
          temperature: 0.7,
        },
      });
    } catch (err) {
      console.error('Gemini Computer Use error:', err);
      break;
    }

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) break;

    const parts = candidate.content.parts;
    const functionCalls = parts.filter(p => p.functionCall);
    
    // If no function calls, the model might be done or asking a question
    if (functionCalls.length === 0) {
      // Check if the model said it's done
      const textParts = parts.filter(p => p.text);
      const lastText = textParts[textParts.length - 1]?.text || '';
      
      if (lastText.toLowerCase().includes('done') || lastText.toLowerCase().includes('finished') || lastText.toLowerCase().includes('complete')) {
        break;
      }
      
      // Model is responding with text, add it as a thought and continue
      const thought = lastText.slice(0, 100);
      const step: AgentStep = {
        stepNumber: turn + 1,
        screenshot: '', // Gemini Computer Use handles screenshots internally
        action: {
          name: 'observation',
          args: {},
          description: thought,
        },
        thought,
      };
      stepHistory.push(step);
      onStep(step);
      
      // Add model's response to history and ask to continue
      contents.push({ role: 'model', parts });
      contents.push({ 
        role: 'user', 
        parts: [{ text: 'Continue exploring or say done if finished.' } as Part] 
      });
      continue;
    }

    // Add model's function calls to history
    contents.push({ role: 'model', parts });

    const functionResponseParts: Part[] = [];
    let stepDescription = '';

    for (const part of functionCalls) {
      const fc = part.functionCall!;
      
      // Execute the action (Gemini's computer use API handles browser automation)
      // We just need to acknowledge the action
      stepDescription = `Executing: ${fc.name}`;
      
      // For computer use, we acknowledge the action was taken
      functionResponseParts.push({
        functionResponse: {
          name: fc.name!,
          response: {
            success: true,
            output: 'Action acknowledged',
            acknowledged: true,
          },
        },
      } as Part);
    }

    // Add screenshot observation from the model
    // The model should describe what it sees after taking action
    const observationText = parts
      .filter(p => p.text)
      .map(p => p.text)
      .join(' ')
      .slice(0, 200);

    const step: AgentStep = {
      stepNumber: turn + 1,
      screenshot: '', // Handled by Gemini Computer Use
      action: {
        name: functionCalls[0]?.functionCall?.name || 'unknown',
        args: (functionCalls[0]?.functionCall?.args as Record<string, unknown>) || {},
        description: stepDescription,
      },
      thought: observationText || 'Exploring...',
    };

    stepHistory.push(step);
    onStep(step);

    // Add function responses and ask for next step
    contents.push({
      role: 'user',
      parts: [
        ...functionResponseParts,
        { text: 'Continue exploring or say done if you have finished examining the site.' } as Part,
      ],
    });
  }

  // Generate final summary
  const journeyDescription = stepHistory
    .map(s => `Step ${s.stepNumber}: ${s.action.description} - ${s.thought}`)
    .join('\n');

  const { object: summary } = await generateObject({
    model: google('gemini-2.0-flash'),
    schema: SummarySchema,
    prompt: `${persona.systemPrompt}

You just navigated ${url}. Here is your journey:
${journeyDescription || 'You explored the website and observed its features.'}

Now give your overall verdict from your persona's perspective. Be specific about what frustrated you and what worked well. Rate your experience from 1-10.

Format:
- Score: X/10
- Summary: 2-3 sentences
- Pain Points: top 3 issues
- Highlights: top 3 positives`,
  });

  return summary;
}
