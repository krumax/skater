import React, { useState } from 'react';
import { useGame } from '../context/GameContext';

const PlayerSettings = () => {
  const { players, addPlayer, removePlayer, renamePlayer, rounds } = useGame();
  const [newName, setNewName] = useState('');
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (trimmed && !players.includes(trimmed)) {
      addPlayer(trimmed);
      setNewName('');
    }
  };

  const handleRename = (oldName) => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== oldName && !players.includes(trimmed)) {
      renamePlayer(oldName, trimmed);
    }
    setEditingPlayer(null);
    setEditName('');
  };

  const handleRemove = (name) => {
    const hasRounds = rounds.some(r => r.player === name);
    if (hasRounds) {
      if (!window.confirm(`„${name}" hat bereits Runden gespielt. Der Verlauf bleibt erhalten, aber der Spieler wird nicht mehr in künftigen Runden angezeigt. Fortfahren?`)) {
        return;
      }
    }
    removePlayer(name);
  };

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Tischeinstellungen</h1>
        <p className="page-subtitle">Spieler am Tisch verwalten.</p>
      </header>

      <div style={{ maxWidth: '600px' }}>
        <section className="form-section">
          <label className="section-label">Neuen Spieler hinzufügen</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Spielername eingeben…"
              style={{ flex: 1, backgroundColor: 'var(--surface-high)', border: '1px solid transparent', borderRadius: '0.5rem', padding: '1rem 1.25rem', fontFamily: 'inherit', fontSize: '1rem', color: 'var(--on-surface)', transition: 'all 0.2s ease' }} />
            <button className="btn-primary" onClick={handleAdd} style={{ padding: '1rem 2rem' }}>
              <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}>person_add</span>
              Hinzufügen
            </button>
          </div>
        </section>

        <section className="form-section" style={{ marginTop: '2rem' }}>
          <label className="section-label">Sitzordnung ({players.length} Spieler)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {players.map((name, idx) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', backgroundColor: idx % 2 === 0 ? 'var(--surface-low)' : 'var(--bg)', borderRadius: '0.75rem', transition: 'all 0.2s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', backgroundColor: 'var(--primary-container)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontFamily: "'Manrope', sans-serif", fontSize: '1.125rem' }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  {editingPlayer === name ? (
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(name); if (e.key === 'Escape') { setEditingPlayer(null); setEditName(''); } }}
                      onBlur={() => handleRename(name)} autoFocus
                      style={{ backgroundColor: 'var(--surface-highest)', border: '1px solid var(--primary)', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', fontFamily: 'inherit', fontSize: '1rem', color: 'var(--on-surface)', width: '200px' }} />
                  ) : (
                    <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>{name}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => { setEditingPlayer(name); setEditName(name); }} title="Umbenennen"
                    style={{ padding: '0.5rem', borderRadius: '0.375rem', color: 'var(--outline)', transition: 'all 0.2s ease' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>edit</span>
                  </button>
                  <button onClick={() => handleRemove(name)} title="Entfernen" disabled={players.length <= 3}
                    style={{ padding: '0.5rem', borderRadius: '0.375rem', color: players.length <= 3 ? 'var(--outline-variant)' : 'var(--secondary)', transition: 'all 0.2s ease', cursor: players.length <= 3 ? 'not-allowed' : 'pointer' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>person_remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          {players.length >= 4 && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--outline)' }}>Maximal 4 Spieler am Tisch erlaubt.</p>
          )}
          {players.length <= 3 && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--outline)' }}>Mindestens 3 Spieler erforderlich.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default PlayerSettings;
