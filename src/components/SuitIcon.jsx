import { useState } from 'react';
import { useIconset } from '../context/IconsetContext';
import { SUIT_SYMBOLS, SUIT_MAT_ICONS } from '../lib/tokens';
import eichelIcon   from '../../assets/icon_altenburg_einfach/eichel_icon_einfach.png';
import gruenIcon    from '../../assets/icon_altenburg_einfach/gruen_icon_einfach.png';
import rotIcon      from '../../assets/icon_altenburg_einfach/rot_icon_einfach.png';
import schellenIcon from '../../assets/icon_altenburg_einfach/schellen_icon_einfach.png';

const ALTENBURG_ICONS = {
  club:    eichelIcon,
  spade:   gruenIcon,
  heart:   rotIcon,
  diamond: schellenIcon,
};

const ALTENBURG_LABELS = {
  club:    'Eichel',
  spade:   'Grün',
  heart:   'Rot',
  diamond: 'Schellen',
};

const SIZE_MAP = {
  sm: '0.875rem',
  md: '1rem',
  lg: '1.25rem',
  xl: '1.75rem',
};

export default function SuitIcon({ gameType, size = 'md', className, forceIconset, color }) {
  const { iconset: contextIconset } = useIconset();
  const iconset = forceIconset ?? contextIconset;
  const [imgError, setImgError] = useState(false);
  const fontSize = SIZE_MAP[size] || SIZE_MAP.md;

  // Special game types always use Material Icons, independent of iconset
  if (gameType in SUIT_MAT_ICONS) {
    return (
      <span
        className={`material-symbols-outlined ${className || ''}`}
        style={{ fontSize, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...(color ? { color } : {}) }}
      >
        {SUIT_MAT_ICONS[gameType]}
      </span>
    );
  }

  // Suit types: render Altenburg PNG when iconset is 'altenburg' and no load error
  if (iconset === 'altenburg' && gameType in ALTENBURG_ICONS && !imgError) {
    return (
      <img
        src={ALTENBURG_ICONS[gameType]}
        alt={ALTENBURG_LABELS[gameType]}
        onError={() => setImgError(true)}
        className={className}
        style={{ width: fontSize, height: fontSize, display: 'inline-block', verticalAlign: 'middle' }}
      />
    );
  }

  // Fallback: Unicode symbol (French deck or image error)
  return (
    <span
      className={className}
      style={{ fontSize, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...(color ? { color } : {}) }}
    >
      {SUIT_SYMBOLS[gameType] || '?'}
    </span>
  );
}
