import { SUIT_COLORS, SUIT_TEXT_COLORS } from '../lib/tokens';
import SuitIcon from './SuitIcon';

const SIZE_MAP = {
  sm: { size: '1.25rem', fontSize: '0.75rem', borderRadius: '0.25rem' },
  md: { size: '2rem',    fontSize: '1rem',    borderRadius: '0.4rem'  },
  lg: { size: '2.5rem',  fontSize: '1.25rem', borderRadius: '0.5rem'  },
  xl: { size: '2.5rem',  fontSize: '1.5rem',  borderRadius: '0.5rem'  },
};

// Icon-only font sizes for plain variant (no box)
const PLAIN_FONT_SIZE = {
  sm: '0.9rem',
  md: '1.25rem',
  lg: '1.6rem',
  xl: '2rem',
};

// Icon colors for plain variant - optimized for visibility without a background box
const PLAIN_ICON_COLORS = {
  grand:   '#0b7a52',  // kräftiges Grün
  club:    '#1b1c1c',  // Schwarz (bleibt)
  spade:   '#414944',  // Dunkelgrau (bleibt)
  heart:   '#b52619',  // Rot (bleibt)
  diamond: '#b08a00',  // Sattgold (etwas dunkler für Lesbarkeit ohne Box)
  null:    '#4a7c6f',  // Blaugrün – klar unterscheidbar
  passed:  '#9e9e9e',  // Grau (bleibt)
};

export default function SuitBadge({ gameType, size = 'md', className, variant = 'box' }) {
  const { size: dim, fontSize, borderRadius } = SIZE_MAP[size] ?? SIZE_MAP.md;

  // Plain variant: just the icon, no background box
  if (variant === 'plain') {
    const fg = PLAIN_ICON_COLORS[gameType] ?? 'var(--outline)';
    const plainSize = PLAIN_FONT_SIZE[size] ?? PLAIN_FONT_SIZE.md;
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: dim,
          height: dim,
        }}
      >
        <span style={{ fontSize: plainSize, color: fg, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SuitIcon gameType={gameType} size={size} color={fg} />
        </span>
      </span>
    );
  }

  const bg = SUIT_COLORS[gameType] ?? 'var(--surface-high)';
  const fg = SUIT_TEXT_COLORS[gameType] ?? 'var(--outline)';

  return (
    <span
      className={className}
      style={{
        backgroundColor: bg,
        width: dim,
        height: dim,
        borderRadius,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize, color: fg, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SuitIcon gameType={gameType} size={size} />
      </span>
    </span>
  );
}
