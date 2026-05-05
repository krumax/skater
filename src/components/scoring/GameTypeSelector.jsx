/**
 * GameTypeSelector - Spielart-Grid (Kreuz/Pik/Herz/Karo/Grand/Null/Passen).
 */
import SuitIcon from '../SuitIcon';

const SUIT_OPTIONS = [
  { key: 'club',    icon: '♣',  label: 'Kreuz',  color: '#1b1c1c' },
  { key: 'spade',   icon: '♠',  label: 'Pik',    color: '#3d4040' },
  { key: 'heart',   icon: '♥',  label: 'Herz',   color: '#8b1a1a' },
  { key: 'diamond', icon: '♦',  label: 'Karo',   color: '#b5860d' },
  { key: 'grand',   icon: null, label: 'Grand',  color: '#1b4332', matIcon: 'stars' },
  { key: 'null',    icon: null, label: 'Null',   color: '#6b7280', matIcon: 'block' },
  { key: 'passed',  icon: null, label: 'Passen', color: '#4a4a5a', matIcon: 'skip_next' },
];

export { SUIT_OPTIONS };

export default function GameTypeSelector({ gameType, onSelect }) {
  return (
    <section className="form-section">
      <label className="section-label">Spielart</label>
      <div className="game-type-grid-wrapper">
        <div className="game-type-grid">
          {SUIT_OPTIONS.map(suit => {
            const isActive = gameType === suit.key;
            return (
              <button
                key={suit.key}
                onClick={() => onSelect(suit.key)}
                className="game-type-card"
                style={isActive ? { backgroundColor: suit.color, color: '#fff', boxShadow: `0 8px 24px ${suit.color}66` } : {}}
              >
                <SuitIcon gameType={suit.key} size="lg" className="game-suit-icon" />
                <span className="game-type-label">{suit.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
