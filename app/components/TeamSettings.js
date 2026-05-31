'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { useToast } from './ToastProvider';
import styles from './TeamSettings.module.css';

export default function TeamSettings({ teamId, onClose }) {
  const [team, setTeam] = useState(null);
  const [repos, setRepos] = useState([]);
  const [members, setMembers] = useState([]);
  const [newRepo, setNewRepo] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingRepo, setAddingRepo] = useState(false);
  const [removingRepo, setRemovingRepo] = useState(null);
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  async function loadTeamData() {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/teams/${teamId}`);
      setTeam(data.team || data);
      setMembers(data.team?.members || data.members || []);
      // Load repos
      try {
        const repoData = await apiFetch(`/api/teams/${teamId}/repos`);
        setRepos(repoData.repos || repoData || []);
      } catch {
        setRepos([]);
      }
    } catch {
      addToast('Failed to load team data', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRepo(e) {
    e.preventDefault();
    if (!newRepo.trim()) return;
    setAddingRepo(true);
    try {
      await apiFetch(`/api/teams/${teamId}/repos`, {
        method: 'POST',
        body: JSON.stringify({ repoFullName: newRepo.trim() }),
      });
      addToast('Repository added!', 'success');
      setNewRepo('');
      loadTeamData();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setAddingRepo(false);
    }
  }

  async function handleRemoveRepo(repoId, repoFullName) {
    setRemovingRepo(repoId);
    try {
      await apiFetch(`/api/teams/${teamId}/repos`, {
        method: 'DELETE',
        body: JSON.stringify({ repoId, repoFullName }),
      });
      addToast('Repository removed', 'info');
      loadTeamData();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setRemovingRepo(null);
    }
  }

  function handleCopyInviteCode() {
    const code = team?.inviteCode || team?.invite_code;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      addToast('Invite code copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-card" style={{ height: 100 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Team settings" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h2>⚙️ Team Settings</h2>
          <button id="close-settings" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Team Info */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Team Information</h4>
          <div className={styles.infoGrid}>
            <div className={styles.infoField}>
              <span className={styles.infoLabel}>Name</span>
              <span className={styles.infoValue}>{team?.name || 'Unnamed'}</span>
            </div>
            <div className={styles.infoField}>
              <span className={styles.infoLabel}>Members</span>
              <span className={styles.infoValue}>{members.length}</span>
            </div>
          </div>
          {team?.description && (
            <div className={styles.infoField} style={{ marginTop: '0.75rem' }}>
              <span className={styles.infoLabel}>Description</span>
              <span className={styles.infoValue}>{team.description}</span>
            </div>
          )}
        </div>

        <hr className="divider" />

        {/* Invite Code */}
        {(team?.inviteCode || team?.invite_code) && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Invite Code</h4>
            <div className={styles.inviteCode}>
              <span className={styles.codeText}>{team.inviteCode || team.invite_code}</span>
              <button
                id="copy-invite-code"
                className={styles.copyBtn}
                onClick={handleCopyInviteCode}
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>
        )}

        <hr className="divider" />

        {/* Tracked Repos */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Tracked Repositories</h4>
          {repos.length > 0 ? (
            <div className={styles.repoList}>
              {repos.map((repo) => (
                <div key={repo.id} className={styles.repoItem}>
                  <span className={styles.repoName}>
                    📁 {repo.repoFullName}
                  </span>
                  <button
                    id={`remove-repo-${repo.id}`}
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveRepo(repo.id)}
                    disabled={removingRepo === repo.id}
                  >
                    {removingRepo === repo.id ? '...' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyRepos}>No repositories tracked yet.</p>
          )}

          <form className={styles.addRow} onSubmit={handleAddRepo}>
            <input
              id="add-repo-input"
              className="input"
              type="text"
              placeholder="owner/repo"
              value={newRepo}
              onChange={(e) => setNewRepo(e.target.value)}
            />
            <button
              id="add-repo-btn"
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={addingRepo || !newRepo.trim()}
            >
              {addingRepo ? 'Adding...' : 'Add'}
            </button>
          </form>
        </div>

        <hr className="divider" />

        {/* Members */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Members</h4>
          <div className={styles.memberList}>
            {members.map((member) => {
              const user = member.user || member;
              return (
                <div key={user.id || user.email} className={styles.memberItem}>
                  {user.image ? (
                    <img src={user.image} alt={user.name || 'Member'} className="avatar" />
                  ) : (
                    <div className="avatar" style={{ background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#fff' }}>
                      {(user.name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className={styles.memberInfo}>
                    <div className={styles.memberName}>{user.name || 'Anonymous'}</div>
                    <div className={styles.memberEmail}>{user.email || ''}</div>
                  </div>
                  {member.role === 'OWNER' && (
                    <span className={styles.memberRole}>Owner</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
