import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { repoUrl, title, body, token } = await req.json();

    if (!repoUrl || !title || !body || !token) {
      return new Response(JSON.stringify({ error: 'repoUrl, title, body, and token are required' }), { status: 400 });
    }

    const ghMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\s]+)/);
    if (!ghMatch) {
      return new Response(JSON.stringify({ error: 'Invalid GitHub URL' }), { status: 400 });
    }

    const [, owner, repo] = ghMatch;
    const repoName = repo.replace(/\.git$/, '');

    const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        labels: ['parallax', 'ux-bug'],
      }),
    });

    if (response.status === 401) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401 });
    }

    if (response.status === 404) {
      return new Response(JSON.stringify({ error: 'Repository not found' }), { status: 404 });
    }

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to create issue' }), { status: 500 });
    }

    const data = await response.json();

    return Response.json({
      issueUrl: data.html_url,
      issueNumber: data.number,
    });
  } catch (error) {
    console.error('Error creating issue:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create issue' }),
      { status: 500 }
    );
  }
}
