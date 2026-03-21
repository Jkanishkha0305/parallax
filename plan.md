# PARALLAX — Build Plan

> AI persona agents that navigate your product and report real friction.
> Cerebral Valley "Zero to Agent" Hackathon — Vercel x DeepMind, March 21 2026
> Submissions due: 5:00 PM EST

## One-Liner

Paste any URL → 5 AI persona agents ACTUALLY navigate your site using Gemini Computer Use → report what confused them, where they got stuck, and what they loved.

## Problem Statement Fit

- **Statement 2 (Multi-Modal Agents)**: Agents that see (Gemini vision), plan (coordinate-based navigation), and execute (Playwright acts on the browser).
- **Statement 3 (AI Applications)**: Useful product that solves real UX research problem.

## Judging Criteria

| Criteria | Weight (R1) | How we score |
|----------|-------------|-------------|
| Live Demo | 45% | Judge gives ANY URL → agents navigate live → real screenshots streaming in real time |
| Creativity | 35% | Agents ACTUALLY USE the site via Gemini Computer Use — not static analysis, not CSS selectors, coordinate-based real navigation |
| Impact | 20% | Every product team needs this — real B2B value |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                     (Next.js + React)                        │
│                                                              │
│  [URL Input] → [Persona Selector] → [Live Journey Cards]    │
│                                                              │
│  Each card streams:                                          │
│    Step 1: 📸 screenshot + "clicked at nav button..."       │
│    Step 2: 📸 screenshot + "scrolled down, found CTA..."    │
│    Step 3: 📸 screenshot + "typed in search box..."         │
└──────────────────────┬──────────────────────────────────────┘
                       │ POST /api/analyze (SSE stream)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      API ROUTE                               │
│              /api/analyze/route.ts                           │
│                                                              │
│  1. Launch Playwright (Chromium, 5 isolated contexts)        │
│  2. Navigate each page to URL                                │
│  3. AGENT LOOP per persona (up to 8 turns):                  │
│     a. Take screenshot → base64                              │
│     b. Send to Gemini Computer Use API with persona prompt   │
│     c. Gemini returns FunctionCall objects                   │
│        (click_at, type_text_at, scroll_document, navigate)  │
│     d. Execute via Playwright using denormalized coordinates │
│     e. Stream step screenshot + action to frontend via SSE  │
│     f. Send FunctionResponse + new screenshot back to Gemini │
│  4. Final summary from Gemini (Vercel AI SDK generateObject) │
│  5. Close browser contexts                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              GEMINI COMPUTER USE API                         │
│    gemini-2.5-computer-use-preview-10-2025                   │
│              (via @google/genai)                             │
│                                                              │
│  Input: screenshot (inline image) + persona system prompt   │
│  Output: FunctionCall objects {                              │
│    name: "click_at",                                         │
│    args: { x: 450, y: 230 }   ← normalized 0-999 coords    │
│  }                                                           │
│                                                              │
│  Coordinate denormalization:                                 │
│    actual_x = Math.round(x / 1000 * 1440)                   │
│    actual_y = Math.round(y / 1000 * 900)                     │
│                                                              │
│  Available actions:                                          │
│    click_at, type_text_at, scroll_document, navigate,        │
│    key_press, drag_and_drop, right_click_at, double_click_at │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              GEMINI 2.5 FLASH (Summary)                      │
│              (via Vercel AI SDK @ai-sdk/google)              │
│                                                              │
│  Input: full journey screenshots + actions as history        │
│  Output: structured JSON {                                   │
│    overallScore: 6,                                          │
│    summary: "Clara struggled with the nav menu...",          │
│    painPoints: ["No visible search", "3 popups"],            │
│    highlights: ["Clean checkout", "Fast load"]               │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
parallax/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page — URL input + persona picker
│   │   ├── results/
│   │   │   └── page.tsx             # Results dashboard — journey cards
│   │   ├── api/
│   │   │   └── analyze/
│   │   │       └── route.ts         # Main API — agent loop + SSE streaming
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Global styles
│   ├── lib/
│   │   ├── personas.ts              # 5 persona definitions + system prompts
│   │   ├── browser.ts               # Playwright launch + screenshot + coordinate actions
│   │   ├── agent-loop.ts            # Core agent loop: screenshot → Gemini CU → act
│   │   └── types.ts                 # Shared TypeScript types
│   └── components/
│       ├── url-input.tsx             # URL input bar component
│       ├── persona-picker.tsx        # Persona selection grid
│       ├── journey-card.tsx          # Single persona's journey (streaming)
│       └── parallax-score.tsx        # Overall score display
├── .env.local                        # API keys (not committed)
├── plan.md                           # This file
├── package.json
└── next.config.ts
```

---

## Dependencies

```bash
npm install @google/genai ai @ai-sdk/google zod playwright
```

| Package | Purpose |
|---------|---------|
| `@google/genai` | Google GenAI SDK — Gemini Computer Use API |
| `ai` | Vercel AI SDK — generateObject for structured summaries |
| `@ai-sdk/google` | Vercel AI SDK Google provider |
| `zod` | Schema validation for structured summary output |
| `playwright` | Headless Chromium — executes coordinates from Gemini |

### Environment Variables (`.env.local`)

```
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
```

---

## Component Specs

### 1. `src/lib/types.ts`

```typescript
export interface Persona {
  id: string;
  name: string;
  emoji: string;
  description: string;
  systemPrompt: string;
  color: string; // tailwind color for card border
}

export interface AgentAction {
  name: string;        // click_at, type_text_at, scroll_document, navigate, etc.
  args: Record<string, unknown>;  // normalized coords (0-999) or text/url
  description: string; // human-readable description for the UI
}

export interface AgentStep {
  stepNumber: number;
  screenshot: string;  // base64 PNG (taken AFTER executing this action)
  action: AgentAction; // what Gemini decided to do
}

export interface PersonaJourney {
  personaId: string;
  steps: AgentStep[];
  overallScore: number;    // 1-10
  summary: string;         // final verdict from persona's perspective
  painPoints: string[];    // top friction issues
  highlights: string[];    // what they liked
}

// SSE event types sent from API to frontend
export interface SSEStepEvent {
  type: 'step';
  personaId: string;
  step: AgentStep;
}

export interface SSESummaryEvent {
  type: 'summary';
  personaId: string;
  journey: PersonaJourney;
}

export interface SSEErrorEvent {
  type: 'error';
  personaId: string;
  message: string;
}
```

### 2. `src/lib/personas.ts`

```typescript
import { Persona } from './types';

export const PERSONAS: Persona[] = [
  {
    id: 'speedrun-steve',
    name: 'Speedrun Steve',
    emoji: '🏃',
    description: 'Power user who wants to get things done in minimum clicks',
    color: 'blue',
    systemPrompt: `You are Steve, a 28-year-old software engineer who uses dozens of apps daily. You are IMPATIENT. You want to accomplish tasks in the minimum number of clicks. You hate unnecessary steps, loading screens, and anything that wastes your time. You always look for keyboard shortcuts and quick paths.

Navigate this website as Steve would:
- Find the fastest path to core functionality immediately
- Click on the most direct navigation options
- Try to complete a primary task (sign up, find pricing, use the main feature)
- Skip intros, skip tutorials, click through modals fast
- You get frustrated by popups, cookie banners, forced signups before seeing value`,
  },
  {
    id: 'confused-clara',
    name: 'Confused Clara',
    emoji: '😕',
    description: 'First-time user who finds most tech confusing',
    color: 'pink',
    systemPrompt: `You are Clara, a 55-year-old school teacher who is not tech-savvy. You find most websites confusing. You don't know what "CTA" or "hamburger menu" means. You take things literally and get confused by tech jargon.

Navigate this website as Clara would:
- Read everything on the page carefully before clicking
- Click the most obvious, clearly-labeled button you can find
- If something looks like a button, click it
- Look for "Help", "Get Started", or "Sign Up" type buttons
- Avoid anything that looks technical or has jargon you don't understand
- Try to figure out what this website does and how to use its main feature`,
  },
  {
    id: 'skeptical-sam',
    name: 'Skeptical Sam',
    emoji: '🔒',
    description: 'Privacy-conscious user who questions everything',
    color: 'amber',
    systemPrompt: `You are Sam, a 35-year-old privacy advocate. You are deeply suspicious of any website that asks for personal information. You read privacy policies, check for HTTPS, and question why any data is needed.

Navigate this website as Sam would:
- Look for privacy policy and terms of service links first
- Check for cookie consent banners and interact with them carefully
- If you see a signup form, scroll down to read all the fine print before proceeding
- Look for any tracking indicators, cookie notices, or data sharing disclosures
- Try to find out what data the site collects before giving any information
- Click on "Privacy Policy", "Terms", or similar links to investigate`,
  },
  {
    id: 'accessible-alex',
    name: 'Accessible Alex',
    emoji: '♿',
    description: 'User who relies on keyboard navigation and clear visual hierarchy',
    color: 'green',
    systemPrompt: `You are Alex, a 30-year-old data analyst who is visually impaired and primarily uses keyboard navigation. You rely on clear visual hierarchy, proper heading structure, and logical tab order.

Navigate this website as Alex would:
- Look for skip-to-content links or keyboard navigation hints
- Tab through the navigation to find the main menu items
- Look for clear heading hierarchy and logical page structure
- Try to use the main navigation to find core content
- Check if interactive elements have clear visible labels
- Attempt to complete a main task using only the keyboard (Tab, Enter, Space, arrow keys)`,
  },
  {
    id: 'global-gita',
    name: 'Global Gita',
    emoji: '🌍',
    description: 'Non-English speaker from India navigating a US-centric site',
    color: 'purple',
    systemPrompt: `You are Gita, a 40-year-old business owner from Mumbai, India. English is your second language. You are comfortable with technology but US-centric design patterns sometimes confuse you.

Navigate this website as Gita would:
- Look for any language selection or localization options first
- Try to find pricing or contact information, noting any currency or region issues
- Check if the signup form supports international phone numbers and addresses
- Look for any cultural assumptions in the copy (US idioms, US-only payment methods)
- Try to complete a core task and note anything that assumes you're in the US
- Look for support options — you might need help with language or regional settings`,
  },
];
```

### 3. `src/lib/browser.ts`

```typescript
import { chromium, Browser, BrowserContext, Page } from 'playwright';

export const SCREEN_WIDTH = 1440;
export const SCREEN_HEIGHT = 900;

// Launch one shared Chromium browser
export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

// Create an isolated context for each persona
export async function createContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    viewport: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });
}

// Take screenshot, return base64 PNG
export async function takeScreenshot(page: Page): Promise<string> {
  const buffer = await page.screenshot({ type: 'png' });
  return buffer.toString('base64');
}

// Denormalize Gemini's 0-999 coordinates to actual pixels
export function denormalize(x: number, y: number): { px: number; py: number } {
  return {
    px: Math.round((x / 1000) * SCREEN_WIDTH),
    py: Math.round((y / 1000) * SCREEN_HEIGHT),
  };
}

// Execute a Gemini Computer Use FunctionCall via Playwright
export async function executeFunctionCall(
  page: Page,
  name: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; description: string }> {
  try {
    switch (name) {
      case 'click_at': {
        const { px, py } = denormalize(args.x as number, args.y as number);
        await page.mouse.click(px, py);
        await page.waitForTimeout(800);
        return { success: true, description: `Clicked at (${px}, ${py})` };
      }
      case 'double_click_at': {
        const { px, py } = denormalize(args.x as number, args.y as number);
        await page.mouse.dblclick(px, py);
        await page.waitForTimeout(800);
        return { success: true, description: `Double-clicked at (${px}, ${py})` };
      }
      case 'right_click_at': {
        const { px, py } = denormalize(args.x as number, args.y as number);
        await page.mouse.click(px, py, { button: 'right' });
        await page.waitForTimeout(500);
        return { success: true, description: `Right-clicked at (${px}, ${py})` };
      }
      case 'type_text_at': {
        const { px, py } = denormalize(args.x as number, args.y as number);
        await page.mouse.click(px, py);
        await page.keyboard.type(args.text as string, { delay: 50 });
        await page.waitForTimeout(500);
        return { success: true, description: `Typed "${args.text}" at (${px}, ${py})` };
      }
      case 'scroll_document': {
        const direction = args.direction === 'up' ? -500 : 500;
        await page.mouse.wheel(0, direction);
        await page.waitForTimeout(500);
        return { success: true, description: `Scrolled ${args.direction}` };
      }
      case 'navigate': {
        await page.goto(args.url as string, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(1500);
        return { success: true, description: `Navigated to ${args.url}` };
      }
      case 'key_press': {
        await page.keyboard.press(args.key as string);
        await page.waitForTimeout(500);
        return { success: true, description: `Pressed key: ${args.key}` };
      }
      case 'drag_and_drop': {
        const from = denormalize(args.startX as number, args.startY as number);
        const to = denormalize(args.endX as number, args.endY as number);
        await page.mouse.move(from.px, from.py);
        await page.mouse.down();
        await page.mouse.move(to.px, to.py, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(500);
        return { success: true, description: `Dragged from (${from.px}, ${from.py}) to (${to.px}, ${to.py})` };
      }
      default:
        return { success: false, description: `Unknown action: ${name}` };
    }
  } catch (error) {
    return { success: false, description: `Failed: ${name} — ${(error as Error).message}` };
  }
}
```

### 4. `src/lib/agent-loop.ts`

This is the CORE of Parallax — the Computer Use agent loop.

```typescript
import { GoogleGenAI, Content, Part } from '@google/genai';
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

  // Navigate to initial URL
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000); // let page fully render

  // Take initial screenshot
  const initialScreenshot = await takeScreenshot(page);

  // Build conversation history for Gemini Computer Use
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

  // Computer Use agent loop
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    // Call Gemini Computer Use
    let response;
    try {
      response = await ai.models.generateContent({
        model: COMPUTER_USE_MODEL,
        contents,
        config: {
          tools: [{ computerUse: { environment: 'ENVIRONMENT_BROWSER' } }],
        },
      });
    } catch (err) {
      console.error('Gemini Computer Use error:', err);
      break;
    }

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) break;

    // Add model response to conversation history
    contents.push({ role: 'model', parts: candidate.content.parts });

    // Find function calls
    const functionCallParts = candidate.content.parts.filter((p: Part) => p.functionCall);
    if (functionCallParts.length === 0) break; // Gemini decided it's done

    // Execute each function call
    const functionResponseParts: Part[] = [];
    let stepDescription = '';

    for (const part of functionCallParts) {
      const fc = part.functionCall!;
      const result = await executeFunctionCall(page, fc.name!, fc.args as Record<string, unknown>);
      stepDescription = result.description;

      functionResponseParts.push({
        functionResponse: {
          name: fc.name!,
          response: { success: result.success, output: result.description },
        },
      } as Part);
    }

    // Take screenshot after actions
    const screenshot = await takeScreenshot(page);

    // Build step for frontend
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
    onStep(step); // stream to frontend immediately

    // Send function responses + new screenshot back to Gemini
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

  // Generate persona summary using Vercel AI SDK (structured output)
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
```

### 5. `src/app/api/analyze/route.ts`

SSE streaming endpoint. One call per persona, called in parallel from frontend.

```typescript
import { NextRequest } from 'next/server';
import { launchBrowser, createContext } from '@/lib/browser';
import { runAgentLoop } from '@/lib/agent-loop';
import { PERSONAS } from '@/lib/personas';

export const maxDuration = 300; // 5 minutes — Computer Use loops take time

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
          // Stream each step as SSE event
          const data = JSON.stringify({ type: 'step', personaId, step });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        });

        // Stream final summary
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
```

### 6. Frontend — `src/app/page.tsx`

Landing page with URL input and persona selector.

Key behavior:
- Text input for URL (validate format on submit)
- 5 persona cards — each shows emoji, name, description, color border
- "Launch Agents" button — navigates to /results?url=...
- Dark theme, clean, modern — think shadcn/ui feel but with Tailwind

### 7. Frontend — `src/app/results/page.tsx`

Results dashboard. Key behavior:
- On mount, fire 5 parallel fetch calls to /api/analyze (one per persona)
- Each fetch returns an SSE stream
- Parse SSE events and update state for each persona card
- Each card shows:
  - Persona header (emoji + name + color)
  - Steps streaming in: small screenshot thumbnail + action description
  - Loading pulse while waiting
  - Final summary card: score (big) + pain points + highlights
- Calculate overall Parallax Score as weighted average of all persona scores
- Show Parallax Score once ALL personas have submitted summaries

### 8. Components

**`journey-card.tsx`**: Single persona's journey. Shows:
- Persona avatar (emoji) + name + color-coded border
- Steps streaming in (latest screenshot fills card, older thumbnails below)
- Each step: screenshot thumbnail (clickable to expand), action description text
- Final score (1-10, color coded), pain points list, highlights list
- Loading state: pulsing ring animation

**`parallax-score.tsx`**: Overall score widget.
- Big number (average of persona scores × some weighting)
- Color: 1-3 red, 4-6 amber, 7-10 green
- Appears after all 5 personas finish
- Labels: "Needs Work" / "Decent" / "Polished"

**`url-input.tsx`**: URL input bar.
- Clean input with placeholder "https://yourapp.com"
- Validate URL format
- "Launch Agents →" button with animated loading state

---

## Milestone Commits

### Milestone 1: Dependencies + Environment
- Install: `@google/genai ai @ai-sdk/google zod playwright`
- Run `npx playwright install chromium`
- Create `.env.local` with `GOOGLE_GENERATIVE_AI_API_KEY`
- Create `src/lib/types.ts`
- Create `src/lib/personas.ts`
- **Commit: "feat: add dependencies, types, and persona definitions"**

### Milestone 2: Landing Page UI
- Build `src/app/page.tsx` — URL input + persona preview grid
- Build `src/app/layout.tsx` — dark theme root
- Add `src/components/url-input.tsx`
- Add `src/components/persona-picker.tsx`
- **Commit: "feat: landing page with URL input and persona selector"**

### Milestone 3: Browser + Screenshot Engine
- Build `src/lib/browser.ts` — Playwright launch, contexts, screenshot, executeFunctionCall
- Test locally: can take screenshot of any URL
- **Commit: "feat: Playwright browser engine with coordinate action executor"**

### Milestone 4: Agent Loop + API Route
- Build `src/lib/agent-loop.ts` — Computer Use loop + Vercel AI SDK summary
- Build `src/app/api/analyze/route.ts` — SSE streaming endpoint
- Test: single persona can navigate a site and stream steps
- **Commit: "feat: Gemini Computer Use agent loop with SSE streaming"**

### Milestone 5: Results Dashboard
- Build `src/app/results/page.tsx` — 5 parallel SSE streams
- Build `src/components/journey-card.tsx` — streaming persona cards
- Build `src/components/parallax-score.tsx` — overall score
- **Commit: "feat: streaming results dashboard with journey cards"**

### Milestone 6: Polish + Deploy
- Error handling: SSE error events, empty screenshots, Gemini failures
- Loading animations on all cards
- README with setup instructions and screenshots
- Deploy to Vercel (`vercel --prod`)
- Pre-test with 3 URLs before demo
- **Commit: "feat: polish, error handling, README, deploy"**

---

## Critical Implementation Notes

1. **maxDuration = 300**: Vercel's max for Pro plans is 5 min. Computer Use loops are slow — 8 turns × Gemini latency ≈ 40-80 seconds per persona. Frontend fires all 5 in parallel.

2. **Playwright on Vercel**: Playwright works on Vercel serverless if you install the binary. Add to `package.json` postinstall:
   ```json
   "postinstall": "playwright install chromium"
   ```
   Or use `PLAYWRIGHT_BROWSERS_PATH=/tmp` env var on Vercel.

3. **Coordinate denormalization**: Gemini returns x,y in 0-999 range. ALWAYS denormalize before calling Playwright:
   ```typescript
   actual_x = Math.round(x / 1000 * 1440)
   actual_y = Math.round(y / 1000 * 900)
   ```

4. **Computer Use model**: Use `gemini-2.5-computer-use-preview-10-2025`. NOT gemini-2.5-flash for the navigation — that model doesn't have Computer Use tools.

5. **Two models, two jobs**:
   - `@google/genai` + `gemini-2.5-computer-use-preview-10-2025` → navigation FunctionCalls
   - `@ai-sdk/google` + `gemini-2.5-flash` → structured persona summary (generateObject)

6. **SSE parsing on frontend**: Use `fetch` with `ReadableStream` reader (NOT EventSource — it doesn't support POST). Parse each `data: {...}\n\n` line.

7. **Parallel personas**: Frontend fires 5 simultaneous POST requests. Each runs in its own Vercel function invocation. All stream results independently.

8. **Demo prep**: Pre-test with these sites:
   - `stripe.com` — well-designed, should score high
   - `cerebralvalley.ai` — fun for the judges, they'll recognize it
   - Your own custom app — authentic, shows real bugs

---

## Vercel Stack Usage (for judges)

| Vercel Resource | How Used |
|-----------------|----------|
| **AI SDK** (`ai`) | `generateObject` with structured output for persona summaries |
| **Google Provider** (`@ai-sdk/google`) | Gemini 2.5 Flash for structured summary |
| **Next.js 16** (App Router) | Frontend + API routes + SSE streaming |
| **Vercel Deploy** | Production deployment |
| **Tailwind CSS** | UI styling |

Core differentiator (mention to judges):
| Tech | How |
|------|-----|
| **`@google/genai`** | Gemini Computer Use API — coordinate-based real navigation |
| **Playwright** | Executes Gemini's click_at / type_text_at on actual browser |

Optional bonus (if time):
| Resource | How |
|----------|-----|
| **Supabase** | Store scan history + share results via URL |
| **ElevenLabs** | Personas narrate their journey aloud |

---

## Demo Script (3 minutes)

```
[0:00-0:20] HOOK
"User research takes weeks. Focus groups cost thousands.
What if 5 AI personas could navigate your site RIGHT NOW
and tell you exactly what's broken — from their perspective?"

[0:20-1:30] LIVE DEMO
- Paste a URL (use cerebralvalley.ai for judges' delight)
- 5 persona cards appear, start navigating simultaneously
- Show screenshots streaming in with action descriptions
  "Steve clicked the nav link in 1 second — fast path found"
  "Clara is scrolling trying to understand what this site does"
  "Sam clicked the Privacy Policy link first — suspicious"

[1:30-2:20] SHOW RESULTS
- Overall Parallax Score: 6.4/10
- Click into Clara's full journey — show each screenshot
- Show pain points: "Navigation labels use jargon"
- Show highlights: "Clean hero section, clear value prop"

[2:20-3:00] CLOSE
- "Built with Gemini Computer Use API — agents actually
  navigate using coordinates, just like a real human mouse"
- "Powered by Vercel AI SDK + Next.js — 5 parallel agents,
  all streaming results simultaneously"
- "Point it at any URL. Get 5 real user perspectives in 60 seconds."
```

---

## Gemini Computer Use — Quick Reference

Available FunctionCall names returned by the model:

| Action | Args | What it does |
|--------|------|--------------|
| `click_at` | `x, y` (0-999) | Single click at normalized coordinates |
| `double_click_at` | `x, y` | Double click |
| `right_click_at` | `x, y` | Right click |
| `type_text_at` | `x, y, text` | Click then type text |
| `scroll_document` | `direction` (up/down) | Scroll the page |
| `navigate` | `url` | Go to a URL |
| `key_press` | `key` (e.g. "Tab", "Enter") | Press a keyboard key |
| `drag_and_drop` | `startX, startY, endX, endY` | Drag from one point to another |

Coordinate denormalization formula:
```
actual_x = Math.round(x / 1000 * SCREEN_WIDTH)   // SCREEN_WIDTH = 1440
actual_y = Math.round(y / 1000 * SCREEN_HEIGHT)  // SCREEN_HEIGHT = 900
```
