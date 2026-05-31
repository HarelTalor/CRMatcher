import { auth } from '../../../lib/auth';
import prisma from '../../../lib/prisma';
import { Octokit } from '@octokit/rest';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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

    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
      type: 'all',
    });

    const result = repos.map((repo) => ({
      id: repo.id,
      fullName: repo.full_name,
      name: repo.name,
      owner: repo.owner.login,
      description: repo.description,
      private: repo.private,
      url: repo.html_url,
      language: repo.language,
      updatedAt: repo.updated_at,
    }));

    return Response.json(result);
  } catch (error) {
    console.error('Error fetching GitHub repos:', error);
    if (error.status === 401) {
      return Response.json(
        { error: 'GitHub token expired. Please re-authenticate.' },
        { status: 401 }
      );
    }
    return Response.json({ error: 'Failed to fetch repositories' }, { status: 500 });
  }
}
