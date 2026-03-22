import Anthropic from '@anthropic-ai/sdk';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { Page } from 'playwright';
import { Persona, AgentStep } from './types';
import { takeScreenshot, SCREEN_WIDTH, SCREEN_HEIGHT } from './browser';

const MAX_TURNS = 8;

const BROWSER_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'click_at',
    description: 'Click at coordinates (x, y) on the page. Coordinates are in pixels, where (0,0) is top-left and (1280,800) is bottom-right.',
    input_schema: {
      type: 'object' as const,
      properties: {
        x: { type: 'number', description: 'X coordinate in pixels' },
        y: { type: 'number', description: 'Y coordinate in pixels' },
        description: { type: 'string', description: 'What you are clicking on' },
      },
      required: ['x', 'y', 'description'],
    },
  },
  {
    name: 'scroll',
    description: 'Scroll the page up or down to see more content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        direction: { type: 'string', enum: ['up', 'down'], description: 'Scroll direction' },
      },
      required: ['direction'],
    },
  },
  {
    name: 'type_text',
    description: 'Type text into the currently focused input field.',
    input_schema: {
      type: 'object' as const,
      properties: {
        text: { type: 'string', description: 'Text to type' },
      },
      required: ['text'],
    },
  },
  {
    name: 'navigate',
    description: 'Navigate to a different URL.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'URL to navigate to' },
      },
      required: ['url'],
    },
  },
  {
    name: 'go_back',
    description: 'Go back to the previous page.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'hover_at',
    description: 'Hover the mouse at coordinates (x, y) to reveal menus or tooltips.',
    input_schema: {
      type: 'object' as const,
      properties: {
        x: { type: 'number', description: 'X coordinate in pixels' },
        y: { type: 'number', description: 'Y coordinate in pixels' },
        description: { type: 'string', description: 'What you are hovering on' },
      },
      required: ['x', 'y', 'description'],
    },
  },
];

async function executeAction(
  page: Page,
  name: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; description: string }> {
  try {
    switch (name) {
      case 'click_at': {
        const { x, y, description } = args as { x: number; y: number; description: string };
        await page.mouse.click(x, y);
        await page.waitForTimeout(1000);
        return { success: true, description: `Clicked on: ${description} at (${x}, ${y})` };
      }
      case 'scroll': {
        const { direction } = args as { direction: string };
        const delta = direction === 'up' ? -500 : 500;
        await page.mouse.wheel(0, delta);
        await page.waitForTimeout(500);
        return { success: true, description: `Scrolled ${direction}` };
      }
      case 'type_text': {
        const { text } = args as { text: string };
        await page.keyboard.type(text, { delay: 50 });
        await page.waitForTimeout(500);
        return { success: true, description: `Typed "${text}"` };
      }
      case 'navigate': {
        const { url } = args as { url: string };
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        return { success: true, description: `Navigated to ${url}` };
      }
      case 'go_back': {
        await page.goBack();
        await page.waitForTimeout(1000);
        return { success: true, description: 'Went back to previous page' };
      }
      case 'hover_at': {
        const { x, y, description } = args as { x: number; y: number; description: string };
        await page.mouse.move(x, y);
        await page.waitForTimeout(500);
        return { success: true, description: `Hovered on: ${description} at (${x}, ${y})` };
      }
      default:
        return { success: false, description: `Unknown action: ${name}` };
    }
  } catch (error) {
    return { success: false, description: `Failed: ${name} — ${(error as Error).message}` };
  }
}

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
  onStep: (step: AgentStep) => void,
  intent?: string
): Promise<{ overallScore: number; summary: string; painPoints: string[]; highlights: string[] }> {
  const client = new Anthropic();

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const initialScreenshot = await takeScreenshot(page);

  const systemPrompt = `${persona.systemPrompt}

You are navigating a website at ${url}. You can see screenshots of the page and must use the provided tools to interact with it.

RULES:
- Explore the site as your persona would — click links, scroll, check navigation, read content.
- Use pixel coordinates from the screenshot (viewport is ${SCREEN_WIDTH}x${SCREEN_HEIGHT}).
- Do NOT try to create accounts or submit personal data.
- Take 6-8 actions to thoroughly explore, then stop calling tools.
- After each action, briefly think about what you observe from your persona's perspective.${intent ? `\n\nIMPORTANT: A user reported: '${intent}'. Focus on reproducing this complaint. Document if you find the problem or can't reproduce it.` : ''}`;

  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Here is the website. Start exploring as your persona would.' },
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: initialScreenshot } },
      ],
    },
  ];

  const stepHistory: AgentStep[] = [];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let response;
    try {
      response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        tools: BROWSER_TOOLS,
        messages,
      });
    } catch (err) {
      console.error('Claude Computer Use error:', err);
      break;
    }

    // Extract text thoughts and tool calls
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use'
    );
    const textBlocks = response.content.filter(
      (b): b is Anthropic.Messages.TextBlock => b.type === 'text'
    );

    // If no tool calls, the model is done exploring
    if (toolUseBlocks.length === 0) break;

    // Add assistant response to messages
    messages.push({ role: 'assistant', content: response.content });

    // Execute each tool call and collect results
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    let lastDescription = '';

    for (const toolBlock of toolUseBlocks) {
      const result = await executeAction(page, toolBlock.name, toolBlock.input as Record<string, unknown>);
      lastDescription = result.description;

      const screenshot = await takeScreenshot(page);

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: [
          { type: 'text', text: `${result.description}. Current URL: ${page.url()}` },
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: screenshot } },
        ],
      });

      // Record step
      const thought = textBlocks.map(b => b.text).join(' ').substring(0, 200) || lastDescription;
      const step: AgentStep = {
        stepNumber: turn + 1,
        screenshot,
        action: {
          name: toolBlock.name,
          args: toolBlock.input as Record<string, unknown>,
          description: lastDescription,
        },
        thought,
      };

      stepHistory.push(step);
      onStep(step);
    }

    // Add tool results to messages
    messages.push({ role: 'user', content: toolResults });

    // Stop if the model says it's done
    if (response.stop_reason === 'end_turn') break;
  }

  // Generate summary
  const journeyDescription = stepHistory
    .map(s => `Step ${s.stepNumber}: ${s.action.description} — Thought: ${s.thought}`)
    .join('\n');

  const { object: summary } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: SummarySchema,
    prompt: `${persona.systemPrompt}

You just navigated ${url}. Here is your journey:
${journeyDescription}

Now give your overall verdict from your persona's perspective. Be specific about what frustrated you and what worked well.`,
  });

  return summary;
}
