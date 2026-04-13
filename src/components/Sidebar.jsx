import React from 'react';
import { NavLink } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { SYNC_COLORS } from '../lib/tokens';

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
    <aside className="sidebar">
      <img
        src="/skatastrophe_logo_3.png"
        alt="Skatastrophe"
        style={{ width: '80%', marginBottom: '0.25rem', marginTop: '-1rem', display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
      />
      <p style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.4rem', letterSpacing: '0.12em', color: '#d0a600', marginBottom: '0.75rem', fontFamily: "'Manrope', sans-serif", textTransform: 'uppercase' }}>
        Skatastrophe
      </p>
      {/* Tisch-Info-Box */}
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '0.5rem',
        padding: '0.75rem 0.875rem', marginBottom: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
      }}>
        {tableName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', opacity: 0.6 }}>table_bar</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{tableName}</span>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {seating.filter(p => p !== '-').map(p => {
              const score = totals[p] ?? 0;
              return (
                <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', opacity: 0.6 }}>person</span>
                    <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)' }}>{p}</span>
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: score >= 0 ? 'rgba(255,255,255,0.9)' : '#f87171', fontFamily: "'Manrope', sans-serif" }}>
                    {score >= 0 ? '+' : ''}{score}
                  </span>
                </div>
              );
            })}
          </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', opacity: 0.6 }}>tag</span>
          <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)' }}>
            Runde <strong style={{ color: '#fff' }}>{currentRound}</strong>
          </span>
        </div>
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
          <button
            onClick={refreshFromDB}
            disabled={syncStatus === 'syncing'}
            title="Daten aus Datenbank laden"
            style={{
              background: 'none',
              border: 'none',
              cursor: syncStatus === 'syncing' ? 'not-allowed' : 'pointer',
              color: syncStatus === 'syncing' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.8125rem',
              padding: '0.25rem 0.5rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>refresh</span>
            Aktualisieren
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
