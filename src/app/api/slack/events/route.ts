import { NextRequest } from 'next/server';
import { after } from 'next/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { launchBrowser, createContext } from '@/lib/browser';
import { runAgentLoop } from '@/lib/agent-loop';
import { PERSONAS } from '@/lib/personas';

export const maxDuration = 300;

// Use 2 personas for speed in Slack context
const SLACK_PERSONAS = PERSONAS.slice(0, 2);

async function postSlackMessage(channel: string, text: string) {
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel, text }),
  });
  if (!res.ok) {
    console.error('Slack postMessage failed:', await res.text());
  }
}

async function handleMention(text: string, channel: string) {
  // Remove @mention from text
  const cleanText = text.replace(/<@[^>]+>/g, '').trim();

  // Post "working on it" message
  await postSlackMessage(channel, '🔍 Analyzing... I\'ll post findings here when done.');

  // Parse input to extract URL + intent
  const ParseSchema = z.object({
    url: z.string(),
    intent: z.string(),
  });

  let parsed;
  try {
    const result = await generateObject({
      model: anthropic('claude-sonnet-4-20250514'),
      schema: ParseSchema,
      prompt: `Extract the website URL and the user's complaint from this message. If there's a plain URL with no complaint, set intent to 'General UX audit'. Always extract the most relevant URL.\n\nMessage:\n${cleanText}`,
    });
    parsed = result.object;
  } catch {
    await postSlackMessage(channel, '❌ Couldn\'t extract a URL from that message. Try: @Parallax check https://example.com');
    return;
  }

  if (!parsed.url) {
    await postSlackMessage(channel, '❌ No URL found in that message. Try: @Parallax check https://example.com');
    return;
  }

  const url = parsed.url.startsWith('http') ? parsed.url : `https://${parsed.url}`;

  await postSlackMessage(channel, `🌐 Navigating to ${url}...\n${parsed.intent !== 'General UX audit' ? `🎯 Intent: "${parsed.intent}"` : ''}`);

  // Run personas
  const results: { persona: typeof SLACK_PERSONAS[0]; summary?: { overallScore: number; summary: string; painPoints: string[]; highlights: string[] }; error?: string }[] = [];
  let browser;

  try {
    browser = await launchBrowser();

    for (const persona of SLACK_PERSONAS) {
      const context = await createContext(browser);
      const page = await context.newPage();
      try {
        const summary = await runAgentLoop(page, persona, url, () => {}, parsed.intent);
        results.push({ persona, summary });
      } catch (err) {
        results.push({ persona, error: err instanceof Error ? err.message : 'Unknown error' });
      } finally {
        await context.close();
      }
    }
  } catch (err) {
    await postSlackMessage(channel, `❌ Browser launch failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return;
  } finally {
    if (browser) await browser.close();
  }

  // Format results
  let message = `🔍 *Parallax Analysis: ${url}*\n`;
  if (parsed.intent && parsed.intent !== 'General UX audit') {
    message += `🎯 *Intent:* "${parsed.intent}"\n`;
  }
  message += '\n';

  const scores: number[] = [];
  for (const r of results) {
    if (r.summary) {
      scores.push(r.summary.overallScore);
      message += `*${r.persona.emoji} ${r.persona.name}* — Score: ${r.summary.overallScore}/10\n`;
      message += r.summary.summary + '\n';
      message += '*Pain Points:*\n';
      message += r.summary.painPoints.map(p => `  • ${p}`).join('\n');
      message += '\n*Highlights:*\n';
      message += r.summary.highlights.map(h => `  ✅ ${h}`).join('\n');
      message += '\n\n';
    } else if (r.error) {
      message += `*${r.persona.emoji} ${r.persona.name}*: ❌ ${r.error}\n\n`;
    }
  }

  if (scores.length > 0) {
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    message += `📊 *Overall Score: ${avg}/10*\n`;
  }

  message += `\n_Powered by Parallax_`;

  await postSlackMessage(channel, message);

  // Auto-file GitHub issue if configured
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo = process.env.GITHUB_REPO;

  if (ghToken && ghRepo && scores.length > 0) {
    try {
      const ghMatch = ghRepo.match(/github\.com\/([^\/]+)\/([^\/\s]+)/);
      if (ghMatch) {
        const [, owner, repoName] = ghMatch;
        const cleanRepo = repoName.replace(/\.git$/, '');
        const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

        const issueTitle = `[Parallax] UX Audit: ${url} (Score: ${avg}/10)`;
        let issueBody = `## Parallax UX Audit\n\n**URL:** ${url}\n`;
        if (parsed.intent && parsed.intent !== 'General UX audit') {
          issueBody += `**Complaint:** ${parsed.intent}\n`;
        }
        issueBody += `**Overall Score:** ${avg}/10\n\n`;

        for (const r of results) {
          if (r.summary) {
            issueBody += `### ${r.persona.emoji} ${r.persona.name} — ${r.summary.overallScore}/10\n\n`;
            issueBody += `${r.summary.summary}\n\n`;
            issueBody += `**Pain Points:**\n${r.summary.painPoints.map(p => `- ${p}`).join('\n')}\n\n`;
            issueBody += `**Highlights:**\n${r.summary.highlights.map(h => `- ${h}`).join('\n')}\n\n`;
          }
        }

        issueBody += `---\n*Auto-filed by Parallax via Slack*`;

        const ghRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/issues`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ghToken}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: issueTitle,
            body: issueBody,
            labels: ['parallax', 'ux-bug'],
          }),
        });

        if (ghRes.ok) {
          const issueData = await ghRes.json();
          await postSlackMessage(channel, `📋 GitHub issue filed: ${issueData.html_url}`);
        } else {
          console.error('GitHub issue creation failed:', ghRes.status, await ghRes.text());
        }
      }
    } catch (err) {
      console.error('GitHub auto-file error:', err);
    }
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // URL verification challenge (Slack sends this when you set up Event Subscriptions)
  if (body.type === 'url_verification') {
    return Response.json({ challenge: body.challenge });
  }

  // Ignore Slack retries (we already got the event)
  if (req.headers.get('x-slack-retry-num')) {
    return new Response('OK', { status: 200 });
  }

  // Handle app_mention events
  if (body.event?.type === 'app_mention') {
    const { text, channel } = body.event;

    after(async () => {
      try {
        await handleMention(text, channel);
      } catch (err) {
        console.error('Slack handler error:', err);
        try {
          await postSlackMessage(channel, `❌ Something went wrong: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } catch {}
      }
    });

    return new Response('OK', { status: 200 });
  }

  return new Response('OK', { status: 200 });
}
