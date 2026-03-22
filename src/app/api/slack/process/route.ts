import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { PERSONAS } from '@/lib/personas';

export const maxDuration = 60;

const SLACK_PERSONAS = PERSONAS.slice(0, 3);

const AnalysisSchema = z.object({
  overallScore: z.number(),
  summary: z.string(),
  painPoints: z.array(z.string()),
  highlights: z.array(z.string()),
});

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

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('x-internal-secret');
  if (authHeader !== process.env.ANTHROPIC_API_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { text, channel } = await req.json();
  const cleanText = text.replace(/<@[^>]+>/g, '').trim();

  // Parse input
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
    return new Response('OK', { status: 200 });
  }

  if (!parsed.url) {
    await postSlackMessage(channel, '❌ No URL found. Try: @Parallax check https://example.com');
    return new Response('OK', { status: 200 });
  }

  const url = parsed.url.startsWith('http') ? parsed.url : `https://${parsed.url}`;

  await postSlackMessage(channel, `🌐 Analyzing ${url}...\n${parsed.intent !== 'General UX audit' ? `🎯 Intent: "${parsed.intent}"` : ''}`);

  // Fetch the page HTML instead of using browser
  let pageContent = '';
  try {
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    const html = await pageRes.text();
    // Strip scripts/styles, keep text content
    pageContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);
  } catch {
    await postSlackMessage(channel, '❌ Could not fetch the website.');
    return new Response('OK', { status: 200 });
  }

  // Run personas against the HTML content
  const results: { persona: typeof SLACK_PERSONAS[0]; summary?: z.infer<typeof AnalysisSchema>; error?: string }[] = [];

  for (const persona of SLACK_PERSONAS) {
    try {
      const { object } = await generateObject({
        model: anthropic('claude-sonnet-4-20250514'),
        schema: AnalysisSchema,
        prompt: `${persona.systemPrompt}

You are visiting this website: ${url}
The user's complaint: "${parsed.intent}"

Here is the page content:
${pageContent}

Analyze this website from your persona's perspective. Score it 1-10, provide a summary, list 3 specific pain points, and list 2 highlights. Be specific and reference actual content from the page.`,
      });
      results.push({ persona, summary: object });
    } catch (err) {
      results.push({ persona, error: err instanceof Error ? err.message : 'Unknown error' });
    }
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

  // Auto-file GitHub issue
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

  return new Response('OK', { status: 200 });
}
