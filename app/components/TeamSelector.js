'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { useToast } from './ToastProvider';
import styles from './TeamSelector.module.css';

export default function TeamSelector({ onTeamJoined }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
    try {
      const data = await apiFetch('/api/teams');
      setTeams(data.teams || data || []);
    } catch {
      // Teams endpoint may not exist yet
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(teamId) {
    setJoining(teamId);
    try {
      await apiFetch(`/api/teams/${teamId}/join`, { method: 'POST' });
      addToast('Successfully joined the team!', 'success');
      onTeamJoined?.();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setJoining(null);
    }
  }

  async function handleJoinByCode() {
    if (!inviteCode.trim()) return;
    try {
      // Try to find and join by invite code
      await apiFetch(`/api/teams/join`, {
        method: 'POST',
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      addToast('Successfully joined the team!', 'success');
      onTeamJoined?.();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await apiFetch('/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      addToast('Team created successfully!', 'success');
      onTeamJoined?.();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>Welcome to CR Matcher</h1>
        <p>Join an existing team or create a new one to get started.</p>
      </header>

      <div className={styles.sections}>
        {/* Join by invite code */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🔑</span>
            Join with Invite Code
          </h3>
          <div className={styles.inviteRow}>
            <input
              id="invite-code-input"
              className="input"
              type="text"
              placeholder="Enter invite code..."
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            <button
              id="join-by-code-btn"
              className="btn btn-primary"
              onClick={handleJoinByCode}
              disabled={!inviteCode.trim()}
            >
              Join
            </button>
          </div>
        </section>

        {/* Join existing */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>👥</span>
            Join a Team
          </h3>

          {loading ? (
            <div className={styles.teamList}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton skeleton-card" style={{ height: 72 }} />
              ))}
            </div>
          ) : teams.length > 0 ? (
            <div className={styles.teamList}>
              {teams.map((team) => (
                <div key={team.id} className={styles.teamCard}>
                  <div className={styles.teamInfo}>
                    <h4>{team.name}</h4>
                    <span className={styles.teamMeta}>
                      {team.description || 'No description'} · {team._count?.members ?? team.memberCount ?? '?'} members
                    </span>
                  </div>
                  <button
                    id={`join-team-${team.id}`}
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleJoin(team.id)}
                    disabled={joining === team.id}
                  >
                    {joining === team.id ? 'Joining...' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🏠</div>
              <p>No teams available yet. Create one below!</p>
            </div>
          )}
        </section>

        {/* Create team */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>✨</span>
            Create a Team
          </h3>
          <form className={styles.form} onSubmit={handleCreate}>
            <div className="form-group">
              <label htmlFor="team-name" className="form-label">Team Name</label>
              <input
                id="team-name"
                className="input"
                type="text"
                placeholder="e.g., Frontend Avengers"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="team-description" className="form-label">Description</label>
              <textarea
                id="team-description"
                className="textarea"
                placeholder="What does your team work on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className={styles.formActions}>
              <button
                id="create-team-btn"
                type="submit"
                className="btn btn-primary"
                disabled={creating || !name.trim()}
              >
                {creating ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
