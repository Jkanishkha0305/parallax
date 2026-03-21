# PARALLAX — Build Plan

> AI persona agents that navigate your product and report real friction.
> Cerebral Valley "Zero to Agent" Hackathon — Vercel x DeepMind, March 21 2026
> Submissions due: 5:00 PM EST

## One-Liner

Paste any URL → 5 AI persona agents ACTUALLY navigate your site as different users → report what confused them, where they got stuck, and what they loved.

## Problem Statement Fit

- **Statement 2 (Multi-Modal Agents)**: Agents that see (Gemini vision), plan (decide what to click), and execute (Playwright navigates).
- **Statement 3 (AI Applications)**: Useful product that solves real UX research problem.

## Judging Criteria

| Criteria | Weight (R1) | How we score |
|----------|-------------|-------------|
| Live Demo | 45% | Judge gives ANY URL → agents navigate live → real feedback in 60 seconds |
| Creativity | 35% | Agents that actually USE the site, not just analyze screenshots |
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
│    Step 1: 📸 screenshot + "I see a signup form..."         │
│    Step 2: 📸 screenshot + "I clicked Sign Up but..."       │
│    Step 3: 📸 screenshot + "Now I'm confused because..."    │
└──────────────────────┬──────────────────────────────────────┘
                       │ POST /api/analyze (SSE stream)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      API ROUTE                               │
│              /api/analyze/route.ts                            │
│                                                              │
│  1. Launch Puppeteer (headless Chrome)                        │
│  2. Navigate to URL                                          │
│  3. AGENT LOOP (5-8 steps per persona):                      │
│     a. Take screenshot → base64                              │
│     b. Send to Gemini with persona prompt                    │
│     c. Gemini returns: observation + action + reasoning      │
│     d. Execute action via Puppeteer (click/scroll/type)      │
│     e. Stream step result to frontend via SSE                │
│  4. Final summary from Gemini                                │
│  5. Close browser                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    GEMINI 2.5 FLASH                           │
│                  (via @ai-sdk/google)                         │
│                                                              │
│  Input: screenshot (image) + persona system prompt           │
│  Output: structured JSON {                                   │
│    observation: "I see a login page with...",                │
│    emotion: "confused",                                      │
│    action: { type: "click", selector: ".btn-signup" },       │
│    reasoning: "As a first-time user I'd look for..."        │
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
│   │   ├── browser.ts               # Puppeteer launch + screenshot + actions
│   │   ├── agent-loop.ts            # Core agent loop: screenshot → gemini → act
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
npm install ai @ai-sdk/google zod puppeteer-core @sparticuz/chromium-min
```

| Package | Purpose |
|---------|---------|
| `ai` | Vercel AI SDK — streamText, generateObject |
| `@ai-sdk/google` | Gemini provider |
| `zod` | Schema validation for structured Gemini output |
| `puppeteer-core` | Headless Chrome control (no bundled Chromium) |
| `@sparticuz/chromium-min` | Minimal Chromium binary for serverless |

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
  type: 'click' | 'scroll' | 'type' | 'navigate' | 'done';
  selector?: string;      // CSS selector for click/type
  text?: string;           // text to type
  url?: string;            // URL for navigate
  direction?: 'up' | 'down'; // for scroll
}

export interface AgentStep {
  stepNumber: number;
  screenshot: string;      // base64 PNG
  observation: string;     // what the persona sees
  emotion: string;         // confused, frustrated, delighted, neutral, etc.
  reasoning: string;       // why they're taking this action
  action: AgentAction;     // what they do next
  score: number;           // 1-10 how they feel about this step
}

export interface PersonaJourney {
  personaId: string;
  steps: AgentStep[];
  overallScore: number;    // 1-10
  summary: string;         // final verdict
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

When analyzing a webpage:
- Look for the fastest path to the core functionality
- Note any unnecessary friction or extra steps
- Check if there are keyboard shortcuts or quick actions
- Judge the information density — too sparse = wasted space, too dense = overwhelming
- You get frustrated by: popups, cookie banners that aren't dismissible, forced signups before seeing value`,
  },
  {
    id: 'confused-clara',
    name: 'Confused Clara',
    emoji: '😕',
    description: 'First-time user who finds most tech confusing',
    color: 'pink',
    systemPrompt: `You are Clara, a 55-year-old school teacher who is not tech-savvy. You find most websites confusing. You don't know what "CTA" or "hamburger menu" means. You take things literally and get confused by tech jargon.

When analyzing a webpage:
- Read everything literally — if the wording is ambiguous, you WILL misunderstand it
- Look for clear labels and obvious navigation
- Note anything that assumes technical knowledge
- You get confused by: icons without labels, dropdown menus, unclear button text
- You feel anxious about: entering personal information, clicking things that might "break something"
- You need: clear step-by-step guidance, visible help/support options`,
  },
  {
    id: 'skeptical-sam',
    name: 'Skeptical Sam',
    emoji: '🔒',
    description: 'Privacy-conscious user who questions everything',
    color: 'amber',
    systemPrompt: `You are Sam, a 35-year-old privacy advocate. You are deeply suspicious of any website that asks for personal information. You read privacy policies, check for HTTPS, and question why any data is needed.

When analyzing a webpage:
- Question EVERY form field: "why do they need my phone number?"
- Look for privacy indicators: HTTPS, privacy policy links, data usage disclosures
- Check for dark patterns: pre-checked boxes, confusing opt-out language
- Note any tracking indicators, cookie banners, third-party integrations
- You get suspicious of: vague privacy language, forced account creation, excessive permissions
- You refuse to: enter data that isn't clearly necessary for the service`,
  },
  {
    id: 'accessible-alex',
    name: 'Accessible Alex',
    emoji: '♿',
    description: 'User who navigates primarily with keyboard and screen reader',
    color: 'green',
    systemPrompt: `You are Alex, a 30-year-old data analyst who is visually impaired and primarily uses a keyboard and screen reader. You cannot use a mouse. You rely on tab navigation, aria labels, and logical page structure.

When analyzing a webpage:
- Check if the tab order makes logical sense
- Look for visible focus indicators on interactive elements
- Note images without alt text
- Check heading hierarchy (H1 → H2 → H3)
- Judge color contrast — low contrast text is invisible to you
- You struggle with: hover-only interactions, drag-and-drop, CAPTCHAs, auto-playing media
- You need: skip-to-content links, properly labeled form fields, keyboard-accessible menus`,
  },
  {
    id: 'global-gita',
    name: 'Global Gita',
    emoji: '🌍',
    description: 'Non-English speaker from India navigating a US-centric site',
    color: 'purple',
    systemPrompt: `You are Gita, a 40-year-old business owner from Mumbai, India. English is your second language. You are comfortable with technology but US-centric design patterns sometimes confuse you.

When analyzing a webpage:
- Note US-centric assumptions: date formats (MM/DD/YYYY vs DD/MM/YYYY), phone number formats, address fields without international support
- Flag unclear idioms or colloquialisms in the copy
- Check if icons are universally understood or culturally specific
- Note currency assumptions (defaulting to USD)
- You struggle with: slang, cultural references, US-only payment methods, phone number validation that rejects international numbers
- You appreciate: language options, international phone support, universal iconography`,
  },
];
```

### 3. `src/lib/browser.ts`

```typescript
import puppeteer, { Browser, Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

// Chromium executable path for serverless
const CHROMIUM_PATH = 'https://github.com/nicknisi/headless-chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar';

export async function launchBrowser(): Promise<Browser> {
  const executablePath = await chromium.executablePath(CHROMIUM_PATH);
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 720 },
    executablePath,
    headless: chromium.headless,
  });
}

export async function takeScreenshot(page: Page): Promise<string> {
  const buffer = await page.screenshot({
    type: 'png',
    encoding: 'base64',
  });
  return buffer as string; // base64 string
}

export async function executeAction(
  page: Page,
  action: { type: string; selector?: string; text?: string; direction?: string; url?: string }
): Promise<boolean> {
  try {
    switch (action.type) {
      case 'click':
        if (action.selector) {
          await page.waitForSelector(action.selector, { timeout: 3000 });
          await page.click(action.selector);
        }
        break;
      case 'scroll':
        await page.evaluate((dir) => {
          window.scrollBy(0, dir === 'up' ? -400 : 400);
        }, action.direction || 'down');
        break;
      case 'type':
        if (action.selector && action.text) {
          await page.waitForSelector(action.selector, { timeout: 3000 });
          await page.type(action.selector, action.text);
        }
        break;
      case 'navigate':
        if (action.url) {
          await page.goto(action.url, { waitUntil: 'networkidle2', timeout: 10000 });
        }
        break;
      case 'done':
        return false; // signal to stop the loop
      default:
        break;
    }
    // Wait for page to settle after action
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  } catch (error) {
    console.error('Action failed:', error);
    return true; // continue loop even if action fails
  }
}
```

### 4. `src/lib/agent-loop.ts`

This is the CORE of Parallax — the agent loop.

```typescript
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { Page } from 'puppeteer-core';
import { Persona, AgentStep } from './types';
import { takeScreenshot, executeAction } from './browser';

const StepSchema = z.object({
  observation: z.string().describe('What you see on this page — describe the layout, key elements, and content'),
  emotion: z.enum(['confused', 'frustrated', 'delighted', 'neutral', 'anxious', 'impressed', 'bored']),
  reasoning: z.string().describe('As your persona, explain WHY you are taking the next action'),
  action: z.object({
    type: z.enum(['click', 'scroll', 'type', 'navigate', 'done']),
    selector: z.string().optional().describe('CSS selector of element to interact with'),
    text: z.string().optional().describe('Text to type into an input field'),
    direction: z.enum(['up', 'down']).optional(),
    url: z.string().optional(),
  }),
  score: z.number().min(1).max(10).describe('How satisfied you feel about this page (1=terrible, 10=perfect)'),
});

const SummarySchema = z.object({
  overallScore: z.number().min(1).max(10),
  summary: z.string().describe('2-3 sentence overall verdict of the website experience'),
  painPoints: z.array(z.string()).describe('Top 3 friction points encountered'),
  highlights: z.array(z.string()).describe('Top 3 things done well'),
});

const MAX_STEPS = 6;

export async function runAgentLoop(
  page: Page,
  persona: Persona,
  url: string,
  onStep: (step: AgentStep) => void
): Promise<{ overallScore: number; summary: string; painPoints: string[]; highlights: string[] }> {

  // Navigate to initial URL
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(resolve => setTimeout(resolve, 1500)); // let page fully render

  const stepHistory: AgentStep[] = [];

  for (let i = 0; i < MAX_STEPS; i++) {
    // 1. Take screenshot
    const screenshotBase64 = await takeScreenshot(page);

    // 2. Build context from previous steps
    const historyContext = stepHistory.map(s =>
      `Step ${s.stepNumber}: ${s.observation} → Felt ${s.emotion} → ${s.reasoning}`
    ).join('\n');

    // 3. Ask Gemini what this persona would do
    const { object: stepResult } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: StepSchema,
      messages: [
        {
          role: 'system',
          content: `${persona.systemPrompt}

You are navigating a website. Look at the screenshot and decide what you would do next as this persona. Be specific about which element you'd interact with (use CSS selectors when possible, or describe the element clearly).

Your previous steps on this site:
${historyContext || 'This is your first look at the site.'}

If you feel you've explored enough (visited 2-3 pages or completed a key task), set action.type to "done".`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Step ${i + 1}: Look at this webpage and decide what you'd do next.` },
            { type: 'image', image: Buffer.from(screenshotBase64, 'base64') },
          ],
        },
      ],
    });

    // 4. Build step object
    const step: AgentStep = {
      stepNumber: i + 1,
      screenshot: screenshotBase64,
      observation: stepResult.observation,
      emotion: stepResult.emotion,
      reasoning: stepResult.reasoning,
      action: stepResult.action,
      score: stepResult.score,
    };

    stepHistory.push(step);
    onStep(step); // stream to frontend

    // 5. Execute the action
    if (stepResult.action.type === 'done') break;
    const shouldContinue = await executeAction(page, stepResult.action);
    if (!shouldContinue) break;
  }

  // 6. Generate final summary
  const { object: summary } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: SummarySchema,
    prompt: `${persona.systemPrompt}

You just navigated a website. Here is your journey:
${stepHistory.map(s => `Step ${s.stepNumber}: ${s.observation} (Felt: ${s.emotion}, Score: ${s.score}/10) — ${s.reasoning}`).join('\n')}

Now give your overall verdict.`,
  });

  return summary;
}
```

### 5. `src/app/api/analyze/route.ts`

SSE streaming endpoint. Runs ONE persona at a time (called once per persona from frontend).

```typescript
import { NextRequest } from 'next/server';
import { launchBrowser } from '@/lib/browser';
import { runAgentLoop } from '@/lib/agent-loop';
import { PERSONAS } from '@/lib/personas';

export const maxDuration = 60; // seconds — needed for agent loop

export async function POST(req: NextRequest) {
  const { url, personaId } = await req.json();

  const persona = PERSONAS.find(p => p.id === personaId);
  if (!persona) {
    return new Response(JSON.stringify({ error: 'Unknown persona' }), { status: 400 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let browser;
      try {
        browser = await launchBrowser();
        const page = await browser.newPage();

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
- Text input for URL
- Optional: let user describe their target customers (Gemini generates matching personas)
- Default: use the 5 preset personas
- "Scan" button starts the analysis
- Redirects to /results with the URL as query param

### 7. Frontend — `src/app/results/page.tsx`

Results dashboard. Key behavior:
- On mount, fire 5 parallel fetch calls to /api/analyze (one per persona)
- Each fetch returns an SSE stream
- Parse SSE events and update state for each persona card
- Each card shows steps as they arrive (screenshot thumbnail + observation + emotion)
- When summary arrives, show overall score + pain points + highlights
- Calculate overall Parallax Score as average of all persona scores

### 8. Components

**`journey-card.tsx`**: Single persona's journey. Shows:
- Persona avatar (emoji) + name + description
- Steps as they stream in (collapsible)
- Each step: small screenshot thumbnail, observation text, emotion badge
- Final score (big number), pain points list, highlights list
- Loading state: pulsing animation while waiting for steps

**`parallax-score.tsx`**: Overall score. Shows:
- Big number (average of all persona scores)
- Color-coded: 1-3 red, 4-6 yellow, 7-10 green
- Appears after all personas have submitted summaries

**`url-input.tsx`**: URL input bar. Shows:
- Clean input with placeholder "https://yourapp.com"
- Validate URL format before submission
- "Analyze" button with loading state

---

## Milestone Commits

Each milestone should be committed and pushed separately:

### Milestone 1: Dependencies + Environment
- Install packages: `ai`, `@ai-sdk/google`, `zod`, `puppeteer-core`, `@sparticuz/chromium-min`
- Create `.env.local` with `GOOGLE_GENERATIVE_AI_API_KEY`
- Create `src/lib/types.ts`
- Create `src/lib/personas.ts`
- **Commit: "feat: add dependencies, types, and persona definitions"**

### Milestone 2: Landing Page UI
- Build `src/app/page.tsx` — URL input + persona preview grid
- Style with Tailwind — dark theme, modern, clean
- Add `src/components/url-input.tsx`
- Add `src/components/persona-picker.tsx`
- **Commit: "feat: landing page with URL input and persona selector"**

### Milestone 3: Browser + Screenshot Engine
- Build `src/lib/browser.ts` — Puppeteer launch, screenshot, action execution
- Test: can take screenshot of any URL
- **Commit: "feat: headless browser screenshot engine"**

### Milestone 4: Agent Loop + API Route
- Build `src/lib/agent-loop.ts` — core loop with Gemini
- Build `src/app/api/analyze/route.ts` — SSE streaming endpoint
- Test: single persona can navigate a site and stream steps
- **Commit: "feat: agent loop with Gemini vision + SSE streaming"**

### Milestone 5: Results Dashboard
- Build `src/app/results/page.tsx` — 5 parallel streams
- Build `src/components/journey-card.tsx` — streaming persona cards
- Build `src/components/parallax-score.tsx` — overall score
- **Commit: "feat: streaming results dashboard with journey cards"**

### Milestone 6: Polish + Deploy
- Error handling for all edge cases
- Loading animations
- README with project description + setup instructions
- Deploy to Vercel
- Test with 3 different websites
- Record 1-minute demo video
- **Commit: "feat: polish, error handling, README, deploy"**

---

## Critical Implementation Notes

1. **maxDuration**: Set `export const maxDuration = 60` in the API route. The agent loop needs time for 6 steps × (screenshot + Gemini call + action).

2. **Chromium binary**: Use `@sparticuz/chromium-min` with a remote tar URL. The full `@sparticuz/chromium` package may exceed Vercel's 50MB function size limit.

3. **Gemini structured output**: Use `generateObject` with zod schemas (NOT `generateText` with JSON parsing). This guarantees valid output every time.

4. **Screenshot size**: Keep screenshots at 1280×720. Full-page screenshots can be huge and slow down Gemini. Cap at viewport size.

5. **CSS selector reliability**: Gemini may return invalid CSS selectors. Wrap `executeAction` in try/catch and continue the loop if an action fails. The agent should gracefully recover.

6. **Parallel personas**: The frontend fires 5 parallel requests. Each runs independently. If one fails, the others continue. Don't wait for all to finish before showing results.

7. **SSE parsing on frontend**: Use `EventSource` or `fetch` with `ReadableStream` reader to parse SSE events. Each `data:` line is a JSON object.

8. **Demo prep**: Pre-test with these sites:
   - A well-designed site (stripe.com) — should score high
   - A mediocre site (any random SaaS) — mixed scores
   - The hackathon's own site (cerebralvalley.ai) — fun for demo

---

## Vercel Stack Usage (for judges)

| Vercel Resource | How Used |
|-----------------|----------|
| **AI SDK** (`ai`) | `generateObject` with structured output, streaming |
| **Google Provider** (`@ai-sdk/google`) | Gemini 2.5 Flash for vision + reasoning |
| **Next.js 16** (App Router) | Frontend + API routes + SSE streaming |
| **Vercel Deploy** | Production deployment |
| **Tailwind CSS** | UI styling |

Optional bonus (if time):
| Resource | How |
|----------|-----|
| **Supabase** | Store scan history + results for sharing |
| **ElevenLabs** | Personas narrate their journey aloud |
| **Vercel Sandbox** | Isolated browser environment (mention in README) |

---

## Demo Script (3 minutes)

```
[0:00-0:20] HOOK
"Every product team needs user feedback. But real user testing
takes weeks and costs thousands. What if 5 AI personas could
navigate your site RIGHT NOW and tell you what's broken?"

[0:20-1:30] LIVE DEMO
- Paste a URL (judge's site or well-known site)
- 5 persona cards appear, start navigating simultaneously
- Show screenshots streaming in with observations
- "Steve says signup takes 7 clicks — he wants a shortcut"
- "Clara can't find the pricing page"
- "Sam doesn't trust the cookie banner"

[1:30-2:20] SHOW RESULTS
- Overall Parallax Score: 6.2/10
- Click into one persona's full journey
- Show screenshot at each step with emotion + reasoning
- Show pain points summary

[2:20-3:00] CLOSE
- "Built with Vercel AI SDK + Gemini 2.5 Flash"
- "Each persona actually navigates your site — this isn't
  static analysis, these are real agent journeys"
- "Point it at any URL. Know your blind spots in 60 seconds."
```
