/**
 * PlayerSelector — Auswahl des Alleinspielers.
 * Wird bei gameType 'passed' deaktiviert.
 */
export default function PlayerSelector({ players, activePlayer, onSelect, playerLevels, disabled }) {
  return (
    <section className="form-section">
      <label className="section-label">Wer ist der Alleinspieler?</label>
      <div
        className="player-grid"
        style={{ opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
      >
        {players.map(name => {
          const lv = playerLevels?.[name];
          const isActive = activePlayer === name;
          return (
            <button
              key={name}
              onClick={() => onSelect(name)}
              className={`player-card ${isActive ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>person</span>
              <span style={{ fontWeight: 700 }}>{name}</span>
              {lv && (
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600, marginTop: '0.2rem',
                  color: isActive ? 'rgba(255,255,255,0.85)' : 'var(--outline)',
                }}>
                  {lv.emoji} {lv.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
