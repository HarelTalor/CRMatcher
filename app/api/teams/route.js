import { auth } from '../../lib/auth';
import prisma from '../../lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const teams = await prisma.team.findMany({
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = teams.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      inviteCode: team.inviteCode,
      memberCount: team._count.members,
      createdAt: team.createdAt,
    }));

    return Response.json(result);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return Response.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, description } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Response.json({ error: 'Team name is required' }, { status: 400 });
    }

    const existingTeam = await prisma.team.findUnique({
      where: { name: name.trim() },
    });

    if (existingTeam) {
      return Response.json({ error: 'A team with this name already exists' }, { status: 409 });
    }

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description || null,
      },
    });

    // Auto-add the creating user to the team
    await prisma.user.update({
      where: { id: session.user.id },
      data: { teamId: team.id },
    });

    return Response.json(team, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return Response.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
