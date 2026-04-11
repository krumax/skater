/**
 * NullOutcomeSelector — Gewonnen/Verloren-Auswahl für Null-Spiele.
 * Wird bei allen anderen Spielarten deaktiviert.
 */
export default function NullOutcomeSelector({ gameType, eyeCount, setEyeCount }) {
  const active = gameType === 'null';

  return (
    <section className="form-section">
      <label className="section-label">Null-Ergebnis</label>
      <div
        className="chip-grid"
        style={{ gridTemplateColumns: '1fr 1fr', opacity: active ? 1 : 0.4, pointerEvents: active ? 'auto' : 'none' }}
      >
        <button
          disabled={!active}
          className={`chip ${eyeCount === 0 ? 'active' : ''}`}
          onClick={() => setEyeCount(0)}
        >
          Gewonnen (0 Stiche)
        </button>
        <button
          disabled={!active}
          className={`chip ${eyeCount !== 0 ? 'active' : ''}`}
          onClick={() => setEyeCount(1)}
          style={{ color: 'var(--secondary)' }}
        >
          Verloren (Stich gemacht)
        </button>
      </div>
    </section>
  );
}
