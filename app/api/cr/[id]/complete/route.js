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

    // Find the assignment for this reviewer
    const assignment = await prisma.cRAssignment.findUnique({
      where: {
        crRequestId_reviewerId: {
          crRequestId: id,
          reviewerId: session.user.id,
        },
      },
    });

    if (!assignment) {
      return Response.json(
        { error: 'You are not assigned to this CR request' },
        { status: 404 }
      );
    }

    if (assignment.status === 'COMPLETED') {
      return Response.json(
        { error: 'You have already completed this review' },
        { status: 400 }
      );
    }

    // Mark assignment as completed
    const updatedAssignment = await prisma.cRAssignment.update({
      where: { id: assignment.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Check if all required reviewers have completed
    const completedCount = await prisma.cRAssignment.count({
      where: {
        crRequestId: id,
        status: 'COMPLETED',
      },
    });

    let updatedCR = crRequest;
    if (completedCount >= crRequest.requiredReviewers) {
      updatedCR = await prisma.cRRequest.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });
    }

    return Response.json({
      assignment: updatedAssignment,
      crRequest: updatedCR,
      allReviewsComplete: completedCount >= crRequest.requiredReviewers,
    });
  } catch (error) {
    console.error('Error completing review:', error);
    return Response.json({ error: 'Failed to complete review' }, { status: 500 });
  }
}
