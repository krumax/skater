/**
 * SpitzenSelector — Spitzen 5–11 (nur für Farbspiele aktiv).
 */

const SUIT_GAMES = ['club', 'spade', 'heart', 'diamond'];

export default function SpitzenSelector({ gameType, spitzen, setSpitzen }) {
  const active = SUIT_GAMES.includes(gameType);

  return (
    <section
      className="form-section"
      style={{ opacity: active ? 1 : 0.25, pointerEvents: active ? 'auto' : 'none' }}
    >
      <label className="section-label">Spitzen</label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {Array.from({ length: 7 }, (_, i) => i + 5).map(num => (
          <button
            key={num}
            onClick={() => setSpitzen(num)}
            className={`game-type-card touch-target ${spitzen === num ? 'active' : ''}`}
            style={{ width: '44px', height: '44px', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 700 }}
          >
            {num}
          </button>
        ))}
      </div>
    </section>
  );
}
