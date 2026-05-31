import { auth } from '../../../../lib/auth';
import prisma from '../../../../lib/prisma';

export async function POST(request, { params }) {
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.teamId === id) {
      return Response.json({ error: 'You are already a member of this team' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { teamId: id },
    });

    return Response.json({ message: 'Successfully joined team', teamId: id });
  } catch (error) {
    console.error('Error joining team:', error);
    return Response.json({ error: 'Failed to join team' }, { status: 500 });
  }
}
