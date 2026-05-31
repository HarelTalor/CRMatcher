import { auth } from '../../../../lib/auth';
import prisma from '../../../../lib/prisma';

export async function POST(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const crRequest = await prisma.cRRequest.findUnique({
      where: { id },
      include: {
        assignments: true,
      },
    });

    if (!crRequest) {
      return Response.json({ error: 'CR request not found' }, { status: 404 });
    }

    if (crRequest.status !== 'OPEN') {
      return Response.json({ error: 'CR request is not open' }, { status: 400 });
    }

    // Prevent self-assignment (requester can't review their own CR)
    if (crRequest.requesterId === session.user.id) {
      return Response.json(
        { error: 'You cannot review your own CR request' },
        { status: 400 }
      );
    }

    // Check if already assigned
    const existingAssignment = await prisma.cRAssignment.findUnique({
      where: {
        crRequestId_reviewerId: {
          crRequestId: id,
          reviewerId: session.user.id,
        },
      },
    });

    if (existingAssignment) {
      return Response.json(
        { error: 'You are already assigned to this CR request' },
        { status: 409 }
      );
    }

    // Check if user is on the same team
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.teamId !== crRequest.teamId) {
      return Response.json(
        { error: 'You must be in the same team to review this CR' },
        { status: 403 }
      );
    }

    const assignment = await prisma.cRAssignment.create({
      data: {
        crRequestId: id,
        reviewerId: session.user.id,
      },
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
    });

    return Response.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Error assigning reviewer:', error);
    return Response.json({ error: 'Failed to assign reviewer' }, { status: 500 });
  }
}
