/**
 * EyeCountSelector - Augen-Eingabe mit Schnellauswahl-Buttons.
 * Wird bei Null und Passen deaktiviert.
 */

const SUIT_GAMES = ['club', 'spade', 'heart', 'diamond', 'grand'];

export default function EyeCountSelector({ gameType, eyeCount, setEyeCount }) {
  const disabled    = gameType === 'null' || gameType === 'passed';
  const canSpaltarsch = SUIT_GAMES.includes(gameType);

  return (
    <section className="form-section">
      <label className="section-label">Augen</label>
      <div style={{
        display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
        opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? 'none' : 'auto',
      }}>
          <button disabled={disabled} className={`chip ${eyeCount >= 61 && eyeCount < 90  ? 'active' : ''}`} onClick={() => setEyeCount(61)}>61+</button>
          <button disabled={disabled} className={`chip ${eyeCount >= 90 && eyeCount < 120 ? 'active' : ''}`} onClick={() => setEyeCount(90)}>Schneider (90+)</button>
          <button disabled={disabled} className={`chip ${eyeCount >= 120               ? 'active' : ''}`} onClick={() => setEyeCount(120)}>Schwarz (120)</button>
          <button disabled={disabled} className={`chip ${eyeCount < 61 && eyeCount !== 60 ? 'active' : ''}`} onClick={() => setEyeCount(30)}
            style={eyeCount < 61 && eyeCount !== 60 ? { backgroundColor: 'var(--secondary)', color: '#fff', borderColor: 'var(--secondary)' } : { color: 'var(--secondary)' }}>
            Verloren (&lt;61)
          </button>
          <button
            disabled={!canSpaltarsch}
            className={`chip ${eyeCount === 60 ? 'active' : ''}`}
            onClick={() => setEyeCount(60)}
            style={{
              opacity: canSpaltarsch ? 1 : 0.4,
              pointerEvents: canSpaltarsch ? 'auto' : 'none',
              ...(eyeCount === 60
                ? { backgroundColor: 'var(--secondary)', color: '#fff', borderColor: 'var(--secondary)' }
                : { color: 'var(--secondary)' }),
            }}
            title="Spaltarsch: exakt 60 Augen - Spiel verloren, nächste Runden als Bockrunde"
          >
            💥 Spaltarsch (60)
          </button>
      </div>
    </section>
  );
}
