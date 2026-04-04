import React from 'react';
import { NavLink } from 'react-router-dom';
import { useGame } from '../context/GameContext';

const ROLE_LABELS = {
  geber: { label: 'Geben', icon: 'style', desc: 'Kartengeber' },
  hoeren: { label: 'Hören', icon: 'hearing', desc: 'Vorhand' },
  sagen: { label: 'Sagen', icon: 'record_voice_over', desc: 'Mittelhand' },
};

const SYNC_ICON = {
  idle:    { icon: 'cloud_done', color: '#4caf50', title: 'Synchronisiert' },
  synced:  { icon: 'cloud_done', color: '#4caf50', title: 'Synchronisiert' },
  syncing: { icon: 'sync',       color: '#9e9e9e', title: 'Synchronisiert…', spin: true },
  error:   { icon: 'cloud_off',  color: '#f44336', title: 'Synchronisierungsfehler' },
};

const Sidebar = () => {
  const { currentRound, currentRoles, seating, syncStatus, refreshFromDB } = useGame();
  const syncIcon = SYNC_ICON[syncStatus] ?? SYNC_ICON.idle;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Tisch</h2>
        <p>Runde {currentRound}</p>
      </div>

      {/* Geben-Hören-Sagen Anzeige */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '0.375rem',
        margin: '0 0 1.5rem 0', padding: '0.875rem',
        backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '0.5rem',
      }}>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, marginBottom: '0.25rem' }}>
          Tischordnung
        </span>
        {['geber', 'hoeren', 'sagen'].map(role => (
          <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', opacity: 0.7 }}>{ROLE_LABELS[role].icon}</span>
            <span style={{ fontWeight: 700, width: '3.5rem', color: 'rgba(255,255,255,0.6)' }}>{ROLE_LABELS[role].label}</span>
            <span style={{ fontWeight: 500 }}>{currentRoles[role]}</span>
          </div>
        ))}
        {seating.length === 4 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem', marginTop: '0.25rem', opacity: 0.5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>pause_circle</span>
            <span style={{ fontWeight: 700, width: '3.5rem' }}>Pause</span>
            <span>{currentRoles.geber}</span>
          </div>
        )}
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
          Statistiken
        </NavLink>
        <NavLink to="/players" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
          <span className="material-symbols-outlined">group</span>
          Tischeinstellungen
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
