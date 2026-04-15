import { SUIT_COLORS, SUIT_TEXT_COLORS, SUIT_SYMBOLS, SUIT_MAT_ICONS } from '../lib/tokens';

const SIZE_MAP = {
  sm: { size: '1.25rem', fontSize: '0.75rem', borderRadius: '0.25rem' },
  md: { size: '2rem',    fontSize: '1rem',    borderRadius: '0.4rem'  },
  lg: { size: '2.5rem',  fontSize: '1.25rem', borderRadius: '0.5rem'  },
};

export default function SuitBadge({ gameType, size = 'md', className }) {
  const bg = SUIT_COLORS[gameType] ?? 'var(--surface-high)';
  const fg = SUIT_TEXT_COLORS[gameType] ?? 'var(--outline)';
  const { size: dim, fontSize, borderRadius } = SIZE_MAP[size] ?? SIZE_MAP.md;

  let icon;
  if (gameType in SUIT_SYMBOLS) {
    icon = SUIT_SYMBOLS[gameType];
  } else if (gameType in SUIT_MAT_ICONS) {
    icon = (
      <span
        className="material-symbols-outlined"
        style={{ fontSize, color: fg, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {SUIT_MAT_ICONS[gameType]}
      </span>
    );
  } else {
    icon = '?';
  }

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
        {icon}
      </span>
    </span>
  );
}
