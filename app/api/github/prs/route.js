import { auth } from '../../../lib/auth';
import prisma from '../../../lib/prisma';
import { Octokit } from '@octokit/rest';

export async function GET(request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const repo = searchParams.get('repo');

    if (!repo) {
      return Response.json({ error: 'repo query parameter is required (e.g. ?repo=owner/repo)' }, { status: 400 });
    }

    // Validate format
    const parts = repo.split('/');
    if (parts.length !== 2) {
      return Response.json({ error: 'Invalid repo format. Expected "owner/repo"' }, { status: 400 });
    }

    const [owner, repoName] = parts;

    // Get the access token from the database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.accessToken) {
      return Response.json(
        { error: 'No GitHub access token found. Please re-authenticate.' },
        { status: 401 }
      );
    }

    const octokit = new Octokit({ auth: user.accessToken });

    const { data: pulls } = await octokit.pulls.list({
      owner,
      repo: repoName,
      state: 'open',
      sort: 'updated',
      direction: 'desc',
      per_page: 50,
    });

    const result = pulls.map((pr) => ({
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      state: pr.state,
      user: {
        login: pr.user.login,
        avatarUrl: pr.user.avatar_url,
      },
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      draft: pr.draft,
      labels: pr.labels.map((l) => ({ name: l.name, color: l.color })),
    }));

    return Response.json(result);
  } catch (error) {
    console.error('Error fetching PRs:', error);
    if (error.status === 401) {
      return Response.json(
        { error: 'GitHub token expired. Please re-authenticate.' },
        { status: 401 }
      );
    }
    if (error.status === 404) {
      return Response.json({ error: 'Repository not found' }, { status: 404 });
    }
    return Response.json({ error: 'Failed to fetch pull requests' }, { status: 500 });
  }
}
