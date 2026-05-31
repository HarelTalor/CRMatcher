import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import prisma from './prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'github') {
        try {
          await prisma.user.upsert({
            where: { githubId: profile.id },
            update: {
              username: profile.login,
              name: profile.name || profile.login,
              email: profile.email,
              avatarUrl: profile.avatar_url,
              accessToken: account.access_token,
            },
            create: {
              githubId: profile.id,
              username: profile.login,
              name: profile.name || profile.login,
              email: profile.email,
              avatarUrl: profile.avatar_url,
              accessToken: account.access_token,
            },
          });
        } catch (error) {
          console.error('Error upserting user:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === 'github' && profile) {
        const dbUser = await prisma.user.findUnique({
          where: { githubId: profile.id },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.teamId = dbUser.teamId;
          token.accessToken = account.access_token;
          token.githubId = profile.id;
          token.username = profile.login;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId;
        session.user.teamId = token.teamId;
        session.user.accessToken = token.accessToken;
        session.user.githubId = token.githubId;
        session.user.username = token.username;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.AUTH_SECRET,
});
