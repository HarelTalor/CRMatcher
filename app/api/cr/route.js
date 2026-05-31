import { auth } from '../../lib/auth';
import prisma from '../../lib/prisma';

export async function GET(request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Refresh user data from DB to get current teamId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.teamId) {
      return Response.json({ error: 'You must be in a team to view CR requests' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const where = { teamId: user.teamId };
    if (status) {
      where.status = status;
    }

    const crRequests = await prisma.cRRequest.findMany({
      where,
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
        assignments: {
          include: {
            reviewer: {
              select: {
                id: true,
                username: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json(crRequests);
  } catch (error) {
    console.error('Error fetching CR requests:', error);
    return Response.json({ error: 'Failed to fetch CR requests' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Refresh user data from DB to get current teamId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.teamId) {
      return Response.json({ error: 'You must be in a team to create CR requests' }, { status: 400 });
    }

    const body = await request.json();
    const { repoFullName, prNumber, prTitle, prUrl, additions, deletions, requiredReviewers } = body;

    if (!repoFullName || !prNumber || !prTitle || !prUrl) {
      return Response.json(
        { error: 'repoFullName, prNumber, prTitle, and prUrl are required' },
        { status: 400 }
      );
    }

    const crRequest = await prisma.cRRequest.create({
      data: {
        teamId: user.teamId,
        requesterId: user.id,
        repoFullName,
        prNumber: parseInt(prNumber, 10),
        prTitle,
        prUrl,
        additions: parseInt(additions, 10) || 0,
        deletions: parseInt(deletions, 10) || 0,
        requiredReviewers: parseInt(requiredReviewers, 10) || 1,
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
        assignments: true,
      },
    });

    return Response.json(crRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating CR request:', error);
    return Response.json({ error: 'Failed to create CR request' }, { status: 500 });
  }
}
