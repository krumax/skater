/**
 * AnsageSelector - Mit/Ohne-Toggle und Spitzen 1–4.
 * Wird bei Null/Passen deaktiviert (maxSpitzen === 0).
 */
export default function AnsageSelector({
  mitOhne,
  setMitOhne,
  spitzen,
  setSpitzen,
  maxSpitzen = 0,
  disabled: externallyDisabled = false,
}) {
  const disabled = externallyDisabled || maxSpitzen === 0;

  return (
    <section className="form-section" aria-disabled={disabled}>
      <label className="section-label">Ansage</label>
      <div className="ansage-layout" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', opacity: disabled ? 0.25 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
          <button
            type="button"
            disabled={disabled}
            aria-pressed={mitOhne === 'mit'}
            className={`chip ${mitOhne === 'mit' ? 'active' : ''}`}
            onClick={() => setMitOhne('mit')}
          >
            Mit
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-pressed={mitOhne === 'ohne'}
            className={`chip ${mitOhne === 'ohne' ? 'active' : ''}`}
            onClick={() => setMitOhne('ohne')}
          >
            Ohne
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4].map(num => {
            const isDisabled = disabled || num > maxSpitzen;
            return (
              <button
                key={num}
                type="button"
                disabled={isDisabled}
                aria-pressed={spitzen === num && !isDisabled}
                onClick={() => setSpitzen(num)}
                className={`game-type-card touch-target ${spitzen === num && !isDisabled ? 'active' : ''}`}
                style={{ width: '44px', height: '44px', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 700, opacity: isDisabled ? 0.25 : 1, pointerEvents: isDisabled ? 'none' : 'auto' }}
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
