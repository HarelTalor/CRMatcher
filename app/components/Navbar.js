'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useTheme } from './ThemeProvider';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const pathname = usePathname();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className={styles.navbar} role="navigation" aria-label="Main navigation">
      <Link href="/" className={styles.brand} id="nav-brand">
        <span className={styles.brandIcon} aria-hidden="true">CR</span>
        <span>CR Matcher</span>
      </Link>

      {session && (
        <div className={styles.navLinks}>
          <Link
            href="/dashboard"
            id="nav-dashboard"
            className={`${styles.navLink} ${pathname === '/dashboard' ? styles.navLinkActive : ''}`}
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard?tab=leaderboard"
            id="nav-leaderboard"
            className={`${styles.navLink} ${pathname === '/dashboard' && typeof window !== 'undefined' && window.location.search.includes('leaderboard') ? styles.navLinkActive : ''}`}
          >
            Leaderboard
          </Link>
        </div>
      )}

      <div className={styles.navRight}>
        <button
          id="theme-toggle"
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {session ? (
          <div className={styles.userSection} ref={dropdownRef}>
            <button
              id="user-menu-toggle"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer' }}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User avatar'}
                  className="avatar avatar-sm"
                />
              ) : (
                <div className="avatar avatar-sm" style={{ background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#fff' }}>
                  {(session.user?.name || 'U')[0].toUpperCase()}
                </div>
              )}
              <span className={styles.userName}>{session.user?.name}</span>
            </button>

            {dropdownOpen && (
              <div className={styles.dropdown} role="menu">
                <button
                  id="menu-sign-out"
                  className={`${styles.dropdownItem} ${styles.dropdownDanger}`}
                  onClick={() => signOut()}
                  role="menuitem"
                >
                  🚪 Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            id="sign-in-nav"
            className={styles.signInBtn}
            onClick={() => signIn('github')}
          >
            Sign in with GitHub
          </button>
        )}
      </div>
    </nav>
  );
}
