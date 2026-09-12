/**
 * GameTypeSelector - Spielart-Grid (Kreuz/Pik/Herz/Karo/Grand/Null/Passen).
 */
import SuitIcon from '../SuitIcon';
import { SUIT_ICON_COLORS } from '../../lib/tokens';
import { useIconset } from '../../context/IconsetContext';

const SUIT_OPTIONS = [
  { key: 'club',    icon: '♣',  labelFrench: 'Kreuz',  labelAltenburg: 'Eichel',   color: '#1b1c1c', iconColor: SUIT_ICON_COLORS.club },
  { key: 'spade',   icon: '♠',  labelFrench: 'Pik',    labelAltenburg: 'Grün',     color: '#3d4040', iconColor: SUIT_ICON_COLORS.spade },
  { key: 'heart',   icon: '♥',  labelFrench: 'Herz',   labelAltenburg: 'Rot',      color: '#8b1a1a', iconColor: SUIT_ICON_COLORS.heart },
  { key: 'diamond', icon: '♦',  labelFrench: 'Karo',   labelAltenburg: 'Schellen', color: '#b5860d', iconColor: SUIT_ICON_COLORS.diamond },
  { key: 'grand',   icon: null, labelFrench: 'Grand',  labelAltenburg: 'Grand',    color: '#1b4332', iconColor: SUIT_ICON_COLORS.grand, matIcon: 'stars' },
  { key: 'null',    icon: null, labelFrench: 'Null',   labelAltenburg: 'Null',     color: '#6b7280', iconColor: SUIT_ICON_COLORS.null, matIcon: 'block' },
  { key: 'passed',  icon: null, labelFrench: 'Passen', labelAltenburg: 'Passen',   color: '#4a4a5a', iconColor: '#9e9e9e', matIcon: 'skip_next' },
];

// Keep backward-compatible `label` field for consumers that import SUIT_OPTIONS
SUIT_OPTIONS.forEach(s => { s.label = s.labelFrench; });

export { SUIT_OPTIONS };

export default function GameTypeSelector({
  gameType,
  onSelect,
  includePassed = true,
  disabled = false,
}) {
  const { iconset } = useIconset();
  const options = includePassed
    ? SUIT_OPTIONS
    : SUIT_OPTIONS.filter((suit) => suit.key !== 'passed');

  return (
    <section className="form-section">
      <label className="section-label">Spielart</label>
      <div className="game-type-grid-wrapper">
        <div className="game-type-grid">
          {options.map(suit => {
            const isActive = gameType === suit.key;
            const label = iconset === 'altenburg' ? suit.labelAltenburg : suit.labelFrench;
            return (
              <button
                key={suit.key}
                type="button"
                onClick={() => onSelect(suit.key)}
                disabled={disabled}
                aria-pressed={isActive}
                aria-label={label}
                className="game-type-card"
                style={{
                  ...(isActive ? { backgroundColor: suit.color, color: '#fff', boxShadow: `0 8px 24px ${suit.color}66` } : {}),
                  ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                }}
              >
                <SuitIcon gameType={suit.key} size="lg" className="game-suit-icon" color={isActive ? '#fff' : suit.iconColor} />
                <span className="game-type-label">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
