/**
 * SpitzenSelector - Spitzen 5–11 (nur für Farbspiele aktiv).
 */

const SUIT_GAMES = ['club', 'spade', 'heart', 'diamond'];

export default function SpitzenSelector({ gameType, spitzen, setSpitzen }) {
  const active = SUIT_GAMES.includes(gameType);

  return (
    <section
      className="form-section"
      style={{ opacity: active ? 1 : 0.25, pointerEvents: active ? 'auto' : 'none' }}
    >
      <label className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        Spitzen
        <span
          className="material-symbols-outlined"
          title="Spitzen = Anzahl der höchsten Trümpfe, die du lückenlos hast (mit) oder nicht hast (ohne). Beginnt immer beim Kreuz-Buben. Erhöht die Gewinnstufe um 1 pro Spitze."
          style={{ fontSize: '0.85rem', cursor: 'help', opacity: 0.6, fontVariationSettings: "'FILL' 0" }}
        >info</span>
      </label>
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
