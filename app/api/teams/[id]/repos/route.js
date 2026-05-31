import { auth } from '../../../../lib/auth';
import prisma from '../../../../lib/prisma';

export async function GET(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return Response.json({ error: 'Team not found' }, { status: 404 });
    }

    const repos = await prisma.trackedRepo.findMany({
      where: { teamId: id },
      orderBy: { addedAt: 'desc' },
    });

    return Response.json(repos);
  } catch (error) {
    console.error('Error fetching repos:', error);
    return Response.json({ error: 'Failed to fetch repos' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { repoFullName } = await request.json();

    if (!repoFullName || typeof repoFullName !== 'string') {
      return Response.json({ error: 'repoFullName is required' }, { status: 400 });
    }

    // Validate format: "owner/repo"
    if (!/^[^/]+\/[^/]+$/.test(repoFullName.trim())) {
      return Response.json(
        { error: 'Invalid repo format. Expected "owner/repo"' },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return Response.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user belongs to this team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (user?.teamId !== id) {
      return Response.json(
        { error: 'You must be a member of this team to add repos' },
        { status: 403 }
      );
    }

    // Check for duplicate
    const existing = await prisma.trackedRepo.findUnique({
      where: {
        teamId_repoFullName: {
          teamId: id,
          repoFullName: repoFullName.trim(),
        },
      },
    });

    if (existing) {
      return Response.json({ error: 'Repo is already tracked' }, { status: 409 });
    }

    const repo = await prisma.trackedRepo.create({
      data: {
        teamId: id,
        repoFullName: repoFullName.trim(),
      },
    });

    return Response.json(repo, { status: 201 });
  } catch (error) {
    console.error('Error adding repo:', error);
    return Response.json({ error: 'Failed to add repo' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { repoId } = await request.json();

    if (!repoId) {
      return Response.json({ error: 'repoId is required' }, { status: 400 });
    }

    // Check the repo belongs to this team
    const repo = await prisma.trackedRepo.findFirst({
      where: { id: repoId, teamId: id },
    });

    if (!repo) {
      return Response.json({ error: 'Repo not found in this team' }, { status: 404 });
    }

    // Check if user belongs to this team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (user?.teamId !== id) {
      return Response.json(
        { error: 'You must be a member of this team to remove repos' },
        { status: 403 }
      );
    }

    await prisma.trackedRepo.delete({ where: { id: repoId } });

    return Response.json({ message: 'Repo removed successfully' });
  } catch (error) {
    console.error('Error removing repo:', error);
    return Response.json({ error: 'Failed to remove repo' }, { status: 500 });
  }
}
