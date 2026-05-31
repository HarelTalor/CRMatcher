'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import styles from './Leaderboard.module.css';

export default function Leaderboard({ teamId }) {
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await apiFetch(`/api/leaderboard?teamId=${teamId}&period=${period}`);
        setData(result.leaderboard || result || []);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [teamId, period]);

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  // Re-order for podium display: 2nd, 1st, 3rd
  const podiumOrder = top3.length >= 2
    ? [top3[1], top3[0], top3[2]].filter(Boolean)
    : top3;

  const podiumClasses = ['silver', 'gold', 'bronze'];

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className="skeleton" style={{ height: 36, width: 260, borderRadius: 10, marginBottom: '1.5rem' }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div className="skeleton skeleton-avatar" style={{ width: 60, height: 60 }} />
              <div className="skeleton skeleton-text" style={{ width: 80 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.periodSelector}>
        {[
          { value: 'week', label: 'This Week' },
          { value: 'month', label: 'This Month' },
          { value: 'all', label: 'All Time' },
        ].map((p) => (
          <button
            key={p.value}
            id={`period-${p.value}`}
            className={`${styles.periodBtn} ${period === p.value ? styles.periodBtnActive : ''}`}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <div className={styles.emptyState}>
          <span>🏆</span>
          <p>No reviews completed yet. Be the first!</p>
        </div>
      ) : (
        <>
          {/* Podium for top 3 */}
          {top3.length > 0 && (
            <div className={styles.podium}>
              {podiumOrder.map((user, idx) => (
                <div key={user.userId || user.id || idx} className={`${styles.podiumSlot} ${styles[podiumClasses[idx]]}`}>
                  <div className={styles.podiumAvatar}>
                    {user.image || user.user?.image ? (
                      <img
                        src={user.image || user.user?.image}
                        alt={user.name || user.user?.name || 'User'}
                        className="avatar"
                      />
                    ) : (
                      <div className={styles.podiumAvatarFallback}>
                        {(user.name || user.user?.name || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <span className={styles.podiumRank}>
                      {podiumClasses[idx] === 'gold' ? '1' : podiumClasses[idx] === 'silver' ? '2' : '3'}
                    </span>
                  </div>
                  <span className={styles.podiumName}>{user.name || user.user?.name || 'Anonymous'}</span>
                  <span className={styles.podiumCount}>{user.count || user.completedCount || 0}</span>
                  <span className={styles.podiumLabel}>reviews</span>
                </div>
              ))}
            </div>
          )}

          {/* Table for the rest */}
          {rest.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Member</th>
                  <th>Reviews</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((user, idx) => (
                  <tr key={user.userId || user.id || idx}>
                    <td className={styles.rankCell}>#{idx + 4}</td>
                    <td>
                      <div className={styles.userCell}>
                        {(user.image || user.user?.image) ? (
                          <img
                            src={user.image || user.user?.image}
                            alt=""
                            className="avatar avatar-sm"
                          />
                        ) : (
                          <div className="avatar avatar-sm" style={{ background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff' }}>
                            {(user.name || user.user?.name || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <strong>{user.name || user.user?.name || 'Anonymous'}</strong>
                      </div>
                    </td>
                    <td className={styles.countCell}>{user.count || user.completedCount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
