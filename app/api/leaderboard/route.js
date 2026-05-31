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
      return Response.json({ error: 'You must be in a team to view the leaderboard' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'week';

    // Calculate the start date based on the period
    const now = new Date();
    let startDate;
    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // Default to week
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
    }

    // Get all team members
    const teamMembers = await prisma.user.findMany({
      where: { teamId: user.teamId },
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
      },
    });

    // Get completed assignments for each member in the time period
    const leaderboard = await Promise.all(
      teamMembers.map(async (member) => {
        const completedReviews = await prisma.cRAssignment.count({
          where: {
            reviewerId: member.id,
            status: 'COMPLETED',
            completedAt: {
              gte: startDate,
            },
            crRequest: {
              teamId: user.teamId,
            },
          },
        });

        const requestedCRs = await prisma.cRRequest.count({
          where: {
            requesterId: member.id,
            teamId: user.teamId,
            createdAt: {
              gte: startDate,
            },
          },
        });

        return {
          user: member,
          completedReviews,
          requestedCRs,
        };
      })
    );

    // Sort by completed reviews (descending)
    leaderboard.sort((a, b) => b.completedReviews - a.completedReviews);

    return Response.json({
      period,
      startDate: startDate.toISOString(),
      leaderboard,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return Response.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
