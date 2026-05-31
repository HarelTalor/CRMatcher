'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch } from '../lib/api';
import { useToast } from './ToastProvider';
import styles from './CRBoard.module.css';

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CRBoard({ teamId }) {
  const { data: session } = useSession();
  const [crs, setCrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRepo, setFilterRepo] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [actionLoading, setActionLoading] = useState(null);
  const { addToast } = useToast();

  const loadCRs = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/cr?status=OPEN&teamId=${teamId}`);
      setCrs(data.crs || data || []);
    } catch {
      setCrs([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadCRs();
  }, [loadCRs]);

  async function handleTakeCR(crId) {
    setActionLoading(crId);
    try {
      await apiFetch(`/api/cr/${crId}/assign`, { method: 'POST' });
      addToast('You\'ve been assigned to this CR!', 'success');
      loadCRs();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCompleteCR(crId) {
    setActionLoading(crId);
    try {
      await apiFetch(`/api/cr/${crId}/complete`, { method: 'POST' });
      addToast('CR marked as completed!', 'success');
      loadCRs();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancelCR(crId) {
    setActionLoading(crId);
    try {
      await apiFetch(`/api/cr/${crId}/cancel`, { method: 'POST' });
      addToast('CR request cancelled', 'info');
      loadCRs();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  // Get unique repos for filter
  const repos = [...new Set(crs.map((cr) => cr.repoFullName || cr.repo).filter(Boolean))];

  // Filter & sort
  let filtered = crs;
  if (filterRepo !== 'all') {
    filtered = filtered.filter((cr) => (cr.repoFullName || cr.repo) === filterRepo);
  }

  if (sortBy === 'newest') {
    filtered = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortBy === 'oldest') {
    filtered = [...filtered].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (sortBy === 'size') {
    filtered = [...filtered].sort((a, b) => ((b.additions || 0) + (b.deletions || 0)) - ((a.additions || 0) + (a.deletions || 0)));
  }

  const currentUserId = session?.user?.id;
  const currentUserEmail = session?.user?.email;

  function isAssigned(cr) {
    const assignments = cr.assignments || cr.reviewers || [];
    return assignments.some(
      (a) => a.reviewerId === currentUserId || a.reviewer?.id === currentUserId
    );
  }

  function isRequester(cr) {
    return cr.requesterId === currentUserId;
  }

  if (loading) {
    return (
      <div>
        <div className={styles.boardHeader}>
          <div className="skeleton skeleton-title" style={{ width: 200 }} />
        </div>
        <div className={styles.skeletonGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`skeleton ${styles.skeletonCard}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section aria-label="Code review board">
      <div className={styles.boardHeader}>
        <h3 className={styles.boardTitle}>
          Open Reviews
          <span className={styles.countBadge}>{filtered.length}</span>
        </h3>
        <div className={styles.filters}>
          <select
            id="filter-repo"
            className={styles.filterSelect}
            value={filterRepo}
            onChange={(e) => setFilterRepo(e.target.value)}
            aria-label="Filter by repository"
          >
            <option value="all">All Repos</option>
            {repos.map((repo) => (
              <option key={repo} value={repo}>{repo}</option>
            ))}
          </select>
          <select
            id="sort-by"
            className={styles.filterSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort by"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="size">Largest First</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎉</div>
          <h3>All caught up!</h3>
          <p>No open code reviews right now. Enjoy the peace, or request a new review.</p>
        </div>
      ) : (
        <div className={styles.crGrid}>
          {filtered.map((cr) => (
            <article key={cr.id} className={styles.crCard}>
              <div className={styles.crCardHeader}>
                {cr.requester?.avatarUrl && (
                  <img
                    src={cr.requester.avatarUrl}
                    alt={cr.requester.name || 'Requester'}
                    className="avatar"
                  />
                )}
                <div className={styles.crCardTitle}>
                  <h4 title={cr.prTitle}>
                    <a href={cr.prUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                      {cr.prTitle}
                    </a>
                  </h4>
                  <div className={styles.repoName}>
                    📁 {cr.repoFullName}
                  </div>
                </div>
              </div>

              <div className={styles.crMeta}>
                <div className={styles.diffStats}>
                  <span className={styles.additions}>+{cr.additions || 0}</span>
                  <span className={styles.deletions}>-{cr.deletions || 0}</span>
                </div>
                <div className={styles.reviewerInfo}>
                  👤 {(cr.assignments || []).length}/{cr.requiredReviewers || 1} reviewers
                </div>
                <span className={styles.timeAgo}>{timeAgo(cr.createdAt)}</span>
              </div>

              <div className={styles.crCardFooter}>
                <div className={styles.requester}>
                  Requested by <strong>{cr.requester?.name || 'Unknown'}</strong>
                </div>
                <div className={styles.cardActions}>
                  {isRequester(cr) && (
                    <button
                      id={`cancel-cr-${cr.id}`}
                      className="btn btn-danger btn-sm"
                      onClick={() => handleCancelCR(cr.id)}
                      disabled={actionLoading === cr.id}
                    >
                      Cancel
                    </button>
                  )}
                  {isAssigned(cr) ? (
                    <button
                      id={`complete-cr-${cr.id}`}
                      className="btn btn-primary btn-sm"
                      onClick={() => handleCompleteCR(cr.id)}
                      disabled={actionLoading === cr.id}
                    >
                      {actionLoading === cr.id ? '...' : '✓ Complete'}
                    </button>
                  ) : !isRequester(cr) && (cr.assignments || []).length < cr.requiredReviewers && (
                    <button
                      id={`take-cr-${cr.id}`}
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleTakeCR(cr.id)}
                      disabled={actionLoading === cr.id}
                    >
                      {actionLoading === cr.id ? '...' : 'Take CR'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
