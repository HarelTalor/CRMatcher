import { auth } from '../../lib/auth';
import prisma from '../../lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        team: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    return Response.json({
      id: user.id,
      githubId: user.githubId,
      username: user.username,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      teamId: user.teamId,
      team: user.team
        ? {
            id: user.team.id,
            name: user.team.name,
            description: user.team.description,
            inviteCode: user.team.inviteCode,
            memberCount: user.team._count.members,
          }
        : null,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return Response.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { teamId } = await request.json();

    const updateData = {};

    if (teamId !== undefined) {
      if (teamId !== null) {
        // Verify the team exists
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team) {
          return Response.json({ error: 'Team not found' }, { status: 404 });
        }
      }
      updateData.teamId = teamId;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      include: {
        team: true,
      },
    });

    return Response.json({
      id: updatedUser.id,
      githubId: updatedUser.githubId,
      username: updatedUser.username,
      name: updatedUser.name,
      email: updatedUser.email,
      avatarUrl: updatedUser.avatarUrl,
      teamId: updatedUser.teamId,
      team: updatedUser.team,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return Response.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
