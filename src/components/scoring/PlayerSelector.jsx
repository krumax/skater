/**
 * PlayerSelector - Auswahl des Alleinspielers.
 * Zeigt Level, Gesamtscore und kombinierten Score je Spieler.
 */

function PlayerCardSkeleton() {
  return (
    <div className="player-card" style={{ pointerEvents: 'none', opacity: 0.5 }}>
      <span className="player-card-identity">
        {/* Name */}
        <span style={{
          display: 'block', width: '80px', height: '22px',
          background: 'var(--outline-variant)', borderRadius: '0.3rem',
        }} />
        {/* Level */}
        <span style={{
          display: 'block', width: '60px', height: '13px', marginTop: '2px',
          background: 'var(--outline-variant)', borderRadius: '0.25rem', opacity: 0.6,
        }} />
      </span>
      <span className="player-card-scores">
        <span style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem' }}>
          <span style={{ width: '24px', height: '13px', background: 'var(--outline-variant)', borderRadius: '0.25rem', display: 'block' }} />
          <span style={{ width: '48px', height: '13px', background: 'var(--outline-variant)', borderRadius: '0.25rem', display: 'block' }} />
        </span>
        <span style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', marginTop: '4px' }}>
          <span style={{ width: '32px', height: '13px', background: 'var(--outline-variant)', borderRadius: '0.25rem', display: 'block' }} />
          <span style={{ width: '48px', height: '13px', background: 'var(--outline-variant)', borderRadius: '0.25rem', display: 'block' }} />
        </span>
      </span>
    </div>
  );
}

export default function PlayerSelector({ players, activePlayer, onSelect, playerLevels, stdTotals, seegerTotals, disabled }) {
  // Bester Spieler je Wertung
  const bestStd      = players.length > 0 ? Math.max(...players.map(p => stdTotals?.[p] ?? 0))      : 0;
  const bestCombined = players.length > 0 ? Math.max(...players.map(p => (stdTotals?.[p] ?? 0) + (seegerTotals?.[p] ?? 0))) : 0;

  return (
    <section className="form-section">
      <label className="section-label">Wer ist der Alleinspieler?</label>
      <div
        className="player-grid"
        style={{ opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
      >
        {players.length === 0 ? (
          // Skeleton - 3 Platzhalter-Karten während Daten laden
          <>
            <PlayerCardSkeleton />
            <PlayerCardSkeleton />
            <PlayerCardSkeleton />
          </>
        ) : (
          players.map(name => {
            const lv       = playerLevels?.[name];
            const isActive = activePlayer === name;
            const std      = stdTotals?.[name] ?? null;
            const seeger   = seegerTotals?.[name] ?? null;
            const combined = std !== null && seeger !== null ? std + seeger : null;

            const diffStd      = std      !== null ? std      - bestStd      : null;
            const diffCombined = combined !== null ? combined - bestCombined : null;

            const scoreColor = (v) => {
              if (v === null) return isActive ? 'rgba(255,255,255,0.5)' : 'var(--outline)';
              return v >= 0
                ? (isActive ? 'rgba(255,255,255,0.9)' : 'var(--primary)')
                : (isActive ? 'rgba(255,180,180,0.9)' : 'var(--secondary)');
            };

            const fmt = (v) => v === null ? '–' : (v >= 0 ? `+${v}` : `${v}`);

            return (
              <button
                key={name}
                onClick={() => onSelect(name)}
                className={`player-card ${isActive ? 'active' : ''}`}
              >
                <span className="player-card-identity">
                  <span style={{ fontWeight: 800, fontSize: '1.25rem', fontFamily: "'Manrope', sans-serif" }}>{name}</span>
                  {lv && (
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600,
                      color: isActive ? 'rgba(255,255,255,0.85)' : 'var(--outline)',
                    }}>
                      {lv.emoji} {lv.label}
                    </span>
                  )}
                </span>
                {std !== null && (
                  <span className="player-card-scores">
                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', fontSize: '0.75rem' }}>
                      <span style={{ opacity: 0.65, color: isActive ? '#fff' : 'var(--outline)' }}>Std</span>
                      <span style={{ fontWeight: 700, color: scoreColor(std) }}>
                        {fmt(std)}
                        {diffStd !== null && diffStd < 0 && (
                          <span style={{ fontWeight: 500, opacity: 0.7, marginLeft: '0.2rem' }}>({fmt(diffStd)})</span>
                        )}
                      </span>
                    </span>
                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', fontSize: '0.75rem' }}>
                      <span style={{ opacity: 0.65, color: isActive ? '#fff' : 'var(--outline)' }}>Komb</span>
                      <span style={{ fontWeight: 700, color: scoreColor(combined) }}>
                        {fmt(combined)}
                        {diffCombined !== null && diffCombined < 0 && (
                          <span style={{ fontWeight: 500, opacity: 0.7, marginLeft: '0.2rem' }}>({fmt(diffCombined)})</span>
                        )}
                      </span>
                    </span>
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
