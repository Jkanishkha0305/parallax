import { NextRequest } from 'next/server';

export const maxDuration = 10;

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
  const body = await req.json();

  // URL verification challenge
  if (body.type === 'url_verification') {
    return Response.json({ challenge: body.challenge });
  }

  // Ignore Slack retries
  if (req.headers.get('x-slack-retry-num')) {
    return new Response('OK', { status: 200 });
  }

  // Handle app_mention events
  if (body.event?.type === 'app_mention') {
    const { text, channel } = body.event;

    // Post immediate acknowledgment
    await postSlackMessage(channel, '🔍 Analyzing... I\'ll post findings here when done.');

    // Fire off processing to a separate serverless function (gets full maxDuration)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    fetch(`${baseUrl}/api/slack/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.ANTHROPIC_API_KEY || '',
      },
      body: JSON.stringify({ text, channel }),
    }).catch(err => {
      console.error('Failed to trigger processing:', err);
    });

    return new Response('OK', { status: 200 });
  }

  return new Response('OK', { status: 200 });
}
