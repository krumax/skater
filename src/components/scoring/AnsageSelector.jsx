/**
 * AnsageSelector — Mit/Ohne-Toggle und Spitzen 1–4.
 * Wird bei Null/Passen deaktiviert (maxSpitzen === 0).
 */
export default function AnsageSelector({ mitOhne, setMitOhne, spitzen, setSpitzen, maxSpitzen }) {
  const disabled = maxSpitzen === 0;

  return (
    <section className="form-section">
      <label className="section-label">Ansage</label>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', opacity: disabled ? 0.25 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
          <button className={`chip ${mitOhne === 'mit'   ? 'active' : ''}`} onClick={() => setMitOhne('mit')}>Mit</button>
          <button className={`chip ${mitOhne === 'ohne'  ? 'active' : ''}`} onClick={() => setMitOhne('ohne')}>Ohne</button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4].map(num => {
            const isDisabled = num > maxSpitzen;
            return (
              <button
                key={num}
                disabled={isDisabled}
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
