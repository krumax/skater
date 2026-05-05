/**
 * GameTypeSelector - Spielart-Grid (Kreuz/Pik/Herz/Karo/Grand/Null/Passen).
 */
import SuitIcon from '../SuitIcon';
import { useIconset } from '../../context/IconsetContext';

const SUIT_OPTIONS = [
  { key: 'club',    icon: '♣',  labelFrench: 'Kreuz',  labelAltenburg: 'Eichel',   color: '#1b1c1c' },
  { key: 'spade',   icon: '♠',  labelFrench: 'Pik',    labelAltenburg: 'Grün',     color: '#3d4040' },
  { key: 'heart',   icon: '♥',  labelFrench: 'Herz',   labelAltenburg: 'Rot',      color: '#8b1a1a' },
  { key: 'diamond', icon: '♦',  labelFrench: 'Karo',   labelAltenburg: 'Schellen', color: '#b5860d' },
  { key: 'grand',   icon: null, labelFrench: 'Grand',  labelAltenburg: 'Grand',    color: '#1b4332', matIcon: 'stars' },
  { key: 'null',    icon: null, labelFrench: 'Null',   labelAltenburg: 'Null',     color: '#6b7280', matIcon: 'block' },
  { key: 'passed',  icon: null, labelFrench: 'Passen', labelAltenburg: 'Passen',   color: '#4a4a5a', matIcon: 'skip_next' },
];

// Keep backward-compatible `label` field for consumers that import SUIT_OPTIONS
SUIT_OPTIONS.forEach(s => { s.label = s.labelFrench; });

export { SUIT_OPTIONS };

export default function GameTypeSelector({ gameType, onSelect }) {
  const { iconset } = useIconset();

  return (
    <section className="form-section">
      <label className="section-label">Spielart</label>
      <div className="game-type-grid-wrapper">
        <div className="game-type-grid">
          {SUIT_OPTIONS.map(suit => {
            const isActive = gameType === suit.key;
            const label = iconset === 'altenburg' ? suit.labelAltenburg : suit.labelFrench;
            return (
              <button
                key={suit.key}
                onClick={() => onSelect(suit.key)}
                className="game-type-card"
                style={isActive ? { backgroundColor: suit.color, color: '#fff', boxShadow: `0 8px 24px ${suit.color}66` } : {}}
              >
                <SuitIcon gameType={suit.key} size="lg" className="game-suit-icon" />
                <span className="game-type-label">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
