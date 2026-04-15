import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { SYNC_COLORS } from '../lib/tokens';
import { supabase } from '../lib/supabaseClient';
import logoUrl from '/skatastrophe_logo.png';

const SYNC_ICON = {
  idle:    { icon: 'cloud_done', color: SYNC_COLORS.idle,    title: 'Synchronisiert' },
  synced:  { icon: 'cloud_done', color: SYNC_COLORS.synced,  title: 'Synchronisiert' },
  syncing: { icon: 'sync',       color: SYNC_COLORS.syncing, title: 'Synchronisiert…', spin: true },
  error:   { icon: 'cloud_off',  color: SYNC_COLORS.error,   title: 'Synchronisierungsfehler' },
};

const Sidebar = () => {
  const { currentRound, seating, syncStatus, refreshFromDB, tableName, getPlayerTotals } = useGame();
  const syncIcon = SYNC_ICON[syncStatus] ?? SYNC_ICON.idle;
  const totals = getPlayerTotals();

  return (
    <>
    <aside className="sidebar">
      <a href="/" style={{ display: 'block', textDecoration: 'none', cursor: 'pointer' }}>
        <img
          src={logoUrl}
          alt="SKATASTROPHE"
          style={{ width: '80%', marginBottom: '0.25rem', marginTop: '-1rem', display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
        />
        <p style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.4rem', letterSpacing: '0.12em', color: '#d0a600', marginBottom: '0.75rem', fontFamily: "'Manrope', sans-serif", textTransform: 'uppercase' }}>
          SKATASTROPHE
        </p>
      </a>
      {/* Tisch-Info-Box */}
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '0.5rem',
        padding: '0.75rem 0.875rem', marginBottom: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
      }}>
        {tableName && (
          <Link to="/statistiken" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', opacity: 0.6, color: '#fff' }}>table_bar</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{tableName}</span>
          </Link>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {seating.filter(p => p !== '-').map(p => {
              const score = totals[p] ?? 0;
              return (
                <Link key={p} to={`/analytics?player=${encodeURIComponent(p)}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', opacity: 0.6, color: '#fff' }}>person</span>
                    <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)' }}>{p}</span>
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: score >= 0 ? 'rgba(255,255,255,0.9)' : '#f87171', fontFamily: "'Manrope', sans-serif" }}>
                    {score >= 0 ? '+' : ''}{score}
                  </span>
                </Link>
              );
            })}
          </div>
        <Link to="/history" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', opacity: 0.6, color: '#fff' }}>tag</span>
          <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)' }}>
            Runde <strong style={{ color: '#fff' }}>{currentRound}</strong>
          </span>
        </Link>
      </div>
      
      <nav className="sidebar-nav">
        <NavLink to="/" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <span className="material-symbols-outlined">playing_cards</span>
          Aktuelle Runde
        </NavLink>
        <NavLink to="/history" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <span className="material-symbols-outlined">menu_book</span>
          Skatliste
        </NavLink>
        <NavLink to="/analytics" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <span className="material-symbols-outlined">leaderboard</span>
          Spielerstatistik
        </NavLink>
        <NavLink to="/statistiken" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <span className="material-symbols-outlined">insights</span>
          Tischstatistik
        </NavLink>
        <NavLink to="/players" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <span className="material-symbols-outlined">group</span>
          Einstellungen
        </NavLink>
        <NavLink to="/info" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <span className="material-symbols-outlined">menu_book</span>
          Regelwerk
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              className="material-symbols-outlined"
              title={syncIcon.title}
              style={{
                fontSize: '1.25rem',
                color: syncIcon.color,
                animation: syncIcon.spin ? 'spin 1.2s linear infinite' : 'none',
              }}
            >
              {syncIcon.icon}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
              v{__APP_VERSION__}
            </span>
            <button
              onClick={refreshFromDB}
              disabled={syncStatus === 'syncing'}
              title="Daten neu laden"
              style={{
                background: 'none', border: 'none',
                cursor: syncStatus === 'syncing' ? 'not-allowed' : 'pointer',
                color: syncStatus === 'syncing' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)',
                display: 'flex', alignItems: 'center', padding: '0',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>refresh</span>
            </button>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            title="Abmelden"
            style={{
              background: 'none', border: 'none',
              cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              fontSize: '0.8125rem', padding: '0.25rem 0.5rem',
              fontFamily: 'inherit',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>logout</span>
            Abmelden
          </button>
        </div>
      </div>
    </aside>

    {/* ── Top Bar (Mobile only) ── */}
    <header className="top-bar">
      <img src={logoUrl} alt="Skatastrophe" style={{ height: '28px', width: 'auto' }} />
      <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.1em', color: '#d0a600', fontFamily: "'Manrope', sans-serif", textTransform: 'uppercase' }}>
        Skatastrophe
      </span>
    </header>

    {/* ── Bottom Navigation (Mobile only) ── */}
    <nav className="bottom-nav" aria-label="Mobile Navigation">
      <NavLink to="/" end className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
        <span className="material-symbols-outlined">playing_cards</span>
        Runde
      </NavLink>
      <NavLink to="/history" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
        <span className="material-symbols-outlined">menu_book</span>
        Liste
      </NavLink>
      <NavLink to="/players" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
        <span className="material-symbols-outlined">group</span>
        Spieler
      </NavLink>
    </nav>
    </>
  );
};

export default Sidebar;
