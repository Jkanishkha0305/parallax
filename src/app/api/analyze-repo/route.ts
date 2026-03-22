import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const RepoSuggestionSchema = z.object({
  relevantFiles: z.array(z.object({
    path: z.string(),
    reason: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
  })),
  summary: z.string(),
  potentialFixes: z.array(z.object({
    file: z.string(),
    issue: z.string(),
    suggestion: z.string(),
  })),
});

interface JourneyInput {
  personaName: string;
  painPoints: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { githubUrl, painPoints } = await req.json();

    if (!githubUrl || typeof githubUrl !== 'string') {
      return new Response(JSON.stringify({ error: 'GitHub URL is required' }), { status: 400 });
    }

    // Parse GitHub URL to get owner/repo
    const ghMatch = githubUrl.match(/github\.com\/([^\/]+)\/([^\/\s]+)/);
    if (!ghMatch) {
      return new Response(JSON.stringify({ error: 'Invalid GitHub URL' }), { status: 400 });
    }

    const [, owner, repo] = ghMatch;
    const repoName = repo.replace(/\.git$/, '');

    // Fetch repo info
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });

    if (!repoResponse.ok) {
      return new Response(JSON.stringify({ error: 'Could not fetch GitHub repo' }), { status: 400 });
    }

    const repoData = await repoResponse.json();

    // Fetch repo structure (tree)
    const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees/HEAD?recursive=1`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });

    let fileStructure: string[] = [];
    if (treeResponse.ok) {
      const treeData = await treeResponse.json();
      fileStructure = (treeData.tree || [])
        .filter((item: any) => item.type === 'blob')
        .map((item: any) => item.path)
        .filter((path: string) => 
          !path.startsWith('node_modules') && 
          !path.startsWith('.') &&
          !path.includes('dist/') &&
          !path.includes('build/')
        )
        .slice(0, 100); // Limit to 100 files
    }

    const painPointContext = painPoints 
      ? painPoints.map((pp: string, i: number) => `${i + 1}. ${pp}`).join('\n')
      : 'No specific pain points provided';

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-20250514'),
      schema: RepoSuggestionSchema,
      prompt: `You are a code expert analyzing a GitHub repository.

Repository: ${repoName}
Description: ${repoData.description || 'No description'}
Language: ${repoData.language || 'Unknown'}
Stars: ${repoData.stargazers_count || 0}

Files in repository:
${fileStructure.join('\n')}

Pain points from UX testing:
${painPointContext}

Based on the pain points and the repository structure, identify:
1. Which files are most likely related to the issues found
2. What specific changes might help address the pain points
3. A summary of findings

Focus on frontend files (components, pages, styles) and UX-related code.`,
    });

    return Response.json({
      repo: {
        name: repoData.full_name,
        description: repoData.description,
        language: repoData.language,
        stars: repoData.stargazers_count,
        url: repoData.html_url,
      },
      suggestions: object,
    });
  } catch (error) {
    console.error('Error analyzing repo:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to analyze repository' }),
      { status: 500 }
    );
  }
}
