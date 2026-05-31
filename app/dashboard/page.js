'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import { useToast } from '../components/ToastProvider';
import TeamSelector from '../components/TeamSelector';
import CRBoard from '../components/CRBoard';
import Leaderboard from '../components/Leaderboard';
import RequestCRModal from '../components/RequestCRModal';
import TeamSettings from '../components/TeamSettings';
import styles from './page.module.css';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('board');
  const [stats, setStats] = useState({ openCRs: 0, myPending: 0, completedWeek: 0 });
  const { addToast } = useToast();

  const loadUserData = useCallback(async () => {
    try {
      const userData = await apiFetch('/api/user');
      const u = userData.user || userData;
      setUser(u);

      if (u.teamId) {
        const teamData = await apiFetch(`/api/teams/${u.teamId}`);
        const t = teamData.team || teamData;
        setTeam(t);

        // Load stats
        try {
          const crData = await apiFetch(`/api/cr?status=OPEN&teamId=${u.teamId}`);
          const crs = crData.crs || crData || [];
          const myPending = crs.filter(cr =>
            cr.assignments?.some(a => a.reviewerId === u.id && a.status === 'ASSIGNED')
          ).length;

          setStats({
            openCRs: crs.length,
            myPending,
            completedWeek: t.completedThisWeek || 0,
          });
        } catch {
          // Stats not critical
        }
      }
    } catch {
      // User not found yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    if (status === 'authenticated') {
      loadUserData();
    }
  }, [status, router, loadUserData]);

  function handleTeamJoined() {
    setLoading(true);
    loadUserData();
  }

  function handleCRCreated() {
    loadUserData();
  }

  if (status === 'loading' || loading) {
    return (
      <div className={styles.dashboard}>
        <div className="container">
          <div className={styles.loadingState}>
            <div className="skeleton skeleton-title" style={{ width: 300, marginBottom: '1rem' }} />
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: 100, flex: 1, borderRadius: 14 }} />
              ))}
            </div>
            <div className="skeleton" style={{ height: 400, borderRadius: 14 }} />
          </div>
        </div>
      </div>
    );
  }

  // No team yet → show team selector
  if (!user?.teamId || !team) {
    return (
      <div className={styles.dashboard}>
        <div className="container">
          <TeamSelector onTeamJoined={handleTeamJoined} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className="container">
        {/* Team header */}
        <div className={styles.teamHeader}>
          <div className={styles.teamInfo}>
            <h1>{team.name}</h1>
            {team.description && <p className="text-muted">{team.description}</p>}
          </div>
          <button
            id="team-settings-btn"
            className="btn btn-ghost"
            onClick={() => setShowSettings(true)}
            title="Team Settings"
          >
            ⚙️ Settings
          </button>
        </div>

        {/* Stats row */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.openCRs}</div>
            <div className={styles.statLabel}>Open Reviews</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.myPending}</div>
            <div className={styles.statLabel}>My Pending</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.completedWeek}</div>
            <div className={styles.statLabel}>Completed This Week</div>
          </div>
        </div>

        {/* Tab switch */}
        <div className={styles.tabs}>
          <button
            id="tab-board"
            className={`${styles.tab} ${activeTab === 'board' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('board')}
          >
            📋 Review Board
          </button>
          <button
            id="tab-leaderboard"
            className={`${styles.tab} ${activeTab === 'leaderboard' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            🏆 Leaderboard
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {activeTab === 'board' ? (
            <CRBoard teamId={team.id} />
          ) : (
            <Leaderboard teamId={team.id} />
          )}
        </div>

        {/* Floating action button */}
        <button
          id="request-cr-fab"
          className={styles.fab}
          onClick={() => setShowRequestModal(true)}
          title="Request Code Review"
          aria-label="Request a new code review"
        >
          <span>+</span>
        </button>

        {/* Modals */}
        {showRequestModal && (
          <RequestCRModal
            teamId={team.id}
            onClose={() => setShowRequestModal(false)}
            onCreated={handleCRCreated}
          />
        )}

        {showSettings && (
          <TeamSettings
            teamId={team.id}
            onClose={() => {
              setShowSettings(false);
              loadUserData();
            }}
          />
        )}
      </div>
    </div>
  );
}
