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
    });

    if (!crRequest) {
      return Response.json({ error: 'CR request not found' }, { status: 404 });
    }

    // Only the requester can cancel
    if (crRequest.requesterId !== session.user.id) {
      return Response.json(
        { error: 'Only the requester can cancel a CR request' },
        { status: 403 }
      );
    }

    if (crRequest.status === 'CANCELLED') {
      return Response.json({ error: 'CR request is already cancelled' }, { status: 400 });
    }

    if (crRequest.status === 'COMPLETED') {
      return Response.json({ error: 'Cannot cancel a completed CR request' }, { status: 400 });
    }

    const updatedCR = await prisma.cRRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return Response.json(updatedCR);
  } catch (error) {
    console.error('Error cancelling CR request:', error);
    return Response.json({ error: 'Failed to cancel CR request' }, { status: 500 });
  }
}
