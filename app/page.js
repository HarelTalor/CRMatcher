'use client';

import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import styles from './page.module.css';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  if (status === 'loading') {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.landing}>
      {/* Animated background */}
      <div className={styles.bgOrbs}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
      </div>

      <main className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <span>✨</span> Built for GitHub Teams
          </div>

          <h1 className={styles.title}>
            <span className="text-gradient">CR Matcher</span>
          </h1>

          <p className={styles.subtitle}>
            Streamline code reviews with your team. Assign, track, and complete
            reviews — all in one beautiful dashboard.
          </p>

          <button
            id="sign-in-hero"
            className={styles.ctaButton}
            onClick={() => signIn('github')}
          >
            <svg className={styles.githubIcon} viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Sign in with GitHub
          </button>
        </div>

        <div className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>👥</div>
            <h3>Team Organization</h3>
            <p>Create teams, invite members, and track repositories. Everyone stays in sync.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🔗</div>
            <h3>GitHub Integration</h3>
            <p>Auto-fetch PRs, track additions and deletions, and link directly to GitHub.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Review Tracking</h3>
            <p>See who&apos;s reviewing what, leaderboard stats, and never miss a code review.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
