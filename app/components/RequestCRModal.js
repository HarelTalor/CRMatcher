'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { useToast } from './ToastProvider';
import styles from './RequestCRModal.module.css';

export default function RequestCRModal({ teamId, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [repos, setRepos] = useState([]);
  const [prs, setPrs] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedPR, setSelectedPR] = useState(null);
  const [requiredReviewers, setRequiredReviewers] = useState(2);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingPRs, setLoadingPRs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  // Load tracked repos for team
  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch(`/api/teams/${teamId}/repos`);
        setRepos(data.repos || data || []);
      } catch {
        // Fallback: load user's GitHub repos
        try {
          const data = await apiFetch('/api/github/repos');
          setRepos(data.repos || data || []);
        } catch {
          setRepos([]);
        }
      } finally {
        setLoadingRepos(false);
      }
    }
    load();
  }, [teamId]);

  // Load PRs when repo is selected
  useEffect(() => {
    if (!selectedRepo) {
      setPrs([]);
      return;
    }

    async function loadPRs() {
      setLoadingPRs(true);
      try {
        const data = await apiFetch(`/api/github/prs?repo=${encodeURIComponent(selectedRepo)}`);
        setPrs(data.prs || data || []);
      } catch {
        setPrs([]);
        addToast('Failed to load pull requests', 'error');
      } finally {
        setLoadingPRs(false);
      }
    }
    loadPRs();
  }, [selectedRepo, addToast]);

  function handleRepoSelect(e) {
    setSelectedRepo(e.target.value);
    setSelectedPR(null);
    if (e.target.value) {
      setStep(2);
    }
  }

  function handlePRSelect(pr) {
    setSelectedPR(pr);
    setStep(3);
  }

  async function handleSubmit() {
    if (!selectedPR) return;
    setSubmitting(true);
    try {
      await apiFetch('/api/cr', {
        method: 'POST',
        body: JSON.stringify({
          teamId,
          repoFullName: selectedRepo,
          prNumber: selectedPR.number,
          prTitle: selectedPR.title,
          prUrl: selectedPR.html_url || selectedPR.url,
          additions: selectedPR.additions || 0,
          deletions: selectedPR.deletions || 0,
          requiredReviewers,
        }),
      });
      addToast('CR request created!', 'success');
      onCreated?.();
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Request code review">
        <div className="modal-header">
          <h2>Request Code Review</h2>
          <button id="close-request-modal" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Step Indicator */}
        <div className={styles.steps}>
          <div className={`${styles.step} ${step >= 1 ? styles.stepActive : ''} ${step > 1 ? styles.stepComplete : ''}`}>
            <span className={styles.stepNumber}>{step > 1 ? '✓' : '1'}</span>
            Repository
          </div>
          <div className={styles.stepDivider} />
          <div className={`${styles.step} ${step >= 2 ? styles.stepActive : ''} ${step > 2 ? styles.stepComplete : ''}`}>
            <span className={styles.stepNumber}>{step > 2 ? '✓' : '2'}</span>
            Pull Request
          </div>
          <div className={styles.stepDivider} />
          <div className={`${styles.step} ${step >= 3 ? styles.stepActive : ''}`}>
            <span className={styles.stepNumber}>3</span>
            Reviewers
          </div>
        </div>

        {/* Step 1: Select Repo */}
        <div className="form-group">
          <label htmlFor="select-repo" className="form-label">Repository</label>
          {loadingRepos ? (
            <div className="skeleton" style={{ height: 42, borderRadius: 10 }} />
          ) : (
          <select
              id="select-repo"
              className="select"
              value={selectedRepo}
              onChange={handleRepoSelect}
            >
              <option value="">Select a repository...</option>
              {repos.map((repo) => {
                const name = repo.repoFullName || repo.full_name || repo.fullName || repo;
                return (
                  <option key={name} value={name}>
                    {name}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        {/* Step 2: Select PR */}
        {selectedRepo && (
          <>
            <label className="form-label" style={{ marginTop: '1rem' }}>Pull Request</label>
            {loadingPRs ? (
              <div className={styles.loadingPR}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />
                ))}
              </div>
            ) : prs.length === 0 ? (
              <div className={styles.emptyPR}>
                <span>📭</span>
                <p>No open pull requests found in this repository.</p>
              </div>
            ) : (
              <div className={styles.prList}>
                {prs.map((pr) => (
                  <div
                    key={pr.number || pr.id}
                    id={`pr-${pr.number || pr.id}`}
                    className={`${styles.prCard} ${selectedPR?.number === pr.number ? styles.prCardSelected : ''}`}
                    onClick={() => handlePRSelect(pr)}
                    role="radio"
                    aria-checked={selectedPR?.number === pr.number}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePRSelect(pr); }}
                  >
                    <div className={styles.prRadio} />
                    <div className={styles.prInfo}>
                      <div className={styles.prTitle}>#{pr.number} {pr.title}</div>
                      <div className={styles.prMeta}>
                        by {pr.user?.login || 'unknown'} · {pr.changed_files || 0} files ·
                        <span style={{ color: 'var(--color-addition)' }}> +{pr.additions || 0}</span>
                        <span style={{ color: 'var(--color-deletion)' }}> -{pr.deletions || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Step 3: Reviewer count */}
        {selectedPR && (
          <div className={styles.reviewerCount}>
            <label className="form-label">Required Reviewers</label>
            <div className={styles.countControl}>
              <button
                id="reviewer-decrement"
                className={styles.countBtn}
                onClick={() => setRequiredReviewers(Math.max(1, requiredReviewers - 1))}
                disabled={requiredReviewers <= 1}
                aria-label="Decrease reviewer count"
              >
                −
              </button>
              <span className={styles.countValue}>{requiredReviewers}</span>
              <button
                id="reviewer-increment"
                className={styles.countBtn}
                onClick={() => setRequiredReviewers(Math.min(5, requiredReviewers + 1))}
                disabled={requiredReviewers >= 5}
                aria-label="Increase reviewer count"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.modalActions}>
          <button id="cancel-request" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            id="submit-request"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!selectedPR || submitting}
          >
            {submitting ? 'Creating...' : 'Request Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
