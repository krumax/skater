/**
 * EyeCountSelector — Augen-Eingabe mit Schnellauswahl-Buttons.
 * Wird bei Null und Passen deaktiviert.
 */
export default function EyeCountSelector({ gameType, eyeCount, setEyeCount }) {
  const disabled = gameType === 'null' || gameType === 'passed';

  return (
    <section className="form-section">
      <label className="section-label">Augen</label>
      <div style={{
        display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap',
        opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? 'none' : 'auto',
      }}>
        <input
          type="number"
          className="number-input"
          disabled={disabled}
          min="0"
          max="120"
          value={eyeCount}
          onChange={e => setEyeCount(Math.min(120, Math.max(0, parseInt(e.target.value) || 0)))}
        />
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button disabled={disabled} className={`chip ${eyeCount >= 61 && eyeCount < 90  ? 'active' : ''}`} onClick={() => setEyeCount(61)}>61+</button>
          <button disabled={disabled} className={`chip ${eyeCount >= 90 && eyeCount < 120 ? 'active' : ''}`} onClick={() => setEyeCount(90)}>Schneider (90+)</button>
          <button disabled={disabled} className={`chip ${eyeCount >= 120               ? 'active' : ''}`} onClick={() => setEyeCount(120)}>Schwarz (120)</button>
          <button disabled={disabled} className={`chip ${eyeCount < 61                 ? 'active' : ''}`} onClick={() => setEyeCount(30)} style={{ color: 'var(--secondary)' }}>Verloren (&lt;61)</button>
        </div>
      </div>
    </section>
  );
}
