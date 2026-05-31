import { auth } from '../../../lib/auth';
import prisma from '../../../lib/prisma';

export async function GET(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
        trackedRepos: true,
        _count: {
          select: {
            crRequests: true,
            members: true,
          },
        },
      },
    });

    if (!team) {
      return Response.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get stats
    const openCRs = await prisma.cRRequest.count({
      where: { teamId: id, status: 'OPEN' },
    });
    const completedCRs = await prisma.cRRequest.count({
      where: { teamId: id, status: 'COMPLETED' },
    });

    return Response.json({
      ...team,
      stats: {
        totalCRs: team._count.crRequests,
        memberCount: team._count.members,
        openCRs,
        completedCRs,
      },
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    return Response.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { name, description } = await request.json();

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return Response.json({ error: 'Team not found' }, { status: 404 });
    }

    const updateData = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return Response.json({ error: 'Team name cannot be empty' }, { status: 400 });
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description;
    }

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: updateData,
    });

    return Response.json(updatedTeam);
  } catch (error) {
    console.error('Error updating team:', error);
    if (error.code === 'P2002') {
      return Response.json({ error: 'A team with this name already exists' }, { status: 409 });
    }
    return Response.json({ error: 'Failed to update team' }, { status: 500 });
  }
}
